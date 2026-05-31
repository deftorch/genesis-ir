import { IRMIRDocument, WebLIR, AudioGraphInstruction } from '@genesis/types';
import { runPass5 } from './temporal.js';

function midiNoteToFrequency(pitch: number): number {
  return 440 * Math.pow(2, (pitch - 69) / 12);
}

/**
 * Generate Web Audio LIR from MIR.
 * @stability BETA
 */
export function generateWebAudioLIR(mir: IRMIRDocument): WebLIR {
  const graph: AudioGraphInstruction[] = [];
  const objects = mir.objects || [];

  // 1. Create a Master Dynamics Compressor and connect it to destination
  const masterCompressorId = 'master_compressor';
  graph.push({
    nodeId: masterCompressorId,
    type: 'DynamicsCompressorNode',
    params: {
      threshold: -24,
      knee: 30,
      ratio: 12,
      attack: 0.003,
      release: 0.25
    },
    connections: ['destination']
  });

  // 2. Create a Master Gain Node connected to master compressor
  const masterGainId = 'master_gain';
  graph.push({
    nodeId: masterGainId,
    type: 'GainNode',
    params: {
      gain: 1.0
    },
    connections: [masterCompressorId]
  });

  // 3. Run Pass 5 to resolve temporal properties
  const tempResult = runPass5(mir, []);
  const resolvedNotesMap = new Map<string, { startMs: number; durationMs: number }>();
  if (tempResult.success && tempResult.resolvedNotes) {
    for (const rn of tempResult.resolvedNotes) {
      resolvedNotesMap.set(rn.noteId, rn);
    }
  }

  // 4. Map each music_track to a GainNode (volume/pan) and BiquadFilterNode (EQ)
  const tracks = objects.filter(o => o.type === 'music_track');
  
  for (const track of tracks) {
    const content = (track.content || {}) as any;

    const volume = content.volume ?? 1.0;
    const muted = !!content.muted;

    const trackGainId = `track_${track.id}_gain`;
    const trackFilterId = `track_${track.id}_filter`;

    // A. BiquadFilterNode (EQ)
    graph.push({
      nodeId: trackFilterId,
      type: 'BiquadFilterNode',
      params: {
        type: 'peaking',
        frequency: 1000,
        Q: 1.0,
        gain: 0.0
      },
      connections: [trackGainId]
    });

    // B. GainNode for volume
    graph.push({
      nodeId: trackGainId,
      type: 'GainNode',
      params: {
        gain: muted ? 0.0 : volume
      },
      connections: [masterGainId]
    });

    // 5. Map each music_note belonging to this track (or parent clip) to an OscillatorNode
    const notes = objects.filter(o => o.type === 'music_note' && o.parent_id === track.id);
    for (const note of notes) {
      const noteContent = (note.content || {}) as any;
      const pitch = noteContent.pitch ?? 60;
      const frequency = midiNoteToFrequency(pitch);

      const resolved = resolvedNotesMap.get(note.id) || { startMs: 0, durationMs: 500 };
      const noteOscId = `note_${note.id}_osc`;

      graph.push({
        nodeId: noteOscId,
        type: 'OscillatorNode',
        params: {
          type: 'sine',
          frequency: frequency,
          detune: 0
        },
        connections: [trackFilterId],
        schedule: {
          startMs: resolved.startMs,
          stopMs: resolved.startMs + resolved.durationMs
        }
      });
    }
  }

  return {
    type: 'web',
    dom_instructions: {
      format: 'webaudio',
      graph: graph
    }
  };
}
