import { describe, it, expect } from 'vitest';
import { validateHIR, validateTierLimits } from '../index.js';
import { createIRDocument, IRNode } from '@genesis/types';

const context = describe;

describe('schema', () => {
  context('validateHIR', () => {
    const validMeta = {
      domain: 'visual',
      active_domains: ['visual'],
      schema_version: '1.0',
      ir_version: '1.0.0',
      created_at: new Date().toISOString(),
      created_by: 'human',
      session_id: 'test-session',
      tier: 'core',
      lifecycle_status: 'draft',
      max_tree_depth: 32,
    };

    const validCanvas = {
      canvas_type: 'standard',
      width: 1920,
      height: 1080,
      platform: 'web',
    };

    const validDoc = {
      ir_id: 'e207908b-b8df-4158-963d-4c3e41416e9b',
      meta: validMeta,
      canvas: validCanvas,
      style_context: {
        theme_tokens: {},
        brand_profile: {},
        component_styles: {},
      },
      objects: [],
      constraints: {
        max_nodes: 100,
        max_depth: 32,
        rules: [],
      },
      nodes: {},
    };

    it('should validate a complete valid document', () => {
      expect(validateHIR(validDoc).valid).toBe(true);
    });

    it('should invalidate an empty object or null', () => {
      expect(validateHIR(null).valid).toBe(false);
      expect(validateHIR({}).valid).toBe(false);
    });

    it('should fail if ir_id is missing', () => {
      const doc = { ...validDoc };
      delete (doc as any).ir_id;
      expect(validateHIR(doc).valid).toBe(false);
    });

    it('should fail if ir_id is not a valid UUID v4', () => {
      const doc = { ...validDoc, ir_id: 'not-a-uuid' };
      expect(validateHIR(doc).valid).toBe(false);
    });

    it('should fail if meta.domain is missing or empty', () => {
      const doc = {
        ...validDoc,
        meta: { ...validMeta, domain: '' },
      };
      expect(validateHIR(doc).valid).toBe(false);
    });

    it('should fail if meta.schema_version is not "1.0"', () => {
      const doc = {
        ...validDoc,
        meta: { ...validMeta, schema_version: '2.0' },
      };
      expect(validateHIR(doc).valid).toBe(false);
    });

    it('should fail if meta.tier is not nano, core, or full', () => {
      const doc = {
        ...validDoc,
        meta: { ...validMeta, tier: 'invalid-tier' },
      };
      expect(validateHIR(doc).valid).toBe(false);
    });

    it('should fail if meta.max_tree_depth is greater than 64', () => {
      const doc = {
        ...validDoc,
        meta: { ...validMeta, max_tree_depth: 65 },
      };
      expect(validateHIR(doc).valid).toBe(false);
    });

    it('should fail validation when unknown fields are present at the root level', () => {
      const doc = {
        ...validDoc,
        extra_unknown_field: 'not-allowed',
      };
      const result = validateHIR(doc);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.keyword === 'additionalProperties')).toBe(true);
    });
  });

  context('validateTierLimits', () => {
    it('should allow valid nano documents', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
        tier: 'nano',
      });
      const result = validateTierLimits(doc);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject nano documents with > 100 nodes', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
        tier: 'nano',
      });
      const nodes: IRNode[] = [];
      for (let i = 0; i < 101; i++) {
        nodes.push({
          id: `node-${i}`,
          type: 'shape',
          parent_id: null,
          children: [],
        });
      }
      doc.objects = nodes;

      const result = validateTierLimits(doc);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('exceeds max node limit'))).toBe(true);
    });

    it('should reject nano documents with tree depth > 8', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
        tier: 'nano',
      });
      // Build a chain of 9 nodes
      const nodes: IRNode[] = [];
      for (let i = 0; i < 9; i++) {
        nodes.push({
          id: `node-${i}`,
          type: 'shape',
          parent_id: i === 0 ? null : `node-${i - 1}`,
          children: i === 8 ? [] : [`node-${i + 1}`],
        });
      }
      doc.objects = nodes;

      const result = validateTierLimits(doc);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('exceeds max tree depth'))).toBe(true);
    });

    it('should reject core documents with > 1,000 nodes', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
        tier: 'core',
      });
      const nodes: IRNode[] = [];
      for (let i = 0; i < 1001; i++) {
        nodes.push({
          id: `node-${i}`,
          type: 'shape',
          parent_id: null,
          children: [],
        });
      }
      doc.objects = nodes;

      const result = validateTierLimits(doc);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('exceeds max node limit'))).toBe(true);
    });

    it('should reject core documents with tree depth > 32', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
        tier: 'core',
      });
      const nodes: IRNode[] = [];
      for (let i = 0; i < 33; i++) {
        nodes.push({
          id: `node-${i}`,
          type: 'shape',
          parent_id: i === 0 ? null : `node-${i - 1}`,
          children: i === 32 ? [] : [`node-${i + 1}`],
        });
      }
      doc.objects = nodes;

      const result = validateTierLimits(doc);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('exceeds max tree depth'))).toBe(true);
    });

    it('should reject nano documents with external assets or plugins', () => {
      // Test external asset
      const docAsset = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
        tier: 'nano',
      });
      docAsset.objects = [
        {
          id: 'node-1',
          type: 'image',
          parent_id: null,
          children: [],
          content: {
            kind: 'image',
            asset_id: 'asset://external-image.png',
          },
        },
      ];
      let result = validateTierLimits(docAsset);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('external asset'))).toBe(true);

      // Test plugin registry snapshot
      const docPlugin = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
        tier: 'nano',
      });
      (docPlugin as any).plugin_registry_snapshot = {
        required_plugins: [{ name: '@genesis/my-plugin', version: '1.0.0' }],
      };
      result = validateTierLimits(docPlugin);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('plugin'))).toBe(true);
    });
  });
});


