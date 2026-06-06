import { describe, it, expect } from 'vitest';
import {
  interpolateKeyframe,
  convertBeatToMs,
  resolveTempoChanges,
  evaluateAutomation,
} from '../temporal.js';

describe('Timeline & Temporal Resolution Engine', () => {
  describe('Keyframe Interpolation & Easing Engine', () => {
    it('should interpolate opacity from 0 to 1 at t=500ms yielding 0.5 with linear easing', () => {
      const keyframes = [
        { time_ms: 0, property: 'style.opacity', value: 0, easing: 'linear' },
        { time_ms: 1000, property: 'style.opacity', value: 1, easing: 'linear' },
      ];

      const res = interpolateKeyframe(keyframes, 500);
      expect(res['style.opacity']).toBeCloseTo(0.5);
    });

    it('should produce lower midpoint value for ease-in than linear easing', () => {
      const kfLinear = [
        { time_ms: 0, property: 'geometry.x', value: 0, easing: 'linear' },
        { time_ms: 1000, property: 'geometry.x', value: 100, easing: 'linear' },
      ];
      const kfEaseIn = [
        { time_ms: 0, property: 'geometry.x', value: 0, easing: 'ease-in' },
        { time_ms: 1000, property: 'geometry.x', value: 100, easing: 'ease-in' },
      ];

      const valLinear = interpolateKeyframe(kfLinear, 500)['geometry.x'];
      const valEaseIn = interpolateKeyframe(kfEaseIn, 500)['geometry.x'];

      expect(valLinear).toBe(50);
      expect(valEaseIn).toBeLessThan(50);
    });
  });

  describe('Temporal Resolution (Pass 5)', () => {
    it('converts beat to ms correctly (BPM=120, 1 beat = 500ms, 4/4 bar = 2000ms)', () => {
      const beat1 = convertBeatToMs(1, 120, 4, 4);
      const bar1Beats = convertBeatToMs(4, 120, 4, 4);

      expect(beat1).toBe(500);
      expect(bar1Beats).toBe(2000);
    });

    it('resolves tempo change at bar 5 correctly from 120 BPM to 180 BPM', () => {
      // First 4 bars at 120 BPM:
      // Each bar duration = 4 beats = 2000 ms.
      // Bar 1 starts at 0ms.
      // Bar 2 starts at 2000ms.
      // Bar 3 starts at 4000ms.
      // Bar 4 starts at 6000ms.
      // Bar 5 starts at 8000ms.
      // At Bar 5: BPM changes to 180.
      // New bar duration = 4 * (60,000 / 180) = 4 * 333.33ms = 1333.33ms.
      // Bar 6 starts at 8000 + 1333.33 = 9333.33ms.

      const changes = [
        { bar: 1, bpm: 120, time_signature: { numerator: 4, denominator: 4 } },
        { bar: 5, bpm: 180 },
      ];

      const tempoMap = resolveTempoChanges(changes, 6);
      expect(tempoMap[1].startMs).toBe(0);
      expect(tempoMap[5].startMs).toBe(8000);
      expect(tempoMap[5].bpm).toBe(180);
      expect(tempoMap[6].startMs).toBeCloseTo(9333.33);
    });
  });

  describe('Automation Schedules', () => {
    it('should interpolate volume automation parameter from 0.0 to 1.0 in 1 second correctly', () => {
      const curve = {
        parameter: 'volume',
        control_points: [
          { time_ms: 0, value: 0.0 },
          { time_ms: 1000, value: 1.0 },
        ],
      };

      const valStart = evaluateAutomation(curve, 0);
      const valMid = evaluateAutomation(curve, 500);
      const valEnd = evaluateAutomation(curve, 1000);

      expect(valStart).toBe(0.0);
      expect(valMid).toBeCloseTo(0.5);
      expect(valEnd).toBe(1.0);
    });
  });

  describe('Pixel Frame Timing (Sub-pass 5b)', () => {
    it('calculates accumulated startMs for pixel frames', () => {
      const { runPass5 } = require('../temporal.js');
      const doc = {
        meta: { domain: 'pixel_art' },
        pixel_spec: {
          frames: [
            { id: 'f1', duration_ms: 100 },
            { id: 'f2', duration_ms: 150 },
            { id: 'f3', duration_ms: 200 }
          ]
        }
      };

      const result = runPass5(doc, []);
      expect(result.success).toBe(true);
      expect(result.resolvedFrames).toHaveLength(3);
      
      expect(result.resolvedFrames[0].startMs).toBe(0);
      expect(result.resolvedFrames[1].startMs).toBe(100);
      expect(result.resolvedFrames[2].startMs).toBe(250); // 100 + 150
      expect(result.resolvedFrames[2].durationMs).toBe(200);
    });
  });
});
