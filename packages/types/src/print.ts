import { IRNode } from './nodes.js';

/**
 * @stability BETA
 */
export interface IRMasterPage {
  id: string;
  name: string;
  objects: IRNode[];
  applied_to: number[];
}

/**
 * @stability BETA
 */
export interface IRPrintPage {
  id: string;
  page_number: number;
  master_id?: string;
  width_mm: number;
  height_mm: number;
  orientation: "portrait" | "landscape";
  section_id?: string;
  objects: string[];
}

/**
 * @stability BETA
 */
export interface IRPrintMarks {
  crop_marks: boolean;
  registration_marks: boolean;
  color_bars: boolean;
  page_info: boolean;
  bleed_marks: boolean;
}

/**
 * @stability BETA
 */
export interface IRSpotColor {
  name: string;
  pantone_ref: string;
  cmyk_fallback: { c: number; m: number; y: number; k: number };
  lab: { l: number; a: number; b: number };
}

/**
 * @stability BETA
 */
export interface IRFoldLine {
  id: string;
  path: string;
  fold_angle: number;
  direction: "valley" | "mountain";
}

/**
 * @stability BETA
 */
export interface IRCutLine {
  id: string;
  path: string;
}

/**
 * @stability BETA
 */
export interface IRPackagingFace {
  id: string;
  name: string;
  region_path: string;
  bleed_mm: number;
}

/**
 * @stability BETA
 */
export interface IRPackagingSpec {
  dieline_type: "box_straight_tuck" | "box_reverse_tuck" | "box_auto_bottom" | "box_sleeve" | "pouch_stand_up" | "pouch_flat" | "label_rectangle" | "label_cylinder" | "custom";
  dieline_svg: string;
  fold_lines: IRFoldLine[];
  cut_lines: IRCutLine[];
  perforation_lines?: IRCutLine[];
  faces: IRPackagingFace[];
  preview_3d: boolean;
  finished_width_mm: number;
  finished_height_mm: number;
  finished_depth_mm: number;
}

/**
 * @stability BETA
 */
export interface IRLargeFormatSpec {
  physical_width_mm: number;
  physical_height_mm: number;
  viewing_distance_m: number;
  material: string;
  finishing: string[];
  effective_dpi: number;
}

/**
 * @stability BETA
 */
export interface IRPrintSpec {
  mode: "print" | "large_format" | "packaging" | "signage";
  pages: IRPrintPage[];
  master_pages: IRMasterPage[];
  color_mode: "CMYK" | "RGB" | "spot_only" | "mixed";
  color_profile: string;
  rendering_intent: "perceptual" | "relative_colorimetric" | "saturation" | "absolute_colorimetric";
  bleed_top_mm: number;
  bleed_right_mm: number;
  bleed_bottom_mm: number;
  bleed_left_mm: number;
  safe_zone_mm: number;
  marks: IRPrintMarks;
  spot_colors?: IRSpotColor[];
  packaging?: IRPackagingSpec;
  large_format?: IRLargeFormatSpec;
  pdf_standard: "PDF_X_1a" | "PDF_X_3" | "PDF_X_4" | "PDF_standard";
  compress_images: boolean;
  downsample_dpi: number;
}
