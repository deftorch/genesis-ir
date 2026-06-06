import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenesisSyncServer } from '../server.js';
import { GenesisSyncClient } from '../client.js';
import { InMemorySyncPersistence } from '../types.js';

describe('Real-time Collaboration & Synchronization Layer', () => {
  let server: GenesisSyncServer;
  const port = 8085;
  const wsUrl = `ws://localhost:${port}`;
  const persistence = new InMemorySyncPersistence();

  beforeAll(async () => {
    // Start local WebSocket Server
    server = new GenesisSyncServer({
      port,
      persistence,
      maxClientsPerRoom: 2, // Limit to 2 clients to test room full scenario
    });
  });

  afterAll(async () => {
    await server.close();
  });

  it('allows clients to connect, join rooms, and retrieve initial state', () => {
    return new Promise<void>((resolve, reject) => {
      const client = new GenesisSyncClient({
        url: wsUrl,
        roomId: 'room-1',
        userId: 'user-1',
        userName: 'Alice',
      });

      client.onSyncResponse = (snapshotBase64) => {
        expect(snapshotBase64).toBeNull(); // Empty room initially
        client.disconnect();
        resolve();
      };

      client.onError = (err) => {
        reject(new Error(err));
      };

      client.connect();
    });
  });

  it('broadcasts Loro document updates to other room members and persists updates', () => {
    return new Promise<void>((resolve, reject) => {
      const client1 = new GenesisSyncClient({
        url: wsUrl,
        roomId: 'room-2',
        userId: 'user-a',
        userName: 'Alice',
      });

      const client2 = new GenesisSyncClient({
        url: wsUrl,
        roomId: 'room-2',
        userId: 'user-b',
        userName: 'Bob',
      });

      const mockSnapshot = Buffer.from('loro-crdt-binary-payload').toString('base64');

      client2.onCrdtUpdate = (payload) => {
        expect(payload.snapshotBase64).toBe(mockSnapshot);
        client1.disconnect();
        client2.disconnect();
        resolve();
      };

      client1.onConnected = () => {
        client2.connect();
      };

      client2.onConnected = () => {
        // Broadcast update from client 1
        client1.sendCrdtUpdate(mockSnapshot);
      };

      client1.onError = (err) => reject(new Error(err));
      client2.onError = (err) => reject(new Error(err));

      client1.connect();
    });
  });

  it('broadcasts user presence (cursor coordinate / selected node) updates', () => {
    return new Promise<void>((resolve, reject) => {
      const client1 = new GenesisSyncClient({
        url: wsUrl,
        roomId: 'room-3',
        userId: 'user-x',
        userName: 'Xavier',
      });

      const client2 = new GenesisSyncClient({
        url: wsUrl,
        roomId: 'room-3',
        userId: 'user-y',
        userName: 'Yolanda',
      });

      client2.onPresenceUpdate = (presence) => {
        expect(presence.userName).toBe('Xavier');
        expect(presence.cursor).toEqual({ x: 100, y: 150, nodeId: 'node-abc' });
        client1.disconnect();
        client2.disconnect();
        resolve();
      };

      client1.onConnected = () => {
        client2.connect();
      };

      client2.onConnected = () => {
        client1.sendPresence({
          cursor: { x: 100, y: 150, nodeId: 'node-abc' }
        });
      };

      client1.connect();
    });
  });

  it('rejects additional client connection when room is full', () => {
    return new Promise<void>((resolve, reject) => {
      const client1 = new GenesisSyncClient({
        url: wsUrl,
        roomId: 'room-4', // maxClientsPerRoom is 2
        userId: 'user-10',
        userName: 'Alice',
      });

      const client2 = new GenesisSyncClient({
        url: wsUrl,
        roomId: 'room-4',
        userId: 'user-11',
        userName: 'Bob',
      });

      const client3 = new GenesisSyncClient({
        url: wsUrl,
        roomId: 'room-4',
        userId: 'user-12',
        userName: 'Charlie',
      });

      client3.onError = (err) => {
        expect(err).toContain('Room is full');
        client1.disconnect();
        client2.disconnect();
        client3.disconnect();
        resolve();
      };

      client1.onConnected = () => {
        client2.connect();
      };

      client2.onConnected = () => {
        client3.connect();
      };

      client1.connect();
    });
  });
});
