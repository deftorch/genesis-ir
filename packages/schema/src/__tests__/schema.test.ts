import { describe, it, expect } from 'vitest';
import { validateHIR } from '../index.js';

const context = describe;

describe('schema', () => {
  context('validateHIR', () => {
    it('should validate a document with valid ir_id and meta', () => {
      const doc = {
        ir_id: 'e207908b-b8df-4158-963d-4c3e41416e9b',
        meta: {
          domain: 'visual',
          schema_version: '1.0',
        },
      };
      expect(validateHIR(doc)).toBe(true);
    });

    it('should invalidate an empty object or null', () => {
      expect(validateHIR(null)).toBe(false);
      expect(validateHIR({})).toBe(false);
    });
  });
});
