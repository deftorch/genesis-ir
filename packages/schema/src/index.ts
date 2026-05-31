import { IRDocument, isNodeAllowedInDomain, validateSecretRef } from '@genesis/types';
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
    timeline: {
      type: 'object',
      additionalProperties: true,
    },
    physical: {
      type: 'object',
      additionalProperties: true,
    },
    bindings: {
      type: 'object',
      additionalProperties: true,
    },
    interaction_model: {
      type: 'object',
      additionalProperties: true,
    },
    print_spec: {
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
  severity?: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
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

  // Music production/Audio domain and canvas_type === 'audio' validation
  const activeDomains = doc.meta?.active_domains || [];
  const isAudio = canvas.canvas_type === 'audio' || domain === 'music_production' || domain === 'audio';

  if (isAudio) {
    if (!('sample_rate' in canvas) || typeof canvas.sample_rate !== 'number') {
      errors.push({
        path: 'canvas.sample_rate',
        message: 'Audio canvas requires a numerical sample_rate',
        keyword: 'required-sample_rate',
      });
    } else {
      const allowedRates = [44100, 48000, 96000];
      if (!allowedRates.includes(canvas.sample_rate)) {
        errors.push({
          path: 'canvas.sample_rate',
          message: 'Audio canvas sample_rate must be 44100, 48000, or 96000 Hz',
          keyword: 'invalid-sample-rate',
        });
      }
    }

    if (domain === 'music_production' || activeDomains.includes('music_production')) {
      if (!('bit_depth' in canvas) || canvas.bit_depth === undefined) {
        errors.push({
          path: 'canvas.bit_depth',
          message: 'Music production domain documents require a bit_depth field on the canvas',
          keyword: 'required-bit-depth',
        });
      } else {
        const allowedDepths = [16, 24, 32];
        if (!allowedDepths.includes(canvas.bit_depth)) {
          errors.push({
            path: 'canvas.bit_depth',
            message: 'Music production domain bit_depth must be 16, 24, or 32',
            keyword: 'invalid-bit-depth',
          });
        }
      }
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

  // Custom timeline validation
  const timelineResult = validateTimeline(doc);
  if (!timelineResult.valid) {
    errors.push(...timelineResult.errors);
  }

  // Custom data binding validation
  const dataBindingResult = validateDataBinding(doc);
  if (!dataBindingResult.valid) {
    errors.push(...dataBindingResult.errors);
  }

  // Custom interaction model validation
  const interactionResult = validateInteractionModel(doc);
  if (!interactionResult.valid) {
    errors.push(...interactionResult.errors);
  }

  // Custom 3D Viewport validation
  const threedResult = validate3DViewportAndNodes(doc);
  if (!threedResult.valid) {
    errors.push(...threedResult.errors);
  }

  const warnings: ValidationError[] = [];

  const physicalResult = validatePhysicalAndPrint(doc);
  if (!physicalResult.valid) {
    errors.push(...physicalResult.errors);
  }
  if (physicalResult.warnings) {
    warnings.push(...physicalResult.warnings);
  }

  const compatResult = validateDomainCompatibilities(doc);
  if (!compatResult.valid) {
    errors.push(...compatResult.errors);
  }
  if (compatResult.warnings) {
    warnings.push(...compatResult.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
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

/**
 * Validate temporal timeline and keyframe rules.
 * @stability BETA
 */
export function validateTimeline(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const timeline = doc.timeline;

  if (timeline) {
    if (typeof timeline.duration_ms !== 'number' || timeline.duration_ms <= 0) {
      errors.push({
        path: 'timeline.duration_ms',
        message: 'Timeline duration_ms is required and must be greater than 0',
        keyword: 'invalid-duration',
      });
    }

    if (timeline.tracks) {
      if (!Array.isArray(timeline.tracks)) {
        errors.push({
          path: 'timeline.tracks',
          message: 'Timeline tracks must be an array',
          keyword: 'invalid-tracks',
        });
      } else {
        timeline.tracks.forEach((track: any, idx: number) => {
          if (!track.clips || !Array.isArray(track.clips)) {
            errors.push({
              path: `timeline.tracks[${idx}].clips`,
              message: 'Track clips must be an array',
              keyword: 'invalid-clips',
            });
            return;
          }

          // Check overlap if allow_overlap is false
          if (track.allow_overlap === false) {
            const clips = track.clips;
            for (let i = 0; i < clips.length; i++) {
              for (let j = i + 1; j < clips.length; j++) {
                const c1 = clips[i];
                const c2 = clips[j];
                const overlap = c1.start_ms < c2.start_ms + c2.duration_ms && c2.start_ms < c1.start_ms + c1.duration_ms;
                if (overlap) {
                  errors.push({
                    path: `timeline.tracks[${idx}].clips`,
                    message: `Clips "${c1.id}" and "${c2.id}" overlap on track "${track.id}" where overlap is disallowed`,
                    keyword: 'clip-overlap',
                  });
                }
              }
            }
          }
        });
      }
    }

    // Validate keyframes type mismatches
    if (timeline.keyframes) {
      for (const [nodeId, keyframes] of Object.entries(timeline.keyframes)) {
        if (!Array.isArray(keyframes)) continue;
        keyframes.forEach((kf: any, idx: number) => {
          const prop = kf.property;
          const val = kf.value;
          if (prop === 'geometry.x' || prop === 'geometry.y' || prop === 'geometry.width' || prop === 'geometry.height' || prop === 'style.opacity') {
            if (typeof val !== 'number') {
              errors.push({
                path: `timeline.keyframes.${nodeId}[${idx}].value`,
                message: `Type mismatch: property "${prop}" requires a number, received ${typeof val}`,
                keyword: 'type-mismatch',
              });
            }
          }
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
 * Validate data binding rules.
 * @stability BETA
 */
export function validateDataBinding(doc: any): ValidationResult {
  const errors: ValidationError[] = [];

  const bindingsList: { path: string; binding: any }[] = [];
  if (doc.bindings) {
    if (typeof doc.bindings === 'object') {
      for (const [key, b] of Object.entries(doc.bindings)) {
        bindingsList.push({ path: `bindings.${key}`, binding: b });
      }
    }
  }

  if (doc.objects) {
    doc.objects.forEach((obj: any, idx: number) => {
      if (obj.bindings) {
        for (const [key, b] of Object.entries(obj.bindings)) {
          bindingsList.push({ path: `objects[${idx}].bindings.${key}`, binding: b });
        }
      }
    });
  }

  for (const { path, binding } of bindingsList) {
    if (!binding) continue;

    if (binding.source === 'api_rest' && !binding.endpoint) {
      errors.push({
        path: `${path}.endpoint`,
        message: 'Endpoint is required for api_rest source',
        keyword: 'required-endpoint',
      });
    }

    if (binding.auth && binding.auth.token) {
      const token = binding.auth.token;
      if (!validateSecretRef(token)) {
        errors.push({
          path: `${path}.auth.token`,
          message: 'Token must use env:, vault:, or secret: prefix',
          keyword: 'secret-ref-required',
        });
      }
    }

    if (binding.transforms) {
      if (Array.isArray(binding.transforms)) {
        binding.transforms.forEach((tr: any, tIdx: number) => {
          if (tr.op === 'filter' && (!tr.params || typeof tr.params !== 'object' || Object.keys(tr.params).length === 0)) {
            errors.push({
              path: `${path}.transforms[${tIdx}].params`,
              message: 'Params are required for filter transform operation',
              keyword: 'required-params',
            });
          }
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
 * Validate interaction model actions.
 * @stability BETA
 */
export function validateInteractionModel(doc: any): ValidationResult {
  const errors: ValidationError[] = [];

  const models: { path: string; model: any }[] = [];
  if (doc.interaction_model) {
    models.push({ path: 'interaction_model', model: doc.interaction_model });
  }
  if (doc.objects) {
    doc.objects.forEach((obj: any, idx: number) => {
      if (obj.interaction_model) {
        models.push({ path: `objects[${idx}].interaction_model`, model: obj.interaction_model });
      }
    });
  }

  for (const { path, model } of models) {
    if (!model || !model.states) continue;

    for (const [stateId, state] of Object.entries(model.states)) {
      const transitions = (state as any).transitions;
      if (transitions && Array.isArray(transitions)) {
        transitions.forEach((tr: any, trIdx: number) => {
          if (tr.actions && Array.isArray(tr.actions)) {
            tr.actions.forEach((act: any, actIdx: number) => {
              const actPath = `${path}.states.${stateId}.transitions[${trIdx}].actions[${actIdx}]`;
              if (act.type === 'navigate') {
                if (!act.target_id) {
                  errors.push({
                    path: `${actPath}.target_id`,
                    message: 'target_id is required for navigate action',
                    keyword: 'required-target',
                  });
                }
              } else if (act.type === 'toggle_state') {
                if (!act.target_id) {
                  errors.push({
                    path: `${actPath}.target_id`,
                    message: 'target_id is required for toggle_state action',
                    keyword: 'required-target',
                  });
                }
              } else if (act.type === 'play_animation') {
                if (!act.animation_id) {
                  errors.push({
                    path: `${actPath}.animation_id`,
                    message: 'animation_id is required for play_animation action',
                    keyword: 'required-animation',
                  });
                }
              } else if (act.type === 'open_modal') {
                if (!act.modal_id) {
                  errors.push({
                    path: `${actPath}.modal_id`,
                    message: 'modal_id is required for open_modal action',
                    keyword: 'required-modal',
                  });
                }
              } else if (act.type === 'scroll_to') {
                if (!act.target_id) {
                  errors.push({
                    path: `${actPath}.target_id`,
                    message: 'target_id is required for scroll_to action',
                    keyword: 'required-target',
                  });
                }
              }
            });
          }
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
 * Validate Physical spec, Print spec and Packaging dieline constraints.
 * @stability BETA
 */
export function validatePhysicalAndPrint(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  const domain = doc.meta?.domain;
  const activeDomains = doc.meta?.active_domains || [];

  const isPrint = domain === 'print' || activeDomains.includes('print');
  const isPackaging = domain === 'packaging' || activeDomains.includes('packaging');
  const isSignage = domain === 'signage' || activeDomains.includes('signage');

  // 1. DPI Sync Policy check
  if (isPrint && doc.canvas && doc.canvas.dpi_sync_policy === 'strict') {
    const canvasDpi = doc.canvas.dpi;
    const physicalDpi = doc.physical?.dpi;
    if (typeof canvasDpi === 'number' && typeof physicalDpi === 'number' && canvasDpi !== physicalDpi) {
      errors.push({
        path: 'canvas.dpi',
        message: `DPI mismatch: Canvas DPI (${canvasDpi}) does not match physical DPI (${physicalDpi})`,
        keyword: 'dpi-mismatch',
      });
    }
  }

  // 2. Packaging domain must contain at least one 'print_dieline' node
  if (isPackaging) {
    const objects = doc.objects || [];
    const hasDieline = objects.some((obj: any) => obj.type === 'print_dieline');
    if (!hasDieline) {
      errors.push({
        path: 'objects',
        message: "Packaging domain documents require at least one 'print_dieline' node",
        keyword: 'missing-dieline',
      });
    }
  }

  // 3. Signage safe zone validation
  if (isSignage && doc.physical && typeof doc.physical.safe_zone_mm === 'number') {
    const safeZone = doc.physical.safe_zone_mm;
    const width = doc.physical.width_mm || doc.canvas?.width || 0;
    const height = doc.physical.height_mm || doc.canvas?.height || 0;

    const xMin = safeZone;
    const xMax = width - safeZone;
    const yMin = safeZone;
    const yMax = height - safeZone;

    const objects = doc.objects || [];
    objects.forEach((obj: any, idx: number) => {
      const x = typeof obj.x === 'number' ? obj.x : 0;
      const y = typeof obj.y === 'number' ? obj.y : 0;
      const w = typeof obj.width === 'number' ? obj.width : 0;
      const h = typeof obj.height === 'number' ? obj.height : 0;

      if (x < xMin || (x + w) > xMax || y < yMin || (y + h) > yMax) {
        warnings.push({
          path: `objects[${idx}]`,
          message: `Content area of node ${obj.id || idx} exceeds physical safe zone (${safeZone}mm)`,
          keyword: 'exceeds-safe-zone',
          severity: 'warning',
        });
      }
    });
  }

  // 4. Sub-pass 3e: validation of print_bleed_guide and print_safe_guide nodes
  const objects = doc.objects || [];
  objects.forEach((obj: any, idx: number) => {
    if (obj.type === 'print_bleed_guide') {
      if (typeof obj.width !== 'number' || typeof obj.height !== 'number') {
        errors.push({
          path: `objects[${idx}]`,
          message: "print_bleed_guide node must have numerical width and height",
          keyword: 'invalid-bleed-guide',
        });
      }
    }
    if (obj.type === 'print_safe_guide') {
      if (typeof obj.width !== 'number' || typeof obj.height !== 'number') {
        errors.push({
          path: `objects[${idx}]`,
          message: "print_safe_guide node must have numerical width and height",
          keyword: 'invalid-safe-guide',
        });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate domain compatibilities.
 * @stability BETA
 */
export function validateDomainCompatibilities(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const domain = doc.meta?.domain;
  const activeDomains = doc.meta?.active_domains || [];

  // Visual domain cannot have 3D domain active without 3D canvas (IR3DViewport)
  const has3D = domain === '3d' || activeDomains.includes('3d');
  const hasVisual = domain === 'visual' || activeDomains.includes('visual');
  if (hasVisual && has3D) {
    const canvas = doc.canvas;
    const is3DCanvas = canvas && ('camera_3d' in canvas || (canvas.context && canvas.context.type === '3d'));
    if (!is3DCanvas) {
      errors.push({
        path: 'canvas',
        message: 'Visual domain cannot contain 3D domain without IR3DViewport canvas',
        keyword: 'invalid-3d-canvas',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate 3D viewports, cameras, and mesh definitions.
 * @stability BETA
 */
export function validate3DViewportAndNodes(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const domain = doc.meta?.domain;
  const activeDomains = doc.meta?.active_domains || [];

  const is3D = domain === '3d' || activeDomains.includes('3d') || (doc.canvas && doc.canvas.canvas_type === '3d');

  if (is3D) {
    const objects = doc.objects || [];
    // 1. IR3DViewport tanpa camera_3d node harus gagal Pass 3
    const hasCamera3D = objects.some((obj: any) => obj.type === 'camera_3d');
    if (!hasCamera3D) {
      errors.push({
        path: 'objects',
        message: 'IR3DViewport requires at least one camera_3d node',
        keyword: 'missing-camera_3d',
      });
    }

    // 2. mesh_3d tanpa material_id yang valid harus gagal Pass 3
    objects.forEach((obj: any, idx: number) => {
      if (obj.type === 'mesh_3d') {
        const matId = obj.material_id;
        if (!matId) {
          errors.push({
            path: `objects[${idx}].material_id`,
            message: `mesh_3d node '${obj.id || idx}' is missing material_id`,
            keyword: 'missing-material-id',
          });
        } else {
          const referencedNode = objects.find((o: any) => o.id === matId);
          if (!referencedNode || referencedNode.type !== 'material_3d') {
            errors.push({
              path: `objects[${idx}].material_id`,
              message: `mesh_3d node '${obj.id || idx}' references an invalid material_id: '${matId}'`,
              keyword: 'invalid-material-id',
            });
          }
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}



