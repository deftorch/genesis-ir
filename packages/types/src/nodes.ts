import { IRDomain } from './domains.js';
import { ColorValue } from './style.js';

/**
 * @stability STABLE
 */
export type IRNodeType =
  | 'text'
  | 'image'
  | 'shape'
  | 'path'
  | 'group'
  | 'frame'
  | 'svg_path'
  | 'gradient'
  | 'blur_effect'
  | 'shadow_effect'
  | 'flex_container'
  | 'grid_container'
  | 'masonry_container'
  | 'artboard'
  | 'boolean_shape'
  | 'symbol_instance'
  | 'mesh_gradient'
  | 'chart'
  | 'table'
  | 'data_table'
  | 'gauge'
  | 'map'
  | 'button'
  | 'slider'
  | 'toggle'
  | 'hotspot'
  | 'form_field'
  | 'video_clip'
  | 'audio_clip'
  | 'audio_track'
  | 'animation'
  | 'lottie'
  | 'particle_system'
  | 'shader_effect'
  | 'print_text_frame'
  | 'print_image_frame'
  | 'print_master_ref'
  | 'print_bleed_guide'
  | 'print_safe_guide'
  | 'spot_color_area'
  | 'print_dieline'
  | 'print_fold_line'
  | 'print_cut_line'
  | 'scene_3d'
  | 'mesh_3d'
  | 'light_3d'
  | 'camera_3d'
  | 'bone_3d'
  | 'environment_3d'
  | 'material_3d'
  | 'doc_paragraph'
  | 'doc_heading'
  | 'doc_list'
  | 'doc_list_item'
  | 'doc_callout'
  | 'doc_code_block'
  | 'doc_math_block'
  | 'doc_table'
  | 'doc_toggle'
  | 'doc_divider'
  | 'doc_embed_asset'
  | 'doc_footnote'
  | 'doc_toc'
  | 'music_track'
  | 'music_clip'
  | 'music_note'
  | 'music_automation'
  | 'music_marker'
  | 'music_instrument'
  | 'pixel_layer'
  | 'pixel_frame'
  | 'pixel_cel'
  | 'sprite_tag'
  | 'tileset'
  | 'tilemap_layer'
  | 'tile_ref'
  | 'diagram_node'
  | 'diagram_edge'
  | 'diagram_label'
  | 'diagram_swimlane'
  | 'diagram_group'
  | 'erd_entity'
  | 'erd_relation'
  | 'uml_class'
  | 'uml_lifeline'
  | 'uml_message'
  | 'bpmn_element'
  | 'bpmn_pool'
  | 'bpmn_lane'
  | 'mockup_scene'
  | 'device_frame'
  | 'screen_content'
  | 'mockup_prop'
  | 'mockup_background'
  | 'glyph'
  | 'glyph_component'
  | 'font_guideline'
  | 'kerning_pair'
  | 'kerning_group'
  | 'caption_track'
  | 'qr_code'
  | 'watermark_layer'
  | 'network_graph'
  | 'code_runner_cell'
  | 'math_formula'
  | 'physics_collider'
  | 'logic_trigger';

/**
 * Locked static validation mapping for Phase 3.1
 * @stability STABLE
 */
