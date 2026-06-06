import { validateHIR, runPass3 } from '@genesis/schema';
import { isNodeAllowedInDomain, IRDocument, IRLIRDocument, WebLIR } from '@genesis/types';
import { computeLayout, runPass5 } from '@genesis/renderer';
import { dispatchMultiRenderer } from '@genesis/renderer';
import { evaluateRLVRR } from './rlvrr.js';
import { serializeToGIR } from './binary.js';

function resolveStyleCascade(doc: IRDocument) {
  const brand = doc.style_context?.brand_profile || {};
  const theme = doc.style_context?.theme_tokens || {};
  const component = doc.style_context?.component_styles || {};
  
  // Rule #01: inline_overrides > component_styles > theme_tokens > brand_profile
  const computed_global = { ...brand, ...theme, ...component };
  (doc.style_context as any).computed_styles = computed_global;
  
  if (doc.objects) {
    for (const node of doc.objects) {
      if ((node as any).style) {
        (node as any).computed_style = { ...computed_global, ...(node as any).style };
      } else {
        (node as any).computed_style = { ...computed_global };
      }
    }
  }
  return computed_global;
}

/**
 * @stability BETA
 * Pipeline 9-Pass Orchestrator
 */
export async function runCompilerPipeline(doc: IRDocument, referenceBrandDoc?: IRDocument): Promise<IRLIRDocument> {
  // PASS 0: HIR Validation
  const validationResult = validateHIR(doc);
  if (!validationResult.valid) {
    throw new Error(`Pass 0 Failed: Invalid HIR Schema. ${validationResult.errors.map(e => e.message).join(', ')}`);
  }

  // PASS 1: Domain Node Validation
  if (doc.objects) {
    for (const node of doc.objects) {
      if (!isNodeAllowedInDomain(node.type, doc.meta.domain)) {
        throw new Error(`Pass 1 Failed: Node type '${node.type}' is not allowed in domain '${doc.meta.domain}'`);
      }
    }
  }

  // PASS 2: Style Cascade Resolution
  // (Transforms inline styles + component styles + theme tokens into computed styles)
  const resolvedStyleContext = resolveStyleCascade(doc); 

  // PASS 3: Semantic Evaluation (AJV)
  const semanticResult = runPass3(doc);
  if (semanticResult && semanticResult.errors && semanticResult.errors.length > 0) {
    throw new Error(`Pass 3 Failed: Semantic validation failed. ${semanticResult.errors.map((e: any) => e.message).join(', ')}`);
  }

  // PASS 4: Layout Calculation
  // Calculates absolute X, Y bounds for all nodes based on Flex/Grid
  const computedLayout = computeLayout(doc);
  if (!doc.observability) doc.observability = {} as any;
  (doc.observability as any).computed_layout = computedLayout;

  // Sub-pass 4a: Text Reflow for Document Domain
  if (doc.meta.domain === 'document' || doc.meta.active_domains?.includes('document')) {
    const reflowModule = await import('@genesis/renderer');
    const reflowResult = reflowModule.computeTextReflow(doc, computedLayout);
    (doc.observability as any).document_reflow = reflowResult;
  }

  // Sub-pass 4b: A* Auto-Routing for Diagram Domain
  if (doc.meta.domain === 'diagram' || doc.meta.active_domains?.includes('diagram')) {
    const routingModule = await import('@genesis/renderer');
    const routingResult = routingModule.computeEdgeRouting(doc, computedLayout);
    (doc.observability as any).diagram_routing = routingResult;
  }

  // PASS 5: Temporal & Timeline Resolving
  const assetPool = (doc as any).assets || [];
  const temporalResult = runPass5(doc, assetPool);
  if (!temporalResult.success) {
    throw new Error(`Pass 5 Failed: Temporal resolution failed. ${temporalResult.errors.join(', ')}`);
  }
  if (temporalResult.resolvedNotes) {
    (doc.observability as any).temporal_notes = temporalResult.resolvedNotes;
  }
  if (temporalResult.resolvedFrames) {
    (doc.observability as any).pixel_frames = temporalResult.resolvedFrames;
  }

  // PASS 6: Renderer Dispatch
  const renderOutput = await dispatchMultiRenderer(doc, ['svg', 'audio', 'three_d']);

  // PASS 7: LIR Generation
  const { generateLIR } = await import('@genesis/renderer');
  const lirDoc: IRLIRDocument = generateLIR(doc, 'web');
  
  // Attach renderOutput onto lirDoc if applicable
  if (lirDoc.lir.type === 'web' && 'dom_instructions' in lirDoc.lir && lirDoc.lir.dom_instructions.format === 'svg' && renderOutput.svg) {
    lirDoc.lir.dom_instructions.svg = renderOutput.svg;
  }

  // PASS 8: Binary Serialization
  // Generates the .gir binary format
  const binaryPayload = serializeToGIR(doc);
  (lirDoc as any).binary_payload = binaryPayload;

  // POST-COMPILATION: RLVRR Heuristic Scoring
  // Using referenceBrandDoc if provided, else null (so self reference is not done for brand validation)
  const rlvrrScore = evaluateRLVRR(doc, referenceBrandDoc);
  if (rlvrrScore.quality === 'HIGH_NEGATIVE') {
    if (!doc.observability) doc.observability = {} as any;
    (doc.observability as any).rlvrr = rlvrrScore;
  }

  return lirDoc;
}
