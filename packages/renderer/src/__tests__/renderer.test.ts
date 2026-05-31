import { describe, it, expect } from 'vitest';
import { renderToSVG } from '../index.js';
import { IRDocument } from '@genesis/types';

const context = describe;

describe('renderer', () => {
  context('renderToSVG', () => {
    it('should return SVG string containing root element', () => {
      const doc: IRDocument = {
        ir_id: 'e207908b-b8df-4158-963d-4c3e41416e9b',
        meta: {
          domain: 'visual',
          active_domains: ['visual'],
          schema_version: '1.0',
          tier: 'nano',
          max_tree_depth: 8,
          created_at: '',
          updated_at: '',
        },
        canvas: {
          width: 800,
          height: 600,
          color_space: 'sRGB',
        },
        nodes: {},
      };
      const svg = renderToSVG(doc);
      expect(svg).toContain('<svg');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    });
  });
});
