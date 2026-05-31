/**
 * @stability STABLE
 */
export type IRNodeType =
  | 'group'
  | 'shape'
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'pixel_cel'
  | 'mesh_3d'
  | 'glyph'
  | 'diagram_node'
  | 'diagram_edge'
  | 'music_track'
  | 'music_note'
  | 'device_frame'
  | 'print_text_frame';

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
  font_ref?: string;
  text_align?: 'left' | 'center' | 'right' | 'justify';
}

/**
 * @stability STABLE
 */
export interface IRImageContent extends IRNodeContentBase {
  kind: 'image';
  asset_id: string;
  fit?: 'contain' | 'cover' | 'fill';
}

/**
 * @stability STABLE
 */
export interface IRShapeContent extends IRNodeContentBase {
  kind: 'shape';
  shape_type: 'rect' | 'ellipse' | 'polygon' | 'star';
  corner_radius?: number;
  sides?: number;
}

/**
 * @stability STABLE
 */
export type IRNodeContent = IRTextContent | IRImageContent | IRShapeContent;

/**
 * @stability STABLE
 */
export interface IRNode {
  id: string;
  type: IRNodeType;
  parent_id: string | null;
  children: string[];
  style?: Record<string, unknown>;
  geometry?: Record<string, unknown>;
  content?: IRNodeContent;
}
