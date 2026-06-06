import { describe, it, expect } from 'vitest';
import {
  createDocument,
  validate,
  compile,
  renderSVG,
  exportToGIR,
  importFromGIR,
  transitionStatus,
  addNode,
  removeNode,
  SDK_VERSION,
  SDK_INFO,
  isValidIRDomain,
  ALL_IR_DOMAINS,
  CANVAS_PRESETS,
  TIER_CONSTRAINTS,
} from '../index.js';

describe('@genesis/sdk — Public API', () => {
  // ─── createDocument ─────────────────────────────────────────
  describe('createDocument()', () => {
    it('should create a valid visual document', () => {
      const doc = createDocument({
        domain: 'visual',
        canvas: { width: 1920, height: 1080, color_space: 'sRGB' },
      });
      expect(doc.ir_id).toBeDefined();
      expect(doc.ir_id).toMatch(
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      );
      expect(doc.meta.domain).toBe('visual');
      expect(doc.meta.schema_version).toBe('1.0');
      expect(doc.meta.lifecycle_status).toBe('draft');
      expect(doc.objects).toEqual([]);
    });

    it('should reject invalid domain', () => {
      expect(() =>
        createDocument({
          domain: 'invalid_domain' as any,
          canvas: { width: 100, height: 100, color_space: 'sRGB' },
        })
      ).toThrow('Invalid domain');
    });

    it('should create document with specific tier', () => {
      const doc = createDocument({
        domain: 'print',
        canvas: { width: 210, height: 297, color_space: 'CMYK', dpi: 300 },
        tier: 'nano',
      });
      expect(doc.meta.tier).toBe('nano');
      expect(doc.constraints.max_nodes).toBe(100);
    });

    it('should produce immutable ir_id', () => {
      const doc = createDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      const originalId = doc.ir_id;
      expect(() => {
        (doc as any).ir_id = 'tampered-id';
      }).toThrow();
      expect(doc.ir_id).toBe(originalId);
    });
  });

  // ─── validate ───────────────────────────────────────────────
  describe('validate()', () => {
    it('should validate a correct document', () => {
      const doc = createDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      const result = validate(doc);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a document without ir_id', () => {
      const result = validate({
        meta: { domain: 'visual', schema_version: '1.0' },
        canvas: {},
        style_context: {},
        objects: [],
        constraints: {},
        nodes: {},
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ─── compile ────────────────────────────────────────────────
  describe('compile()', () => {
    it('should compile a minimal visual document', () => {
      const doc = createDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      const result = compile(doc);
      expect(result.success).toBe(true);
      expect(result.lir).toBeDefined();
    });

    it('should reject archived documents', () => {
      const doc = createDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      (doc.meta as any).lifecycle_status = 'archived';
      const result = compile(doc);
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('archived');
    });
  });

  // ─── renderSVG ──────────────────────────────────────────────
  describe('renderSVG()', () => {
    it('should render a visual document to SVG string', () => {
      const doc = createDocument({
        domain: 'visual',
        canvas: { width: 400, height: 300, color_space: 'sRGB' },
      });
      const svg = renderSVG(doc);
      expect(svg).toContain('<svg');
      expect(svg).toContain('400');
      expect(svg).toContain('300');
    });
  });

  // ─── GIR Binary Serialization ──────────────────────────────
  describe('exportToGIR() / importFromGIR()', () => {
    it('should round-trip serialize and deserialize a document', () => {
      const doc = createDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      const buffer = exportToGIR(doc);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer[0]).toBe(0x47); // G
      expect(buffer[1]).toBe(0x49); // I
      expect(buffer[2]).toBe(0x52); // R
      expect(buffer[3]).toBe(0x21); // !

      const restored = importFromGIR(buffer);
      expect(restored.ir_id).toBe(doc.ir_id);
      expect(restored.meta.domain).toBe('visual');
    });
  });

  // ─── transitionStatus ──────────────────────────────────────
  describe('transitionStatus()', () => {
    it('should allow forward transitions', () => {
      const doc = createDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      const staged = transitionStatus(doc, 'staging');
      expect(staged.meta.lifecycle_status).toBe('staging');
      expect(staged.meta.updated_at).toBeDefined();
      expect(doc.meta.lifecycle_status).toBe('draft');
    });

    it('should reject backward transitions', () => {
      const doc = createDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      const production = transitionStatus(
        transitionStatus(
          transitionStatus(doc, 'experiment'),
          'staging'
        ),
        'production'
      );
      expect(() => transitionStatus(production, 'draft')).toThrow('forward-only');
    });
  });

  // ─── addNode / removeNode ──────────────────────────────────
  describe('addNode() / removeNode()', () => {
    it('should add a node immutably', () => {
      const doc = createDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      const node = {
        id: 'node-001',
        type: 'shape' as const,
        parent_id: null,
        children: [],
        geometry: { x: 0, y: 0, width: 100, height: 100 },
        content: { kind: 'shape' as const, shape_type: 'rect' as const },
      };
      const newDoc = addNode(doc, node);
      expect(newDoc.objects).toHaveLength(1);
      expect(newDoc.objects[0].id).toBe('node-001');
      expect(doc.objects).toHaveLength(0);
    });

    it('should remove a node by ID immutably', () => {
      const doc = createDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      const node = {
        id: 'node-to-remove',
        type: 'text' as const,
        parent_id: null,
        children: [],
      };
      const withNode = addNode(doc, node);
      const withoutNode = removeNode(withNode, 'node-to-remove');
      expect(withoutNode.objects).toHaveLength(0);
      expect(withNode.objects).toHaveLength(1);
    });
  });

  // ─── Re-exports verification ───────────────────────────────
  describe('Re-exports', () => {
    it('should export ALL_IR_DOMAINS with 17 domains', () => {
      expect(ALL_IR_DOMAINS).toHaveLength(17);
    });

    it('should export isValidIRDomain()', () => {
      expect(isValidIRDomain('visual')).toBe(true);
      expect(isValidIRDomain('fake_domain')).toBe(false);
    });

    it('should export CANVAS_PRESETS', () => {
      expect(CANVAS_PRESETS.A4).toBeDefined();
      expect(CANVAS_PRESETS.A4.width).toBe(210);
      expect(CANVAS_PRESETS['1080p'].width).toBe(1920);
    });

    it('should export TIER_CONSTRAINTS', () => {
      expect(TIER_CONSTRAINTS.nano.maxNodes).toBe(100);
      expect(TIER_CONSTRAINTS.core.maxNodes).toBe(1000);
      expect(TIER_CONSTRAINTS.full.maxNodes).toBe(100000);
    });
  });

  // ─── SDK Metadata ──────────────────────────────────────────
  describe('SDK metadata', () => {
    it('should have correct version', () => {
      expect(SDK_VERSION).toBe('1.0.0');
    });

    it('should have correct SDK_INFO', () => {
      expect(SDK_INFO.name).toBe('@genesis/sdk');
      expect(SDK_INFO.locked_domains).toBe(17);
      expect(SDK_INFO.locked_architectural_decisions).toBe(40);
      expect(SDK_INFO.compiler_passes).toBe(9);
    });
  });
});