export const IR_ALLOWED_NODE_TYPES_BY_DOMAIN: Record<IRDomain, ReadonlyArray<IRNodeType>> = {
  visual: [
    'text', 'image', 'shape', 'path', 'group', 'frame', 'svg_path',
    'gradient', 'blur_effect', 'shadow_effect', 'flex_container',
    'grid_container', 'masonry_container', 'artboard', 'boolean_shape',
    'symbol_instance', 'mesh_gradient', 'chart', 'table', 'data_table',
    'gauge', 'map', 'button', 'slider', 'toggle', 'hotspot', 'form_field',
    'watermark_layer', 'math_formula'
  ],
  image_edit: [
    'image', 'group', 'frame', 'shape', 'path', 'svg_path', 'gradient',
    'blur_effect', 'shadow_effect', 'mesh_gradient', 'watermark_layer'
  ],
  video: [
    'video_clip', 'audio_clip', 'audio_track', 'image', 'text', 'shape',
    'path', 'svg_path', 'group', 'frame', 'animation', 'lottie',
    'particle_system', 'gradient', 'blur_effect', 'shader_effect',
    'caption_track', 'watermark_layer'
  ],
  audio: [
    'audio_clip', 'audio_track', 'group', 'caption_track'
  ],
  motion: [
    'path', 'shape', 'text', 'image', 'group', 'frame', 'svg_path',
    'animation', 'lottie', 'particle_system', 'shader_effect',
    'gradient', 'blur_effect', 'shadow_effect', 'caption_track',
    'physics_collider'
  ],
  print: [
    'path', 'shape', 'text', 'image', 'group', 'frame', 'svg_path',
    'gradient', 'shadow_effect', 'print_text_frame', 'print_image_frame',
    'print_master_ref', 'print_bleed_guide', 'print_safe_guide',
    'spot_color_area', 'qr_code', 'watermark_layer'
  ],
  signage: [
    'path', 'shape', 'text', 'image', 'group', 'frame', 'svg_path',
    'gradient', 'shadow_effect', 'print_text_frame', 'print_image_frame',
    'print_bleed_guide', 'print_safe_guide', 'spot_color_area', 'qr_code'
  ],
  packaging: [
    'path', 'shape', 'text', 'image', 'group', 'frame', 'svg_path',
    'gradient', 'shadow_effect', 'print_dieline', 'print_fold_line',
    'print_cut_line', 'print_bleed_guide', 'print_safe_guide',
    'spot_color_area', 'qr_code'
  ],
  data_viz: [
    'chart', 'table', 'data_table', 'map', 'gauge', 'text', 'shape',
    'path', 'svg_path', 'image', 'group', 'frame', 'network_graph'
  ],
  interactive: [
    'button', 'slider', 'toggle', 'hotspot', 'form_field', 'flex_container',
    'grid_container', 'masonry_container', 'shape', 'path', 'svg_path',
    'text', 'image', 'group', 'frame', 'animation', 'lottie',
    'code_runner_cell', 'logic_trigger', 'physics_collider'
  ],
  '3d': [
    'scene_3d', 'mesh_3d', 'light_3d', 'camera_3d', 'bone_3d',
    'environment_3d', 'material_3d', 'physics_collider'
  ],
  document: [
    'doc_paragraph', 'doc_heading', 'doc_list', 'doc_list_item',
    'doc_callout', 'doc_code_block', 'doc_math_block', 'doc_table',
    'doc_toggle', 'doc_divider', 'doc_embed_asset', 'doc_footnote',
    'doc_toc', 'image', 'table', 'group', 'frame', 'math_formula',
    'code_runner_cell', 'watermark_layer'
  ],
  music_production: [
    'music_track', 'music_clip', 'music_note', 'music_automation',
    'music_marker', 'music_instrument'
  ],
  pixel_art: [
    'pixel_layer', 'pixel_frame', 'pixel_cel', 'sprite_tag', 'tileset',
    'tilemap_layer', 'tile_ref'
  ],
  diagram: [
    'diagram_node', 'diagram_edge', 'diagram_label', 'diagram_swimlane',
    'diagram_group', 'erd_entity', 'erd_relation', 'uml_class',
    'uml_lifeline', 'uml_message', 'bpmn_element', 'bpmn_pool', 'bpmn_lane',
    'text', 'shape', 'path', 'svg_path', 'network_graph'
  ],
  mockup: [
    'mockup_scene', 'device_frame', 'screen_content', 'mockup_prop',
    'mockup_background', 'image', 'video_clip', 'logic_trigger'
  ],
  font_design: [
    'glyph', 'glyph_component', 'font_guideline', 'kerning_pair',
    'kerning_group'
  ]
};
Object.freeze(IR_ALLOWED_NODE_TYPES_BY_DOMAIN);
for (const key of Object.keys(IR_ALLOWED_NODE_TYPES_BY_DOMAIN)) {
  Object.freeze(IR_ALLOWED_NODE_TYPES_BY_DOMAIN[key as IRDomain]);
}

/**
 * Check if a node type is allowed in a given domain
 * @stability STABLE
 */
