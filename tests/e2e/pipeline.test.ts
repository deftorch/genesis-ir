/**
 * E2E Integration Tests — Full Pipeline
 *
 * These tests exercise the complete Genesis IR pipeline from document
 * creation through compilation to rendered output. They verify
 * cross-package integration without mocking.
 */
import { describe, it, expect } from 'vitest';
import {
  createIRDocument,
  IRDocument,
  IRNode,
  isNodeAllowedInDomain,
  canTransition,
} from '../../packages/types/src/index.js';
import { validateHIR, runPass3, validateCanvas, validateNodes } from '../../packages/schema/src/index.js';
import { compileDocument, serializeToGIR, deserializeFromGIR } from '../../packages/compiler/src/index.js';
import { renderToSVG, computeLayout, generateLIR } from '../../packages/renderer/src/index.js';

// ─── Helper: Create a minimal valid document ─────────────────
function createMinimalVisualDoc(): IRDocument {
  return createIRDocument({
    domain: 'visual',
    canvas: { width: 800, height: 600, color_space: 'sRGB' },
    tier: 'core',
  });
}

function createVisualDocWithNodes(): IRDocument {
  const doc = createMinimalVisualDoc();
  doc.objects = [
    {
      id: 'rect-1',
      type: 'shape',
      parent_id: null,
      children: [],
      geometry: { x: 10, y: 20, width: 200, height: 100 },
      content: { kind: 'shape', shape_type: 'rect', corner_radius: 8 },
    } as IRNode,
    {
      id: 'text-1',
      type: 'text',
      parent_id: null,
      children: [],
      geometry: { x: 50, y: 50, width: 300, height: 40 },
      content: { kind: 'text', raw: 'Hello Genesis IR', text_align: 'center' },
    } as IRNode,
    {
      id: 'img-1',
      type: 'image',
      parent_id: null,
      children: [],
      geometry: { x: 400, y: 100, width: 150, height: 150 },
      content: { kind: 'image', asset_id: 'asset://test-image-001', fit: 'fill' },
    } as IRNode,
  ];
  return doc;
}

// ═══════════════════════════════════════════════════════════════
// E2E 1: Visual Domain → SVG Output
// ═══════════════════════════════════════════════════════════════
describe('E2E: Visual Domain → SVG Pipeline', () => {
  it('should create → validate → compile → SVG a visual document', () => {
    // Step 1: Create
    const doc = createVisualDocWithNodes();
    expect(doc.ir_id).toBeDefined();
    expect(doc.objects).toHaveLength(3);

    // Step 2: Validate HIR
    const validation = validateHIR(doc);
    expect(validation.valid).toBe(true);

    // Step 3: Canvas validation
    const canvasResult = validateCanvas(doc);
    expect(canvasResult.valid).toBe(true);

    // Step 4: Node domain validation
    const nodesResult = validateNodes(doc);
    expect(nodesResult.valid).toBe(true);

    // Step 5: Semantic Pass 3
    const semanticResult = runPass3(doc);
    expect(semanticResult.valid).toBe(true);

    // Step 6: Compile
    const compilation = compileDocument(doc);
    expect(compilation.success).toBe(true);
    expect(compilation.lir).toBeDefined();

    // Step 7: SVG Render
    const svg = renderToSVG(doc);
    expect(svg).toContain('<svg');
    expect(svg).toContain('800');
    expect(svg).toContain('600');
  });

  it('should reject cross-domain node types in visual documents', () => {
    const doc = createMinimalVisualDoc();
    doc.objects = [
      {
        id: 'invalid-node',
        type: 'music_track',
        parent_id: null,
        children: [],
      } as IRNode,
    ];

    const nodesResult = validateNodes(doc);
    expect(nodesResult.valid).toBe(false);
    expect(nodesResult.errors[0].keyword).toBe('node-domain-mismatch');
  });
});

// ═══════════════════════════════════════════════════════════════
// E2E 2: Binary .gir Round-Trip
// ═══════════════════════════════════════════════════════════════
describe('E2E: Binary .gir Round-Trip', () => {
  it('should serialize → deserialize preserving document identity', () => {
    const original = createVisualDocWithNodes();

    // Serialize
    const buffer = serializeToGIR(original);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(64);

    // Verify magic header
    const magic = buffer.slice(0, 4).toString('ascii');
    expect(magic).toBe('GIR!');

    // Deserialize
    const restored = deserializeFromGIR(buffer);
    expect(restored.ir_id).toBe(original.ir_id);
    expect(restored.meta.domain).toBe('visual');
    expect(restored.meta.schema_version).toBe('1.0');
    expect(restored.objects).toHaveLength(3);
    expect(restored.objects[0].id).toBe('rect-1');
    expect(restored.objects[1].id).toBe('text-1');
    expect(restored.objects[2].id).toBe('img-1');
  });
});

