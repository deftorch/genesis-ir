import { describe, it, expect } from 'vitest';
import { generateLIR } from '../index.js';
import { IRMIRDocument } from '@genesis/types';

describe('LIR Generation (Pass 7 — Static)', () => {
  it('should generate SVG instructions for MIR domain visual on web platform', () => {
    const mir: IRMIRDocument = {
      ir_id: 'doc-mir-visual',
      meta: {
        domain: 'visual',
        active_domains: ['visual'],
        schema_version: '1.0',
        tier: 'nano',
        max_tree_depth: 8,
        created_at: '',
        updated_at: '',
      },
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
      style_context: { tokens: {}, styles: {} },
      constraints: { max_nodes: 100, max_depth: 8, rules: [] },
      nodes: {},
      objects: [
        {
          id: 'r1',
          type: 'shape',
          parent_id: null,
          children: [],
          geometry: { x: 10, y: 10, width: 100, height: 100 },
          content: { kind: 'shape', shape_type: 'rect' },
        },
      ],
    };

    const lirDoc = generateLIR(mir, 'web');
    expect(lirDoc.target).toBe('web');
    expect(lirDoc.lir.type).toBe('web');
    const domInstructions = (lirDoc.lir as any).dom_instructions;
    expect(domInstructions.format).toBe('svg');
    expect(domInstructions.svg).toContain('<svg');
    expect(domInstructions.svg).toContain('<rect');
  });

  it('should generate canvas2d drawing instructions for MIR domain image_edit on web platform', () => {
    const mir: IRMIRDocument = {
      ir_id: 'doc-mir-image-edit',
      meta: {
        domain: 'image_edit',
        active_domains: ['image_edit'],
        schema_version: '1.0',
        tier: 'nano',
        max_tree_depth: 8,
        created_at: '',
        updated_at: '',
      },
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
      style_context: { tokens: {}, styles: {} },
      constraints: { max_nodes: 100, max_depth: 8, rules: [] },
      nodes: {},
      objects: [
        {
          id: 'r1',
          type: 'shape',
          parent_id: null,
          children: [],
          geometry: { x: 15, y: 25, width: 120, height: 130 },
          content: { kind: 'shape', shape_type: 'rect' },
        },
      ],
    };

    const lirDoc = generateLIR(mir, 'web');
    expect(lirDoc.target).toBe('web');
    expect(lirDoc.lir.type).toBe('web');
    const domInstructions = (lirDoc.lir as any).dom_instructions;
    expect(domInstructions.format).toBe('canvas2d');
    expect(domInstructions.instructions).toBeInstanceOf(Array);
    expect(domInstructions.instructions[0]).toEqual({
      id: 'r1',
      type: 'shape',
      x: 15,
      y: 25,
      width: 120,
      height: 130,
      style: {},
    });
  });
});