export function isNodeAllowedInDomain(nodeType: IRNodeType, domain: IRDomain): boolean {
  const allowed = IR_ALLOWED_NODE_TYPES_BY_DOMAIN[domain];
  if (!allowed) return false;
  return allowed.includes(nodeType);
}

/**
 * @stability STABLE
 */
export interface IRMatrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

/**
 * @stability STABLE
 */
export interface IRGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scale_x?: number;
  scale_y?: number;
  skew_x?: number;
  skew_y?: number;
  transform?: IRMatrix2D;
  flip_x?: boolean;
  flip_y?: boolean;
  z?: number;
  rotation_x?: number;
  rotation_y?: number;
  rotation_z?: number;
}

/**
 * Compose a matrix transformation onto a geometry.
 * @stability STABLE
 */
export function applyTransform(geo: IRGeometry, matrix: IRMatrix2D): IRGeometry {
  const x = geo.x;
  const y = geo.y;
  const newX = matrix.a * x + matrix.c * y + matrix.tx;
  const newY = matrix.b * x + matrix.d * y + matrix.ty;

  let newTransform: IRMatrix2D;
  if (geo.transform) {
    const m1 = geo.transform;
    const m2 = matrix;
    newTransform = {
      a: m2.a * m1.a + m2.c * m1.b,
      b: m2.b * m1.a + m2.d * m1.b,
      c: m2.a * m1.c + m2.c * m1.d,
      d: m2.b * m1.c + m2.d * m1.d,
      tx: m2.a * m1.tx + m2.c * m1.ty + m2.tx,
      ty: m2.b * m1.tx + m2.d * m1.ty + m2.ty,
    };
  } else {
    newTransform = { ...matrix };
  }

  return {
    ...geo,
    x: newX,
    y: newY,
    transform: newTransform,
  };
}

/**
 * @stability STABLE
 */
export type StyleOverride = Record<string, unknown>;

/**
 * @stability STABLE
 */
export interface IRRichTextSpan {
  text: string;
  style?: StyleOverride;
  link?: string;
  annotation?: 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'highlight';
}

/**
 * @stability STABLE
 */
export interface IRImageFilter {
  type: 'brightness' | 'contrast' | 'saturation' | 'hue' | 'blur' | 'sharpen' | 'noise' | 'vignette' | 'curves' | 'levels' | 'color_balance' | 'threshold' | 'sepia' | 'invert';
  value: number | IRCurvesData;
}

/**
 * @stability STABLE
 */
export interface IRCurvesData {
  rgb: [number, number][];
  r?: [number, number][];
  g?: [number, number][];
  b?: [number, number][];
}

/**
 * @stability STABLE
 */
export interface IRNodeContentBase {
  kind: string;
}

/**
 * @stability STABLE
 */
export interface IRTextContent extends IRNodeContentBase {
  kind: 'text';
  raw: string;
  rich_text?: IRRichTextSpan[];
  font_ref?: string;
  text_align: 'left' | 'center' | 'right' | 'justify';
  vertical_align?: 'top' | 'middle' | 'bottom';
  overflow?: 'visible' | 'hidden' | 'scroll' | 'chain';
  chain_to?: string;
}

/**
 * @stability STABLE
 */
export interface IRImageContent extends IRNodeContentBase {
  kind: 'image';
  asset_id: string;
  fit: 'fill' | 'fit' | 'crop' | 'tile' | 'none';
  focal_point?: { x: number; y: number };
  filters?: IRImageFilter[];
}

/**
 * @stability STABLE
 */
export interface IRShapeContent extends IRNodeContentBase {
  kind: 'shape';
  shape_type: 'rect' | 'ellipse' | 'polygon' | 'star' | 'arrow' | 'line' | 'triangle' | 'custom';
  corner_radius?: number | [number, number, number, number];
  sides?: number;
  star_ratio?: number;
}

/**
 * @stability STABLE
 */
export interface IRSVGPathContent extends IRNodeContentBase {
  kind: 'svg_path';
  d: string;
  fill_rule: 'nonzero' | 'evenodd';
  path_type: 'cubic' | 'quadratic';
}

/**
 * @stability STABLE
 */
