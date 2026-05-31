import { describe, it, expect } from 'vitest';
import { createIRDocument } from '@genesis/types';
import { generateLIR } from '../lir.js';

describe('Sprite Sheet Packer Renderer', () => {
  it('correctly packs multiple frames/cels and generates a PixiJS/Phaser manifest', () => {
    // Create 16x16 red and green cels
    const redBuffer = Buffer.alloc(1024); // 16 * 16 * 4
    for (let i = 0; i < 1024; i += 4) {
      redBuffer[i] = 255;   // R
      redBuffer[i + 3] = 255; // A
    }
    const redBase64 = redBuffer.toString('base64');

    const greenBuffer = Buffer.alloc(1024);
    for (let i = 0; i < 1024; i += 4) {
      greenBuffer[i + 1] = 255; // G
      greenBuffer[i + 3] = 255; // A
    }
    const greenBase64 = greenBuffer.toString('base64');

    const doc = createIRDocument({
      domain: 'pixel_art',
      canvas: {
        canvas_type: '2d',
        width: 100,
        height: 100,
      } as any,
    });

    // Attach pixel spec
    (doc as any).pixel_spec = {
      canvas: {
        pixel_width: 16,
        pixel_height: 16,
      },
      palette: {
        id: 'palette1',
        name: 'test_palette',
        colors: ['#ff0000', '#00ff00'],
        locked: true,
      },
      layers: [
        {
          id: 'layer1',
          name: 'Layer 1',
          type: 'normal',
          opacity: 1.0,
          visible: true,
          locked: false,
          blend_mode: 'normal',
          lock_alpha: false,
        },
      ],
      frames: [
        {
          id: 'frame0',
          duration_ms: 100,
          cels: [
            { layer_id: 'layer1', node_id: 'celNode0' },
          ],
        },
        {
          id: 'frame1',
          duration_ms: 100,
          cels: [
            { layer_id: 'layer1', node_id: 'celNode1' },
          ],
        },
      ],
      animation_tags: [],
    };

    doc.objects = [
      {
        id: 'celNode0',
        type: 'pixel_cel',
        content: {
          kind: 'pixel_cel',
          pixels: redBase64,
          width: 16,
          height: 16,
          offset_x: 0,
          offset_y: 0,
        },
      } as any,
      {
        id: 'celNode1',
        type: 'pixel_cel',
        content: {
          kind: 'pixel_cel',
          pixels: greenBase64,
          width: 16,
          height: 16,
          offset_x: 0,
          offset_y: 0,
        },
      } as any,
    ];

    const lirDoc = generateLIR(doc as any, 'web');
    expect(lirDoc.target).toBe('web');
    expect(lirDoc.lir.type).toBe('pixel');

    const pixelLir = lirDoc.lir as any;
    expect(pixelLir.atlas).toBeDefined();
    expect(typeof pixelLir.atlas).toBe('string');
    
    // Check manifest structure
    const manifest = pixelLir.manifest;
    expect(manifest).toBeDefined();
    expect(manifest.meta).toBeDefined();
    expect(manifest.meta.format).toBe('RGBA8888');
    
    const frame0 = manifest.frames['spec_0_frame_frame0'];
    expect(frame0).toBeDefined();
    expect(frame0.frame.w).toBe(16);
    expect(frame0.frame.h).toBe(16);
    expect(frame0.sourceSize.w).toBe(16);
    expect(frame0.sourceSize.h).toBe(16);

    const frame1 = manifest.frames['spec_0_frame_frame1'];
    expect(frame1).toBeDefined();
    expect(frame1.frame.w).toBe(16);
    expect(frame1.frame.h).toBe(16);

    // Make sure they do not overlap
    const f0 = frame0.frame;
    const f1 = frame1.frame;
    const overlaps = (
      f0.x < f1.x + f1.w &&
      f0.x + f0.w > f1.x &&
      f0.y < f1.y + f1.h &&
      f0.y + f0.h > f1.y
    );
    expect(overlaps).toBe(false);
  });
});
