import { validateHIR, runPass3 } from '@genesis/schema';
import { isNodeAllowedInDomain, IRDocument, IRLIRDocument, WebLIR } from '@genesis/types';
import { computeLayout, runPass5 } from '@genesis/renderer';
import { evaluateRLVRR } from './rlvrr.js';
import { serializeToGIR } from './binary.js';

/**
 * @stability BETA
 * Pipeline 9-Pass Orchestrator
 */
export function runCompilerPipeline(doc: IRDocument): IRLIRDocument {
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
  // Engine for this is still under active development, returning raw context
  const resolvedStyleContext = doc.style_context; 

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

  // PASS 5: Temporal & Timeline Resolving
  const assetPool = (doc as any).assets || [];
  const temporalResult = runPass5(doc, assetPool);
  if (!temporalResult.success) {
    throw new Error(`Pass 5 Failed: Temporal resolution failed. ${temporalResult.errors.join(', ')}`);
  }
  if (temporalResult.resolvedNotes) {
    (doc.observability as any).temporal_notes = temporalResult.resolvedNotes;
  }

  // PASS 6: RLVRR Heuristic Scoring
  const rlvrrScore = evaluateRLVRR(doc, doc); // Using doc as reference for now
  if (rlvrrScore.quality === 'HIGH_NEGATIVE') {
    // We can decide to block or warn, for now just log/attach
    if (!doc.observability) doc.observability = {} as any;
    (doc.observability as any).rlvrr = rlvrrScore;
  }

  // PASS 7: Binary Transformation
  // Generates the .gir binary format
  const binaryPayload = serializeToGIR(doc);

  // PASS 8: LIR Dispatching
  // Dispatches to the correct LIR format based on domain / target
  const lirDoc: IRLIRDocument = {
    target: 'web',
    lir: {
      type: 'web',
      dom_instructions: {
        format: 'svg',
        svg: `<svg width="${(doc.canvas as any)?.width || 800}" height="${(doc.canvas as any)?.height || 600}"></svg>`
      }
    } as WebLIR
  };

  // Attach binary artifact for sync/download purposes
  (lirDoc as any).binary_payload = binaryPayload;

  return lirDoc;
}
