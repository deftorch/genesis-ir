import { describe, it, expect } from 'vitest';
import { computeLayout } from '../layout.js';
import { IRDocument } from '@genesis/types';

describe('Layout Computation Engine', () => {
  it('should compute absolute coordinates for absolute layout nodes', () => {
    const doc: IRDocument = {
      ir_id: 'doc-1',
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
          id: 'parent',
          type: 'shape',
          parent_id: null,
          children: ['child'],
          geometry: { x: 10, y: 20, width: 200, height: 200 },
        },
        {
          id: 'child',
          type: 'shape',
          parent_id: 'parent',
          children: [],
          geometry: { x: 5, y: 15, width: 50, height: 50 },
        },
      ],
    };

    const layout = computeLayout(doc);
    expect(layout['parent']).toEqual({ x: 10, y: 20, width: 200, height: 200 });
    expect(layout['child']).toEqual({ x: 15, y: 35, width: 50, height: 50 });
  });

  it('should compute bounding box for group nodes based on their children', () => {
    const doc: IRDocument = {
      ir_id: 'doc-1',
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
          id: 'grp',
          type: 'group',
          parent_id: null,
          children: ['c1', 'c2'],
          geometry: { x: 100, y: 100, width: 0, height: 0 }, // group width/height should be computed
        },
        {
          id: 'c1',
          type: 'shape',
          parent_id: 'grp',
          children: [],
          geometry: { x: 10, y: 10, width: 50, height: 50 },
        },
        {
          id: 'c2',
          type: 'shape',
          parent_id: 'grp',
          children: [],
          geometry: { x: 40, y: 30, width: 100, height: 80 },
        },
      ],
    };

    const layout = computeLayout(doc);
    // Bounding box:
    // minX = 10, maxX = 40 + 100 = 140 -> width = 130
    // minY = 10, maxY = 30 + 80 = 110 -> height = 100
    expect(layout['grp'].width).toBe(130);
    expect(layout['grp'].height).toBe(100);
    expect(layout['grp'].x).toBe(100);
    expect(layout['grp'].y).toBe(100);

    // Absolute child positions: parent pos + child local pos
    expect(layout['c1']).toEqual({ x: 110, y: 110, width: 50, height: 50 });
    expect(layout['c2']).toEqual({ x: 140, y: 130, width: 100, height: 80 });
  });

  it('should compute correct absolute layout for flex layout nodes (row direction)', () => {
    const doc: IRDocument = {
      ir_id: 'doc-1',
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
          id: 'flex',
          type: 'flex_container',
          parent_id: null,
          children: ['c1', 'c2'],
          geometry: { x: 50, y: 50, width: 300, height: 100 },
          style: {
            flex_direction: 'row',
            gap: 10,
            justify_content: 'center',
            align_items: 'center',
          },
        },
        {
          id: 'c1',
          type: 'shape',
          parent_id: 'flex',
          children: [],
          geometry: { x: 0, y: 0, width: 50, height: 40 },
        },
        {
          id: 'c2',
          type: 'shape',
          parent_id: 'flex',
          children: [],
          geometry: { x: 0, y: 0, width: 70, height: 60 },
        },
      ],
    };

    const layout = computeLayout(doc);
    // Row math:
    // Children width total = 50 + 70 = 120. Gaps total = 10. Total size = 130.
    // justifyContent: center -> mainStartOffset = (300 - 130) / 2 = 85.
    // Child 1: relative x = 85, absolute x = 50 + 85 = 135.
    // alignItems: center -> relative y = (100 - 40) / 2 = 30. absolute y = 50 + 30 = 80.
    // Child 2: relative x = 85 + 50 + 10 = 145, absolute x = 50 + 145 = 195.
    // alignItems: center -> relative y = (100 - 60) / 2 = 20. absolute y = 50 + 20 = 70.

    expect(layout['flex']).toEqual({ x: 50, y: 50, width: 300, height: 100 });
    expect(layout['c1']).toEqual({ x: 135, y: 80, width: 50, height: 40 });
    expect(layout['c2']).toEqual({ x: 195, y: 70, width: 70, height: 60 });
  });

  it('should apply min_width and max_width constraints correctly during layout', () => {
    const doc: IRDocument = {
      ir_id: 'doc-1',
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
          id: 'n1',
          type: 'shape',
          parent_id: null,
          children: [],
          geometry: { x: 0, y: 0, width: 50, height: 50 },
          style: { min_width: 100, max_width: 150 },
        },
        {
          id: 'n2',
          type: 'shape',
          parent_id: null,
          children: [],
          geometry: { x: 0, y: 0, width: 250, height: 50 },
          style: { min_width: 100, max_width: 150 },
        },
      ],
    };

    const layout = computeLayout(doc);
    expect(layout['n1'].width).toBe(100); // Clamped to min_width
    expect(layout['n2'].width).toBe(150); // Clamped to max_width
  });
});
