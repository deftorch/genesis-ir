/**
 * @stability BETA
 * Spesifikasi pembuatan font digital (Keputusan #10, Keputusan #15).
 */
export interface IRFontSpec {
  family_name: string;
  style_name: string;
  full_name: string;
  postscript_name: string;
  version: string;
  description?: string;
  designer?: string;
  license?: string;
  units_per_em: 1000 | 2048;
  metrics: {
    ascender: number;
    descender: number;
    x_height: number;
    cap_height: number;
    line_gap: number;
    underline_position: number;
    underline_thickness: number;
    strikeout_position: number;
    strikeout_size: number;
  };
  glyphs: string[];
  glyph_count: number;
  kerning_pairs: IRKerningPairDef[];
  grid_groups: IRKerningGroupDef[];
  opentype_features: IROpenTypeFeature[];
  variable_axes?: IRVariableAxis[];
  masters?: IRFontMaster[];
  auto_hint?: boolean;
}

/** @stability BETA */
export interface IRKerningPairDef {
  left_class: string;
  right_class: string;
  value: number;
}

/** @stability BETA */
export interface IRKerningGroupDef {
  name: string;
  side: "left" | "right";
  glyphs: string[];
}

/** @stability BETA */
export interface IROpenTypeFeature {
  tag: string;
  name: string;
  enabled_by_default: boolean;
  rules: IROTFeatureRule[];
}

/** @stability BETA */
export interface IROTFeatureRule {
  type: "single_sub" | "ligature_sub" | "contextual_sub" | "alternate_sub";
  input_glyphs: string[];
  output_glyphs: string[];
  context?: {
    lookahead: string[];
    lookbehind: string[];
  };
}

/** @stability BETA */
export interface IRVariableAxis {
  tag: string;
  name: string;
  minimum: number;
  default: number;
  maximum: number;
}

/** @stability BETA */
export interface IRFontMaster {
  id: string;
  name: string;
  axis_values: Record<string, number>;
  glyph_overrides: Record<string, string>;
}
