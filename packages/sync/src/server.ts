import { WebSocketServer, WebSocket } from 'ws';
import { SyncMessage, ISyncPersistenceStore, InMemorySyncPersistence, UserPresence } from './types.js';

interface RoomClient {
  userId: string;
  ws: WebSocket;
}

/**
 * GenesisSyncServer: WebSocket server managing collaborative document synchronization.
 * Conflict resolution is handled at the CRDT layer; this server routes updates,
 * manages room presence, and persists document snapshots.
 * @stability BETA
 */
export class GenesisSyncServer {
  private wss: WebSocketServer;
  private rooms = new Map<string, RoomClient[]>();
  private presences = new Map<string, Map<string, UserPresence>>();
  private persistenceStore: ISyncPersistenceStore;
  private maxClientsPerRoom: number;
  private maxPayloadSizeBytes: number;

  constructor(opts: {
    port?: number;
    server?: any;
    persistence?: ISyncPersistenceStore;
    maxClientsPerRoom?: number;
    maxPayloadSizeBytes?: number;
  } = {}) {
    this.wss = new WebSocketServer({
      port: opts.port,
      server: opts.server,
    });
    this.persistenceStore = opts.persistence || new InMemorySyncPersistence();
    this.maxClientsPerRoom = opts.maxClientsPerRoom || 50;
    this.maxPayloadSizeBytes = opts.maxPayloadSizeBytes || 5 * 1024 * 1024; // 5MB limit

    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });
  }

  /**
   * Stop the WebSocket server.
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.wss.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private handleConnection(ws: WebSocket): void {
    let clientRoomId: string | null = null;
    let clientUserId: string | null = null;

    ws.on('message', async (data, isBinary) => {
      try {
        if (data.toString().length > this.maxPayloadSizeBytes) {
          this.sendError(ws, 'Payload too large', clientRoomId || '');
          return;
        }

        const msg: SyncMessage = JSON.parse(data.toString());
        if (!msg.roomId || !msg.senderId) {
          this.sendError(ws, 'Missing roomId or senderId', msg.roomId || '');
          return;
        }

        clientRoomId = msg.roomId;
        clientUserId = msg.senderId;

        switch (msg.type) {
          case 'join_room':
            await this.handleJoinRoom(ws, msg);
            break;
          case 'crdt_update':
            await this.handleCrdtUpdate(ws, msg);
            break;
          case 'presence_update':
            this.handlePresenceUpdate(ws, msg);
            break;
          case 'sync_request':
            await this.handleSyncRequest(ws, msg);
            break;
          default:
            this.sendError(ws, `Unsupported message type: ${msg.type}`, msg.roomId);
        }
      } catch (e: any) {
        this.sendError(ws, `Failed to process message: ${e.message}`, clientRoomId || '');
      }
    });

    ws.on('close', () => {
      if (clientRoomId && clientUserId) {
        this.removeClientFromRoom(clientRoomId, clientUserId);
        this.broadcastPresencePruning(clientRoomId, clientUserId);
      }
    });
  }

  private async handleJoinRoom(ws: WebSocket, msg: SyncMessage): Promise<void> {
    const { roomId, senderId } = msg;
    let clients = this.rooms.get(roomId) || [];

    // Circuit breaker: check maximum client count
    if (clients.length >= this.maxClientsPerRoom) {
      this.sendError(ws, 'Room is full', roomId);
      ws.close(1008, 'Room is full');
      return;
    }

    // Add client if not already present
    if (!clients.some(c => c.userId === senderId)) {
      clients.push({ userId: senderId, ws });
      this.rooms.set(roomId, clients);
    }

    // Send initial join acknowledgement
    ws.send(JSON.stringify({
      type: 'join_room',
      roomId,
      senderId: 'server',
      payload: { status: 'joined', clientCount: clients.length }
    }));

    // Trigger sync response automatically
    await this.handleSyncRequest(ws, msg);
  }

  private async handleCrdtUpdate(ws: WebSocket, msg: SyncMessage): Promise<void> {
    const { roomId, senderId, payload } = msg;
    
    this.broadcastToRoom(roomId, senderId, {
      type: 'crdt_update',
      roomId,
      senderId,
      payload
    });

    // Persist snapshot to store
    if (payload && payload.snapshotBase64) {
      try {
        const buf = Buffer.from(payload.snapshotBase64, 'base64');
        await this.persistenceStore.saveSnapshot(roomId, buf);
      } catch (e) {
        // Log persistence error
      }
    }
  }

  private handlePresenceUpdate(ws: WebSocket, msg: SyncMessage): void {
    const { roomId, senderId, payload } = msg;
    const presenceMap = this.presences.get(roomId) || new Map<string, UserPresence>();

    const userPresence: UserPresence = {
      userId: senderId,
      userName: payload?.userName || 'Anonymous',
      cursor: payload?.cursor,
      activeNodeId: payload?.activeNodeId,
      lastSeenMs: Date.now(),
    };

    presenceMap.set(senderId, userPresence);
    this.presences.set(roomId, presenceMap);

    // Broadcast presence update to others
    this.broadcastToRoom(roomId, senderId, {
      type: 'presence_update',
      roomId,
      senderId,
      payload: userPresence
    });
  }

  private async handleSyncRequest(ws: WebSocket, msg: SyncMessage): Promise<void> {
    const { roomId } = msg;
    const snapshot = await this.persistenceStore.getSnapshot(roomId);

    ws.send(JSON.stringify({
      type: 'sync_response',
      roomId,
      senderId: 'server',
      payload: {
        snapshotBase64: snapshot ? Buffer.from(snapshot).toString('base64') : null
      }
    }));
  }

  private broadcastToRoom(roomId: string, senderId: string, message: SyncMessage): void {
    const clients = this.rooms.get(roomId) || [];
    const msgStr = JSON.stringify(message);

    for (const client of clients) {
      if (client.userId !== senderId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msgStr);
      }
    }
  }

  private removeClientFromRoom(roomId: string, userId: string): void {
    let clients = this.rooms.get(roomId) || [];
    clients = clients.filter(c => c.userId !== userId);
    if (clients.length === 0) {
      this.rooms.delete(roomId);
      this.presences.delete(roomId);
    } else {
      this.rooms.set(roomId, clients);
      const presenceMap = this.presences.get(roomId);
      if (presenceMap) {
        presenceMap.delete(userId);
      }
    }
  }

  private broadcastPresencePruning(roomId: string, userId: string): void {
    this.broadcastToRoom(roomId, 'server', {
      type: 'presence_update',
      roomId,
      senderId: 'server',
      payload: {
        prunedUserId: userId
      }
    });
  }

  private sendError(ws: WebSocket, error: string, roomId: string): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'error',
        roomId,
        senderId: 'server',
        error
      }));
    }
  }
}
