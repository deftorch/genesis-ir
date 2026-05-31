/**
 * @stability STABLE
 */
export type ColorValue =
  | string // Hex value e.g., "#ffffff"
  | { r: number; g: number; b: number; a: number } // RGBA
  | { c: number; m: number; y: number; k: number } // CMYK
  | { h: number; s: number; l: number } // HSL
  | `brand://${string}` // Brand token reference
  | `theme://${string}` // Theme token reference
  | `pantone://${string}`; // Pantone reference

/**
 * @stability STABLE
 */
export interface DesignTokenMap {
  colors?: Record<string, ColorValue>;
  typography?: Record<string, unknown>;
  spacing?: Record<string, unknown>;
}

/**
 * @stability STABLE
 */
export interface IRBrandProfile {
  color_palette: Record<string, ColorValue>;
  typography_tokens?: Record<string, unknown>;
  spacing_tokens?: Record<string, unknown>;
}

/**
 * @stability STABLE
 */
export interface IRStyleContext {
  theme_tokens: DesignTokenMap;
  brand_profile?: IRBrandProfile;
  component_styles?: Record<string, Record<string, unknown>>;
}
