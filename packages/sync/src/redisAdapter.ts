import { ISyncPersistenceStore } from './types.js';
import { Redis } from 'ioredis';

/**
 * Redis-backed persistence layer for room snapshots.
 * @stability BETA
 */
export class RedisSyncPersistence implements ISyncPersistenceStore {
  private client: Redis;
  private prefix: string;

  constructor(redisUrl: string, prefix = 'gir:sync:') {
    this.client = new Redis(redisUrl);
    this.prefix = prefix;
  }

  async saveSnapshot(roomId: string, snapshot: Uint8Array): Promise<void> {
    const key = `${this.prefix}${roomId}`;
    const buffer = Buffer.from(snapshot);
    // Disimpan ke dalam redis sebagai buffer biner
    await this.client.set(key, buffer);
  }

  async getSnapshot(roomId: string): Promise<Uint8Array | null> {
    const key = `${this.prefix}${roomId}`;
    const buffer = await this.client.getBuffer(key);
    if (!buffer) return null;
    return new Uint8Array(buffer);
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}