// ═══════════════════════════════════════════════════════════════
// E2E 3: Layout Computation Pipeline
// ═══════════════════════════════════════════════════════════════
describe('E2E: Layout Computation', () => {
  it('should compute absolute positions for all nodes', () => {
    const doc = createVisualDocWithNodes();
    const layout = computeLayout(doc);

    expect(layout).toBeDefined();
    for (const node of doc.objects) {
      if (node.geometry) {
        expect(layout[node.id]).toBeDefined();
        expect(layout[node.id].x).toBe(node.geometry.x);
        expect(layout[node.id].y).toBe(node.geometry.y);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// E2E 4: Multi-Domain Validation
// ═══════════════════════════════════════════════════════════════
describe('E2E: Multi-Domain Validation', () => {
  it('should validate print domain with physical spec', () => {
    const doc = createIRDocument({
      domain: 'print',
      canvas: { width: 210, height: 297, color_space: 'CMYK', dpi: 300 },
    });
    (doc as any).physical = {
      width_mm: 210,
      height_mm: 297,
      bleed_mm: 3,
      safe_zone_mm: 5,
      color_profile: 'CMYK',
    };

    const result = validateHIR(doc);
    expect(result.valid).toBe(true);
  });

  it('should fail print domain without physical spec at compile', () => {
    const doc = createIRDocument({
      domain: 'print',
      canvas: { width: 210, height: 297, color_space: 'CMYK', dpi: 300 },
    });
    const compilation = compileDocument(doc);
    expect(compilation.success).toBe(false);
    expect(compilation.errors[0]).toContain('Physical spec');
  });

  it('should validate all 17 domain names are locked', () => {
    const domains = [
      'visual', 'image_edit', 'video', 'audio', 'motion',
      'print', 'signage', 'packaging', 'data_viz', 'interactive',
      '3d', 'document', 'music_production', 'pixel_art',
      'diagram', 'mockup', 'font_design',
    ];
    for (const d of domains) {
      const doc = createIRDocument({
        domain: d as any,
        canvas: { width: 100, height: 100, color_space: 'sRGB' },
      });
      expect(doc.meta.domain).toBe(d);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// E2E 5: Lifecycle Forward-Only Transitions
// ═══════════════════════════════════════════════════════════════
describe('E2E: Document Lifecycle', () => {
  it('should enforce forward-only status transitions', () => {
    expect(canTransition('draft', 'experiment')).toBe(true);
    expect(canTransition('experiment', 'staging')).toBe(true);
    expect(canTransition('staging', 'production')).toBe(true);
    expect(canTransition('production', 'deprecated')).toBe(true);
    expect(canTransition('deprecated', 'archived')).toBe(true);

    // Backward: MUST be false
    expect(canTransition('production', 'draft')).toBe(false);
    expect(canTransition('staging', 'experiment')).toBe(false);
    expect(canTransition('archived', 'production')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// E2E 6: Tier System Enforcement
// ═══════════════════════════════════════════════════════════════
describe('E2E: Tier System', () => {
  it('should reject nano tier with >100 nodes', () => {
    const doc = createIRDocument({
      domain: 'visual',
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
      tier: 'nano',
    });

    doc.objects = Array.from({ length: 101 }, (_, i) => ({
      id: `node-${i}`,
      type: 'shape' as const,
      parent_id: null,
      children: [],
      geometry: { x: 0, y: 0, width: 10, height: 10 },
    }));

    const result = validateHIR(doc);
    expect(result.valid).toBe(false);
    const nodeError = result.errors.find(e => e.keyword === 'node-limit');
    expect(nodeError).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// E2E 7: LIR Generation
// ═══════════════════════════════════════════════════════════════
describe('E2E: LIR Generation', () => {
  it('should generate Web LIR for visual domain', () => {
    const doc = createVisualDocWithNodes();
    const lir = generateLIR(doc as any, 'web');
    expect(lir.target).toBe('web');
    expect(lir.lir).toBeDefined();
    expect(lir.lir.type).toBe('web');
  });

  it('should generate Print LIR for print target', () => {
    const doc = createIRDocument({
      domain: 'print',
      canvas: { width: 210, height: 297, color_space: 'CMYK', dpi: 300 },
    });
    const lir = generateLIR(doc as any, 'print');
    expect(lir.target).toBe('print');
    expect(lir.lir.type).toBe('print');
  });
});
