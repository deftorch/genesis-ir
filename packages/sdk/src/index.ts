/**
 * @genesis/sdk — Public API Layer for Genesis IR
 *
 * This is the consumer-facing entrypoint for the Genesis Intermediate
 * Representation system. External consumers should use this package
 * instead of importing internal packages directly.
 *
 * @stability BETA
 * @module @genesis/sdk
 */

// ─── Re-exports from internal packages ──────────────────────────
export type {
  IRDomain,
  IRMode,
  IRModeContext,
  IRDocument,
  IRDocumentMetadata,
  IRDocumentLifecycleStatus,
  IRProductionGate,
  IRCanvas,
  IRAudioCanvas,
  IR3DViewport,
  IRCanvasModeContext,
  IRNode,
  IRNodeType,
  IRNodeContent,
  IRTextContent,
  IRImageContent,
  IRShapeContent,
  IRSVGPathContent,
  IRVideoContent,
  IRAudioContent,
  IRChartContent,
  IRDocContent,
  IRDiagramNodeContent,
  IRDiagramEdgeContent,
  IRMusicTrackContent,
  IRMusicNoteContent,
  IRPixelCelContent,
  IRMesh3DContent,
  IRGlyphContent,
  IRDeviceFrameContent,
  IRPrintTextFrameContent,
  IRGeometry,
  IRMatrix2D,
  IRStyleContext,
  IRConstraintSet,
  IRTimeline,
  IRLIRDocument,
  WebLIR,
  PrintLIR,
  VideoLIR,
  PixelLIR,
} from '@genesis/types';

export {
  isValidIRDomain,
  ALL_IR_DOMAINS,
  getModeContext,
  IR_MODE_DOMAIN_MAP,
  createIRDocument,
  canTransition,
  CANVAS_PRESETS,
  applyPreset,
  isNodeAllowedInDomain,
  IR_ALLOWED_NODE_TYPES_BY_DOMAIN,
  applyTransform,
} from '@genesis/types';

export type {
  ValidationResult,
  ValidationError,
  SemanticValidationResult,
  TierConstraint,
} from '@genesis/schema';

export {
  validateHIR,
  validateCanvas,
  validateNodes,
  validateTierLimits,
  runPass3,
  TIER_CONSTRAINTS,
} from '@genesis/schema';

export type {
  CompilationResult,
} from '@genesis/compiler';

export {
  compileDocument,
  runCompilerPipeline,
  serializeToGIR,
  deserializeFromGIR,
  evaluateRLVRR,
} from '@genesis/compiler';

export {
  renderToSVG,
  computeLayout,
  generateLIR,
  dispatchMultiRenderer,
} from '@genesis/renderer';

// ─── High-Level SDK Facade ──────────────────────────────────────

import {
  createIRDocument as _createDoc,
  IRDocument,
  IRDomain,
  IRCanvas,
  IRAudioCanvas,
  IR3DViewport,
  IRNode,
  isValidIRDomain,
  canTransition,
  IRDocumentLifecycleStatus,
} from '@genesis/types';

import {
  validateHIR,
  ValidationResult,
} from '@genesis/schema';

import {
  compileDocument,
  CompilationResult,
  serializeToGIR,
  deserializeFromGIR,
} from '@genesis/compiler';

import {
  renderToSVG,
  dispatchMultiRenderer,
} from '@genesis/renderer';

/**
 * Configuration options for creating a new Genesis document.
 * @stability BETA
 */
export interface GenesisDocumentOptions {
  domain: IRDomain;
  canvas: IRCanvas | IRAudioCanvas | IR3DViewport;
  tier?: 'nano' | 'core' | 'full';
}

/**
 * Result of a full pipeline render operation.
 * @stability BETA
 */
export interface RenderResult {
  success: boolean;
  svg?: string;
  pdf?: Buffer;
  audio?: Buffer;
  three_d_html?: string;
  errors: string[];
}

/**
 * Create a new Genesis IR document with validated parameters.
 *
 * @param opts - Document creation options
 * @returns A new, valid IRDocument with immutable UUID v4 ir_id
 * @throws {Error} If the domain is not valid
 *
 * @example
 * ```ts
 * import { createDocument } from '@genesis/sdk';
 *
 * const doc = createDocument({
 *   domain: 'visual',
 *   canvas: { width: 1920, height: 1080, color_space: 'sRGB' },
 * });
 * ```
 *
 * @stability BETA
 */
export function createDocument(opts: GenesisDocumentOptions): IRDocument {
  if (!isValidIRDomain(opts.domain)) {
    throw new Error(`Invalid domain: "${opts.domain}". Must be one of the 17 locked domains.`);
  }
  return _createDoc(opts);
}

