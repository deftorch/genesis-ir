import { IRNode } from './nodes.js';

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

/**
 * @stability STABLE
 */
export interface ResolvedStyle {
  [property: string]: string | undefined;
}

// Caching cache for token resolution to optimize performance for large documents
const tokenCache = new WeakMap<IRStyleContext, Map<string, string>>();

function getCachedToken(context: IRStyleContext, key: string): string | undefined {
  return tokenCache.get(context)?.get(key);
}

function setCachedToken(context: IRStyleContext, key: string, value: string): void {
  let cache = tokenCache.get(context);
  if (!cache) {
    cache = new Map();
    tokenCache.set(context, cache);
  }
  cache.set(key, value);
}

/**
 * Resolve a token reference recursively
 * @stability STABLE
 */
export function resolveToken(value: unknown, context: IRStyleContext): string | undefined {
  if (typeof value !== 'string') return undefined;

  const cached = getCachedToken(context, value);
  if (cached !== undefined) return cached;

  let resolved: string | undefined = undefined;

  if (value.startsWith('brand://')) {
    if (context.brand_profile) {
      const rawBrand = resolveBrandToken(value, context.brand_profile);
      if (rawBrand !== undefined) {
        const recursive = resolveToken(rawBrand, context);
        resolved = recursive !== undefined ? recursive : rawBrand;
      }
    }
  } else if (value.startsWith('theme://')) {
    const cleanRef = value.slice(8);
    const parts = cleanRef.split('.');
    if (parts.length >= 2) {
      const section = parts[0];
      const key = parts[1];
      let val: unknown = undefined;

      if (section === 'colors' || section === 'color_palette') {
        val = context.theme_tokens.colors?.[key];
      } else if (section === 'spacing' || section === 'spacing_tokens') {
        val = context.theme_tokens.spacing?.[key];
      } else if (section === 'typography' || section === 'typography_tokens') {
        val = context.theme_tokens.typography?.[key];
      }

      if (val !== undefined) {
        if (typeof val === 'string' && (val.startsWith('brand://') || val.startsWith('theme://'))) {
          const recursive = resolveToken(val, context);
          resolved = recursive !== undefined ? recursive : val;
        } else if (typeof val === 'object' && val !== null) {
          try {
            resolved = resolveColorValue(val as ColorValue, context);
          } catch {
            resolved = JSON.stringify(val);
          }
        } else {
          resolved = String(val);
        }
      }
    }
  }

  if (resolved !== undefined) {
    setCachedToken(context, value, resolved);
  }
  return resolved;
}

/**
 * Resolve a brand token from the brand profile
 * @stability STABLE
 */
export function resolveBrandToken(ref: string, brand: IRBrandProfile): string | undefined {
  const cleanRef = ref.startsWith('brand://') ? ref.slice(8) : ref;
  const parts = cleanRef.split('.');
  if (parts.length < 2) return undefined;

  const section = parts[0];
  const key = parts[1];

  if (section === 'color_palette' || section === 'palette') {
    const val = brand.color_palette[key];
    if (val === undefined) return undefined;
    if (typeof val === 'object' && val !== null) {
      if ('r' in val && 'g' in val && 'b' in val) {
        return `rgba(${val.r}, ${val.g}, ${val.b}, ${val.a ?? 1})`;
      }
      if ('c' in val && 'm' in val && 'y' in val && 'k' in val) {
        return `cmyk(${val.c}, ${val.m}, ${val.y}, ${val.k})`;
      }
      if ('h' in val && 's' in val && 'l' in val) {
        return `hsl(${val.h}, ${val.s}%, ${val.l}%)`;
      }
    }
    return String(val);
  }

  if (section === 'spacing' || section === 'spacing_tokens') {
    return brand.spacing_tokens?.[key] as string | undefined;
  }

  if (section === 'typography' || section === 'typography_tokens') {
    return brand.typography_tokens?.[key] as string | undefined;
  }

  return undefined;
}

/**
 * Resolve ColorValue to standard CSS color string format
 * @stability STABLE
 */
