import { describe, it, expect } from 'vitest';
import { isNodeAllowedInDomain, applyTransform, IRGeometry, IRMatrix2D } from '../nodes.js';

describe('nodes registry & transform', () => {
  describe('isNodeAllowedInDomain static registry', () => {
    it('should reject music_track in visual domain', () => {
      expect(isNodeAllowedInDomain('music_track', 'visual')).toBe(false);
    });

    it('should allow glyph only in font_design domain', () => {
      expect(isNodeAllowedInDomain('glyph', 'font_design')).toBe(true);
      expect(isNodeAllowedInDomain('glyph', 'visual')).toBe(false);
      expect(isNodeAllowedInDomain('glyph', 'diagram')).toBe(false);
    });

    it('should allow bpmn_element only in diagram domain', () => {
      expect(isNodeAllowedInDomain('bpmn_element', 'diagram')).toBe(true);
      expect(isNodeAllowedInDomain('bpmn_element', 'visual')).toBe(false);
    });
  });

  describe('applyTransform affine matrix composition', () => {
    it('should treat identity matrix as identity transform', () => {
      const geo: IRGeometry = {
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      };

      const identityMatrix: IRMatrix2D = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        tx: 0,
        ty: 0,
      };

      const transformed = applyTransform(geo, identityMatrix);
      expect(transformed.x).toBe(10);
      expect(transformed.y).toBe(20);
      expect(transformed.transform?.a).toBe(1);
      expect(transformed.transform?.d).toBe(1);
    });

    it('should compose translations and matrices correctly', () => {
      const geo: IRGeometry = {
        x: 10,
        y: 20,
        width: 100,
        height: 50,
        transform: {
          a: 2,
          b: 0,
          c: 0,
          d: 2,
          tx: 5,
          ty: 5,
        },
      };

      const translateMatrix: IRMatrix2D = {
        a: 1,
        b: 0,
        c: 0,
        d: 1,
        tx: 10,
        ty: 10,
      };

      const transformed = applyTransform(geo, translateMatrix);
      // newX = 1*10 + 0*20 + 10 = 20
      // newY = 0*10 + 1*20 + 10 = 30
      expect(transformed.x).toBe(20);
      expect(transformed.y).toBe(30);

      // Composed transform matrix M2 * M1
      // a3 = a2*a1 + c2*b1 = 1*2 + 0*0 = 2
      // tx3 = a2*tx1 + c2*ty1 + tx2 = 1*5 + 0*5 + 10 = 15
      // ty3 = b2*tx1 + d2*ty1 + ty2 = 0*5 + 1*5 + 10 = 15
      expect(transformed.transform?.a).toBe(2);
      expect(transformed.transform?.tx).toBe(15);
      expect(transformed.transform?.ty).toBe(15);
    });
  });
});
