import { IRDelta } from '@genesis/types';

/**
 * Message types for the Real-time Collaboration WebSocket Sync Layer.
 * @stability STABLE
 */
export type SyncMessageType =
  | 'join_room'
  | 'crdt_update'
  | 'presence_update'
  | 'sync_request'
  | 'sync_response'
  | 'error';

/**
 * Client-Server message envelope format.
 * @stability STABLE
 */
export interface SyncMessage {
  type: SyncMessageType;
  roomId: string;
  senderId: string;
  payload?: any;
  error?: string;
}

/**
 * User presence structure (cursor positions, selection, user metadata).
 * @stability STABLE
 */
export interface UserPresence {
  userId: string;
  userName: string;
  cursor?: { x: number; y: number; nodeId?: string };
  activeNodeId?: string;
  lastSeenMs: number;
}

/**
 * Persistence layer adapter for room snapshots.
 * @stability STABLE
 */
export interface ISyncPersistenceStore {
  saveSnapshot(roomId: string, snapshot: Uint8Array): Promise<void>;
  getSnapshot(roomId: string): Promise<Uint8Array | null>;
}

/**
 * In-memory fallback persistence store implementation.
 * @stability BETA
 */
export class InMemorySyncPersistence implements ISyncPersistenceStore {
  private store = new Map<string, Uint8Array>();

  async saveSnapshot(roomId: string, snapshot: Uint8Array): Promise<void> {
    this.store.set(roomId, snapshot);
  }

  async getSnapshot(roomId: string): Promise<Uint8Array | null> {
    return this.store.get(roomId) || null;
  }
}
