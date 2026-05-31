import { describe, it, expect } from 'vitest';
import { createIRDocument } from '@genesis/types';
import { generateWebAudioLIR } from '../webaudio.js';
import { generateLIR } from '../lir.js';

describe('Web Audio LIR Generator', () => {
  it('correctly maps music tracks and notes to an audio graph', () => {
    const doc = createIRDocument({
      domain: 'music_production',
      canvas: {
        canvas_type: 'audio',
      } as any,
    });

    doc.timeline = {
      duration_ms: 5000,
      bpm: 120,
      time_signature: { numerator: 4, denominator: 4 },
    } as any;

    doc.objects = [
      {
        id: 'track1',
        type: 'music_track',
        content: {
          track_type: 'midi',
          volume: 0.8,
          muted: false,
        },
      } as any,
      {
        id: 'note1',
        type: 'music_note',
        parent_id: 'track1',
        content: {
          pitch: 60, // C4 -> 261.63Hz
          velocity: 90,
          start_beat: 0,
          duration_beats: 2, // 1000ms at 120 bpm
        },
      } as any,
      {
        id: 'note2',
        type: 'music_note',
        parent_id: 'track1',
        content: {
          pitch: 64, // E4 -> 329.63Hz
          velocity: 100,
          start_beat: 2, // 1000ms at 120 bpm
          duration_beats: 2,
        },
      } as any,
    ];

    const lirDoc = generateLIR(doc as any, 'web');
    expect(lirDoc.target).toBe('web');
    
    const webLir = lirDoc.lir as any;
    expect(webLir.type).toBe('web');
    expect(webLir.dom_instructions.format).toBe('webaudio');

    const graph = webLir.dom_instructions.graph;
    expect(graph).toBeDefined();

    // Check master nodes
    const masterCompressor = graph.find((n: any) => n.nodeId === 'master_compressor');
    expect(masterCompressor).toBeDefined();
    expect(masterCompressor.type).toBe('DynamicsCompressorNode');
    expect(masterCompressor.connections).toContain('destination');

    const masterGain = graph.find((n: any) => n.nodeId === 'master_gain');
    expect(masterGain).toBeDefined();
    expect(masterGain.type).toBe('GainNode');
    expect(masterGain.connections).toContain('master_compressor');

    // Check track nodes
    const trackGain = graph.find((n: any) => n.nodeId === 'track_track1_gain');
    expect(trackGain).toBeDefined();
    expect(trackGain.type).toBe('GainNode');
    expect(trackGain.params.gain).toBe(0.8);
    expect(trackGain.connections).toContain('master_gain');

    const trackFilter = graph.find((n: any) => n.nodeId === 'track_track1_filter');
    expect(trackFilter).toBeDefined();
    expect(trackFilter.type).toBe('BiquadFilterNode');
    expect(trackFilter.connections).toContain('track_track1_gain');

    // Check notes and oscillator schedules
    const note1Osc = graph.find((n: any) => n.nodeId === 'note_note1_osc');
    expect(note1Osc).toBeDefined();
    expect(note1Osc.type).toBe('OscillatorNode');
    expect(note1Osc.params.frequency).toBeCloseTo(261.63, 1);
    expect(note1Osc.connections).toContain('track_track1_filter');
    expect(note1Osc.schedule.startMs).toBe(0);
    expect(note1Osc.schedule.stopMs).toBe(1000);

    const note2Osc = graph.find((n: any) => n.nodeId === 'note_note2_osc');
    expect(note2Osc).toBeDefined();
    expect(note2Osc.params.frequency).toBeCloseTo(329.63, 1);
    expect(note2Osc.schedule.startMs).toBe(1000);
    expect(note2Osc.schedule.stopMs).toBe(2000);
  });
});
