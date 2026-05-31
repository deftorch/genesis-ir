import { describe, it, expect } from 'vitest';
import { validateTimeline } from '../index.js';

describe('Schema Timeline & Keyframe Validation Engine', () => {
  it('should fail validation if timeline does not have duration_ms in video domain', () => {
    const doc: any = {
      ir_id: 'e207908b-b8df-4158-963d-4c3e41416e9b',
      meta: {
        domain: 'video',
        active_domains: ['video'],
        schema_version: '1.0',
        tier: 'nano',
        max_tree_depth: 8,
        created_at: '',
        updated_at: '',
      },
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
      style_context: { tokens: {}, styles: {} },
      constraints: { max_nodes: 100, max_depth: 8, rules: [] },
      nodes: {},
      objects: [],
      timeline: {
        tracks: [],
      },
    };

    const res = validateTimeline(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.path === 'timeline.duration_ms')).toBe(true);
  });

  it('should allow audio and visual tracks to run concurrently in a video document', () => {
    const doc: any = {
      ir_id: 'e207908b-b8df-4158-963d-4c3e41416e9b',
      meta: {
        domain: 'video',
        active_domains: ['video'],
        schema_version: '1.0',
        tier: 'nano',
        max_tree_depth: 8,
        created_at: '',
        updated_at: '',
      },
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
      style_context: { tokens: {}, styles: {} },
      constraints: { max_nodes: 100, max_depth: 8, rules: [] },
      nodes: {},
      objects: [],
      timeline: {
        duration_ms: 5000,
        tracks: [
          {
            id: 'track-v1',
            type: 'video',
            clips: [{ id: 'c1', start_ms: 0, duration_ms: 2000, asset_id: 'asset://video1' }],
          },
          {
            id: 'track-a1',
            type: 'audio',
            clips: [{ id: 'c2', start_ms: 0, duration_ms: 5000, asset_id: 'asset://audio1' }],
          },
        ],
      },
    };

    const res = validateTimeline(doc);
    expect(res.valid).toBe(true);
  });

  it('should reject overlapping clips if allow_overlap is false', () => {
    const doc: any = {
      ir_id: 'e207908b-b8df-4158-963d-4c3e41416e9b',
      meta: {
        domain: 'video',
        active_domains: ['video'],
        schema_version: '1.0',
        tier: 'nano',
        max_tree_depth: 8,
        created_at: '',
        updated_at: '',
      },
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
      style_context: { tokens: {}, styles: {} },
      constraints: { max_nodes: 100, max_depth: 8, rules: [] },
      nodes: {},
      objects: [],
      timeline: {
        duration_ms: 10000,
        tracks: [
          {
            id: 'track-v1',
            type: 'video',
            allow_overlap: false,
            clips: [
              { id: 'c1', start_ms: 0, duration_ms: 3000, asset_id: 'asset://video1' },
              { id: 'c2', start_ms: 2000, duration_ms: 4000, asset_id: 'asset://video2' }, // overlaps!
            ],
          },
        ],
      },
    };

    const res = validateTimeline(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'clip-overlap')).toBe(true);
  });

  it('should fail validation if keyframe geometry.x is a string', () => {
    const doc: any = {
      ir_id: 'e207908b-b8df-4158-963d-4c3e41416e9b',
      meta: {
        domain: 'video',
        active_domains: ['video'],
        schema_version: '1.0',
        tier: 'nano',
        max_tree_depth: 8,
        created_at: '',
        updated_at: '',
      },
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
      style_context: { tokens: {}, styles: {} },
      constraints: { max_nodes: 100, max_depth: 8, rules: [] },
      nodes: {},
      objects: [],
      timeline: {
        duration_ms: 5000,
        tracks: [],
        keyframes: {
          node1: [
            { time_ms: 0, property: 'geometry.x', value: 'invalid-string', easing: 'linear' },
          ],
        },
      },
    };

    const res = validateTimeline(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'type-mismatch')).toBe(true);
  });
});
