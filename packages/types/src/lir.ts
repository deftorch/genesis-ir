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
    | { format: 'html_dom'; html: string; scripts: string[] }
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

export interface SpriteManifest {
  meta: { size: { w: number; h: number }; format: 'RGBA8888'; scale: 1 };
  frames: Record<string, {
    frame:      { x: number; y: number; w: number; h: number };
    sourceSize: { w: number; h: number };
    pivot:      { x: number; y: number };
    rotated:    false;
    trimmed:    false;
  }>;
}

/**
 * @stability STABLE
 */
export interface PixelLIR {
  type: 'pixel';
  atlas: string; // base64 PNG
  manifest: SpriteManifest;
}

/**
 * @stability STABLE
 */
export interface IRLIRDocument {
  target: PlatformTarget;
  lir: WebLIR | PrintLIR | VideoLIR | PixelLIR;
}
