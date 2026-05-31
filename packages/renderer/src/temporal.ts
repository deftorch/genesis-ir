import { IRKeyframe, IRAutomationCurve } from '@genesis/types';

export type PropertyMap = Record<string, any>;

/**
 * Custom Cubic Bezier solver.
 * @stability BETA
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  return function(x: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    let t = 0.5;
    let minT = 0;
    let maxT = 1;
    for (let i = 0; i < 20; i++) {
      const bx = 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
      if (Math.abs(x - bx) < 1e-5) {
        break;
      }
      if (bx < x) {
        minT = t;
      } else {
        maxT = t;
      }
      t = (minT + maxT) / 2;
    }
    return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
  };
}

/**
 * Get Easing Function by name or cubic-bezier signature.
 * @stability BETA
 */
export function getEasingFunction(easingStr: string): (t: number) => number {
  const clean = easingStr.trim().toLowerCase();
  if (clean === 'linear') {
    return (t) => t;
  }
  if (clean === 'ease-in') {
    return cubicBezier(0.42, 0, 1, 1);
  }
  if (clean === 'ease-out') {
    return cubicBezier(0, 0, 0.58, 1);
  }
  if (clean === 'ease-in-out') {
    return cubicBezier(0.42, 0, 0.58, 1);
  }
  if (clean.startsWith('cubic-bezier(')) {
    const match = clean.match(/cubic-bezier\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/);
    if (match) {
      const x1 = parseFloat(match[1]);
      const y1 = parseFloat(match[2]);
      const x2 = parseFloat(match[3]);
      const y2 = parseFloat(match[4]);
      return cubicBezier(x1, y1, x2, y2);
    }
  }
  return (t) => t;
}

/**
 * Interpolate values across properties given keyframes at a specific time.
 * @stability BETA
 */
export function interpolateKeyframe(keyframes: IRKeyframe[], time: number): PropertyMap {
  const result: PropertyMap = {};
  if (!keyframes || keyframes.length === 0) return result;

  // Group keyframes by property
  const groups: Record<string, IRKeyframe[]> = {};
  for (const kf of keyframes) {
    if (!groups[kf.property]) {
      groups[kf.property] = [];
    }
    groups[kf.property].push(kf);
  }

  // Interpolate each property
  for (const [prop, propKfs] of Object.entries(groups)) {
    const sorted = [...propKfs].sort((a, b) => a.time_ms - b.time_ms);
    if (sorted.length === 0) continue;

    if (time <= sorted[0].time_ms) {
      result[prop] = sorted[0].value;
      continue;
    }
    if (time >= sorted[sorted.length - 1].time_ms) {
      result[prop] = sorted[sorted.length - 1].value;
      continue;
    }

    // Find interpolation pair
    let idx = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (time >= sorted[i].time_ms && time <= sorted[i + 1].time_ms) {
        idx = i;
        break;
      }
    }

    const k1 = sorted[idx];
    const k2 = sorted[idx + 1];
    const range = k2.time_ms - k1.time_ms;
    const t = range === 0 ? 0 : (time - k1.time_ms) / range;

    const easeFn = getEasingFunction(k1.easing || 'linear');
    const easedT = easeFn(t);

    const val1 = k1.value;
    const val2 = k2.value;

    if (typeof val1 === 'number' && typeof val2 === 'number') {
      result[prop] = val1 + (val2 - val1) * easedT;
    } else {
      // Step interpolation for non-numeric types
      result[prop] = t < 0.5 ? val1 : val2;
    }
  }

  return result;
}

// 5.3 TEMPORAL RESOLUTION (PASS 5)

export interface IRTempoChange {
  bar: number; // 1-indexed bar number
  bpm: number;
  time_signature?: { numerator: number; denominator: number };
}

export interface TempoState {
  bpm: number;
  timeSignature: { numerator: number; denominator: number };
  startMs: number;
}

export type TempoMap = Record<number, TempoState>;

/**
 * Convert beat count to milliseconds based on BPM and Time Signature.
 * @stability BETA
 */
