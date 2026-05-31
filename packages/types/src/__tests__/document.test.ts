import { describe, it, expect } from 'vitest';
import { canTransition, IRDocumentLifecycleStatus, createIRDocument } from '../document.js';

const context = describe;

describe('document lifecycle & factory', () => {
  context('canTransition', () => {
    it('should allow forward transitions', () => {
      expect(canTransition('draft', 'experiment')).toBe(true);
      expect(canTransition('draft', 'staging')).toBe(true);
      expect(canTransition('staging', 'production')).toBe(true);
      expect(canTransition('production', 'deprecated')).toBe(true);
      expect(canTransition('deprecated', 'archived')).toBe(true);
    });

    it('should disallow downgrade transitions (backward)', () => {
      expect(canTransition('production', 'draft')).toBe(false);
      expect(canTransition('staging', 'draft')).toBe(false);
      expect(canTransition('archived', 'production')).toBe(false);
      expect(canTransition('deprecated', 'staging')).toBe(false);
    });

    it('should disallow transition to the same state', () => {
      expect(canTransition('draft', 'draft')).toBe(false);
      expect(canTransition('production', 'production')).toBe(false);
    });
  });

  context('createIRDocument factory', () => {
    it('should auto-generate UUID v4 and set default metadata fields', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: {
          width: 800,
          height: 600,
          color_space: 'sRGB',
        },
      });

      expect(doc.ir_id).toBeDefined();
      // UUID v4 format regex
      expect(doc.ir_id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(doc.meta.domain).toBe('visual');
      expect(doc.meta.schema_version).toBe('1.0');
      expect(doc.meta.tier).toBe('core');
      expect(doc.meta.lifecycle_status).toBe('draft');
      expect(doc.meta.max_tree_depth).toBe(64);
    });

    it('should make ir_id immutable', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: {
          width: 800,
          height: 600,
          color_space: 'sRGB',
        },
      });

      const originalId = doc.ir_id;
      
      // Attempting to overwrite should throw or be ignored depending on implementation.
      // Since TypeScript strict might block write, we can test it using Object.getOwnPropertyDescriptor or attempting delete/redefine or verify it throws in strict mode
      expect(() => {
        (doc as any).ir_id = 'new-id';
      }).toThrow();
      expect(doc.ir_id).toBe(originalId);
    });
  });
});