export interface IRVideoContent extends IRNodeContentBase {
  kind: 'video_clip';
  asset_id: string;
  in_point_ms: number;
  out_point_ms: number;
  volume: number;
  muted: boolean;
  loop: boolean;
  playback_speed: number;
}

/**
 * @stability STABLE
 */
export interface IRAudioContent extends IRNodeContentBase {
  kind: 'audio_clip';
  asset_id: string;
  in_point_ms: number;
  out_point_ms: number;
  volume: number;
  muted: boolean;
  pan: number;
  loop: boolean;
}

/**
 * @stability STABLE
 */
export interface IRChartContent extends IRNodeContentBase {
  kind: 'chart';
  chart_type: 'bar' | 'line' | 'pie' | 'scatter' | 'radar' | 'area';
  data_provider_id: string;
  x_axis_field: string;
  y_axis_fields: string[];
  show_legend: boolean;
  show_gridlines: boolean;
  color_palette: string[];
}

/**
 * @stability STABLE
 */
export interface IRDocContent extends IRNodeContentBase {
  kind: 'doc';
  doc_type: 'paragraph' | 'heading' | 'list' | 'callout' | 'code_block' | 'math_block' | 'doc_table' | 'toggle' | 'divider' | 'embed_asset' | 'footnote' | 'toc';
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  list_style?: 'bullet' | 'numbered' | 'checklist';
  checked?: boolean;
  language?: string;
  latex?: string;
  callout_type?: 'tip' | 'info' | 'warning' | 'danger';
  embed_asset_id?: string;
  paragraph_style?: string;
  char_style?: string;
  spans?: IRRichTextSpan[];
}

/**
 * @stability STABLE
 */
export interface IRDiagramNodeContent extends IRNodeContentBase {
  kind: 'diagram_node';
  shape_preset: string;
  notation: 'flowchart' | 'bpmn' | 'uml' | 'erd';
  label: string;
  attributes?: IRDiagramAttribute[];
  port_ids?: string[];
}

/**
 * @stability STABLE
 */
export interface IRDiagramAttribute {
  name: string;
  type: string;
  constraints: ('PK' | 'FK' | 'NN' | 'UQ' | 'AI')[];
}

/**
 * @stability STABLE
 */
export interface IRDiagramEdgeContent extends IRNodeContentBase {
  kind: 'diagram_edge';
  source_node_id: string;
  target_node_id: string;
  source_port_id?: string;
  target_port_id?: string;
  line_style: 'orthogonal' | 'curved' | 'straight';
  stroke_width: number;
  stroke_color: ColorValue;
  arrow_head_start?: 'none' | 'arrow' | 'diamond' | 'circle';
  arrow_head_end?: 'none' | 'arrow' | 'diamond' | 'circle';
}

/**
 * @stability STABLE
 */
export interface IRMusicTrackContent extends IRNodeContentBase {
  kind: 'music_track';
  track_type: 'audio' | 'midi' | 'bus' | 'master';
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  instrument_id?: string;
  plugin_effects?: string[];
}

/**
 * @stability STABLE
 */
export interface IRMusicNoteContent extends IRNodeContentBase {
  kind: 'music_note';
  pitch: number;
  velocity: number;
  start_beat: number;
  duration_beats: number;
  channel?: number;
  pitchbend?: number;
  aftertouch?: number;
}

/**
 * @stability STABLE
 */
export interface IRPixelCelContent extends IRNodeContentBase {
  kind: 'pixel_cel';
  pixels: string;
  width: number;
  height: number;
  offset_x?: number;
  offset_y?: number;
}

/**
 * @stability STABLE
 */
export interface IRMesh3DContent extends IRNodeContentBase {
  kind: 'mesh_3d';
  source: 'primitive' | 'imported' | 'svg_extrude' | 'text_3d';
  primitive?: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'capsule';
  primitive_params?: Record<string, number>;
  asset_id?: string;
  svg_path?: string;
  extrude_depth?: number;
  text_3d_content?: string;
  material_id?: string;
}

/**
 * @stability STABLE
 */
export interface IRGlyphComponentRef {
  glyph_name: string;
  transform?: IRMatrix2D;
}

/**
 * @stability STABLE
 */
