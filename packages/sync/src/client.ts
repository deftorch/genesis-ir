import { WebSocket } from 'ws';
import { SyncMessage, UserPresence } from './types.js';

/**
 * GenesisSyncClient: SDK wrapper client managing real-time document synchronization.
 * Includes automatic reconnection with exponential backoff and sync recovery.
 * @stability BETA
 */
export class GenesisSyncClient {
  private ws: WebSocket | null = null;
  private url: string;
  private roomId: string;
  private userId: string;
  private userName: string;
  private isClosedExplicitly = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseDelayMs = 1000;
  private lastDisconnectTime = 0;
  private forceFullSyncThresholdMs = 30000; // 30 seconds

  // Event callbacks
  public onConnected?: () => void;
  public onDisconnected?: () => void;
  public onCrdtUpdate?: (payload: any) => void;
  public onPresenceUpdate?: (presence: any) => void;
  public onSyncResponse?: (snapshotBase64: string | null) => void;
  public onError?: (error: string) => void;

  constructor(opts: {
    url: string;
    roomId: string;
    userId: string;
    userName?: string;
  }) {
    this.url = opts.url;
    this.roomId = opts.roomId;
    this.userId = opts.userId;
    this.userName = opts.userName || 'Anonymous';
  }

  /**
   * Connect to the server.
   */
  connect(): void {
    this.isClosedExplicitly = false;
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      this.reconnectAttempts = 0;
      this.joinRoom();
      
      const disconnectDuration = Date.now() - this.lastDisconnectTime;
      if (this.lastDisconnectTime > 0 && disconnectDuration > this.forceFullSyncThresholdMs) {
        // Reconnected after a long delay; request full snapshot
        this.requestSync();
      }

      if (this.onConnected) this.onConnected();
    });

    this.ws.on('message', (data) => {
      try {
        const msg: SyncMessage = JSON.parse(data.toString());
        if (msg.roomId !== this.roomId) return;

        switch (msg.type) {
          case 'crdt_update':
            if (this.onCrdtUpdate) this.onCrdtUpdate(msg.payload);
            break;
          case 'presence_update':
            if (this.onPresenceUpdate) this.onPresenceUpdate(msg.payload);
            break;
          case 'sync_response':
            if (this.onSyncResponse) this.onSyncResponse(msg.payload?.snapshotBase64 || null);
            break;
          case 'error':
            if (this.onError && msg.error) this.onError(msg.error);
            break;
        }
      } catch (e: any) {
        if (this.onError) this.onError(`Parse error: ${e.message}`);
      }
    });

    this.ws.on('close', () => {
      this.lastDisconnectTime = Date.now();
      if (this.onDisconnected) this.onDisconnected();
      if (!this.isClosedExplicitly) {
        this.attemptReconnect();
      }
    });

    this.ws.on('error', (err) => {
      if (this.onError) this.onError(err.message);
    });
  }

  /**
   * Disconnect from server.
   */
  disconnect(): void {
    this.isClosedExplicitly = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Broadcast a Loro/CRDT update snapshot base64 string to the room.
   */
  sendCrdtUpdate(snapshotBase64: string): void {
    this.send({
      type: 'crdt_update',
      roomId: this.roomId,
      senderId: this.userId,
      payload: { snapshotBase64 }
    });
  }

  /**
   * Broadcast user presence (cursor, selection, identity) updates.
   */
  sendPresence(presence: {
    cursor?: { x: number; y: number; nodeId?: string };
    activeNodeId?: string;
  }): void {
    this.send({
      type: 'presence_update',
      roomId: this.roomId,
      senderId: this.userId,
      payload: {
        userName: this.userName,
        cursor: presence.cursor,
        activeNodeId: presence.activeNodeId,
      }
    });
  }

  /**
   * Request a fresh full snapshot sync from the server.
   */
  requestSync(): void {
    this.send({
      type: 'sync_request',
      roomId: this.roomId,
      senderId: this.userId
    });
  }

  private joinRoom(): void {
    this.send({
      type: 'join_room',
      roomId: this.roomId,
      senderId: this.userId,
      payload: { userName: this.userName }
    });
  }

  private send(msg: SyncMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      if (this.onError) {
        this.onError('Max reconnection attempts reached');
      }
      return;
    }

    const delay = this.baseDelayMs * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => {
      this.connect();
    }, delay);
  }
}
