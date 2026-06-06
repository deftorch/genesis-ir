/**
 * @stability STABLE
 * Struktur data detail operasi mutasi pada node dokumen IR (Keputusan #27).
 */
export type IRNodeOp =
  | { op: "add"; node: unknown; parent_id?: string; index?: number }
  | { op: "remove"; node_id: string }
  | { op: "replace"; node_id: string; path: string; value: unknown }
  | { op: "move"; node_id: string; new_parent_id: string; index?: number };

/**
 * @stability STABLE
 * Struktur data operasi mutasi meta data dokumen IR.
 */
export interface IRMetaOp {
  op: "replace";
  path: string;
  value: unknown;
}

/**
 * @stability STABLE
 * Struktur data operasi mutasi gaya (style) dokumen IR.
 */
export type IRStyleOp =
  | { op: "set_token"; path: string; value: unknown }
  | { op: "remove_token"; path: string }
  | { op: "set_component_style"; component_id: string; style: unknown }
  | { op: "set_object_override"; object_id: string; style: unknown };

/**
 * @stability STABLE
 * Struktur data operasi mutasi timeline dan keyframe dokumen IR.
 */
export type IRTimelineOp =
  | { op: "add_layer"; layer: unknown }
  | { op: "remove_layer"; layer_id: string }
  | { op: "add_keyframe"; layer_id: string; keyframe: unknown }
  | { op: "remove_keyframe"; layer_id: string; time_ms: number; property: string }
  | { op: "replace_keyframe"; layer_id: string; keyframe: unknown };

/**
 * @stability STABLE
 * Struktur data operasi mutasi aset (asset pool) dokumen IR.
 */
export type IRAssetOp =
  | { op: "add_asset"; asset: unknown }
  | { op: "remove_asset"; asset_id: string }
  | { op: "update_asset"; asset_id: string; path: string; value: unknown };

/**
 * @stability STABLE
 * Struktur data operasi mutasi saran visual (suggestion layer) dokumen IR.
 */
export type IRSuggestionOp =
  | { op: "add_suggestion"; suggestion: unknown }
  | { op: "resolve_suggestion"; suggestion_id: string; resolution: "accepted" | "rejected" }
  | { op: "expire_suggestion"; suggestion_id: string };

/**
 * @stability STABLE
 * Representasi transaksi perubahan atomik (delta) yang dapat diaplikasikan pada dokumen IR.
 * Menjamin replikasi state yang deterministik (Keputusan #27).
 */
export interface IRDelta {
  delta_id: string;
  created_at: string;
  created_by: string;
  lamport_clock?: number;
  session_id: string;
  delta_type:
    | "user_action"
    | "ai_generate"
    | "ai_edit"
    | "ai_autofix"
    | "suggestion_accept"
    | "migration"
    | "collab_merge"
    | "undo"
    | "redo";
  reverses_delta_id?: string;
  from_suggestion_id?: string;
  from_migration_id?: string;
  confidence?: number;
  validated: boolean;
  validation_pass?: "pass1" | "pass3" | "both";
  node_ops?: IRNodeOp[];
  meta_ops?: IRMetaOp[];
  style_ops?: IRStyleOp[];
  timeline_ops?: IRTimelineOp[];
  asset_ops?: IRAssetOp[];
  suggestion_ops?: IRSuggestionOp[];
}

/**
 * @stability STABLE
 * Struktur data penyimpan tumpukan (stack) delta perubahan dokumen IR.
 * Bersifat append-only dan melacak pointer undo aktif (Keputusan #34).
 */
export interface IRDeltaStack {
  document_id: string;
  stack: IRDelta[];
  undo_pointer: number;
  max_size: number;
  total_deltas: number;
  total_undone: number;
  last_delta_at: string;
}

/**
 * Create a new empty IRDeltaStack.
 * @stability BETA
 */
export function createDeltaStack(documentId: string, maxSize: number = 100): IRDeltaStack {
  return {
    document_id: documentId,
    stack: [],
    undo_pointer: -1,
    max_size: maxSize,
    total_deltas: 0,
    total_undone: 0,
    last_delta_at: new Date().toISOString(),
  };
}

/**
 * Append a delta to the stack. Evicts oldest deltas if max_size is exceeded.
 * @stability BETA
 */
export function pushDelta(stack: IRDeltaStack, delta: IRDelta): IRDeltaStack {
  // Truncate stack to undo_pointer + 1 (discard any redoable future)
  const truncated = stack.stack.slice(0, stack.undo_pointer + 1);
  truncated.push(delta);

  // Evict oldest if exceeding max_size
  while (truncated.length > stack.max_size) {
    truncated.shift();
  }

  return {
    ...stack,
    stack: truncated,
    undo_pointer: truncated.length - 1,
    total_deltas: stack.total_deltas + 1,
    last_delta_at: delta.created_at,
  };
}

/**
 * Undo: move the undo_pointer back by one.
 * Returns the delta that was undone, or null if nothing to undo.
 * @stability BETA
 */
export function undoDelta(stack: IRDeltaStack): { stack: IRDeltaStack; undone: IRDelta | null } {
  if (stack.undo_pointer < 0) {
    return { stack, undone: null };
  }
  const undone = stack.stack[stack.undo_pointer];
  return {
    stack: {
      ...stack,
      undo_pointer: stack.undo_pointer - 1,
      total_undone: stack.total_undone + 1,
    },
    undone,
  };
}

/**
 * Redo: move the undo_pointer forward by one.
 * Returns the delta that was redone, or null if nothing to redo.
 * @stability BETA
 */
export function redoDelta(stack: IRDeltaStack): { stack: IRDeltaStack; redone: IRDelta | null } {
  if (stack.undo_pointer >= stack.stack.length - 1) {
    return { stack, redone: null };
  }
  const redone = stack.stack[stack.undo_pointer + 1];
  return {
    stack: {
      ...stack,
      undo_pointer: stack.undo_pointer + 1,
    },
    redone,
  };
}

/**
 * Validate delta constraints.
 * @stability BETA
 */
export function validateDelta(delta: IRDelta): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if ((delta.delta_type === 'undo' || delta.delta_type === 'redo') && !delta.reverses_delta_id) {
    errors.push('Delta of type "undo" or "redo" must have reverses_delta_id');
  }

  if (delta.delta_type === 'migration' && !delta.from_migration_id) {
    errors.push('Delta of type "migration" must have from_migration_id');
  }

  return { valid: errors.length === 0, errors };
}
