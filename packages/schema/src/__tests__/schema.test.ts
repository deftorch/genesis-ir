import { describe, it, expect } from 'vitest';
import { validateHIR, validateTierLimits, validateAsset, runPass3 } from '../index.js';
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

  describe('validateCanvas & canvas contexts', () => {
    it('should reject canvas with width: 0 or height: 0', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 0, height: 600, color_space: 'sRGB' },
      });
      const result = validateHIR(doc);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('canvas.width'))).toBe(true);

      const doc2 = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 0, color_space: 'sRGB' },
      });
      const result2 = validateHIR(doc2);
      expect(result2.valid).toBe(false);
      expect(result2.errors.some(e => e.path.includes('canvas.height'))).toBe(true);
    });

    it('should reject print domain document canvas if dpi is missing or invalid', () => {
      const doc = createIRDocument({
        domain: 'print',
        canvas: { width: 800, height: 600, color_space: 'CMYK' }, // missing dpi
      });
      const result = validateHIR(doc);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('canvas.dpi'))).toBe(true);
    });

    it('should reject music production domain document canvas if sample_rate is missing or invalid', () => {
      const doc = createIRDocument({
        domain: 'music_production',
        canvas: { width: 800, height: 600, color_space: 'sRGB' } as any, // missing sample_rate
      });
      const result = validateHIR(doc);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('canvas.sample_rate'))).toBe(true);
    });

    it('should validate canvas context structures correctly (discriminated union style)', () => {
      // Valid pixel context
      const docPixelValid = createIRDocument({
        domain: 'pixel_art',
        canvas: {
          width: 512,
          height: 512,
          color_space: 'sRGB',
          context: {
            type: 'pixel',
            pixel_width: 64,
            pixel_height: 64,
          },
        } as any,
      });
      expect(validateHIR(docPixelValid).valid).toBe(true);

      // Invalid pixel context width (600 exceeds 512)
      const docPixelInvalid = createIRDocument({
        domain: 'pixel_art',
        canvas: {
          width: 512,
          height: 512,
          color_space: 'sRGB',
          context: {
            type: 'pixel',
            pixel_width: 600,
            pixel_height: 64,
          },
        } as any,
      });
      const res = validateHIR(docPixelInvalid);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.path.includes('canvas.context.pixel_width'))).toBe(true);

      // Valid music context
      const docMusicValid = createIRDocument({
        domain: 'music_production',
        canvas: {
          sample_rate: 44100,
          bit_depth: 16,
          channels: 2,
          context: {
            type: 'music',
            bpm: 120,
          },
        } as any,
      });
      expect(validateHIR(docMusicValid).valid).toBe(true);

      // Invalid music context bpm (10 is less than 20)
      const docMusicInvalid = createIRDocument({
        domain: 'music_production',
        canvas: {
          sample_rate: 44100,
          bit_depth: 16,
          channels: 2,
          context: {
            type: 'music',
            bpm: 10,
          },
        } as any,
      });
      expect(validateHIR(docMusicInvalid).valid).toBe(false);

      // Invalid font em unit (not 1000 or 2048)
      const docFontInvalid = createIRDocument({
        domain: 'font_design',
        canvas: {
          width: 1000,
          height: 1000,
          color_space: 'sRGB',
          context: {
            type: 'font',
            em: 500,
          },
        } as any,
      });
      expect(validateHIR(docFontInvalid).valid).toBe(false);
    });
  });

  describe('validateNodes - node & content semantic validation', () => {
    it('should reject music_track in visual domain', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        {
          id: 'node-1',
          type: 'music_track', // disallowed in visual
          parent_id: null,
          children: [],
        },
      ];
      const result = validateHIR(doc);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path.includes('objects[0].type'))).toBe(true);
    });

    it('should allow glyph only in font_design domain', () => {
      const docFont = createIRDocument({
        domain: 'font_design',
        canvas: { width: 1000, height: 1000, color_space: 'sRGB' },
      });
      docFont.objects = [
        {
          id: 'node-1',
          type: 'glyph', // allowed in font_design
          parent_id: null,
          children: [],
        },
      ];
      expect(validateHIR(docFont).valid).toBe(true);

      const docVisual = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      docVisual.objects = [
        {
          id: 'node-1',
          type: 'glyph', // disallowed in visual
          parent_id: null,
          children: [],
        },
      ];
      expect(validateHIR(docVisual).valid).toBe(false);
    });

    it('should allow bpmn_element only in diagram domain', () => {
      const docDiagram = createIRDocument({
        domain: 'diagram',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      docDiagram.objects = [
        {
          id: 'node-1',
          type: 'bpmn_element', // allowed in diagram
          parent_id: null,
          children: [],
        },
      ];
      expect(validateHIR(docDiagram).valid).toBe(true);

      const docVisual = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      docVisual.objects = [
        {
          id: 'node-1',
          type: 'bpmn_element', // disallowed in visual
          parent_id: null,
          children: [],
        },
      ];
      expect(validateHIR(docVisual).valid).toBe(false);
    });

    it('should reject IRGeometry with width < 0 or height < 0', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        {
          id: 'node-1',
          type: 'shape',
          parent_id: null,
          children: [],
          geometry: {
            x: 0,
            y: 0,
            width: -10, // negative width
            height: 50,
          },
        },
      ];
      expect(validateHIR(doc).valid).toBe(false);
    });

    it('should reject geometry rotation outside of 0-360 degrees', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        {
          id: 'node-1',
          type: 'shape',
          parent_id: null,
          children: [],
          geometry: {
            x: 0,
            y: 0,
            width: 10,
            height: 50,
            rotation: 370, // invalid rotation
          },
        },
      ];
      expect(validateHIR(doc).valid).toBe(false);
    });

    it('should reject text node content if raw field is missing or invalid', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        {
          id: 'node-1',
          type: 'text',
          parent_id: null,
          children: [],
          content: {
            kind: 'text',
            // missing raw field
          } as any,
        },
      ];
      expect(validateHIR(doc).valid).toBe(false);
    });

    it('should reject image node content if asset_id or fit field is missing', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        {
          id: 'node-1',
          type: 'image',
          parent_id: null,
          children: [],
          content: {
            kind: 'image',
            // missing asset_id
          } as any,
        },
      ];
      expect(validateHIR(doc).valid).toBe(false);
    });

    it('should reject video node content if in_point_ms > out_point_ms', () => {
      const doc = createIRDocument({
        domain: 'video',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        {
          id: 'node-1',
          type: 'video_clip',
          parent_id: null,
          children: [],
          content: {
            kind: 'video_clip',
            asset_id: 'asset://video.mp4',
            in_point_ms: 5000,
            out_point_ms: 2000, // in_point > out_point
            volume: 1.0,
            muted: false,
            loop: false,
            playback_speed: 1.0,
          } as any,
        },
      ];
      expect(validateHIR(doc).valid).toBe(false);
    });

    it('should reject shape node content with type polygon if sides < 3', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        {
          id: 'node-1',
          type: 'shape',
          parent_id: null,
          children: [],
          content: {
            kind: 'shape',
            shape_type: 'polygon',
            sides: 2, // invalid polygon sides
          } as any,
        },
      ];
      expect(validateHIR(doc).valid).toBe(false);
    });

    it('should reject svg_path node content if d is empty string', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        {
          id: 'node-1',
          type: 'svg_path',
          parent_id: null,
          children: [],
          content: {
            kind: 'svg_path',
            d: '', // empty SVG path d string
            fill_rule: 'nonzero',
            path_type: 'cubic',
          } as any,
        },
      ];
      expect(validateHIR(doc).valid).toBe(false);
    });
  });

  describe('validateAsset - asset references validation', () => {
    const validChecksum = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // SHA-256 for empty string

    it('should allow valid image asset with asset:// URI, checksum, and dimensions', () => {
      const asset = {
        asset_id: 'asset-1',
        uri: 'asset://asset-1',
        type: 'image',
        checksum: validChecksum,
        mime_type: 'image/png',
        metadata: {
          dimensions: { width: 100, height: 100 },
        },
      };
      expect(validateAsset(asset).valid).toBe(true);
    });

    it('should reject asset with non-asset:// URI', () => {
      const asset = {
        asset_id: 'asset-1',
        uri: 'http://example.com/asset-1',
        type: 'image',
        checksum: validChecksum,
        mime_type: 'image/png',
        metadata: {
          dimensions: { width: 100, height: 100 },
        },
      };
      const result = validateAsset(asset);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.path === 'uri')).toBe(true);
    });

    it('should reject asset without checksum or invalid checksum length', () => {
      const asset = {
        asset_id: 'asset-1',
        uri: 'asset://asset-1',
        type: 'image',
        checksum: 'short-checksum', // invalid checksum
        mime_type: 'image/png',
        metadata: {
          dimensions: { width: 100, height: 100 },
        },
      };
      expect(validateAsset(asset).valid).toBe(false);
    });

    it('should reject image asset without dimensions in metadata', () => {
      const asset = {
        asset_id: 'asset-1',
        uri: 'asset://asset-1',
        type: 'image',
        checksum: validChecksum,
        mime_type: 'image/png',
        metadata: {},
      };
      expect(validateAsset(asset).valid).toBe(false);
    });

    it('should reject audio asset without duration_ms in metadata', () => {
      const asset = {
        asset_id: 'asset-1',
        uri: 'asset://asset-1',
        type: 'audio',
        checksum: validChecksum,
        mime_type: 'audio/mp3',
        metadata: {},
      };
      expect(validateAsset(asset).valid).toBe(false);
    });
  });

  describe('runPass3 - Semantic validation engine checks', () => {
    it('should reject print domain document without physical specification', () => {
      const doc = createIRDocument({
        domain: 'print',
        canvas: { width: 210, height: 297, color_space: 'CMYK' },
      });
      // no doc.physical
      const res = runPass3(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.path === 'physical')).toBe(true);
    });

    it('should allow print domain document with physical specification', () => {
      const doc = createIRDocument({
        domain: 'print',
        canvas: { width: 210, height: 297, color_space: 'CMYK' },
      });
      doc.physical = {
        width_mm: 210,
        height_mm: 297,
        bleed_mm: 3,
        safe_zone_mm: 5,
        color_profile: 'CMYK',
      };
      expect(runPass3(doc).valid).toBe(true);
    });

    it('should reject video domain document without timeline specification', () => {
      const doc = createIRDocument({
        domain: 'video',
        canvas: { width: 1920, height: 1080, color_space: 'sRGB' },
      });
      // no doc.timeline
      expect(runPass3(doc).valid).toBe(false);
    });

    it('should reject audio domain document without IRAudioCanvas', () => {
      const doc = createIRDocument({
        domain: 'audio',
        canvas: { width: 1000, height: 1000, color_space: 'sRGB' } as any, // IRCanvas instead of IRAudioCanvas
      });
      doc.timeline = { duration_ms: 10000, tracks: [] };
      const res = runPass3(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.path === 'canvas')).toBe(true);
    });

    it('should reject document when node tree depth exceeds max_tree_depth', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.meta.max_tree_depth = 2;
      doc.objects = [
        { id: '1', type: 'group', parent_id: null, children: ['2'] },
        { id: '2', type: 'group', parent_id: '1', children: ['3'] },
        { id: '3', type: 'shape', parent_id: '2', children: [] },
      ];
      const res = runPass3(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.path === 'objects')).toBe(true);
    });
  });
});


