import { describe, it, expect } from 'vitest';
import { compileDocument } from '../index.js';
import { createIRDocument } from '@genesis/types';

const context = describe;

describe('compiler', () => {
  context('compileDocument', () => {
    it('should successfully compile a valid document', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: {
          width: 800,
          height: 600,
          color_space: 'sRGB',
        },
      });
      const result = compileDocument(doc);
      expect(result.success).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should return errors for an invalid document', () => {
      const doc = {};
      const result = compileDocument(doc);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject compilation if document lifecycle status is archived', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: {
          width: 800,
          height: 600,
          color_space: 'sRGB',
        },
        lifecycle_status: 'archived',
      });
      const result = compileDocument(doc);
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cannot compile archived document');
    });
  });
});

