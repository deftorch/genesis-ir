import { IRDomain } from './domains.js';
import { IRStyleContext } from './style.js';
import { IRNode } from './nodes.js';
import { IRConstraintSet } from './constraints.js';

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
 * @stability STABLE
 */
export interface IRCanvas {
  width: number;
  height: number;
  dpi?: number;
  color_space: 'sRGB' | 'CMYK';
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

