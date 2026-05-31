/**
 * @stability STABLE
 */
export type IRDeltaOpType = 'add' | 'remove' | 'replace' | 'move';

/**
 * @stability STABLE
 */
export interface IRDeltaOp {
  op: IRDeltaOpType;
  path: string;
  value?: unknown;
  from_path?: string;
}

/**
 * @stability STABLE
 */
export interface IRDelta {
  delta_id: string; // UUID v4
  timestamp: string;
  operations: IRDeltaOp[];
  reverses_delta_id?: string;
  from_migration_id?: string;
}

/**
 * @stability STABLE
 */
export interface IRDeltaStack {
  max_size: number;
  undo_pointer: number;
  deltas: readonly IRDelta[];
}
