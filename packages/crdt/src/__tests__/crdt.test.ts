import { describe, it, expect } from 'vitest';
import { GenesisLoroDoc, mergeDeltas } from '../index.js';
import { IRDelta, createDeltaStack, pushDelta, undoDelta, redoDelta, validateDelta } from '@genesis/types';

function makeDelta(overrides: Partial<IRDelta> = {}): IRDelta {
  return {
    delta_id: `d-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    created_by: 'test-user',
    session_id: 'session-1',
    delta_type: 'user_action',
    validated: true,
    node_ops: [{ op: 'replace', node_id: 'n1', path: 'geometry.x', value: 100 }],
    ...overrides,
  };
}

describe('FASE 13 — IRDelta Validation', () => {
  it('undo delta must have reverses_delta_id', () => {
    const delta = makeDelta({ delta_type: 'undo' });
    const result = validateDelta(delta);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('reverses_delta_id');
  });

  it('redo delta must have reverses_delta_id', () => {
    const delta = makeDelta({ delta_type: 'redo' });
    const result = validateDelta(delta);
    expect(result.valid).toBe(false);
  });

  it('undo delta with reverses_delta_id passes', () => {
    const delta = makeDelta({ delta_type: 'undo', reverses_delta_id: 'd-original' });
    const result = validateDelta(delta);
    expect(result.valid).toBe(true);
  });

  it('migration delta must have from_migration_id', () => {
    const delta = makeDelta({ delta_type: 'migration' });
    const result = validateDelta(delta);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('from_migration_id');
  });

  it('migration delta with from_migration_id passes', () => {
    const delta = makeDelta({ delta_type: 'migration', from_migration_id: 'mig-001' });
    const result = validateDelta(delta);
    expect(result.valid).toBe(true);
  });
});

describe('FASE 13 — IRDeltaStack', () => {
  it('pushDelta adds a delta and advances undo_pointer', () => {
    let stack = createDeltaStack('doc-1');
    const d1 = makeDelta();
    stack = pushDelta(stack, d1);
    expect(stack.stack.length).toBe(1);
    expect(stack.undo_pointer).toBe(0);
    expect(stack.total_deltas).toBe(1);
  });

  it('evicts oldest delta when max_size is exceeded', () => {
    let stack = createDeltaStack('doc-1', 3);
    for (let i = 0; i < 5; i++) {
      stack = pushDelta(stack, makeDelta({ delta_id: `d-${i}` }));
    }
    expect(stack.stack.length).toBe(3);
    // The first two deltas should have been evicted
    expect(stack.stack[0].delta_id).toBe('d-2');
  });

  it('applying same delta twice is idempotent (via dedup in merge)', () => {
    const d1 = makeDelta({ delta_id: 'fixed-id' });
    const merged = mergeDeltas([d1], [d1]);
    expect(merged.length).toBe(1);
  });

  it('undo moves pointer back, redo moves forward', () => {
    let stack = createDeltaStack('doc-1');
    const d1 = makeDelta({ delta_id: 'd1' });
    const d2 = makeDelta({ delta_id: 'd2' });
    stack = pushDelta(stack, d1);
    stack = pushDelta(stack, d2);
    expect(stack.undo_pointer).toBe(1);

    const undo1 = undoDelta(stack);
    stack = undo1.stack;
    expect(undo1.undone!.delta_id).toBe('d2');
    expect(stack.undo_pointer).toBe(0);

    const redo1 = redoDelta(stack);
    stack = redo1.stack;
    expect(redo1.redone!.delta_id).toBe('d2');
    expect(stack.undo_pointer).toBe(1);
  });

  it('undo on empty stack returns null', () => {
    const stack = createDeltaStack('doc-1');
    const result = undoDelta(stack);
    expect(result.undone).toBeNull();
  });
});

describe('FASE 13 — GenesisLoroDoc', () => {
  it('applies deltas and tracks state', () => {
    const doc = new GenesisLoroDoc('doc-1');
    const d1 = makeDelta();
    const result = doc.applyDelta(d1);
    expect(result.success).toBe(true);
    expect(doc.stack.stack.length).toBe(1);
  });

  it('rejects invalid deltas', () => {
    const doc = new GenesisLoroDoc('doc-1');
    const invalid = makeDelta({ delta_type: 'undo' }); // missing reverses_delta_id
    const result = doc.applyDelta(invalid);
    expect(result.success).toBe(false);
    expect(result.errors!.length).toBeGreaterThan(0);
  });

  it('undo/redo works correctly', () => {
    const doc = new GenesisLoroDoc('doc-1');
    doc.applyDelta(makeDelta({ delta_id: 'x1' }));
    doc.applyDelta(makeDelta({ delta_id: 'x2' }));

    const undone = doc.undo();
    expect(undone!.delta_id).toBe('x2');

    const redone = doc.redo();
    expect(redone!.delta_id).toBe('x2');
  });

  it('syncWithPeer merges and deduplicates', () => {
    const doc = new GenesisLoroDoc('doc-1');
    doc.applyDelta(makeDelta({ delta_id: 'local-1', created_at: '2026-01-01T00:00:01Z' }));

    const remote = [
      makeDelta({ delta_id: 'remote-1', created_at: '2026-01-01T00:00:00Z' }),
      makeDelta({ delta_id: 'local-1', created_at: '2026-01-01T00:00:01Z' }), // duplicate
    ];

    const merged = doc.syncWithPeer(remote);
    expect(merged.length).toBe(2); // local-1 + remote-1, no duplicate
    // remote-1 should be first (earlier timestamp)
    expect(merged[0].delta_id).toBe('remote-1');
  });
});

describe('FASE 13 — LWW Merge Strategy', () => {
  it('concurrent changes on same field use LWW (last timestamp wins)', () => {
    const peer1Delta = makeDelta({
      delta_id: 'p1',
      created_at: '2026-01-01T00:00:01Z',
      created_by: 'peer-1',
      node_ops: [{ op: 'replace', node_id: 'n1', path: 'geometry.x', value: 100 }],
    });
    const peer2Delta = makeDelta({
      delta_id: 'p2',
      created_at: '2026-01-01T00:00:02Z',
      created_by: 'peer-2',
      node_ops: [{ op: 'replace', node_id: 'n1', path: 'geometry.x', value: 200 }],
    });

    const merged = mergeDeltas([peer1Delta], [peer2Delta]);
    expect(merged.length).toBe(2);
    // peer2 comes last (later timestamp), so its value wins in sequential apply
    expect(merged[1].delta_id).toBe('p2');
  });
});
