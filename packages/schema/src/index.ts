import { IRDocument } from '@genesis/types';
import { Ajv, Schema } from 'ajv';

/**
 * AJV Validator instance with strict rules
 * @stability BETA
 */
export const ajv = new Ajv({ strict: true, coerceTypes: false });

const DOMAINS = [
  'visual',
  'image_edit',
  'video',
  'audio',
  'motion',
  'print',
  'signage',
  'packaging',
  'data_viz',
  'interactive',
  '3d',
  'document',
  'music_production',
  'pixel_art',
  'diagram',
  'mockup',
  'font_design',
];

const irDocumentSchema: Schema = {
  type: 'object',
  required: ['ir_id', 'meta', 'canvas', 'style_context', 'objects', 'constraints', 'nodes'],
  properties: {
    ir_id: {
      type: 'string',
      pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$',
    },
    meta: {
      type: 'object',
      required: [
        'domain',
        'active_domains',
        'schema_version',
        'ir_version',
        'created_at',
        'created_by',
        'session_id',
        'tier',
        'lifecycle_status',
        'max_tree_depth',
      ],
      properties: {
        domain: { type: 'string', enum: DOMAINS },
        active_domains: {
          type: 'array',
          items: { type: 'string', enum: DOMAINS },
        },
        schema_version: { type: 'string', const: '1.0' },
        ir_version: { type: 'string' },
        created_at: { type: 'string' },
        created_by: { type: 'string', enum: ['human', 'ai_agent', 'fork', 'import'] },
        session_id: { type: 'string' },
        tier: { type: 'string', enum: ['nano', 'core', 'full'] },
        lifecycle_status: {
          type: 'string',
          enum: ['draft', 'experiment', 'staging', 'production', 'deprecated', 'archived'],
        },
        max_tree_depth: { type: 'integer', maximum: 64 },
        updated_at: { type: 'string' },
      },
      additionalProperties: true,
    },
    canvas: {
      type: 'object',
      additionalProperties: true,
    },
    style_context: {
      type: 'object',
      additionalProperties: true,
    },
    objects: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
    },
    constraints: {
      type: 'object',
      additionalProperties: true,
    },
    nodes: {
      type: 'object',
      additionalProperties: true,
    },
  },
  additionalProperties: false,
};

const validate = ajv.compile(irDocumentSchema);

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate HIR Document
 * @stability BETA
 */
export function validateHIR(doc: unknown): ValidationResult {
  const valid = validate(doc);
  const errors: ValidationError[] = (validate.errors || []).map(err => ({
    path: err.instancePath || '',
    message: err.message || 'unknown validation error',
    keyword: err.keyword,
  }));
  return {
    valid: !!valid,
    errors,
  };
}


export interface TierConstraint {
  maxNodes: number;
  maxTreeDepth: number;
  allowExternalAssets: boolean;
  allowPlugins: boolean;
}

export const TIER_CONSTRAINTS: Readonly<Record<'nano' | 'core' | 'full', TierConstraint>> = Object.freeze({
  nano: Object.freeze({
    maxNodes: 100,
    maxTreeDepth: 8,
    allowExternalAssets: false,
    allowPlugins: false,
  }),
  core: Object.freeze({
    maxNodes: 1000,
    maxTreeDepth: 32,
    allowExternalAssets: true,
    allowPlugins: true,
  }),
  full: Object.freeze({
    maxNodes: 100000,
    maxTreeDepth: 64,
    allowExternalAssets: true,
    allowPlugins: true,
  }),
});

function getTreeDepth(nodes: any[]): number {
  if (!nodes || nodes.length === 0) return 0;

  const nodeMap = new Map<string, any>();
  for (const n of nodes) {
    if (n && n.id) {
      nodeMap.set(n.id, n);
    }
  }

  const roots = nodes.filter(n => !n.parent_id || !nodeMap.has(n.parent_id));
  if (roots.length === 0 && nodes.length > 0) {
    roots.push(...nodes);
  }

  let maxDepth = 0;
  const visited = new Set<string>();

  function dfs(nodeId: string, depth: number): number {
    if (visited.has(nodeId)) {
      return depth;
    }
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

function hasExternalAssets(obj: any): boolean {
  if (obj === null || obj === undefined) return false;
  if (typeof obj === 'string') {
    return obj.startsWith('asset://') || obj.startsWith('http://') || obj.startsWith('https://');
  }
  if (Array.isArray(obj)) {
    return obj.some(item => hasExternalAssets(item));
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (hasExternalAssets(obj[key])) {
        return true;
      }
    }
  }
  return false;
}

function hasPlugins(doc: any): boolean {
  if (doc.plugin_registry_snapshot && Object.keys(doc.plugin_registry_snapshot).length > 0) {
    return true;
  }
  if (doc.plugin_data && Object.keys(doc.plugin_data).length > 0) {
    return true;
  }
  if (doc.meta?.active_plugins && doc.meta.active_plugins.length > 0) {
    return true;
  }
  if (doc.canvas?.plugin_namespace) {
    return true;
  }
  return false;
}

export function validateTierLimits(doc: IRDocument): ValidationResult {
  const errors: ValidationError[] = [];
  const tier = doc.meta?.tier;

  if (tier !== 'nano' && tier !== 'core' && tier !== 'full') {
    return {
      valid: false,
      errors: [{
        path: 'meta.tier',
        message: `Invalid document tier: ${tier}`,
        keyword: 'tier',
      }],
    };
  }

  const constraints = TIER_CONSTRAINTS[tier];
  const nodeCount = doc.objects ? doc.objects.length : 0;
  const depth = doc.objects ? getTreeDepth(doc.objects) : 0;

  if (nodeCount > constraints.maxNodes) {
    errors.push({
      path: 'objects',
      message: `Node count ${nodeCount} exceeds max node limit of ${constraints.maxNodes} for tier ${tier}`,
      keyword: 'node-limit',
    });
  }

  if (depth > constraints.maxTreeDepth) {
    errors.push({
      path: 'objects',
      message: `Tree depth ${depth} exceeds max tree depth of ${constraints.maxTreeDepth} for tier ${tier}`,
      keyword: 'tree-depth-limit',
    });
  }

  if (!constraints.allowExternalAssets && hasExternalAssets(doc.objects)) {
    errors.push({
      path: 'objects',
      message: `Document of tier ${tier} contains external asset references, which are not allowed`,
      keyword: 'external-assets-limit',
    });
  }

  if (!constraints.allowPlugins && hasPlugins(doc)) {
    errors.push({
      path: '',
      message: `Document of tier ${tier} contains plugin references, which are not allowed`,
      keyword: 'plugins-limit',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}



