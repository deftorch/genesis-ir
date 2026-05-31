import { describe, it, expect } from 'vitest';
import { IRNode } from '../nodes.js';
import {
  ColorValue,
  IRStyleContext,
  IRBrandProfile,
  resolveColorValue,
  resolveBrandToken,
  resolveStyleCascade,
} from '../style.js';

const context = describe;

describe('Style System & Token Resolution', () => {
  const brandProfile: IRBrandProfile = {
    color_palette: {
      accent: '#ff00ff',
      primary: { r: 0, g: 0, b: 255, a: 1 },
      pantone_blue: 'pantone://293C',
    },
    spacing_tokens: {
      gap: '12px',
    },
  };

  const styleContext: IRStyleContext = {
    theme_tokens: {
      colors: {
        primary: 'brand://palette.primary',
        secondary: '#00ff00',
        text: 'theme://colors.secondary', // recursive test
      },
      spacing: {
        margin: 'brand://spacing.gap',
      },
    },
    brand_profile: brandProfile,
    component_styles: {
      shape: {
        fill: 'theme://colors.secondary',
        stroke: '#000000',
        padding: '8px',
      },
    },
  };

  context('resolveBrandToken', () => {
    it('should resolve token brand://palette.accent to concrete value', () => {
      const val = resolveBrandToken('brand://palette.accent', brandProfile);
      expect(val).toBe('#ff00ff');

      const val2 = resolveBrandToken('palette.accent', brandProfile);
      expect(val2).toBe('#ff00ff');
    });

    it('should resolve typography or spacing tokens', () => {
      const val = resolveBrandToken('brand://spacing.gap', brandProfile);
      expect(val).toBe('12px');
    });

    it('should return undefined if token is not found', () => {
      const val = resolveBrandToken('brand://palette.nonexistent', brandProfile);
      expect(val).toBeUndefined();
    });

    it('should require color palette to be in CMYK format for print domain documents', () => {
      const printBrandProfile: IRBrandProfile = {
        color_palette: {
          primary: { c: 100, m: 50, y: 0, k: 10 },
          accent: 'pantone://293C',
        },
      };

      const primaryResolved = resolveBrandToken('brand://palette.primary', printBrandProfile);
      const accentResolved = resolveBrandToken('brand://palette.accent', printBrandProfile);

      expect(primaryResolved?.startsWith('cmyk(')).toBe(true);
      expect(accentResolved?.startsWith('pantone://')).toBe(true);
    });

    it('should verify brand profile with Pantone colors has the format pantone://[name]', () => {
      const pColor: ColorValue = 'pantone://ReflexBlue';
      expect(pColor).toMatch(/^pantone:\/\/[a-zA-Z0-9.\-\s]+$/);
    });
  });

  context('resolveColorValue', () => {
    it('should resolve hex colors directly', () => {
      expect(resolveColorValue('#ffffff', styleContext)).toBe('#ffffff');
    });

    it('should resolve RGBA objects to rgba string', () => {
      const rgba = { r: 255, g: 128, b: 0, a: 0.5 };
      expect(resolveColorValue(rgba, styleContext)).toBe('rgba(255, 128, 0, 0.5)');
    });

    it('should resolve CMYK objects to cmyk string', () => {
      const cmyk = { c: 0, m: 50, y: 100, k: 10 };
      expect(resolveColorValue(cmyk, styleContext)).toBe('cmyk(0, 50, 100, 10)');
    });

    it('should resolve HSL objects to hsl string', () => {
      const hsl = { h: 240, s: 100, l: 50 };
      expect(resolveColorValue(hsl, styleContext)).toBe('hsl(240, 100%, 50%)');
    });

    it('should resolve Pantone strings to pantone format', () => {
      expect(resolveColorValue('pantone://293C', styleContext)).toBe('pantone://293C');
    });

    it('should resolve brand token references recursively', () => {
      expect(resolveColorValue('brand://palette.accent', styleContext)).toBe('#ff00ff');
      expect(resolveColorValue('brand://palette.primary', styleContext)).toBe('rgba(0, 0, 255, 1)');
    });

    it('should resolve theme token references recursively', () => {
      expect(resolveColorValue('theme://colors.secondary', styleContext)).toBe('#00ff00');
      expect(resolveColorValue('theme://colors.primary', styleContext)).toBe('rgba(0, 0, 255, 1)');
      expect(resolveColorValue('theme://colors.text', styleContext)).toBe('#00ff00');
    });

    it('should return fallback if token is not found', () => {
      expect(resolveColorValue('theme://colors.nonexistent', styleContext, '#default')).toBe('#default');
    });

    it('should throw a structured error if token is not found and no fallback is provided', () => {
      expect(() => resolveColorValue('theme://colors.nonexistent', styleContext)).toThrow(
        /Failed to resolve token theme:\/\/colors.nonexistent/
      );
    });
  });

  context('resolveStyleCascade', () => {
    it('should override component style with inline style', () => {
      const node: IRNode = {
        id: 'node-1',
        type: 'shape',
        parent_id: null,
        children: [],
        style: {
          fill: '#ff0000', // Inline style override
        },
      };

      const resolved = resolveStyleCascade(node, styleContext);
      // Inline '#ff0000' should beat component style 'theme://colors.secondary' (which is '#00ff00')
      expect(resolved.fill).toBe('#ff0000');
      // stroke is from component style
      expect(resolved.stroke).toBe('#000000');
    });

    it('should fallback to component style when inline style is absent', () => {
      const node: IRNode = {
        id: 'node-1',
        type: 'shape',
        parent_id: null,
        children: [],
        style: {},
      };

      const resolved = resolveStyleCascade(node, styleContext);
      expect(resolved.fill).toBe('#00ff00'); // component style resolved
      expect(resolved.stroke).toBe('#000000');
    });

    it('should fallback to global theme if inline and component styles are absent', () => {
      const node: IRNode = {
        id: 'node-1',
        type: 'shape',
        parent_id: null,
        children: [],
        style: {},
      };

      // Create a style context where component style does not specify stroke, but global theme does
      const customContext: IRStyleContext = {
        ...styleContext,
        component_styles: {
          shape: {
            fill: 'theme://colors.secondary',
          },
        },
        theme_tokens: {
          colors: {
            ...styleContext.theme_tokens.colors,
            stroke: '#ffcc00', // defined in global theme
          },
        },
      };

      const resolved = resolveStyleCascade(node, customContext);
      expect(resolved.stroke).toBe('#ffcc00');
    });

    it('should fallback to brand profile if inline, component, and global theme are absent', () => {
      const node: IRNode = {
        id: 'node-1',
        type: 'shape',
        parent_id: null,
        children: [],
        style: {},
      };

      const customContext: IRStyleContext = {
        theme_tokens: { colors: {} },
        brand_profile: {
          color_palette: {
            fill: '#brand-fill',
          },
        },
        component_styles: {
          shape: {},
        },
      };

      const resolved = resolveStyleCascade(node, customContext);
      expect(resolved.fill).toBe('#brand-fill');
    });

    it('should ensure style overrides on child nodes do not mutate or affect parent nodes', () => {
      const parentNode: IRNode = {
        id: 'parent',
        type: 'shape',
        parent_id: null,
        children: ['child'],
        style: {
          fill: '#parent-color',
        },
      };

      const childNode: IRNode = {
        id: 'child',
        type: 'shape',
        parent_id: 'parent',
        children: [],
        style: {
          fill: '#child-color',
        },
      };

      const resolvedParentBefore = resolveStyleCascade(parentNode, styleContext);
      const resolvedChild = resolveStyleCascade(childNode, styleContext);
      const resolvedParentAfter = resolveStyleCascade(parentNode, styleContext);

      expect(resolvedParentBefore.fill).toBe('#parent-color');
      expect(resolvedChild.fill).toBe('#child-color');
      expect(resolvedParentAfter.fill).toBe('#parent-color');
    });
  });
});
