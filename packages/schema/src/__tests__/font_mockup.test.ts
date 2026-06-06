import { describe, it, expect } from 'vitest';
import { validateHIR } from '../index.js';
import { createIRDocument } from '@genesis/types';

describe('FASE 12A — Font Design Domain', () => {
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
      glyphs: ['glyph_A', 'glyph_B'],
      glyph_count: 2,
      kerning_pairs: [],
      grid_groups: [],
      opentype_features: [],
    } as any;
    return doc;
  };

  it('fails if units_per_em is not 1000 or 2048', () => {
    const doc = baseFontDoc();
    (doc.font_spec as any).units_per_em = 500;
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'invalid-em-unit')).toBe(true);
  });

  it('passes with units_per_em of 1000', () => {
    const doc = baseFontDoc();
    expect(validateHIR(doc).valid).toBe(true);
  });

  it('passes with units_per_em of 2048', () => {
    const doc = baseFontDoc();
    (doc.font_spec as any).units_per_em = 2048;
    expect(validateHIR(doc).valid).toBe(true);
  });

  it('fails if kerning pair left_class is not in grid_groups', () => {
    const doc = baseFontDoc();
    (doc.font_spec as any).grid_groups = [
      { name: 'groupA', side: 'left', glyphs: ['0041'] },
      { name: 'groupB', side: 'right', glyphs: ['0042'] },
    ];
    (doc.font_spec as any).kerning_pairs = [
      { left_class: 'nonexistent', right_class: 'groupB', value: -50 },
    ];
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'invalid-kerning-class')).toBe(true);
  });

  it('passes if kerning pair classes exist in grid_groups', () => {
    const doc = baseFontDoc();
    (doc.font_spec as any).grid_groups = [
      { name: 'groupA', side: 'left', glyphs: ['0041'] },
      { name: 'groupB', side: 'right', glyphs: ['0042'] },
    ];
    (doc.font_spec as any).kerning_pairs = [
      { left_class: 'groupA', right_class: 'groupB', value: -50 },
    ];
    expect(validateHIR(doc).valid).toBe(true);
  });

  it('fails if a glyph contour is open', () => {
    const doc = baseFontDoc();
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
            { kind: 'svg_path', d: 'M 0 0 L 100 100 L 0 100', fill_rule: 'nonzero', path_type: 'cubic' }
          ]
        }
      } as any
    ];
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'open-contour')).toBe(true);
  });

  it('passes if all glyph contours are closed', () => {
    const doc = baseFontDoc();
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
    expect(validateHIR(doc).valid).toBe(true);
  });
});

describe('FASE 12B — Mockup Domain', () => {
  const baseMockupDoc = () => {
    const doc = createIRDocument({
      domain: 'mockup',
      canvas: { width: 1920, height: 1080, color_space: 'sRGB' },
    });
    doc.objects = [
      { id: 'screenshot1', type: 'image' } as any,
    ];
    doc.mockup_spec = {
      scene_type: 'single_device',
      view_mode: '2d_flat',
      devices: [],
      props: [],
      scene_background: { type: 'solid', color: '#ffffff' },
      lighting: { type: 'studio', intensity: 1.0 },
    } as any;
    return doc;
  };

  it('fails if device references non-existent screen_content_node_id', () => {
    const doc = baseMockupDoc();
    (doc.mockup_spec as any).devices = [{
      id: 'iphone', device_lib_id: 'iphone_16_pro_max', color_variant: 'black',
      view_angle: 'front', position: { x: 0, y: 0 }, scale: 1.0,
      screen_content_node_id: 'nonexistent_node',
    }];
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'invalid-screen-content-ref')).toBe(true);
  });

  it('passes if screen_content_node_id references an existing object', () => {
    const doc = baseMockupDoc();
    (doc.mockup_spec as any).devices = [{
      id: 'iphone', device_lib_id: 'iphone_16_pro_max', color_variant: 'black',
      view_angle: 'front', position: { x: 0, y: 0 }, scale: 1.0,
      screen_content_node_id: 'screenshot1',
    }];
    expect(validateHIR(doc).valid).toBe(true);
  });

  it('fails if 3d_perspective device with custom angle lacks custom_rotation', () => {
    const doc = baseMockupDoc();
    (doc.mockup_spec as any).view_mode = '3d_perspective';
    (doc.mockup_spec as any).devices = [{
      id: 'macbook', device_lib_id: 'macbook_pro_16', color_variant: 'silver',
      view_angle: 'custom', position: { x: 0, y: 0 }, scale: 1.0,
      // custom_rotation intentionally missing
    }];
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'missing-custom-rotation')).toBe(true);
  });
});
