/**
 * @stability STABLE
 */
export type IRDomain =
  | 'visual'
  | 'image_edit'
  | 'video'
  | 'audio'
  | 'motion'
  | 'print'
  | 'signage'
  | 'packaging'
  | 'data_viz'
  | 'interactive'
  | '3d'
  | 'document'
  | 'music_production'
  | 'pixel_art'
  | 'diagram'
  | 'mockup'
  | 'font_design';

/**
 * Locked 17 official domains (Decision #09)
 * @stability STABLE
 */
export const ALL_IR_DOMAINS = Object.freeze([
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
] as const);

/**
 * Validate if a given value is a valid IRDomain
 * @stability STABLE
 */
export function isValidIRDomain(value: string): value is IRDomain {
  return ALL_IR_DOMAINS.includes(value as IRDomain);
}

/**
 * @stability STABLE
 */
export type IRMode = 'canvas_editor' | 'video_editor' | 'audio_editor' | 'image_editor';

/**
 * @stability STABLE
 */
export interface IRModeContext {
  primary_domain: IRDomain;
  secondary_domains: IRDomain[];
  timeline_required: boolean;
  canvas_types: string[];
}

/**
 * Compatibility mode and domain mapping (Decision #32)
 */
export const IR_MODE_DOMAIN_MAP: Record<IRMode, IRModeContext> = Object.freeze({
  canvas_editor: {
    primary_domain: 'visual',
    secondary_domains: ['print', 'signage', 'packaging', 'data_viz', 'diagram', 'mockup'],
    timeline_required: false,
    canvas_types: ['standard'],
  },
  video_editor: {
    primary_domain: 'video',
    secondary_domains: ['motion', 'audio'],
    timeline_required: true,
    canvas_types: ['video'],
  },
  audio_editor: {
    primary_domain: 'audio',
    secondary_domains: ['music_production'],
    timeline_required: true,
    canvas_types: ['audio'],
  },
  image_editor: {
    primary_domain: 'image_edit',
    secondary_domains: ['pixel_art'],
    timeline_required: false,
    canvas_types: ['pixel'],
  },
});

/**
 * Get context for a given IRMode
 * @stability STABLE
 */
export function getModeContext(mode: IRMode): IRModeContext | undefined {
  return IR_MODE_DOMAIN_MAP[mode];
}

