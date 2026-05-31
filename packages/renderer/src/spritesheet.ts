import { IRPixelSpec, SpriteManifest } from '@genesis/types';
import pkgPacker from 'maxrects-packer';
import pkgCanvas from 'canvas';

const MaxRectsPacker = (pkgPacker as any).MaxRectsPacker || pkgPacker;
const { createCanvas, createImageData, Image } = pkgCanvas;

function celToCanvas(celNode: any): any {
  const width = celNode.content?.width ?? celNode.width ?? 16;
  const height = celNode.content?.height ?? celNode.height ?? 16;
  const pixels = celNode.content?.pixels ?? celNode.pixels ?? '';
  
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  if (pixels) {
    try {
      const buf = Buffer.from(pixels, 'base64');
      if (buf.length === width * height * 4) {
        const imgData = createImageData(new Uint8ClampedArray(buf), width, height);
        ctx.putImageData(imgData, 0, 0);
      } else {
        const img = new Image();
        img.src = buf;
        ctx.drawImage(img, 0, 0);
      }
    } catch (e) {
      // ignore
    }
  }
  return canvas;
}

export function packSpriteSheet(
  specs: IRPixelSpec[],
  objects: any[],
  opts: { maxSize?: number; padding?: number } = {}
): { atlasBuffer: Buffer; manifest: SpriteManifest } {
  const { maxSize = 2048, padding = 2 } = opts;
  
  const packer = new MaxRectsPacker(maxSize, maxSize, padding, {
    smart: true,
    pot: true,
    square: false,
    allowRotation: false,
  });

  const itemsToPack: any[] = [];
  
  for (let specIndex = 0; specIndex < specs.length; specIndex++) {
    const spec = specs[specIndex];
    for (let frameIndex = 0; frameIndex < spec.frames.length; frameIndex++) {
      const frame = spec.frames[frameIndex];
      const frameWidth = spec.canvas.pixel_width;
      const frameHeight = spec.canvas.pixel_height;
      
      const frameCanvas = createCanvas(frameWidth, frameHeight);
      const frameCtx = frameCanvas.getContext('2d');
      
      // Paint layers from bottom to top
      for (const layer of spec.layers) {
        if (layer.visible === false) continue;
        const celRef = frame.cels.find(c => c.layer_id === layer.id);
        if (!celRef) continue;
        
        const celNode = objects.find(o => o.id === celRef.node_id);
        if (!celNode) continue;
        
        const celCanvas = celToCanvas(celNode);
        frameCtx.globalAlpha = layer.opacity ?? 1.0;
        
        const ox = celNode.content?.offset_x ?? celNode.offset_x ?? 0;
        const oy = celNode.content?.offset_y ?? celNode.offset_y ?? 0;
        frameCtx.drawImage(celCanvas, ox, oy);
      }
      
      itemsToPack.push({
        width: frameWidth,
        height: frameHeight,
        data: {
          id: `spec_${specIndex}_frame_${frame.id || frameIndex}`,
          canvas: frameCanvas,
          frameWidth,
          frameHeight,
        }
      });
    }
  }

  packer.addArray(itemsToPack);

  if (!packer.bins || packer.bins.length === 0) {
    throw new Error('Failed to pack sprite sheet: no bins created');
  }

  const primaryBin = packer.bins[0];
  const atlasWidth = primaryBin.width;
  const atlasHeight = primaryBin.height;

  const atlasCanvas = createCanvas(atlasWidth, atlasHeight);
  const atlasCtx = atlasCanvas.getContext('2d');

  const framesManifest: Record<string, any> = {};

  for (const rect of primaryBin.rects) {
    const item = rect.data;
    atlasCtx.drawImage(item.canvas, rect.x, rect.y);

    framesManifest[item.id] = {
      frame: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      sourceSize: { w: item.frameWidth, h: item.frameHeight },
      pivot: { x: 0.5, y: 0.5 },
      rotated: false,
      trimmed: false,
    };
  }

  const manifest: SpriteManifest = {
    meta: {
      size: { w: atlasWidth, h: atlasHeight },
      format: 'RGBA8888',
      scale: 1,
    },
    frames: framesManifest,
  };

  return {
    atlasBuffer: atlasCanvas.toBuffer('image/png'),
    manifest,
  };
}
