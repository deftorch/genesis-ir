import { IRDocument } from './document.js';

/**
 * @stability STABLE
 */
export interface IRMIRDocument extends IRDocument {
  mir_version?: string;
}

export type PlatformTarget = 'web' | 'print' | 'video' | '3d';

export interface AudioGraphInstruction {
  nodeId: string;
  type: 'GainNode' | 'OscillatorNode' | 'BiquadFilterNode'
      | 'DynamicsCompressorNode' | 'DelayNode';
  params: Record<string, number | string>;
  connections: string[];   // nodeId targets
  schedule?: { startMs: number; stopMs: number };
}

/**
 * @stability STABLE
 */
export interface WebLIR {
  type: 'web';
  dom_instructions:
    | { format: 'svg'; svg: string }
    | { format: 'canvas2d'; instructions: any[] }
    | { format: 'webaudio'; graph: AudioGraphInstruction[] }
    | Record<string, unknown>;
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