export function convertBeatToMs(beat: number, bpm: number, timeSigNum: number, _timeSigDen: number): number {
  const msPerBeat = 60000 / bpm;
  return beat * msPerBeat;
}

/**
 * Resolve tempo changes to absolute bar timing offsets.
 * @stability BETA
 */
export function resolveTempoChanges(changes: IRTempoChange[], totalBars: number): TempoMap {
  const tempoMap: TempoMap = {};
  const sortedChanges = [...changes].sort((a, b) => a.bar - b.bar);

  let currentBpm = 120;
  let currentSig = { numerator: 4, denominator: 4 };
  let accumulatedMs = 0;

  let changeIdx = 0;

  for (let bar = 1; bar <= totalBars + 1; bar++) {
    // Apply changes if any match this bar
    if (changeIdx < sortedChanges.length && sortedChanges[changeIdx].bar === bar) {
      currentBpm = sortedChanges[changeIdx].bpm;
      if (sortedChanges[changeIdx].time_signature) {
        currentSig = sortedChanges[changeIdx].time_signature!;
      }
      changeIdx++;
    }

    tempoMap[bar] = {
      bpm: currentBpm,
      timeSignature: { ...currentSig },
      startMs: accumulatedMs,
    };

    // Calculate duration of this bar: duration in beats = numerator
    const msPerBeat = 60000 / currentBpm;
    const barDuration = currentSig.numerator * msPerBeat;
    accumulatedMs += barDuration;
  }

  return tempoMap;
}

export interface TemporalResolutionResult {
  success: boolean;
  resolvedNotes?: { noteId: string; startMs: number; durationMs: number }[];
  errors: string[];
}

/**
 * Run Pass 5: Temporal Resolution
 * @stability BETA
 */
export function runPass5(doc: any, _assetPool: any[]): TemporalResolutionResult {
  const errors: string[] = [];
  const domain = doc.meta?.domain;

  if (domain === 'music_production') {
    const timeline = doc.timeline;
    if (!timeline) {
      return { success: false, errors: ['Missing timeline specification'] };
    }

    const bpm = timeline.bpm || 120;
    const timeSig = timeline.time_signature || { numerator: 4, denominator: 4 };

    const resolvedNotes: { noteId: string; startMs: number; durationMs: number }[] = [];

    // Resolve notes timing from objects
    const objects = doc.objects || [];
    for (const obj of objects) {
      if (obj.type === 'music_note') {
        const content = obj.content || {};
        const startBeat = content.start_beat ?? 0;
        const durationBeats = content.duration_beats ?? 1;

        const startMs = convertBeatToMs(startBeat, bpm, timeSig.numerator, timeSig.denominator);
        const durationMs = convertBeatToMs(durationBeats, bpm, timeSig.numerator, timeSig.denominator);

        resolvedNotes.push({
          noteId: obj.id,
          startMs,
          durationMs,
        });
      }
    }

    return {
      success: true,
      resolvedNotes,
      errors: [],
    };
  }

  return {
    success: true,
    errors: [],
  };
}

// 5.4 AUTOMATION SCHEDULES

/**
 * Evaluate automation parameter value at a given playhead millisecond timestamp.
 * @stability BETA
 */
export function evaluateAutomation(curve: IRAutomationCurve, time_ms: number): number {
  if (!curve || !curve.control_points || curve.control_points.length === 0) {
    return 0;
  }
  const pts = [...curve.control_points].sort((a, b) => a.time_ms - b.time_ms);
  if (time_ms <= pts[0].time_ms) {
    return pts[0].value;
  }
  if (time_ms >= pts[pts.length - 1].time_ms) {
    return pts[pts.length - 1].value;
  }

  // Find surrounding points
  let idx = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    if (time_ms >= pts[i].time_ms && time_ms <= pts[i + 1].time_ms) {
      idx = i;
      break;
    }
  }

  const p1 = pts[idx];
  const p2 = pts[idx + 1];

  const range = p2.time_ms - p1.time_ms;
  if (range === 0) return p1.value;

  const t = (time_ms - p1.time_ms) / range;
  return p1.value + (p2.value - p1.value) * t;
}
