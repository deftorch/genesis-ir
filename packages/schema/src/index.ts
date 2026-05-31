import { IRDocument, isNodeAllowedInDomain } from '@genesis/types';
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
 * Validate Canvas constraints for digital, print, music domains and context structures.
 * @stability BETA
 */
export function validateCanvas(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const canvas = doc.canvas;
  const domain = doc.meta?.domain;

  if (!canvas) {
    return {
      valid: false,
      errors: [{ path: 'canvas', message: 'Canvas is required', keyword: 'required' }],
    };
  }

  // Width and height validation for standard canvas
  if ('width' in canvas) {
    if (canvas.width <= 0) {
      errors.push({
        path: 'canvas.width',
        message: 'Canvas width must be greater than 0',
        keyword: 'min-width',
      });
    }
  }
  if ('height' in canvas) {
    if (canvas.height <= 0) {
      errors.push({
        path: 'canvas.height',
        message: 'Canvas height must be greater than 0',
        keyword: 'min-height',
      });
    }
  }

  // Print domain requires dpi
  if (domain === 'print') {
    if (!('dpi' in canvas) || typeof canvas.dpi !== 'number' || canvas.dpi <= 0) {
      errors.push({
        path: 'canvas.dpi',
        message: 'Print domain documents require a positive dpi field on the canvas',
        keyword: 'required-dpi',
      });
    }
  }

  // Music production domain requires sample_rate
  if (domain === 'music_production') {
    if (!('sample_rate' in canvas) || typeof canvas.sample_rate !== 'number' || canvas.sample_rate <= 0) {
      errors.push({
        path: 'canvas.sample_rate',
        message: 'Music production domain documents require a positive sample_rate field on the canvas',
        keyword: 'required-sample_rate',
      });
    }
  }

  // Canvas Mode Context Validation
  if (canvas.context) {
    const ctx = canvas.context;
    if (typeof ctx !== 'object') {
      errors.push({
        path: 'canvas.context',
        message: 'Canvas context must be an object',
        keyword: 'type',
      });
    } else {
      const type = ctx.type;
      const validTypes = ['pixel', 'multipage', 'music', 'font', 'diagram', '3d', 'mockup'];
      if (!validTypes.includes(type)) {
        errors.push({
          path: 'canvas.context.type',
          message: `Invalid canvas context type: ${type}`,
          keyword: 'enum',
        });
      } else {
        if (type === 'pixel') {
          if (typeof ctx.pixel_width !== 'number' || ctx.pixel_width < 8 || ctx.pixel_width > 512) {
            errors.push({
              path: 'canvas.context.pixel_width',
              message: 'pixel_width must be between 8 and 512 for pixel canvas context',
              keyword: 'range',
            });
          }
        } else if (type === 'music') {
          if (typeof ctx.bpm !== 'number' || ctx.bpm < 20 || ctx.bpm > 300) {
            errors.push({
              path: 'canvas.context.bpm',
              message: 'bpm must be between 20 and 300 for music canvas context',
              keyword: 'range',
            });
          }
        } else if (type === 'font') {
          if (ctx.em !== 1000 && ctx.em !== 2048) {
            errors.push({
              path: 'canvas.context.em',
              message: 'em font unit must be exactly 1000 or 2048',
              keyword: 'enum',
            });
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Node registry constraints, geometries, transforms, and content fields.
 * @stability BETA
 */
export function validateNodes(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const domain = doc.meta?.domain;
  const nodes = doc.objects;

  if (!nodes || !Array.isArray(nodes)) return { valid: true, errors: [] };

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const basePath = `objects[${i}]`;

    // 1. Tipe node diperbolehkan di domain
    if (domain && node.type) {
      if (!isNodeAllowedInDomain(node.type, domain)) {
        errors.push({
          path: `${basePath}.type`,
          message: `Node type "${node.type}" is not allowed in domain "${domain}"`,
          keyword: 'node-domain-mismatch',
        });
      }
    }

    // 2. IRGeometry validation
    if (node.geometry) {
      const geo = node.geometry;
      if (typeof geo.width === 'number' && geo.width < 0) {
        errors.push({
          path: `${basePath}.geometry.width`,
          message: 'Geometry width cannot be negative',
          keyword: 'geometry-width-negative',
        });
      }
      if (typeof geo.height === 'number' && geo.height < 0) {
        errors.push({
          path: `${basePath}.geometry.height`,
          message: 'Geometry height cannot be negative',
          keyword: 'geometry-height-negative',
        });
      }
      if (typeof geo.rotation === 'number') {
        if (geo.rotation < 0 || geo.rotation > 360) {
          errors.push({
            path: `${basePath}.geometry.rotation`,
            message: 'Geometry rotation must be between 0 and 360 degrees',
            keyword: 'geometry-rotation-out-of-bounds',
          });
        }
      }
    }

    // 3. Node content fields validation
    if (node.content) {
      const content = node.content;
      const kind = content.kind;

      if (kind === 'text') {
        if (content.raw === undefined || content.raw === null || typeof content.raw !== 'string') {
          errors.push({
            path: `${basePath}.content.raw`,
            message: 'Text content raw field is required and must be a string',
            keyword: 'required-raw',
          });
        }
      } else if (kind === 'image') {
        if (content.asset_id === undefined || content.asset_id === null) {
          errors.push({
            path: `${basePath}.content.asset_id`,
            message: 'Image content asset_id field is required',
            keyword: 'required-asset_id',
          });
        }
        if (content.fit === undefined || content.fit === null) {
          errors.push({
            path: `${basePath}.content.fit`,
            message: 'Image content fit field is required',
            keyword: 'required-fit',
          });
        }
      } else if (kind === 'video_clip') {
        if (typeof content.in_point_ms === 'number' && typeof content.out_point_ms === 'number') {
          if (content.in_point_ms > content.out_point_ms) {
            errors.push({
              path: `${basePath}.content.in_point_ms`,
              message: 'Video in_point_ms cannot be greater than out_point_ms',
              keyword: 'video-timeline-invalid',
            });
          }
        }
      } else if (kind === 'shape') {
        if (content.shape_type === 'polygon') {
          if (typeof content.sides !== 'number' || content.sides < 3) {
            errors.push({
              path: `${basePath}.content.sides`,
              message: 'Polygon shape must have at least 3 sides',
              keyword: 'shape-sides-range',
            });
          }
        }
      } else if (kind === 'svg_path') {
        if (content.d === undefined || content.d === null || content.d === '') {
          errors.push({
            path: `${basePath}.content.d`,
            message: 'SVG path d field cannot be empty',
            keyword: 'required-d',
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate HIR Document
 * @stability BETA
 */
export function validateHIR(doc: unknown): ValidationResult {
  const schemaResult = validate(doc);
  const errors: ValidationError[] = (validate.errors || []).map(err => ({
    path: err.instancePath || '',
    message: err.message || 'unknown validation error',
    keyword: err.keyword,
  }));

  if (!schemaResult) {
    return {
      valid: false,
      errors,
    };
  }

  // Custom canvas validation
  const canvasResult = validateCanvas(doc);
  if (!canvasResult.valid) {
    errors.push(...canvasResult.errors);
  }

  // Custom nodes validation
  const nodesResult = validateNodes(doc);
  if (!nodesResult.valid) {
    errors.push(...nodesResult.errors);
  }

  // Tier limits validation
  const tierResult = validateTierLimits(doc as any);
  if (!tierResult.valid) {
    errors.push(...tierResult.errors);
  }

  return {
    valid: errors.length === 0,
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

/**
 * Validate IRAssetRef reference & metadata
 * @stability BETA
 */
export function validateAsset(asset: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!asset) {
    return {
      valid: false,
      errors: [{ path: '', message: 'Asset is null or undefined', keyword: 'required' }],
    };
  }

  if (!asset.asset_id) {
    errors.push({ path: 'asset_id', message: 'Asset asset_id is required', keyword: 'required' });
  }

  if (!asset.uri || typeof asset.uri !== 'string' || !asset.uri.startsWith('asset://')) {
    errors.push({
      path: 'uri',
      message: 'Asset uri is required and must start with "asset://"',
      keyword: 'invalid-uri-scheme',
    });
  }

  if (!asset.checksum || typeof asset.checksum !== 'string' || asset.checksum.length !== 64) {
    errors.push({
      path: 'checksum',
      message: 'Asset checksum is required and must be a valid SHA-256 hex string',
      keyword: 'invalid-checksum',
    });
  }

  if (!asset.type) {
    errors.push({ path: 'type', message: 'Asset type is required', keyword: 'required' });
  } else {
    const meta = asset.metadata || {};
    if (asset.type === 'image') {
      if (!meta.dimensions || typeof meta.dimensions.width !== 'number' || typeof meta.dimensions.height !== 'number') {
        errors.push({
          path: 'metadata.dimensions',
          message: 'Image asset must specify dimensions in metadata',
          keyword: 'required-dimensions',
        });
      }
    } else if (asset.type === 'audio') {
      if (typeof meta.duration_ms !== 'number') {
        errors.push({
          path: 'metadata.duration_ms',
          message: 'Audio asset must specify duration_ms in metadata',
          keyword: 'required-duration',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Run Pass 3: Semantic Validation Engine
 * @stability BETA
 */
export function runPass3(doc: any): SemanticValidationResult {
  const errors: ValidationError[] = [];
  const domain = doc.meta?.domain;

  // 1. Validate tree depth against max_tree_depth limit
  const maxTreeDepth = doc.meta?.max_tree_depth || 32;
  const nodes = doc.objects || [];
  const currentDepth = getTreeDepth(nodes);
  if (currentDepth > maxTreeDepth) {
    errors.push({
      path: 'objects',
      message: `Tree depth ${currentDepth} exceeds maximum allowed tree depth of ${maxTreeDepth}`,
      keyword: 'tree-depth-exceeded',
    });
  }

  // 2. Domain coverage matrix validation
  if (domain) {
    // Print physical spec rules
    const physicalRequiredDomains = ['print', 'signage', 'packaging'];
    if (physicalRequiredDomains.includes(domain)) {
      if (!doc.physical) {
        errors.push({
          path: 'physical',
          message: `Physical spec is mandatory for domain "${domain}"`,
          keyword: 'missing-physical-spec',
        });
      }
    }

    // Timeline requirements
    const timelineRequiredDomains = ['video', 'audio', 'motion', 'music_production', 'pixel_art'];
    if (timelineRequiredDomains.includes(domain)) {
      if (!doc.timeline) {
        errors.push({
          path: 'timeline',
          message: `Timeline is mandatory for domain "${domain}"`,
          keyword: 'missing-timeline',
        });
      }
    }

    // Canvas type validation
    const canvas = doc.canvas;
    if (canvas) {
      if (domain === 'audio' || domain === 'music_production') {
        if (canvas.sample_rate === undefined) {
          errors.push({
            path: 'canvas',
            message: `Canvas type must be IRAudioCanvas for domain "${domain}"`,
            keyword: 'invalid-canvas-type',
          });
        }
      } else if (domain === '3d') {
        if (canvas.width !== undefined || canvas.sample_rate !== undefined) {
          errors.push({
            path: 'canvas',
            message: `Canvas type must be IR3DViewport for domain "3d"`,
            keyword: 'invalid-canvas-type',
          });
        }
      } else {
        if (canvas.width === undefined) {
          errors.push({
            path: 'canvas',
            message: `Canvas type must be IRCanvas for domain "${domain}"`,
            keyword: 'invalid-canvas-type',
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface SemanticValidationResult {
  valid: boolean;
  errors: ValidationError[];
}



