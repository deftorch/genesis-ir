import { IRAutomationCurve } from './timeline.js';

/**
 * @stability BETA
 * Spesifikasi formal untuk domain produksi musik dan DAW (Keputusan #12).
 */
export interface IRMusicSpec {
  project: {
    bpm: number;
    time_sig_num: number;
    time_sig_den: number;
    key: string;
    total_bars: number;
    sample_rate: 44100 | 48000 | 96000;
    bit_depth: 16 | 24 | 32;
  };
  tracks: IRMusicTrack[];
  instruments: IRVirtualInstrument[];
  master_effects: IRMusicEffect[];
  loop_region?: { start_bar: number; end_bar: number };
  tempo_changes?: IRMusicTempoChange[];
}

/** @stability BETA */
export interface IRMusicTempoChange {
  at_bar: number;
  new_bpm: number;
  transition: "immediate" | "gradual";
}

/** @stability BETA */
export interface IRMusicTrack {
  id: string;
  name: string;
  type: "audio" | "midi" | "bus" | "master";
  color: string;
  instrument_id?: string;
  clips: IRMusicClip[];
  effects: IRMusicEffect[];
  automations: IRAutomationCurve[];
  volume: number;
  pan: number;
  muted: boolean;
  soloed: boolean;
  record_arm: boolean;
  send_levels: Record<string, number>;
  input_device?: string;
  output_device?: string;
}

/** @stability BETA */
export interface IRMusicClip {
  id: string;
  type: "audio" | "midi_pattern";
  name: string;
  start_bar: number;
  length_bars: number;
  color?: string;
  muted: boolean;
  notes?: IRMidiNote[];
  time_sig_num?: number;
  time_sig_den?: number;
  asset_id?: string;
  gain: number;
  fade_in_bars?: number;
  fade_out_bars?: number;
  reverse?: boolean;
  pitch_shift?: number;
  time_stretch?: number;
}

/** @stability BETA */
export interface IRMidiNote {
  pitch: number;
  velocity: number;
  start_beat: number;
  duration_beats: number;
  channel: number;
  probability?: number;
}

/** @stability BETA */
export interface IRVirtualInstrument {
  id: string;
  name: string;
  type: "drum_machine" | "synthesizer" | "sampler" | "bass" | "guitar" | "piano" | "strings" | "brass" | "pad" | "synth_bass_808";
  preset_id?: string;
  synth_params?: {
    oscillator_type: "sine" | "square" | "sawtooth" | "triangle";
    oscillator_detune: number;
    filter_type: "lowpass" | "highpass" | "bandpass" | "notch";
    filter_frequency: number;
    filter_q: number;
    envelope: IREnvelope;
    lfo?: IRLFO;
  };
  sampler_params?: {
    sample_map: IRSampleMapEntry[];
    loop_mode: "none" | "loop" | "ping_pong";
  };
  drum_params?: {
    pads: IRDrumPad[];
  };
}

/** @stability BETA */
export interface IREnvelope {
  attack_ms: number;
  decay_ms: number;
  sustain: number;
  release_ms: number;
}

/** @stability BETA */
export interface IRLFO {
  type: "sine" | "square" | "sawtooth" | "random";
  rate_hz: number;
  depth: number;
  target: "pitch" | "filter" | "volume" | "pan";
}

/** @stability BETA */
export interface IRSampleMapEntry {
  note_low: number;
  note_high: number;
  root_note: number;
  asset_id: string;
}

/** @stability BETA */
export interface IRDrumPad {
  pad_id: number;
  name: string;
  asset_id: string;
  volume: number;
  pan: number;
  pitch: number;
  muted: boolean;
}

/** @stability BETA */
export interface IRMusicEffect {
  id: string;
  type: "eq" | "compressor" | "limiter" | "reverb" | "delay" | "chorus" | "flanger" | "phaser" | "distortion" | "overdrive" | "bit_crusher" | "auto_tune" | "de_esser" | "stereo_widener" | "noise_gate" | "tremolo";
  enabled: boolean;
  params: Record<string, number | string | boolean>;
}

/**
 * Convert bar/beat to milliseconds based on BPM.
 * @stability BETA
 */
export function barBeatToMs(bar: number, beat: number, bpm: number, timeSigDen: number = 4): number {
  const beatsPerBar = timeSigDen;
  const totalBeats = (bar - 1) * beatsPerBar + beat;
  const msPerBeat = 60000 / bpm;
  return totalBeats * msPerBeat;
}
