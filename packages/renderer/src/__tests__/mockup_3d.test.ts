import { describe, it, expect } from 'vitest';
import { ThreeDWebGLRenderer } from '../three_webgl.js';
import { createIRDocument } from '@genesis/types';

describe('FASE 12B — Sub-pass 6d: Mockup 3D Perspective Integration', () => {
  it('renders a 3D perspective mockup scene to WebGL HTML script', () => {
    const doc = createIRDocument({
      domain: 'mockup',
      canvas: { width: 1920, height: 1080, color_space: 'sRGB', canvas_type: '2d' }, // Canvas type is 2d but mockup_spec enables 3d_perspective
    });
    
    doc.mockup_spec = {
      scene_type: 'single_device',
      view_mode: '3d_perspective',
      devices: [
        {
          id: 'dev1',
          device_lib_id: 'iphone_16',
          color_variant: 'black',
          view_angle: 'angle_45',
          position: { x: 5, y: 0, z: -10 },
          scale: 1.5,
        }
      ],
      props: [],
      scene_background: { type: 'solid', color: '#111111' },
      lighting: { type: 'studio', intensity: 1.0 },
    } as any;

    const renderer = new ThreeDWebGLRenderer();
    const html = renderer.renderToHtml(doc);

    // It should generate a box mesh representing the device
    expect(html).toContain('const geometry_dev1 = new THREE.BoxGeometry(1, 2, 0.1)');
    
    // It should set color based on color_variant 'black' -> '#222222'
    expect(html).toContain("color: '#222222'");

    // It should apply position correctly
    expect(html).toContain('mesh_dev1.position.set(5, 0, -10)');
    
    // It should apply rotation based on view_angle: 'angle_45'
    // Math.PI / 4 is 0.785398...
    expect(html).toContain(`mesh_dev1.rotation.set(0, ${Math.PI / 4}, 0)`);

    // It should apply scale
    expect(html).toContain('mesh_dev1.scale.set(1.5, 1.5, 1.5)');
    
    // It should include shadow casting and receiving
    expect(html).toContain('mesh_dev1.castShadow = true');
    expect(html).toContain('mesh_dev1.receiveShadow = true');
  });

  it('handles custom rotations correctly', () => {
    const doc = createIRDocument({
      domain: 'mockup',
      canvas: { width: 1920, height: 1080, color_space: 'sRGB' },
    });
    
    doc.mockup_spec = {
      scene_type: 'multi_device',
      view_mode: '3d_perspective',
      devices: [
        {
          id: 'dev2',
          device_lib_id: 'macbook',
          color_variant: 'silver',
          view_angle: 'custom',
          custom_rotation: { x: 0.1, y: 0.2, z: 0.3 },
          position: { x: 0, y: 0, z: 0 },
          scale: 1.0,
        }
      ],
      props: [],
      scene_background: { type: 'solid', color: '#ffffff' },
      lighting: { type: 'studio', intensity: 1.0 },
    } as any;

    const renderer = new ThreeDWebGLRenderer();
    const html = renderer.renderToHtml(doc);

    expect(html).toContain('mesh_dev2.rotation.set(0.1, 0.2, 0.3)');
    expect(html).toContain("color: '#cccccc'"); // 'silver' maps to '#cccccc'
  });
});
