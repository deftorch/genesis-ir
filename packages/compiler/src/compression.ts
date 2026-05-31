import * as lz4 from 'lz4js';

/**
 * Compress a buffer using LZ4 format via lz4js library.
 * Replaces the previous pure-JS toy implementation.
 * @stability STABLE
 */
export function compress(data: Buffer): Buffer {
  if (data.length === 0) {
    return Buffer.alloc(0);
  }
  return Buffer.from(lz4.compress(data));
}

/**
 * Decompress an LZ4-compressed buffer.
 * Replaces the previous pure-JS toy implementation.
 * @stability STABLE
 */
export function decompress(data: Buffer): Buffer {
  if (data.length === 0) {
    return Buffer.alloc(0);
  }
  return Buffer.from(lz4.decompress(data));
}
