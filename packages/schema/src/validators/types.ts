/**
 * Shared validation types and helper utilities for the schema package.
 * @stability BETA
 * @module @genesis/schema/validators/types
 */
import { IRDocument } from '@genesis/types';

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  severity?: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

export interface SemanticValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface TierConstraint {
  maxNodes: number;
  maxTreeDepth: number;
  allowExternalAssets: boolean;
  allowPlugins: boolean;
}

export const TIER_CONSTRAINTS: Readonly<Record<'nano' | 'core' | 'full', TierConstraint>> = Object.freeze({
  nano: Object.freeze({ maxNodes: 100, maxTreeDepth: 8, allowExternalAssets: false, allowPlugins: false }),
  core: Object.freeze({ maxNodes: 1000, maxTreeDepth: 32, allowExternalAssets: true, allowPlugins: true }),
  full: Object.freeze({ maxNodes: 100000, maxTreeDepth: 64, allowExternalAssets: true, allowPlugins: true }),
});

// ─── Shared Helper Functions ─────────────────────────────────

export function getTreeDepth(nodes: any[]): number {
  if (!nodes || nodes.length === 0) return 0;

  const nodeMap = new Map<string, any>();
  for (const n of nodes) {
    if (n && n.id) nodeMap.set(n.id, n);
  }

  const roots = nodes.filter(n => !n.parent_id || !nodeMap.has(n.parent_id));
  if (roots.length === 0 && nodes.length > 0) roots.push(...nodes);

  let maxDepth = 0;
  const visited = new Set<string>();

  function dfs(nodeId: string, depth: number): number {
    if (visited.has(nodeId)) return depth;
    visited.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node || !node.children || node.children.length === 0) {
      visited.delete(nodeId);
      return depth;
    }
    let localMax = depth;
    for (const childId of node.children) {
      localMax = Math.max(localMax, dfs(childId, depth + 1));
    }
    visited.delete(nodeId);
    return localMax;
  }

  for (const r of roots) {
    maxDepth = Math.max(maxDepth, dfs(r.id, 1));
  }
  return maxDepth;
}

export function hasExternalAssets(obj: any): boolean {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === 'string') {
    return obj.startsWith('asset://') || obj.startsWith('http://') || obj.startsWith('https://');
  }
  if (Array.isArray(obj)) return obj.some(item => hasExternalAssets(item));
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (hasExternalAssets(obj[key])) return true;
    }
  }
  return false;
}

export function hasPlugins(doc: any): boolean {
  if (doc.plugin_registry_snapshot && Object.keys(doc.plugin_registry_snapshot).length > 0) return true;
  if (doc.plugin_data && Object.keys(doc.plugin_data).length > 0) return true;
  if (doc.meta?.active_plugins && doc.meta.active_plugins.length > 0) return true;
  if (doc.canvas?.plugin_namespace) return true;
  return false;
}
