import { IRDomain } from './domains.js';

/**
 * @stability STABLE
 */
export type IRDocumentLifecycleStatus =
  | 'draft'
  | 'staging'
  | 'production'
  | 'archived'
  | 'review'
  | 'deprecated';

/**
 * @stability STABLE
 */
export interface IRProductionGate {
  approved_by: string[];
  approval_timestamp: string;
  checks_passed: string[];
}

/**
 * @stability STABLE
 */
export interface IRDocumentMetadata {
  domain: IRDomain;
  active_domains: IRDomain[];
  schema_version: '1.0';
  tier: 'nano' | 'core' | 'full';
  max_tree_depth: number;
  created_at: string;
  updated_at: string;
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
  nodes: Record<string, unknown>; // Will reference IRNode
}
