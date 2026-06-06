import { describe, it, expect } from 'vitest';
import { compileOpenTypeFont } from '../opentype.js';
import { createIRDocument } from '@genesis/types';

describe('FASE 12A — Sub-pass 5c & 7c: Font Asset Compilation', () => {
  const baseFontDoc = () => {
    const doc = createIRDocument({
      domain: 'font_design',
      canvas: { width: 1000, height: 1000, color_space: 'sRGB' },
    });
    doc.font_spec = {
      family_name: 'Genesis Sans',
      style_name: 'Regular',
      full_name: 'Genesis Sans Regular',
      postscript_name: 'GenesisSans-Regular',
      version: '1.0',
      units_per_em: 1000,
      metrics: {
        ascender: 800, descender: -200, x_height: 500,
        cap_height: 700, line_gap: 0, underline_position: -100,
        underline_thickness: 50, strikeout_position: 300, strikeout_size: 50,
      },
      glyphs: ['glyph_A'],
      glyph_count: 1,
      kerning_pairs: [],
      grid_groups: [],
      opentype_features: [],
    } as any;
    
    doc.objects = [
      {
        id: 'glyphA',
        type: 'glyph',
        content: {
          kind: 'glyph',
          unicode: 65,
          glyph_name: 'A',
          advance_width: 600,
          lsb: 50,
          rsb: 50,
          contours: [
            { kind: 'svg_path', d: 'M 0 0 L 100 100 L 0 100 Z', fill_rule: 'nonzero', path_type: 'cubic' }
          ]
        }
      } as any
    ];
    
    return doc;
  };

  it('compiles standard font without hinting', () => {
    const doc = baseFontDoc();
    const result = compileOpenTypeFont(doc);
    expect(result.format).toBe('ttf');
    expect(result.hasHinting).toBe(false);
    expect(result.buffer.toString()).toContain('Genesis Sans:Regular:UNHINTED');
  });

  it('compiles font with auto_hint TrueType instructions', () => {
    const doc = baseFontDoc();
    (doc.font_spec as any).auto_hint = true;
    const result = compileOpenTypeFont(doc);
    expect(result.hasHinting).toBe(true);
    expect(result.buffer.toString()).toContain('Genesis Sans:Regular:HINTED');
  });
});
