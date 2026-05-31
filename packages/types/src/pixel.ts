/** Blend mode type for pixel layers */
export type IRBlendMode = "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten" | "color_dodge" | "color_burn" | "hard_light" | "soft_light" | "difference" | "exclusion" | "hue" | "saturation" | "color" | "luminosity";

/**
 * @stability BETA
 * Spesifikasi domain pixel art dan animasi sprite game (Keputusan #11, Keputusan #16).
 */
export interface IRPixelSpec {
  canvas: {
    pixel_width: number;
    pixel_height: number;
  };
  palette: IRPixelPalette;
  layers: IRPixelLayerDef[];
  frames: IRPixelFrameDef[];
  animation_tags: IRSpriteTag[];
  tilesets?: IRTileset[];
  tilemaps?: IRTilemap[];
}

/** @stability BETA */
export interface IRPixelPalette {
  id: string;
  name: string;
  preset?: "nes" | "gameboy" | "pico8" | "cga" | "ega" | "c64" | "1bit" | "2bit" | "8bit" | "custom";
  colors: string[];
  locked: boolean;
  background_color_index?: number;
}

/** @stability BETA */
export interface IRPixelLayerDef {
  id: string;
  name: string;
  type: "normal" | "reference" | "background";
  opacity: number;
  visible: boolean;
  locked: boolean;
  blend_mode: IRBlendMode;
  lock_alpha: boolean;
}

/** @stability BETA */
export interface IRPixelFrameDef {
  id: string;
  duration_ms: number;
  cels: IRPixelCelRef[];
}

/** @stability BETA */
export interface IRPixelCelRef {
  layer_id: string;
  node_id: string;
}

/** @stability BETA */
export interface IRSpriteTag {
  id: string;
  name: string;
  from_frame: number;
  to_frame: number;
  direction: "forward" | "reverse" | "pingpong";
  repeat: number | "infinite";
  color: string;
}

/** @stability BETA */
export interface IRTileset {
  id: string;
  name: string;
  tile_width: number;
  tile_height: number;
  asset_id: string;
  tile_count: number;
  columns: number;
  tile_meta?: IRTileMeta[];
}

/** @stability BETA */
export interface IRTileMeta {
  tile_index: number;
  collision: "none" | "full" | "slope_left" | "slope_right" | "custom";
  custom_collision_polygon?: [number, number][];
  tags?: string[];
  animation?: {
    frames: number[];
    duration_ms: number;
  };
}

/** @stability BETA */
export interface IRTilemap {
  id: string;
  name: string;
  tileset_id: string;
  map_width: number;
  map_height: number;
  layers: IRTilemapLayer[];
}

/** @stability BETA */
export interface IRTilemapLayer {
  id: string;
  name: string;
  type: "tile" | "object" | "image";
  visible: boolean;
  opacity: number;
  data?: number[];
}