/**
 * Validate a document against the full HIR schema.
 *
 * @param doc - The document (or raw JSON) to validate
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```ts
 * const result = validate(myDocument);
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 *
 * @stability BETA
 */
export function validate(doc: unknown): ValidationResult {
  return validateHIR(doc);
}

/**
 * Compile a document through the full 9-pass pipeline.
 *
 * @param doc - A valid IRDocument to compile
 * @returns Compilation result with LIR output or errors
 *
 * @example
 * ```ts
 * const result = compile(myDocument);
 * if (result.success) {
 *   // result.lir contains the Low-Level IR output
 * }
 * ```
 *
 * @stability BETA
 */
export function compile(doc: IRDocument): CompilationResult {
  return compileDocument(doc);
}

/**
 * Render a document to SVG string output.
 *
 * @param doc - A valid IRDocument (domain 'visual' recommended)
 * @returns SVG string representation of the document
 *
 * @stability BETA
 */
export function renderSVG(doc: IRDocument): string {
  return renderToSVG(doc);
}

/**
 * Render a document to multiple output formats based on active domains.
 *
 * @param doc - A valid IRDocument
 * @param targets - Optional array of target contexts ('svg', 'pdf', 'audio', 'three_d')
 * @returns Render result with outputs for each requested format
 *
 * @example
 * ```ts
 * const result = await render(myDocument, ['svg', 'pdf']);
 * if (result.success) {
 *   // result.svg, result.pdf available
 * }
 * ```
 *
 * @stability BETA
 */
export async function render(doc: IRDocument, targets?: string[]): Promise<RenderResult> {
  try {
    const output = await dispatchMultiRenderer(doc, targets);
    return {
      success: true,
      svg: output.svg,
      pdf: output.pdf,
      audio: output.audio,
      three_d_html: output.three_d_html,
      errors: [],
    };
  } catch (error: any) {
    return {
      success: false,
      errors: [error.message || 'Unknown render error'],
    };
  }
}

/**
 * Serialize an IRDocument to the binary .gir format.
 *
 * @param doc - A valid IRDocument
 * @returns Buffer containing the .gir binary payload
 *
 * @stability BETA
 */
export function exportToGIR(doc: IRDocument): Buffer {
  return serializeToGIR(doc);
}

/**
 * Deserialize a .gir binary buffer back to an IRDocument.
 *
 * @param buffer - Buffer containing .gir binary data
 * @returns The deserialized IRDocument
 * @throws {Error} If the buffer header or checksum is invalid
 *
 * @stability BETA
 */
export function importFromGIR(buffer: Buffer): IRDocument {
  return deserializeFromGIR(buffer);
}

/**
 * Transition a document's lifecycle status with forward-only validation.
 *
 * @param doc - The document to transition
 * @param newStatus - The target lifecycle status
 * @returns A new document object with the updated status
 * @throws {Error} If the transition is invalid (backward transitions are forbidden)
 *
 * @stability BETA
 */
export function transitionStatus(
  doc: IRDocument,
  newStatus: IRDocumentLifecycleStatus
): IRDocument {
  if (!canTransition(doc.meta.lifecycle_status, newStatus)) {
    throw new Error(
      `Invalid lifecycle transition: ${doc.meta.lifecycle_status} → ${newStatus}. ` +
      `Status transitions are forward-only.`
    );
  }
  return {
    ...doc,
    meta: {
      ...doc.meta,
      lifecycle_status: newStatus,
      updated_at: new Date().toISOString(),
    },
  };
}

/**
 * Add a node to a document (returns new document, does not mutate).
 *
 * @param doc - The source document
 * @param node - The node to add
 * @returns A new document with the node appended to objects array
 *
 * @stability BETA
 */
export function addNode(doc: IRDocument, node: IRNode): IRDocument {
  return {
    ...doc,
    objects: [...doc.objects, node],
  };
}

/**
 * Remove a node from a document by ID (returns new document, does not mutate).
 *
 * @param doc - The source document
 * @param nodeId - The UUID of the node to remove
 * @returns A new document without the specified node
 *
 * @stability BETA
 */
export function removeNode(doc: IRDocument, nodeId: string): IRDocument {
  return {
    ...doc,
    objects: doc.objects.filter(n => n.id !== nodeId),
  };
}

/**
 * SDK version constant.
 * @stability STABLE
 */
export const SDK_VERSION = '1.0.0';

/**
 * SDK metadata.
 * @stability STABLE
 */
export const SDK_INFO = Object.freeze({
  name: '@genesis/sdk',
  version: SDK_VERSION,
  spec_version: '1.0',
  locked_domains: 17,
  locked_architectural_decisions: 40,
  compiler_passes: 9,
});
