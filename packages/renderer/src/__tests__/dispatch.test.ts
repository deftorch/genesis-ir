import { describe, it, expect } from 'vitest';
import { createIRDocument } from '@genesis/types';
import { dispatchMultiRenderer } from '../dispatch.js';
import { ThreeDWebGLRenderer } from '../three_webgl.js';

describe('Multi-Renderer Dispatch & WebGL Renderer', () => {
  describe('dispatchMultiRenderer', () => {
    it('dispatches visual/svg rendering for visual domain documents', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 100, height: 100, color_space: 'sRGB' },
      });

      const res = dispatchMultiRenderer(doc, ['svg']);
      expect(res.svg).toBeDefined();
      expect(res.svg).toContain('<svg');
      expect(res.pdf).toBeUndefined();
    });

    it('dispatches visual, pdf, and audio rendering for multi-domain documents', () => {
      const doc = createIRDocument({
        domain: 'print',
        canvas: { width: 100, height: 100, color_space: 'CMYK' },
      });
      doc.meta.active_domains = ['print', 'audio'];

      const res = dispatchMultiRenderer(doc);
      expect(res.svg).toBeDefined();
      expect(res.pdf).toBeDefined();
      expect(res.audio).toBeDefined();
      expect(res.audio!.toString('binary')).toContain('WAVE');
    });

    it('dispatches 3D HTML output for 3D viewport canvas documents', () => {
      const doc = createIRDocument({
        domain: '3d',
        canvas: { canvas_type: '3d' } as any,
      });

      const res = dispatchMultiRenderer(doc, ['three_d']);
      expect(res.three_d_html).toBeDefined();
      expect(res.three_d_html).toContain('THREE.Scene');
    });
  });

  describe('ThreeDWebGLRenderer', () => {
    it('generates a valid HTML string setting up Three.js scene, camera, lights, and meshes', () => {
      const doc = createIRDocument({
        domain: '3d',
        canvas: {
          canvas_type: '3d',
          width: 600,
          height: 400,
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
            ambient_color: '#ff00ff',
            ambient_intensity: 0.8,
          },
          render_settings: {
            antialiasing: 'msaa_4x',
            shadows: true,
            reflections: false,
          },
          background: { type: 'color', value: '#333333' },
        } as any,
      });

      doc.objects = [
        { id: 'cam', type: 'camera_3d' } as any,
        { id: 'mat_blue', type: 'material_3d', style: { color: '#0000ff' } } as any,
        { id: 'box1', type: 'mesh_3d', x: 1, y: 2, z: 3, material_id: 'mat_blue' } as any,
      ];

      const renderer = new ThreeDWebGLRenderer();
      const html = renderer.renderToHtml(doc);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain("new THREE.Color('#333333')");
      expect(html).toContain('THREE.AmbientLight');
      expect(html).toContain("'#ff00ff'");
      expect(html).toContain('THREE.BoxGeometry');
      expect(html).toContain("material_box1 = new THREE.MeshPhongMaterial({ color: '#0000ff' })");
      expect(html).toContain('mesh_box1.position.set(1, 2, 3)');
    });

    it('generates standard PBR materials and various primitive geometries', () => {
      const doc = createIRDocument({
        domain: '3d',
        canvas: {
          canvas_type: '3d',
          width: 800,
          height: 600,
        } as any,
      });

      doc.objects = [
        {
          id: 'mat_standard',
          type: 'material_3d',
          style: {
            color: '#ffaa00',
            material_type: 'standard',
            roughness: 0.2,
            metalness: 0.8,
            opacity: 0.9,
          },
        } as any,
        {
          id: 'sphere1',
          type: 'mesh_3d',
          primitive: 'sphere',
          primitive_params: { radius: 2, widthSegments: 64 },
          material_id: 'mat_standard',
        } as any,
        {
          id: 'torus1',
          type: 'mesh_3d',
          primitive: 'torus',
          material_id: 'mat_standard',
        } as any,
      ];

      const renderer = new ThreeDWebGLRenderer();
      const html = renderer.renderToHtml(doc);

      expect(html).toContain('THREE.SphereGeometry(2, 64, 16)');
      expect(html).toContain('THREE.TorusGeometry(0.5, 0.2, 16, 100)');
      expect(html).toContain('new THREE.MeshStandardMaterial');
      expect(html).toContain("color: '#ffaa00'");
      expect(html).toContain('roughness: 0.2');
      expect(html).toContain('metalness: 0.8');
      expect(html).toContain('opacity: 0.9');
      expect(html).toContain('transparent: true');
      expect(html).toContain('THREE.OrbitControls');
    });
  });
});
