import { IRDomain } from './domains.js';
import { IRStyleContext } from './style.js';
import { IRNode } from './nodes.js';
import { IRConstraintSet } from './constraints.js';
import { IRTimeline } from './timeline.js';
import { IRDataBinding, IRInteractionModel } from './bindings.js';

/**
 * @stability STABLE
 */
export type IRDocumentLifecycleStatus =
  | 'draft'
  | 'experiment'
  | 'staging'
  | 'production'
  | 'deprecated'
  | 'archived';

/**
 * @stability STABLE
 */
export interface IRProductionGate {
  evaluation_pass_rate_threshold: number;
  minimum_test_duration_hours: number;
  required_validators: string[];
  approved_by?: string;
  approved_at?: string;
}

const STATUS_ORDER: IRDocumentLifecycleStatus[] = [
  'draft',
  'experiment',
  'staging',
  'production',
  'deprecated',
  'archived',
];

/**
 * Determine if a transition between document lifecycle statuses is valid (forward-only)
 * @stability STABLE
 */
export function canTransition(
  from: IRDocumentLifecycleStatus,
  to: IRDocumentLifecycleStatus
): boolean {
  const fromIndex = STATUS_ORDER.indexOf(from);
  const toIndex = STATUS_ORDER.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) return false;
  return toIndex > fromIndex;
}


/**
 * @stability STABLE
 */
export interface IRDocumentMetadata {
  domain: IRDomain;
  active_domains: IRDomain[];
  schema_version: '1.0';
  ir_version: string;
  created_at: string;
  created_by: 'human' | 'ai_agent' | 'fork' | 'import';
  session_id: string;
  tier: 'nano' | 'core' | 'full';
  lifecycle_status: IRDocumentLifecycleStatus;
  max_tree_depth: number;
  updated_at?: string;
}

/**
 /**
 * @stability STABLE
 */
export interface IRPixelCanvasContext {
  type: 'pixel';
  pixel_width: number;
  pixel_height: number;
}

/**
 * @stability STABLE
 */
export interface IRMultiPageContext {
  type: 'multipage';
  page_count: number;
  page_size?: string;
  margins?: { top: number; right: number; bottom: number; left: number };
}

/**
 * @stability STABLE
 */
export interface IRMusicCanvasContext {
  type: 'music';
  bpm: number;
  time_signature?: string;
}

/**
 * @stability STABLE
 */
export interface IRFontCanvasContext {
  type: 'font';
  em: 1000 | 2048;
}

/**
 * @stability STABLE
 */
export interface IRDiagramCanvasContext {
  type: 'diagram';
  layout_engine?: 'dot' | 'neato' | 'fdp' | 'circo';
}

/**
 * @stability STABLE
 */
export interface IR3DCanvasContext {
  type: '3d';
  fov?: number;
  near?: number;
  far?: number;
}

/**
 * @stability STABLE
 */
export interface IRMockupCanvasContext {
  type: 'mockup';
  target_device?: string;
}

/**
 * @stability STABLE
 */
export type IRCanvasModeContext =
  | IRPixelCanvasContext
  | IRMultiPageContext
  | IRMusicCanvasContext
  | IRFontCanvasContext
  | IRDiagramCanvasContext
  | IR3DCanvasContext
  | IRMockupCanvasContext;

/**
 * @stability STABLE
 */
export interface IRCanvas {
  width: number;
  height: number;
  dpi?: number;
  color_space: 'sRGB' | 'CMYK';
  context?: IRCanvasModeContext;
}

/**
 * @stability STABLE
 */
export interface IRAudioCanvas {
  sample_rate: number;
  bit_depth: number;
  channels: number;
}

/**
 * @stability STABLE
 */
export interface IR3DViewport {
  camera_3d?: string;
  scene_config?: Record<string, unknown>;
}

/**
 * @stability BETA
 */
export interface IRPhysicalSpec {
  width_mm: number;
  height_mm: number;
  bleed_mm: number;
  safe_zone_mm: number;
  color_profile: "sRGB" | "CMYK" | "PantoneC" | "PantoneU" | "PantoneM" | "P3" | "Rec2020" | string;
  three_d_print?: {
    unit: "mm" | "cm" | "in";
    infill_percent: number;
    layer_height_mm: number;
    support: boolean;
    material: "PLA" | "ABS" | "PETG" | "resin" | "nylon" | string;
    printer_profile?: string;
  };
}

/**
 * @stability STABLE
 */
