import { describe, it, expect } from 'vitest';
import { validateHIR } from '../index.js';
import { createIRDocument } from '@genesis/types';

describe('Physical Output & Print Domain Validation', () => {
  it('fails validation if dpi_sync_policy is strict and DPI canvas differs from physical DPI', () => {
    const doc = createIRDocument({
      domain: 'print',
      canvas: {
        width: 210,
        height: 297,
        dpi: 300, // Canvas DPI
        color_space: 'CMYK',
        dpi_sync_policy: 'strict',
      },
    });
    // Add physical spec with different DPI
    (doc as any).physical = {
      width_mm: 210,
      height_mm: 297,
      bleed_mm: 3,
      safe_zone_mm: 5,
      color_profile: 'Coated_Fogra39',
      dpi: 150, // Physical DPI differs!
    };

    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'dpi-mismatch')).toBe(true);
  });

  it('passes validation if dpi_sync_policy is strict and DPIs match', () => {
    const doc = createIRDocument({
      domain: 'print',
      canvas: {
        width: 210,
        height: 297,
        dpi: 300,
        color_space: 'CMYK',
        dpi_sync_policy: 'strict',
      },
    });
    (doc as any).physical = {
      width_mm: 210,
      height_mm: 297,
      bleed_mm: 3,
      safe_zone_mm: 5,
      color_profile: 'Coated_Fogra39',
      dpi: 300, // Matches!
    };

    const res = validateHIR(doc);
    expect(res.valid).toBe(true);
  });

  it('fails if domain is packaging but there is no print_dieline node', () => {
    const doc = createIRDocument({
      domain: 'packaging',
      canvas: {
        width: 200,
        height: 200,
        color_space: 'CMYK',
      },
    });
    // No print_dieline node in doc.objects!
    doc.objects = [
      { id: 'box_layout', type: 'rect', x: 10, y: 10, width: 100, height: 100 } as any,
    ];

    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'missing-dieline')).toBe(true);
  });

  it('passes if domain is packaging and contains a print_dieline node', () => {
    const doc = createIRDocument({
      domain: 'packaging',
      canvas: {
        width: 200,
        height: 200,
        color_space: 'CMYK',
      },
    });
    doc.objects = [
      { id: 'die_cut_knife', type: 'print_dieline', x: 10, y: 10, width: 100, height: 100 } as any,
    ];

    const res = validateHIR(doc);
    expect(res.valid).toBe(true);
  });

  it('triggers a warning in signage domain if content is placed outside the safe zone boundary', () => {
    const doc = createIRDocument({
      domain: 'signage',
      canvas: {
        width: 1000,
        height: 1000,
        color_space: 'sRGB',
      },
    });
    (doc as any).physical = {
      width_mm: 1000,
      height_mm: 1000,
      bleed_mm: 10,
      safe_zone_mm: 50, // Safe zone is 50mm from border (50 <= x <= 950)
      color_profile: 'sRGB',
    };
    // This node exceeds safe zone because x is 20 (which is < 50)
    doc.objects = [
      { id: 'logo', type: 'image', x: 20, y: 100, width: 100, height: 100 } as any,
    ];

    const res = validateHIR(doc);
    expect(res.valid).toBe(true); // Warnings do not fail validation
    expect(res.warnings).toBeDefined();
    expect(res.warnings!.some(w => w.keyword === 'exceeds-safe-zone')).toBe(true);
  });

  it('is valid if active_domains contains audio and visual for video domain', () => {
    const doc = createIRDocument({
      domain: 'video',
      canvas: {
        width: 1920,
        height: 1080,
        color_space: 'sRGB',
      },
    });
    doc.meta.active_domains = ['video', 'audio', 'visual'];

    const res = validateHIR(doc);
    expect(res.valid).toBe(true);
  });

  it('fails if active_domains has 3d on visual domain but canvas is not 3D viewport', () => {
    const doc = createIRDocument({
      domain: 'visual',
      canvas: {
        width: 800,
        height: 600,
        color_space: 'sRGB',
      },
    });
    doc.meta.active_domains = ['visual', '3d'];

    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'invalid-3d-canvas')).toBe(true);
  });
});
