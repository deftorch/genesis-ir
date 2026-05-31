import { IRDocument } from './document.js';

/**
 * @stability STABLE
 */
export interface IRMIRDocument extends IRDocument {
  mir_version?: string;
}

export type PlatformTarget = 'web' | 'print' | 'video' | '3d';

/**
 * @stability STABLE
 */
export interface WebLIR {
  type: 'web';
  dom_instructions: Record<string, unknown>;
}

/**
 * @stability STABLE
 */
export interface PrintLIR {
  type: 'print';
  pdf_instructions: Record<string, unknown>;
}

/**
 * @stability STABLE
 */
export interface VideoLIR {
  type: 'video';
  render_tracks: Record<string, unknown>;
}

/**
 * @stability STABLE
 */
export interface IRLIRDocument {
  target: PlatformTarget;
  lir: WebLIR | PrintLIR | VideoLIR;
}
