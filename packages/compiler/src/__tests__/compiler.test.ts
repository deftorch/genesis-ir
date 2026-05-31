import { describe, it, expect } from 'vitest';
import { compileDocument } from '../index.js';

const context = describe;

describe('compiler', () => {
  context('compileDocument', () => {
    it('should successfully compile a valid document', () => {
      const doc = {
        ir_id: 'e207908b-b8df-4158-963d-4c3e41416e9b',
        meta: {
          domain: 'visual',
          schema_version: '1.0',
        },
      };
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
  });
});
