import { describe, it, expect, vi } from 'vitest';
import { renderToCanvas2D } from '../index.js';
import { IRDocument } from '@genesis/types';

describe('Web Canvas 2D Renderer Backend', () => {
  it('should call ctx.fillRect with correct parameters for a rect shape', () => {
    const doc: IRDocument = {
      ir_id: 'doc-canvas-rect',
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
          geometry: { x: 20, y: 30, width: 120, height: 80 },
          content: {
            kind: 'shape',
            shape_type: 'rect',
          },
          style: {
            fill: '#FF00FF',
          },
        },
      ],
    };

    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillStyle: 'transparent',
      strokeStyle: 'transparent',
      lineWidth: 1,
    };

    renderToCanvas2D(doc, ctx);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.fillStyle).toBe('#FF00FF');
    expect(ctx.fillRect).toHaveBeenCalledWith(20, 30, 120, 80);
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('should map IRImageFilter brightness to canvas filter correctly', () => {
    const doc: IRDocument = {
      ir_id: 'doc-canvas-filter',
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
          geometry: { x: 0, y: 0, width: 100, height: 100 },
          content: {
            kind: 'shape',
            shape_type: 'rect',
          },
          style: {
            fill: '#000000',
            filters: [
              { type: 'brightness', value: 1.5 },
              { type: 'blur', value: 5 },
            ],
          },
        },
      ],
    };

    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      fillStyle: 'transparent',
      strokeStyle: 'transparent',
      lineWidth: 1,
      filter: '',
    };

    renderToCanvas2D(doc, ctx);

    expect(ctx.filter).toBe('brightness(150%) blur(5px)');
  });
});
