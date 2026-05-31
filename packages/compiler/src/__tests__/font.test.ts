import { describe, it, expect } from 'vitest';
import * as opentype from 'opentype.js';
import { compileFontSpec, svgPathToOTPath } from '../font.js';
import { IRFontSpec, IRGlyphContent } from '@genesis/types';

describe('FASE 12A / M8 — Font Design Domain Compiler', () => {
  const fontSpec: IRFontSpec = {
    family_name: 'Genesis Sans',
    style_name: 'Regular',
    full_name: 'Genesis Sans Regular',
    postscript_name: 'GenesisSans-Regular',
    version: '1.0',
    units_per_em: 1000,
    metrics: {
      ascender: 800,
      descender: -200,
      x_height: 500,
      cap_height: 700,
      line_gap: 0,
      underline_position: -100,
      underline_thickness: 50,
      strikeout_position: 300,
      strikeout_size: 50,
    },
    glyphs: ['A', 'V', 'f', 'i', 'fi'],
    glyph_count: 5,
    kerning_pairs: [
      { left_class: 'groupA', right_class: 'groupV', value: -75 },
    ],
    grid_groups: [
      { name: 'groupA', side: 'left', glyphs: ['A'] },
      { name: 'groupV', side: 'right', glyphs: ['V'] },
    ],
    opentype_features: [
      {
        tag: 'liga',
        name: 'Standard Ligatures',
        enabled_by_default: true,
        rules: [
          {
            type: 'ligature_sub',
            input_glyphs: ['f', 'i'],
            output_glyphs: ['fi'],
          },
        ],
      },
    ],
  };

  const glyphContents: IRGlyphContent[] = [
    {
      kind: 'glyph',
      unicode: 65, // 'A'
      glyph_name: 'A',
      advance_width: 600,
      lsb: 50,
      rsb: 50,
      contours: [
        {
          kind: 'svg_path',
          d: 'M 50 0 L 300 800 L 550 0 Z',
          fill_rule: 'nonzero',
          path_type: 'cubic',
        },
      ],
    },
    {
      kind: 'glyph',
      unicode: 86, // 'V'
      glyph_name: 'V',
      advance_width: 600,
      lsb: 50,
      rsb: 50,
      contours: [
        {
          kind: 'svg_path',
          d: 'M 50 800 L 300 0 L 550 800 Z',
          fill_rule: 'nonzero',
          path_type: 'cubic',
        },
      ],
    },
    {
      kind: 'glyph',
      unicode: 102, // 'f'
      glyph_name: 'f',
      advance_width: 350,
      lsb: 30,
      rsb: 30,
      contours: [
        {
          kind: 'svg_path',
          d: 'M 100 0 L 100 800 L 200 800 L 200 700 L 100 700 L 100 0 Z',
          fill_rule: 'nonzero',
          path_type: 'cubic',
        },
      ],
    },
    {
      kind: 'glyph',
      unicode: 105, // 'i'
      glyph_name: 'i',
      advance_width: 250,
      lsb: 20,
      rsb: 20,
      contours: [
        {
          kind: 'svg_path',
          d: 'M 100 0 L 100 600 L 150 600 L 150 0 Z',
          fill_rule: 'nonzero',
          path_type: 'cubic',
        },
      ],
    },
    {
      kind: 'glyph',
      unicode: 0, // 'fi' ligature
      glyph_name: 'fi',
      advance_width: 600,
      lsb: 30,
      rsb: 20,
      contours: [
        {
          kind: 'svg_path',
          d: 'M 100 0 L 100 800 L 300 800 L 300 0 Z',
          fill_rule: 'nonzero',
          path_type: 'cubic',
        },
      ],
    },
  ];

  it('compiles IRFontSpec to a valid binary OTF buffer', () => {
    const arrayBuffer = compileFontSpec(fontSpec, glyphContents);
    expect(arrayBuffer).toBeInstanceOf(ArrayBuffer);
    expect(arrayBuffer.byteLength).toBeGreaterThan(0);

    // Round-trip parse the binary font
    const font = opentype.parse(arrayBuffer);

    expect(font.unitsPerEm).toBe(1000);
    expect(font.ascender).toBe(800);
    expect(font.descender).toBe(-200);
    
    // 5 custom glyphs + 1 default .notdef
    expect(font.glyphs.length).toBe(6);

    const parsedA = font.charToGlyph('A');
    expect(parsedA.name).toBe('A');
    expect(parsedA.unicode).toBe(65);
    expect(parsedA.advanceWidth).toBe(600);

    const parsedV = font.charToGlyph('V');
    expect(parsedV.name).toBe('V');
    expect(parsedV.unicode).toBe(86);

    // Verify kerning value is successfully stored and retrieved
    const kernValue = font.getKerningValue(parsedA, parsedV);
    expect(kernValue).toBe(-75);

    // Verify GSUB ligature features
    expect(font.tables.gsub).toBeDefined();
    expect(font.substitution.getLigatures('liga', 'latn')).toBeDefined();
  });

  it('svgPathToOTPath correctly flips the y-axis coordinate', () => {
    const d = 'M 10 20 L 30 40';
    const upm = 1000;
    const otPath = svgPathToOTPath(d, upm);

    expect(otPath.commands).toHaveLength(2);
    expect(otPath.commands[0]).toEqual({
      type: 'M',
      x: 10,
      y: 980, // 1000 - 20
    });
    expect(otPath.commands[1]).toEqual({
      type: 'L',
      x: 30,
      y: 960, // 1000 - 40
    });
  });

  it('throws on invalid units_per_em (Decision #10)', () => {
    const invalidSpec = { ...fontSpec, units_per_em: 1500 as any };
    expect(() => compileFontSpec(invalidSpec, glyphContents)).toThrow(
      'Invalid units_per_em: Must be either 1000 or 2048'
    );
  });
});
