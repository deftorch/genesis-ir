import { IRDelta, IRDeltaStack, createDeltaStack, pushDelta, undoDelta, redoDelta, validateDelta } from '@genesis/types';

/**
 * Merge local and remote deltas using Last-Write-Wins (LWW) strategy.
 * @stability BETA
 */
export function mergeDeltas(local: IRDelta[], remote: IRDelta[]): IRDelta[] {
  const merged = [...local, ...remote];
  // Sort by created_at timestamp for deterministic ordering (LWW)
  merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
  // Deduplicate by delta_id
  const seen = new Set<string>();
  return merged.filter(d => {
    if (seen.has(d.delta_id)) return false;
    seen.add(d.delta_id);
    return true;
  });
}

/**
 * GenesisLoroDoc: wrapper that manages an IRDeltaStack for a document.
 * This provides the core state management layer before Loro WASM integration.
 * @stability BETA
 */
export class GenesisLoroDoc {
  private _stack: IRDeltaStack;

  constructor(documentId: string, maxSize: number = 100) {
    this._stack = createDeltaStack(documentId, maxSize);
  }

  /** Get the current stack state */
  get stack(): IRDeltaStack {
    return this._stack;
  }

  /** Apply a delta to the document state */
  applyDelta(delta: IRDelta): { success: boolean; errors?: string[] } {
    const validation = validateDelta(delta);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }
    this._stack = pushDelta(this._stack, delta);
    return { success: true };
  }

  /** Undo the last applied delta */
  undo(): IRDelta | null {
    const result = undoDelta(this._stack);
    this._stack = result.stack;
    return result.undone;
  }

  /** Redo the last undone delta */
  redo(): IRDelta | null {
    const result = redoDelta(this._stack);
    this._stack = result.stack;
    return result.redone;
  }

  /** Sync with remote deltas using LWW merge */
  syncWithPeer(remoteDeltas: IRDelta[]): IRDelta[] {
    const merged = mergeDeltas(this._stack.stack, remoteDeltas);
    // Rebuild stack with merged deltas
    this._stack = createDeltaStack(this._stack.document_id, this._stack.max_size);
    for (const delta of merged) {
      this._stack = pushDelta(this._stack, delta);
    }
    return merged;
  }
}

// Re-export delta utilities
export { createDeltaStack, pushDelta, undoDelta, redoDelta, validateDelta };
