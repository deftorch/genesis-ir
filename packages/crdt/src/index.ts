import { IRDelta, IRDeltaStack, createDeltaStack, pushDelta, undoDelta, redoDelta, validateDelta } from '@genesis/types';
import { LoroDoc } from 'loro-crdt';

/**
 * Common interface for CRDT stores.
 * @stability BETA
 */
export interface ICRDTStore {
  applyDelta(delta: IRDelta): { success: boolean; errors?: string[] };
  undo(): IRDelta | null;
  redo(): IRDelta | null;
  merge(remote: Uint8Array): void;
  export(): Uint8Array;
}

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
 * GenesisLWWDoc: wrapper that manages an IRDeltaStack for a document using Last-Write-Wins (LWW) delta store.
 * This provides the core state management layer before Loro WASM integration.
 * @stability BETA
 */
export class GenesisLWWDoc implements ICRDTStore {
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

  merge(remote: Uint8Array): void {
    // Basic LWW implementation doesn't support raw Uint8Array merge directly.
    // In a real system, you'd decode the array into IRDelta[] and call syncWithPeer.
    throw new Error('merge(Uint8Array) not implemented natively in GenesisLWWDoc');
  }

  export(): Uint8Array {
    // Basic LWW implementation doesn't support raw Uint8Array export directly.
    throw new Error('export() not implemented natively in GenesisLWWDoc');
  }
}

/**
 * LoroCRDTAdapter: Production CRDT store using Loro Rust/WASM.
 * Implements ICRDTStore — drop-in replacement for GenesisLWWDoc.
 * @stability EXPERIMENTAL (Phase 3)
 */
export class LoroCRDTAdapter implements ICRDTStore {
  private doc: LoroDoc;

  static async create(): Promise<LoroCRDTAdapter> {
    const instance = new LoroCRDTAdapter();
    return instance;
  }

  private constructor() {
    this.doc = new LoroDoc();
  }

  applyDelta(delta: IRDelta): { success: boolean; errors?: string[] } {
    try {
      const map = this.doc.getMap('objects');
      if (delta.node_ops) {
        for (const op of delta.node_ops) {
          switch (op.op) {
            case 'add':
              if (op.node && typeof op.node === 'object') {
                const id = (op.node as any).id || (op.node as any).node_id;
                if (id) map.set(id, op.node as any);
              }
              break;
            case 'replace':
              map.set(op.node_id, op.value as any);
              break;
            case 'remove':
              map.delete(op.node_id);
              break;
            case 'move':
              // move implementation
              break;
          }
        }
      }
      this.doc.commit();
      return { success: true };
    } catch (e) {
      return { success: false, errors: [String(e)] };
    }
  }

  undo(): IRDelta | null {
    // Note: Loro has its own undo/redo manager `new UndoManager(doc)`
    throw new Error('Undo not implemented yet in LoroCRDTAdapter');
  }

  redo(): IRDelta | null {
    throw new Error('Redo not implemented yet in LoroCRDTAdapter');
  }

  merge(remote: Uint8Array): void {
    this.doc.import(remote); // automatic CRDT merge — no conflict resolution needed
  }

  export(): Uint8Array {
    return this.doc.export({ mode: 'update' });
  }
}

/**
 * Factory to create the appropriate CRDT store backend based on env/feature-flag.
 */
export async function createCRDTStore(
  documentId: string,
  backend: 'loro' | 'lww' = process.env.GENESIS_CRDT_BACKEND as any ?? 'lww'
): Promise<ICRDTStore> {
  if (backend === 'loro') {
    return await LoroCRDTAdapter.create();
  }
  return new GenesisLWWDoc(documentId);
}

// Re-export delta utilities
export { createDeltaStack, pushDelta, undoDelta, redoDelta, validateDelta };
