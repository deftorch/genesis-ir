import { Ajv, Schema } from 'ajv';

/**
 * AJV Validator instance with strict rules
 * @stability BETA
 */
export const ajv = new Ajv({ strict: true, coerceTypes: false });

const DOMAINS = [
  'visual', 'image_edit', 'video', 'audio', 'motion',
  'print', 'signage', 'packaging', 'data_viz', 'interactive',
  '3d', 'document', 'music_production', 'pixel_art',
  'diagram', 'mockup', 'font_design',
];

export const irDocumentSchema: Schema = {
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
        'domain', 'active_domains', 'schema_version', 'ir_version',
        'created_at', 'created_by', 'session_id', 'tier',
        'lifecycle_status', 'max_tree_depth',
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
      additionalProperties: false,
    },
    canvas: { 
      type: 'object', 
      properties: {
        canvas_type: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
        dpi: { type: 'number' },
        color_space: { type: 'string', enum: ['sRGB', 'CMYK'] },
        context: { type: 'object' },
        dpi_sync_policy: { type: 'string' },
        sample_rate: { type: 'number' },
        bit_depth: { type: 'number' },
        channel_layout: { type: ['string', 'object'] },
        duration_ms: { type: 'number' },
        export_format: { type: 'string' },
        proxy_mode: { type: 'boolean' },
        loudness_target: { type: 'object' },
        metadata: { type: 'object' },
        coordinate_system: { type: 'string' },
        units: { type: 'string' },
        default_camera: { type: 'object' },
        default_lighting: { type: 'object' },
        render_settings: { type: 'object' },
        background: { type: 'object' },
        camera_3d: { type: 'string' },
        scene_config: { type: 'object' }
      },
      additionalProperties: false 
    },
    style_context: { type: 'object', additionalProperties: true },
    objects: { type: 'array', items: { type: 'object', additionalProperties: true } },
    constraints: { 
      type: 'object', 
      properties: {
        max_nodes: { type: 'number' },
        max_depth: { type: 'number' },
        rules: { type: 'array' }
      },
      additionalProperties: false 
    },
    nodes: { type: 'object', additionalProperties: true },
    timeline: { type: 'object', additionalProperties: true },
    physical: { type: 'object', additionalProperties: true },
    bindings: { type: 'object', additionalProperties: true },
    interaction_model: { type: 'object', additionalProperties: true },
    print_spec: { type: 'object', additionalProperties: true },
    observability: { type: 'object', additionalProperties: true },
    x_debug: { type: 'object', additionalProperties: true },
    music_spec: { type: 'object', additionalProperties: true },
    pixel_spec: { type: 'object', additionalProperties: true },
    font_spec: { type: 'object', additionalProperties: true },
    mockup_spec: { type: 'object', additionalProperties: true },
    i18n_context: { type: 'object', additionalProperties: true },
    asset_registry: { type: 'object', additionalProperties: true },
    ai_lineage: { type: 'object', additionalProperties: true },
  },
  additionalProperties: false,
};

export const ajvValidateDocument = ajv.compile(irDocumentSchema);
