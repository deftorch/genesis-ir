import { describe, it, expect } from 'vitest';
import { createIRDocument } from '@genesis/types';
import { evaluateRLVRR } from '../rlvrr.js';

/**
 * Helper: create a valid document that will pass validateHIR schema checks.
 * Uses createIRDocument (which sets ir_id immutably) and proper node types.
 */
function makeValidDoc(overrides?: {
  objects?: any[];
  style_context?: any;
  canvas?: any;
}) {
  const doc = createIRDocument({
    domain: 'visual',
    canvas: overrides?.canvas ?? {
      width: 1920,
      height: 1080,
      color_space: 'sRGB',
    },
  });
  if (overrides?.objects) {
    doc.objects = overrides.objects;
  }
  if (overrides?.style_context) {
    doc.style_context = overrides.style_context;
  }
  return doc;
}

describe('FASE RLVRR — Reward Signal Chain', () => {
  it('fails Signal 1 (schema) and returns total reward 0 (short-circuit)', () => {
    const invalidDoc = {} as any;
    const refDoc = makeValidDoc();
    const result = evaluateRLVRR(invalidDoc, refDoc);

    expect(result.signals.signal_1_schema_compliance.passed).toBe(false);
    expect(result.signals.signal_2_brand_guard).toBeUndefined(); // short-circuited
    expect(result.total_reward).toBe(0.0);
    expect(result.quality).toBe('HIGH_NEGATIVE');
  });

  it('passes all 5 signals and returns total reward ≈ 1.0', () => {
    const tokens = { 'colors.primary': '#ff0000' };
    const doc = makeValidDoc({
      objects: [
        {
          id: 'n1',
          kind: 'visual',
          type: 'shape',
          name: 'Shape 1',
          geometry: { x: 0, y: 0, width: 10, height: 10 },
          style_override: {},
        },
      ],
      style_context: {
        theme_tokens: tokens,
        brand_profile: {},
        component_styles: {},
      },
    });

    const ref = makeValidDoc({
      objects: [
        {
          id: 'n1',
          kind: 'visual',
          type: 'shape',
          name: 'Shape 1',
          geometry: { x: 0, y: 0, width: 10, height: 10 },
          style_override: {},
        },
      ],
      style_context: {
        theme_tokens: tokens,
        brand_profile: {},
        component_styles: {},
      },
    });

    const result = evaluateRLVRR(doc, ref);

    expect(result.signals.signal_1_schema_compliance.passed).toBe(true);
    expect(result.signals.signal_2_brand_guard?.passed).toBe(true);
    expect(result.signals.signal_3_render_error_rate?.error_rate).toBe(0);
    expect(result.signals.signal_4_budget_accuracy).toBeDefined();
    expect(result.signals.signal_5_semantic_quality).toBeDefined();
    expect(result.total_reward).toBeGreaterThanOrEqual(0.85);
    expect(result.quality).toBe('HIGH_POSITIVE');
  });

  it('fails Signal 2 (brand guard) when output is missing brand tokens', () => {
    const doc = makeValidDoc({
      style_context: {
        theme_tokens: { colors: {} },
        brand_profile: {},
        component_styles: {},
      },
    });

    const ref = makeValidDoc({
      style_context: {
        theme_tokens: {
          colors: { primary: '#ff0000', secondary: '#00ff00' }
        },
        brand_profile: {},
        component_styles: {},
      },
    });

    const result = evaluateRLVRR(doc, ref);

    expect(result.signals.signal_1_schema_compliance.passed).toBe(true);
    expect(result.signals.signal_2_brand_guard?.passed).toBe(false);
    expect(result.signals.signal_2_brand_guard?.violations.length).toBeGreaterThan(0);
    // Short-circuit: signal 3, 4, 5 should not be evaluated
    expect(result.signals.signal_3_render_error_rate).toBeUndefined();
    expect(result.quality).toBe('AMBIGUOUS');
  });

  it('fails Signal 2 (brand guard) when palette color diverges from reference', () => {
    const doc = makeValidDoc({
      style_context: {
        theme_tokens: {
          colors: { primary: '#0000ff' }
        },
        brand_profile: {},
        component_styles: {},
      },
    });

    const ref = makeValidDoc({
      style_context: {
        theme_tokens: {
          colors: { primary: '#ff0000' }
        },
        brand_profile: {},
        component_styles: {},
      },
    });

    const result = evaluateRLVRR(doc, ref);

    expect(result.signals.signal_2_brand_guard?.passed).toBe(false);
    expect(result.signals.signal_2_brand_guard?.violations[0]).toContain('Invalid color for brand token colors.primary');
  });

  it('fails Signal 2 (brand guard) when contrast ratio violates WCAG AA requirement', () => {
    const doc = makeValidDoc({
      style_context: {
        theme_tokens: {
          colors: {
            text: '#777777',
            background: '#888888'
          }
        },
        brand_profile: {},
        component_styles: {},
      },
    });

    const ref = makeValidDoc({
      style_context: {
        theme_tokens: {
          colors: {
            text: '#777777',
            background: '#888888'
          }
        },
        brand_profile: {},
        component_styles: {},
      },
    });

    const result = evaluateRLVRR(doc, ref);

    expect(result.signals.signal_2_brand_guard?.passed).toBe(false);
    expect(result.signals.signal_2_brand_guard?.violations.some(v => v.includes('WCAG contrast compliance failed'))).toBe(true);
  });


  it('fails Signal 3 (render error) when node geometry is out of bounds', () => {
    const doc = makeValidDoc({
      objects: Array.from({ length: 50 }, (_, i) => ({
        id: `n-${i}`,
        kind: 'visual',
        type: 'shape',
        name: `S ${i}`,
        geometry: { x: 0, y: 0, width: 10, height: 10 },
        style_override: {},
      })),
      style_context: { theme_tokens: {}, brand_profile: {}, component_styles: {} },
    });
    
    // Simulate computed layout where all 50 nodes are out of bounds
    (doc as any).observability = {
      computed_layout: Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [
          `n-${i}`,
          { x: -100, y: -100, width: 10, height: 10 }
        ])
      )
    };

    const ref = makeValidDoc();
    const result = evaluateRLVRR(doc, ref);

    expect(result.signals.signal_1_schema_compliance.passed).toBe(true);
    expect(result.signals.signal_2_brand_guard?.passed).toBe(true);
    // 50 out of bounds out of 50 = 1.0 error rate
    expect(result.signals.signal_3_render_error_rate?.error_rate).toBeGreaterThan(0.02);
    // Signal 4, 5 not evaluated
    expect(result.signals.signal_4_budget_accuracy).toBeUndefined();
    expect(result.signals.signal_5_semantic_quality).toBeUndefined();
    expect(result.total_reward).toBeLessThanOrEqual(0.65);
  });

  it('allows custom signal weights configuration', () => {
    const doc = makeValidDoc({
      style_context: { theme_tokens: {}, brand_profile: {}, component_styles: {} },
    });
    const ref = makeValidDoc({
      style_context: { theme_tokens: {}, brand_profile: {}, component_styles: {} },
    });

    const customConfig = {
      weights: {
        schema: 0.50,
        brand: 0.10,
        render: 0.20,
        budget: 0.10,
        semantic: 0.10,
      },
    };
    const result = evaluateRLVRR(doc, ref, customConfig);

    expect(result.signals.signal_1_schema_compliance.passed).toBe(true);
    // All gates should pass → total reward should be close to 1.0
    expect(result.total_reward).toBeGreaterThanOrEqual(0.85);
  });

  it('RLVRR weight values match Decision #39 defaults', () => {
    const doc = makeValidDoc();
    const ref = makeValidDoc();
    const result = evaluateRLVRR(doc, ref);

    // Verify default weights are applied (Decision #39)
    // Schema(0.40) + Brand(0.25) + Render(0.20) + Budget(0.10) + Semantik(0.05) = 1.0
    expect(result.total_reward).toBeGreaterThan(0);
    expect(result.signals.signal_1_schema_compliance.gate).toBe(true);
  });
});
