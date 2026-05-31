import { describe, it, expect } from 'vitest';
import { validateHIR } from '../index.js';
import { createIRDocument } from '@genesis/types';
import { barBeatToMs } from '@genesis/types';

describe('FASE 11A — Music Production Domain', () => {
  const baseMusicDoc = () => {
    const doc = createIRDocument({
      domain: 'music_production',
      canvas: {
        canvas_type: 'audio',
        sample_rate: 44100,
        bit_depth: 24,
        channel_layout: 'stereo',
        duration_ms: 60000,
        export_format: 'wav',
      } as any,
    });
    doc.music_spec = {
      project: {
        bpm: 120,
        time_sig_num: 4,
        time_sig_den: 4,
        key: 'Cm',
        total_bars: 16,
        sample_rate: 44100,
        bit_depth: 24,
      },
      tracks: [],
      instruments: [],
      master_effects: [],
    } as any;
    return doc;
  };

  it('fails if BPM is outside 20–300 range', () => {
    const doc = baseMusicDoc();
    (doc.music_spec as any).project.bpm = 10;
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'invalid-bpm-range')).toBe(true);
  });

  it('passes with valid BPM of 120', () => {
    const doc = baseMusicDoc();
    expect(validateHIR(doc).valid).toBe(true);
  });

  it('fails if MIDI note pitch is outside 0–127', () => {
    const doc = baseMusicDoc();
    (doc.music_spec as any).tracks = [{
      id: 't1', name: 'Lead', type: 'midi', color: '#ff0000',
      instrument_id: 'inst1', clips: [{
        id: 'c1', type: 'midi_pattern', name: 'Clip 1',
        start_bar: 1, length_bars: 4, muted: false, gain: 1.0,
        notes: [
          { pitch: 128, velocity: 100, start_beat: 0, duration_beats: 1, channel: 0 },
        ],
      }],
      effects: [], automations: [], volume: 0.8, pan: 0, muted: false,
      soloed: false, record_arm: false, send_levels: {},
    }];
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'invalid-midi-pitch')).toBe(true);
  });

  it('fails if synthesizer instrument lacks synth_params', () => {
    const doc = baseMusicDoc();
    (doc.music_spec as any).instruments = [{
      id: 'synth1', name: 'Lead Synth', type: 'synthesizer',
      // synth_params intentionally missing
    }];
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'missing-synth-params')).toBe(true);
  });

  it('fails if reverb effect lacks room_size param', () => {
    const doc = baseMusicDoc();
    (doc.music_spec as any).master_effects = [{
      id: 'fx_reverb', type: 'reverb', enabled: true,
      params: { /* room_size missing */ mix: 0.5 },
    }];
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'missing-reverb-room-size')).toBe(true);
  });

  it('passes reverb with room_size param', () => {
    const doc = baseMusicDoc();
    (doc.music_spec as any).master_effects = [{
      id: 'fx_reverb', type: 'reverb', enabled: true,
      params: { room_size: 0.8, mix: 0.5 },
    }];
    expect(validateHIR(doc).valid).toBe(true);
  });

  describe('barBeatToMs conversion', () => {
    it('converts bar 1 beat 0 at 120 BPM to 0ms', () => {
      expect(barBeatToMs(1, 0, 120)).toBe(0);
    });

    it('converts bar 2 beat 0 at 120 BPM to 2000ms (4 beats × 500ms)', () => {
      expect(barBeatToMs(2, 0, 120)).toBe(2000);
    });

    it('converts bar 1 beat 2 at 60 BPM to 2000ms', () => {
      expect(barBeatToMs(1, 2, 60)).toBe(2000);
    });
  });
});

describe('FASE 11B — Pixel Art Domain', () => {
  const basePixelDoc = () => {
    const doc = createIRDocument({
      domain: 'pixel_art',
      canvas: { width: 64, height: 64, color_space: 'sRGB' },
    });
    doc.pixel_spec = {
      canvas: { pixel_width: 64, pixel_height: 64 },
      palette: {
        id: 'pal1', name: 'Default', colors: ['#000000', '#ffffff'], locked: false,
      },
      layers: [],
      frames: [],
      animation_tags: [],
    } as any;
    return doc;
  };

  it('fails if pixel_width is outside 8–512 range', () => {
    const doc = basePixelDoc();
    (doc.pixel_spec as any).canvas.pixel_width = 4;
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'invalid-pixel-width')).toBe(true);
  });

  it('passes with valid pixel_width of 128', () => {
    const doc = basePixelDoc();
    (doc.pixel_spec as any).canvas.pixel_width = 128;
    expect(validateHIR(doc).valid).toBe(true);
  });

  it('fails if locked palette has zero colors', () => {
    const doc = basePixelDoc();
    (doc.pixel_spec as any).palette = {
      id: 'pal_locked', name: 'Locked', colors: [], locked: true,
    };
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'locked-palette-empty')).toBe(true);
  });

  it('passes if locked palette has colors', () => {
    const doc = basePixelDoc();
    (doc.pixel_spec as any).palette = {
      id: 'pal_locked', name: 'Locked', colors: ['#ff0000'], locked: true,
    };
    expect(validateHIR(doc).valid).toBe(true);
  });

  it('fails if SpriteTag from_frame > to_frame', () => {
    const doc = basePixelDoc();
    (doc.pixel_spec as any).animation_tags = [{
      id: 'tag1', name: 'walk', from_frame: 5, to_frame: 2, direction: 'forward', repeat: 'infinite', color: '#00ff00',
    }];
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'invalid-sprite-tag-range')).toBe(true);
  });

  it('fails if TilemapLayer data.length ≠ map_width × map_height', () => {
    const doc = basePixelDoc();
    (doc.pixel_spec as any).tilemaps = [{
      id: 'tm1', name: 'Level 1', tileset_id: 'ts1',
      map_width: 3, map_height: 3,
      layers: [{
        id: 'tl1', name: 'Ground', type: 'tile', visible: true, opacity: 255,
        data: [1, 2, 3, 4, 5], // length 5, expected 9
      }],
    }];
    const res = validateHIR(doc);
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.keyword === 'invalid-tilemap-data-length')).toBe(true);
  });

  it('passes if TilemapLayer data.length equals map_width × map_height', () => {
    const doc = basePixelDoc();
    (doc.pixel_spec as any).tilemaps = [{
      id: 'tm1', name: 'Level 1', tileset_id: 'ts1',
      map_width: 3, map_height: 2,
      layers: [{
        id: 'tl1', name: 'Ground', type: 'tile', visible: true, opacity: 255,
        data: [1, 2, 3, 4, 5, 6], // length 6 = 3×2
      }],
    }];
    expect(validateHIR(doc).valid).toBe(true);
  });
});
