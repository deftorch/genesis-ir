import { describe, it, expect } from 'vitest';
import { validateHIR } from '../index.js';
import { createIRDocument } from '@genesis/types';

describe('Audio and 3D Domain validations', () => {
  describe('IRAudioCanvas', () => {
    it('fails if sample_rate is not 44100, 48000, or 96000 Hz', () => {
      const doc = createIRDocument({
        domain: 'audio',
        canvas: {
          canvas_type: 'audio',
          sample_rate: 22050, // Invalid rate!
          bit_depth: 16,
          channel_layout: 'stereo',
          duration_ms: 1000,
          export_format: 'wav',
        } as any,
      });

      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'invalid-sample-rate')).toBe(true);
    });

    it('passes if sample_rate is 48000 Hz', () => {
      const doc = createIRDocument({
        domain: 'audio',
        canvas: {
          canvas_type: 'audio',
          sample_rate: 48000,
          bit_depth: 16,
          channel_layout: 'stereo',
          duration_ms: 1000,
          export_format: 'wav',
        } as any,
      });

      const res = validateHIR(doc);
      expect(res.valid).toBe(true);
    });

    it('fails if music_production domain does not specify bit_depth', () => {
      const doc = createIRDocument({
        domain: 'music_production',
        canvas: {
          canvas_type: 'audio',
          sample_rate: 44100,
          // bit_depth is missing!
          channel_layout: 'stereo',
          duration_ms: 5000,
          export_format: 'mp3',
        } as any,
      });

      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'required-bit-depth')).toBe(true);
    });

    it('fails if music_production domain bit_depth is invalid', () => {
      const doc = createIRDocument({
        domain: 'music_production',
        canvas: {
          canvas_type: 'audio',
          sample_rate: 44100,
          bit_depth: 20, // Invalid! Only 16, 24, 32 allowed
          channel_layout: 'stereo',
          duration_ms: 5000,
          export_format: 'mp3',
        } as any,
      });

      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'invalid-bit-depth')).toBe(true);
    });
  });

  describe('IR3DViewport & 3D Objects', () => {
    const valid3DCanvas = {
      canvas_type: '3d',
      width: 800,
      height: 600,
      coordinate_system: 'Y_up',
      units: 'meters',
      default_camera: {
        type: 'perspective',
        near_clip: 0.1,
        far_clip: 1000,
        position: { x: 0, y: 0, z: 10 },
        look_at: { x: 0, y: 0, z: 0 },
        up_vector: { x: 0, y: 1, z: 0 },
      },
      default_lighting: {
        type: 'phong',
        ambient_color: '#ffffff',
        ambient_intensity: 0.5,
      },
      render_settings: {
        antialiasing: 'msaa_4x',
        shadows: true,
        reflections: false,
      },
      background: { type: 'color', value: '#1a1a1a' },
    };

    it('fails if there is no camera_3d node in 3D viewport doc', () => {
      const doc = createIRDocument({
        domain: '3d',
        canvas: valid3DCanvas as any,
      });
      doc.objects = [
        { id: 'box', type: 'mesh_3d', x: 0, y: 0, z: 0, material_id: 'mat_red' } as any,
      ];

      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'missing-camera_3d')).toBe(true);
    });

    it('fails if a mesh_3d has no material_id', () => {
      const doc = createIRDocument({
        domain: '3d',
        canvas: valid3DCanvas as any,
      });
      doc.objects = [
        { id: 'cam', type: 'camera_3d' } as any,
        { id: 'box', type: 'mesh_3d', x: 0, y: 0, z: 0 } as any, // missing material_id
      ];

      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'missing-material-id')).toBe(true);
    });

    it('fails if a mesh_3d references an invalid material_id', () => {
      const doc = createIRDocument({
        domain: '3d',
        canvas: valid3DCanvas as any,
      });
      doc.objects = [
        { id: 'cam', type: 'camera_3d' } as any,
        { id: 'box', type: 'mesh_3d', x: 0, y: 0, z: 0, material_id: 'non-existent' } as any,
      ];

      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'invalid-material-id')).toBe(true);
    });

    it('passes if all 3D viewport rules, cameras, and mesh material references are correct', () => {
      const doc = createIRDocument({
        domain: '3d',
        canvas: valid3DCanvas as any,
      });
      doc.objects = [
        { id: 'cam', type: 'camera_3d' } as any,
        { id: 'mat_red', type: 'material_3d', style: { color: '#ff0000' } } as any,
        { id: 'box', type: 'mesh_3d', x: 0, y: 0, z: 0, material_id: 'mat_red' } as any,
      ];

      const res = validateHIR(doc);
      expect(res.valid).toBe(true);
    });
  });
});
