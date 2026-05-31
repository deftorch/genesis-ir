import { describe, it, expect } from 'vitest';
import { renderToSVG } from '../index.js';
import { IRDocument } from '@genesis/types';

describe('SVG Renderer Backend', () => {
  it('should render shape content type rect to a valid <rect> SVG element', () => {
    const doc: IRDocument = {
      ir_id: 'doc-rect',
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
          geometry: { x: 10, y: 20, width: 100, height: 150 },
          content: {
            kind: 'shape',
            shape_type: 'rect',
            corner_radius: 5,
          },
          style: {
            fill: '#FF0000',
            stroke: '#000000',
            stroke_width: 2,
          },
        },
      ],
    };

    const svg = renderToSVG(doc);
    expect(svg).toContain('<rect x="10" y="20" width="100" height="150" rx="5" fill="#FF0000" stroke="#000000" stroke-width="2" />');
  });

  it('should render shape content type ellipse to a valid <ellipse> SVG element', () => {
    const doc: IRDocument = {
      ir_id: 'doc-ellipse',
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
          id: 'e1',
          type: 'shape',
          parent_id: null,
          children: [],
          geometry: { x: 50, y: 60, width: 80, height: 100 },
          content: {
            kind: 'shape',
            shape_type: 'ellipse',
          },
          style: {
            fill: '#00FF00',
          },
        },
      ],
    };

    const svg = renderToSVG(doc);
    // cx = 50 + 40 = 90, cy = 60 + 50 = 110, rx = 40, ry = 50
    expect(svg).toContain('<ellipse cx="90" cy="110" rx="40" ry="50" fill="#00FF00"');
  });

  it('should render svg_path content type to a valid <path> SVG element inside a translate group', () => {
    const doc: IRDocument = {
      ir_id: 'doc-path',
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
          id: 'p1',
          type: 'svg_path',
          parent_id: null,
          children: [],
          geometry: { x: 15, y: 25, width: 100, height: 100 },
          content: {
            kind: 'svg_path',
            d: 'M 10 10 H 90 V 90 H 10 Z',
          },
        },
      ],
    };

    const svg = renderToSVG(doc);
    expect(svg).toContain('<g transform="translate(15, 25)"><path d="M 10 10 H 90 V 90 H 10 Z"');
  });

  it('should render text content to a valid <text> SVG element', () => {
    const doc: IRDocument = {
      ir_id: 'doc-text',
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
          id: 't1',
          type: 'text',
          parent_id: null,
          children: [],
          geometry: { x: 30, y: 40, width: 200, height: 30 },
          content: {
            kind: 'text',
            raw: 'Hello Genesis',
          },
          style: {
            font_family: 'Arial',
            font_size: 24,
            font_weight: 'bold',
            fill: '#0000FF',
          },
        },
      ],
    };

    const svg = renderToSVG(doc);
    // y = 40 + fontSize(24) = 64
    expect(svg).toContain('<text x="30" y="64" font-family="Arial" font-size="24" font-weight="bold" fill="#0000FF" stroke="none" stroke-width="1">Hello Genesis</text>');
  });

  it('should render style properties opacity and blend_mode correctly to SVG', () => {
    const doc: IRDocument = {
      ir_id: 'doc-styles',
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
          content: { kind: 'shape', shape_type: 'rect' },
          style: {
            opacity: 0.5,
            blend_mode: 'multiply',
          },
        },
      ],
    };

    const svg = renderToSVG(doc);
    expect(svg).toContain('opacity="0.5"');
    expect(svg).toContain('style="mix-blend-mode: multiply;"');
  });
});