export interface IRGlyphContent extends IRNodeContentBase {
  kind: 'glyph';
  unicode: number;
  glyph_name: string;
  advance_width: number;
  lsb: number;
  rsb: number;
  contours: IRSVGPathContent[];
  components?: IRGlyphComponentRef[];
  unicode_range?: string;
}

/**
 * @stability STABLE
 */
export interface IRDeviceFrameContent extends IRNodeContentBase {
  kind: 'device_frame';
  device_id: string;
  color_variant: string;
  view_angle: 'front' | 'side' | 'angle_45' | 'angle_30' | 'angle_60' | 'custom';
  custom_rotation?: { x: number; y: number; z: number };
  screen_area: IRGeometry;
  screen_content_id?: string;
}

/**
 * @stability STABLE
 */
export interface IRPrintTextFrameContent extends IRNodeContentBase {
  kind: 'print_text_frame';
  text_content: IRDocContent[];
  overflow_to?: string;
  columns: number;
  column_gutter: number;
  inset: { top: number; right: number; bottom: number; left: number };
  baseline_grid_align: boolean;
}

/**
 * @stability BETA
 */
export interface IRAnimationContent extends IRNodeContentBase {
  kind: 'animation';
  duration_ms: number;
  loop: boolean;
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'step';
  keyframes: { progress: number; properties: Record<string, any> }[];
}

/**
 * @stability BETA
 */
export interface IRFlexContainerContent extends IRNodeContentBase {
  kind: 'flex_container';
  direction: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  wrap: 'nowrap' | 'wrap' | 'wrap-reverse';
  justify_content: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  align_items: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  gap: number | [number, number];
}

/**
 * @stability BETA
 */
export interface IRGridContainerContent extends IRNodeContentBase {
  kind: 'grid_container';
  columns: number | string[];
  rows: number | string[];
  gap: number | [number, number];
  auto_flow: 'row' | 'column' | 'dense' | 'row dense' | 'column dense';
}

/**
 * @stability BETA
 */
export interface IRGradientContent extends IRNodeContentBase {
  kind: 'gradient';
  gradient_type: 'linear' | 'radial' | 'angular' | 'diamond';
  stops: { color: ColorValue; position: number }[];
  start_point?: { x: number; y: number };
  end_point?: { x: number; y: number };
}

/**
 * @stability BETA
 */
export interface IRBlurEffectContent extends IRNodeContentBase {
  kind: 'blur_effect';
  blur_type: 'gaussian' | 'box' | 'motion' | 'zoom' | 'background';
  radius: number;
  angle?: number;
  center?: { x: number; y: number };
}

/**
 * @stability BETA
 */
export interface IRShadowEffectContent extends IRNodeContentBase {
  kind: 'shadow_effect';
  shadow_type: 'drop' | 'inner';
  color: ColorValue;
  offset_x: number;
  offset_y: number;
  blur_radius: number;
  spread_radius: number;
}

/**
 * @stability BETA
 */
