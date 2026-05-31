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
  target: 'web' | 'print' | 'video' | '3d';
  lir: WebLIR | PrintLIR | VideoLIR;
}