export function resolveColorValue(value: ColorValue, context: IRStyleContext, fallback?: string): string {
  if (typeof value === 'string') {
    if (value.startsWith('#') || value.startsWith('rgba(') || value.startsWith('rgb(') || value.startsWith('cmyk(') || value.startsWith('hsl(')) {
      return value;
    }
    if (value.startsWith('pantone://')) {
      return value;
    }
    const tokenVal = resolveToken(value, context);
    if (tokenVal !== undefined) {
      return tokenVal;
    }
  } else if (typeof value === 'object' && value !== null) {
    if ('r' in value && 'g' in value && 'b' in value) {
      const a = 'a' in value ? value.a : 1;
      return `rgba(${value.r}, ${value.g}, ${value.b}, ${a})`;
    }
    if ('c' in value && 'm' in value && 'y' in value && 'k' in value) {
      return `cmyk(${value.c}, ${value.m}, ${value.y}, ${value.k})`;
    }
    if ('h' in value && 's' in value && 'l' in value) {
      return `hsl(${value.h}, ${value.s}%, ${value.l}%)`;
    }
  }

  if (fallback !== undefined) return fallback;
  throw new Error(`Failed to resolve token ${typeof value === 'object' ? JSON.stringify(value) : value}`);
}

/**
 * Resolves the final style cascade for a given node: inline -> component -> global theme -> brand profile
 * @stability STABLE
 */
export function resolveStyleCascade(node: IRNode, context: IRStyleContext): ResolvedStyle {
  const resolved: ResolvedStyle = {};

  const keys = new Set<string>();
  if (node.style) {
    for (const k of Object.keys(node.style)) keys.add(k);
  }
  const componentStyle = context.component_styles?.[node.type];
  if (componentStyle) {
    for (const k of Object.keys(componentStyle)) keys.add(k);
  }
  if (context.theme_tokens.colors) {
    for (const k of Object.keys(context.theme_tokens.colors)) keys.add(k);
  }
  if (context.theme_tokens.spacing) {
    for (const k of Object.keys(context.theme_tokens.spacing)) keys.add(k);
  }
  if (context.theme_tokens.typography) {
    for (const k of Object.keys(context.theme_tokens.typography)) keys.add(k);
  }
  if (context.brand_profile?.color_palette) {
    for (const k of Object.keys(context.brand_profile.color_palette)) keys.add(k);
  }
  if (context.brand_profile?.spacing_tokens) {
    for (const k of Object.keys(context.brand_profile.spacing_tokens)) keys.add(k);
  }
  if (context.brand_profile?.typography_tokens) {
    for (const k of Object.keys(context.brand_profile.typography_tokens)) keys.add(k);
  }

  for (const key of keys) {
    let rawValue: unknown = undefined;

    if (node.style && node.style[key] !== undefined) {
      rawValue = node.style[key];
    } else if (componentStyle && componentStyle[key] !== undefined) {
      rawValue = componentStyle[key];
    } else {
      if (context.theme_tokens.colors && context.theme_tokens.colors[key] !== undefined) {
        rawValue = context.theme_tokens.colors[key];
      } else if (context.theme_tokens.spacing && context.theme_tokens.spacing[key] !== undefined) {
        rawValue = context.theme_tokens.spacing[key];
      } else if (context.theme_tokens.typography && context.theme_tokens.typography[key] !== undefined) {
        rawValue = context.theme_tokens.typography[key];
      } else if (context.brand_profile) {
        if (context.brand_profile.color_palette && context.brand_profile.color_palette[key] !== undefined) {
          rawValue = context.brand_profile.color_palette[key];
        } else if (context.brand_profile.spacing_tokens && context.brand_profile.spacing_tokens[key] !== undefined) {
          rawValue = context.brand_profile.spacing_tokens[key];
        } else if (context.brand_profile.typography_tokens && context.brand_profile.typography_tokens[key] !== undefined) {
          rawValue = context.brand_profile.typography_tokens[key];
        }
      }
    }

    if (rawValue !== undefined) {
      if (typeof rawValue === 'string') {
        if (rawValue.startsWith('theme://') || rawValue.startsWith('brand://')) {
          const resolvedToken = resolveToken(rawValue, context);
          if (resolvedToken !== undefined) {
            resolved[key] = resolvedToken;
            continue;
          }
        }
        resolved[key] = rawValue;
      } else if (typeof rawValue === 'object' && rawValue !== null) {
        try {
          resolved[key] = resolveColorValue(rawValue as ColorValue, context);
        } catch {
          resolved[key] = JSON.stringify(rawValue);
        }
      } else {
        resolved[key] = String(rawValue);
      }
    }
  }

  return resolved;
}