export interface IRShaderEffectContent extends IRNodeContentBase {
  kind: 'shader_effect';
  shader_source: string;
  uniforms: Record<string, { type: 'float' | 'int' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D'; value: any }>;
  blend_mode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge' | 'color-burn';
}

/**
 * @stability BETA
 */
export interface IRParticleSystemContent extends IRNodeContentBase {
  kind: 'particle_system';
  max_particles: number;
  emission_rate: number;
  life_time: [number, number];
  start_color: ColorValue;
  end_color: ColorValue;
  start_size: [number, number];
  end_size: [number, number];
  start_velocity: [number, number, number];
  gravity: [number, number, number];
  texture_asset_id?: string;
}

/**
 * @stability BETA
 */
export interface IRLottieContent extends IRNodeContentBase {
  kind: 'lottie';
  asset_id: string;
  loop: boolean;
  autoplay: boolean;
  speed: number;
  interactive_markers?: { name: string; time_start: number; time_end: number }[];
}

/**
 * @stability BETA
 */
export interface IRBooleanShapeContent extends IRNodeContentBase {
  kind: 'boolean_shape';
  operation: 'union' | 'subtract' | 'intersect' | 'exclude';
  operands: string[];
}

/**
 * @stability BETA
 */
export interface IRCaptionTrackContent extends IRNodeContentBase {
  kind: 'caption_track';
  language_code: string;
  captions: {
    start_ms: number;
    end_ms: number;
    text: string;
    speaker?: string;
    style_override?: Record<string, any>;
  }[];
}

/**
 * @stability BETA
 */
export interface IRQRCodeContent extends IRNodeContentBase {
  kind: 'qr_code';
  payload: string;
  error_correction_level: 'L' | 'M' | 'Q' | 'H';
  version?: number;
  foreground_color?: ColorValue;
  background_color?: ColorValue;
  logo_asset_id?: string;
  is_barcode?: boolean;
  barcode_format?: 'UPC' | 'EAN13' | 'CODE39' | 'CODE128';
}

/**
 * @stability BETA
 */
export interface IRWatermarkContent extends IRNodeContentBase {
  kind: 'watermark_layer';
  text?: string;
  image_asset_id?: string;
  opacity: number;
  pattern: 'diagonal' | 'grid' | 'single_center';
  is_locked: boolean;
}

/**
 * @stability BETA
 */
export interface IRNetworkGraphContent extends IRNodeContentBase {
  kind: 'network_graph';
  data_provider_id: string;
  layout_algorithm: 'force_directed' | 'circular' | 'hierarchical';
  node_repulsion: number;
  edge_length: number;
  show_labels: boolean;
}

/**
 * @stability BETA
 */
export interface IRCodeRunnerContent extends IRNodeContentBase {
  kind: 'code_runner_cell';
  language: 'javascript' | 'python' | 'typescript' | 'sql';
  source_code: string;
  auto_execute: boolean;
  hide_source?: boolean;
  output_format?: 'console' | 'html' | 'json';
}

/**
 * @stability BETA
 */
export interface IRMathFormulaContent extends IRNodeContentBase {
  kind: 'math_formula';
  latex: string;
  display_mode: 'inline' | 'block';
}

/**
 * @stability BETA
 */
export interface IRPhysicsColliderContent extends IRNodeContentBase {
  kind: 'physics_collider';
  collider_type: 'box' | 'sphere' | 'capsule' | 'mesh';
  body_type: 'static' | 'kinematic' | 'dynamic';
  mass: number;
  restitution: number;
  friction: number;
  trigger_only: boolean;
}

/**
 * @stability BETA
 */
export interface IRLogicTriggerContent extends IRNodeContentBase {
  kind: 'logic_trigger';
  event_type: 'on_click' | 'on_hover' | 'on_enter_viewport' | 'on_leave_viewport' | 'on_collision';
  target_id: string;
  action_type: 'navigate' | 'play_animation' | 'toggle_state' | 'emit_event' | 'execute_script';
  payload?: any;
}

/**
 * @stability STABLE
 */
export type IRNodeContent =
  | IRTextContent
  | IRImageContent
  | IRShapeContent
  | IRSVGPathContent
  | IRVideoContent
  | IRAudioContent
  | IRChartContent
  | IRDocContent
  | IRDiagramNodeContent
  | IRDiagramEdgeContent
  | IRMusicTrackContent
  | IRMusicNoteContent
  | IRPixelCelContent
  | IRMesh3DContent
  | IRGlyphContent
  | IRDeviceFrameContent
  | IRPrintTextFrameContent
  | IRAnimationContent
  | IRFlexContainerContent
  | IRGridContainerContent
  | IRGradientContent
  | IRBlurEffectContent
  | IRShadowEffectContent
  | IRShaderEffectContent
  | IRParticleSystemContent
  | IRLottieContent
  | IRBooleanShapeContent
  | IRCaptionTrackContent
  | IRQRCodeContent
  | IRWatermarkContent
  | IRNetworkGraphContent
  | IRCodeRunnerContent
  | IRMathFormulaContent
  | IRPhysicsColliderContent
  | IRLogicTriggerContent;

/**
 * @stability STABLE
 */
export interface IRNode {
  id: string;
  type: IRNodeType;
  parent_id: string | null;
  children: string[];
  style?: Record<string, unknown>;
  geometry?: IRGeometry;
  content?: IRNodeContent;
}