export interface IRDocument {
  ir_id: string; // UUID v4, immutable
  meta: IRDocumentMetadata;
  canvas: IRCanvas | IRAudioCanvas | IR3DViewport;
  style_context: IRStyleContext;
  objects: IRNode[];
  constraints: IRConstraintSet;
  nodes: Record<string, unknown>; // Will reference IRNode
  physical?: IRPhysicalSpec;
  timeline?: IRTimeline;
  bindings?: Record<string, IRDataBinding>;
  interaction_model?: IRInteractionModel;
}

function uuidv4(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Factory to create a valid IRDocument with immutable UUID v4 ir_id
 * @stability STABLE
 */
export function createIRDocument(opts: {
  domain: IRDomain;
  canvas: IRCanvas | IRAudioCanvas | IR3DViewport;
  tier?: 'nano' | 'core' | 'full';
  lifecycle_status?: IRDocumentLifecycleStatus;
  bindings?: Record<string, IRDataBinding>;
  interaction_model?: IRInteractionModel;
}): IRDocument {
  const doc = {
    meta: {
      domain: opts.domain,
      active_domains: [opts.domain],
      schema_version: '1.0' as const,
      ir_version: '1.0.0',
      created_at: new Date().toISOString(),
      created_by: 'human' as const,
      session_id: 'session-' + uuidv4().substring(0, 8),
      tier: opts.tier ?? 'core',
      lifecycle_status: opts.lifecycle_status ?? 'draft',
      max_tree_depth: 64,
    },
    canvas: opts.canvas,
    style_context: {
      theme_tokens: {},
      brand_profile: {},
      component_styles: {},
    },
    objects: [],
    constraints: {
      max_nodes: opts.tier === 'nano' ? 100 : opts.tier === 'core' ? 1000 : 100000,
      max_depth: opts.tier === 'nano' ? 8 : opts.tier === 'core' ? 32 : 64,
      rules: [],
    },
    nodes: {},
    bindings: opts.bindings,
    interaction_model: opts.interaction_model,
  } as unknown as IRDocument;

  const id = uuidv4();
  Object.defineProperty(doc, 'ir_id', {
    value: id,
    writable: false,
    configurable: false,
    enumerable: true,
  });

  return doc;
}

/**
 * @stability STABLE
 */
export interface CanvasPreset {
  width: number;
  height: number;
  dpi?: number;
  color_space: 'sRGB' | 'CMYK';
  context?: IRCanvasModeContext;
}

/**
 * Built-in standard canvas presets.
 * @stability STABLE
 */
export const CANVAS_PRESETS: Readonly<Record<string, Readonly<CanvasPreset>>> = Object.freeze({
  A4: Object.freeze({
    width: 210,
    height: 297,
    dpi: 300,
    color_space: 'CMYK',
    context: {
      type: 'multipage' as const,
      page_count: 1,
      page_size: 'A4',
    },
  }),
  A3: Object.freeze({
    width: 297,
    height: 420,
    dpi: 300,
    color_space: 'CMYK',
    context: {
      type: 'multipage' as const,
      page_count: 1,
      page_size: 'A3',
    },
  }),
  A5: Object.freeze({
    width: 148,
    height: 210,
    dpi: 300,
    color_space: 'CMYK',
    context: {
      type: 'multipage' as const,
      page_count: 1,
      page_size: 'A5',
    },
  }),
  letter: Object.freeze({
    width: 216,
    height: 279,
    dpi: 300,
    color_space: 'CMYK',
    context: {
      type: 'multipage' as const,
      page_count: 1,
      page_size: 'letter',
    },
  }),
  '1080p': Object.freeze({
    width: 1920,
    height: 1080,
    color_space: 'sRGB',
  }),
  '720p': Object.freeze({
    width: 1280,
    height: 720,
    color_space: 'sRGB',
  }),
  '4k': Object.freeze({
    width: 3840,
    height: 2160,
    color_space: 'sRGB',
  }),
  square_instagram: Object.freeze({
    width: 1080,
    height: 1080,
    color_space: 'sRGB',
  }),
  portrait_instagram: Object.freeze({
    width: 1080,
    height: 1350,
    color_space: 'sRGB',
  }),
  twitter_header: Object.freeze({
    width: 1500,
    height: 500,
    color_space: 'sRGB',
  }),
});

/**
 * Apply a standard canvas preset by preset ID
 * @stability STABLE
 */
export function applyPreset(preset_id: string): Partial<IRCanvas> {
  const preset = CANVAS_PRESETS[preset_id];
  if (!preset) {
    throw new Error(`Unknown canvas preset ID: ${preset_id}`);
  }
  return { ...preset };
}

