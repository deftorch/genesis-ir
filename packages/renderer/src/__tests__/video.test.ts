import { describe, it, expect, vi } from 'vitest';
import { createIRDocument } from '@genesis/types';
import { buildVideoInstructions, CanvasVideoRenderer } from '../video.js';

describe('CanvasVideoRenderer & buildVideoInstructions', () => {
  const mockDoc = createIRDocument({
    domain: 'video',
    canvas: {
      width: 1920,
      height: 1080,
    },
  });

  mockDoc.timeline = {
    duration_ms: 300, // 300ms duration
    tracks: [],
    keyframes: {
      'obj-1': [
        {
          time_ms: 0,
          property: 'geometry.x',
          value: 10,
          easing: 'linear',
        },
        {
          time_ms: 300,
          property: 'geometry.x',
          value: 40,
          easing: 'linear',
        },
      ],
    },
  };

  mockDoc.objects = [
    {
      id: 'obj-1',
      type: 'shape',
      parent_id: null,
      children: [],
      style: {
        fill_color: '#ff0000',
      },
    },
  ];

  it('buildVideoInstructions generates correct frames and interpolates properties at specific times', () => {
    // at 30 fps, frame time is 33.33ms.
    // 0ms, 33.33ms, 66.67ms, 100ms, 133.33ms, 166.67ms, 200ms, 233.33ms, 266.67ms, 300ms => 10 frames total (or 11 frames depending on end-inclusive boundary)
    const instructions = buildVideoInstructions(mockDoc, 30);

    expect(instructions.fps).toBe(30);
    expect(instructions.duration_ms).toBe(300);
    expect(instructions.width).toBe(1920);
    expect(instructions.height).toBe(1080);
    expect(instructions.frames.length).toBeGreaterThanOrEqual(10);

    // Frame 0 at 0ms should have obj-1 geometry.x = 10
    const frame0 = instructions.frames[0];
    expect(frame0.time_ms).toBe(0);
    expect(frame0.objects[0].id).toBe('obj-1');
    expect(frame0.objects[0].properties['geometry.x']).toBe(10);

    // Frame at the end (300ms) should have obj-1 geometry.x = 40
    const lastFrame = instructions.frames[instructions.frames.length - 1];
    expect(lastFrame.time_ms).toBe(300);
    expect(lastFrame.objects[0].properties['geometry.x']).toBe(40);

    // Mid frame (around 150ms) should interpolate to 25
    const midFrame = instructions.frames.find(f => Math.abs(f.time_ms - 150) < 20);
    expect(midFrame).toBeDefined();
    const expectedX = 10 + (40 - 10) * (midFrame!.time_ms / 300);
    expect(midFrame!.objects[0].properties['geometry.x']).toBeCloseTo(expectedX, 5);
  });

  it('CanvasVideoRenderer renders correctly and reports progress callbacks', async () => {
    const renderer = new CanvasVideoRenderer();
    const onProgress = vi.fn();

    const output = await renderer.render(mockDoc, 30, onProgress);

    expect(output).toBeDefined();
    expect(onProgress).toHaveBeenCalled();
    // Verify progress ends with total frames
    const calls = onProgress.mock.calls;
    const totalFrames = calls[0][1];
    expect(calls[calls.length - 1][0]).toBe(totalFrames);
  });
});
