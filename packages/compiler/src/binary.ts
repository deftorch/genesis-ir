import * as crypto from 'crypto';
import { IRDocument, IRMigrationScript, IRMigrationTransformer } from '@genesis/types';

// ==========================================
// 1. PURE JS MESSAGEPACK ENCODER/DECODER
// ==========================================
export function encodeMsgPack(val: unknown): Buffer {
  const buffers: Buffer[] = [];

  function write(v: unknown) {
    if (v === null || v === undefined) {
      buffers.push(Buffer.from([0xc0]));
    } else if (typeof v === 'boolean') {
      buffers.push(Buffer.from([v ? 0xc3 : 0xc2]));
    } else if (typeof v === 'number') {
      if (Number.isInteger(v)) {
        if (v >= 0 && v <= 127) {
          buffers.push(Buffer.from([v]));
        } else if (v < 0 && v >= -32) {
          buffers.push(Buffer.from([0xe0 | (v + 32)]));
        } else if (v >= 0 && v <= 0xff) {
          buffers.push(Buffer.from([0xcc, v]));
        } else if (v >= 0 && v <= 0xffff) {
          const buf = Buffer.alloc(3);
          buf[0] = 0xcd;
          buf.writeUInt16BE(v, 1);
          buffers.push(buf);
        } else if (v >= 0 && v <= 0xffffffff) {
          const buf = Buffer.alloc(5);
          buf[0] = 0xce;
          buf.writeUInt32BE(v, 1);
          buffers.push(buf);
        } else if (v < 0 && v >= -128) {
          const buf = Buffer.alloc(2);
          buf[0] = 0xd0;
          buf.writeInt8(v, 1);
          buffers.push(buf);
        } else if (v < 0 && v >= -32768) {
          const buf = Buffer.alloc(3);
          buf[0] = 0xd1;
          buf.writeInt16BE(v, 1);
          buffers.push(buf);
        } else if (v < 0 && v >= -2147483648) {
          const buf = Buffer.alloc(5);
          buf[0] = 0xd2;
          buf.writeInt32BE(v, 1);
          buffers.push(buf);
        } else {
          // Fallback to float64
          const buf = Buffer.alloc(9);
          buf[0] = 0xcb;
          buf.writeDoubleBE(v, 1);
          buffers.push(buf);
        }
      } else {
        const buf = Buffer.alloc(9);
        buf[0] = 0xcb;
        buf.writeDoubleBE(v, 1);
        buffers.push(buf);
      }
    } else if (typeof v === 'string') {
      const strBuf = Buffer.from(v, 'utf-8');
      const len = strBuf.length;
      if (len <= 31) {
        buffers.push(Buffer.from([0xa0 | len]));
      } else if (len <= 0xff) {
        buffers.push(Buffer.from([0xd9, len]));
      } else if (len <= 0xffff) {
        const buf = Buffer.alloc(3);
        buf[0] = 0xda;
        buf.writeUInt16BE(len, 1);
        buffers.push(buf);
      } else {
        const buf = Buffer.alloc(5);
        buf[0] = 0xdb;
        buf.writeUInt32BE(len, 1);
        buffers.push(buf);
      }
      buffers.push(strBuf);
    } else if (Array.isArray(v)) {
      const len = v.length;
      if (len <= 15) {
        buffers.push(Buffer.from([0x90 | len]));
      } else if (len <= 0xffff) {
        const buf = Buffer.alloc(3);
        buf[0] = 0xdc;
        buf.writeUInt16BE(len, 1);
        buffers.push(buf);
      } else {
        const buf = Buffer.alloc(5);
        buf[0] = 0xdd;
        buf.writeUInt32BE(len, 1);
        buffers.push(buf);
      }
      for (const item of v) {
        write(item);
      }
    } else if (typeof v === 'object') {
      const keys = Object.keys(v);
      const len = keys.length;
      if (len <= 15) {
        buffers.push(Buffer.from([0x80 | len]));
      } else if (len <= 0xffff) {
        const buf = Buffer.alloc(3);
        buf[0] = 0xde;
        buf.writeUInt16BE(len, 1);
        buffers.push(buf);
      } else {
        const buf = Buffer.alloc(5);
        buf[0] = 0xdf;
        buf.writeUInt32BE(len, 1);
        buffers.push(buf);
      }
      for (const k of keys) {
        write(k);
        write((v as Record<string, unknown>)[k]);
      }
    }
  }

  write(val);
  return Buffer.concat(buffers);
}

export function decodeMsgPack(buf: Buffer): unknown {
  let offset = 0;

  function read(): unknown {
    if (offset >= buf.length) throw new Error('Unexpected EOF in MsgPack');
    const type = buf[offset++];

    if (type <= 0x7f) return type; // positive fixint
    if (type >= 0xe0 && type <= 0xff) return type - 256; // negative fixint
    if (type >= 0x80 && type <= 0x8f) return readMap(type & 0xf);
    if (type >= 0x90 && type <= 0x9f) return readArray(type & 0xf);
    if (type >= 0xa0 && type <= 0xbf) return readStr(type & 0x1f);

    switch (type) {
      case 0xc0: return null;
      case 0xc2: return false;
      case 0xc3: return true;
      case 0xcc: return buf[offset++];
      case 0xcd: {
        const v = buf.readUInt16BE(offset);
        offset += 2;
        return v;
      }
      case 0xce: {
        const v = buf.readUInt32BE(offset);
        offset += 4;
        return v;
      }
      case 0xd0: {
        const v = buf.readInt8(offset);
        offset += 1;
        return v;
      }
      case 0xd1: {
        const v = buf.readInt16BE(offset);
        offset += 2;
        return v;
      }
      case 0xd2: {
        const v = buf.readInt32BE(offset);
        offset += 4;
        return v;
      }
      case 0xcb: {
        const v = buf.readDoubleBE(offset);
        offset += 8;
        return v;
      }
      case 0xd9: return readStr(buf[offset++]);
      case 0xda: {
        const len = buf.readUInt16BE(offset);
        offset += 2;
        return readStr(len);
      }
      case 0xdb: {
        const len = buf.readUInt32BE(offset);
        offset += 4;
        return readStr(len);
      }
      case 0xdc: {
        const len = buf.readUInt16BE(offset);
        offset += 2;
        return readArray(len);
      }
      case 0xdd: {
        const len = buf.readUInt32BE(offset);
        offset += 4;
        return readArray(len);
      }
      case 0xde: {
        const len = buf.readUInt16BE(offset);
        offset += 2;
        return readMap(len);
      }
      case 0xdf: {
        const len = buf.readUInt32BE(offset);
        offset += 4;
        return readMap(len);
      }
      default:
        throw new Error(`Unsupported MsgPack type: 0x${type.toString(16)}`);
    }
  }

  function readStr(len: number): string {
    const s = buf.toString('utf-8', offset, offset + len);
    offset += len;
    return s;
  }

  function readArray(len: number): unknown[] {
    const arr: unknown[] = [];
    for (let i = 0; i < len; i++) {
      arr.push(read());
    }
    return arr;
  }

  function readMap(len: number): Record<string, unknown> {
    const map: Record<string, unknown> = {};
    for (let i = 0; i < len; i++) {
      const k = read() as string;
      const v = read();
      map[k] = v;
    }
    return map;
  }

  return read();
}

// ==========================================
// 2. LZ4 COMPRESSOR / DECOMPRESSOR (lz4js)
// ==========================================
import { compress as lz4Compress, decompress as lz4Decompress } from './compression.js';

/**
 * Compress a Buffer using LZ4 format.
 * @stability STABLE
 */
export function compressLZ4(input: Buffer): Buffer {
  return lz4Compress(input);
}

/**
 * Decompress an LZ4-compressed block.
 * @stability STABLE
 */
export function decompressLZ4(input: Buffer): Buffer {
  return lz4Decompress(input);
}

// ==========================================
// 3. SERIALIZE & DESERIALIZE TO/FROM .GIR
// ==========================================
export function serializeToGIR(doc: IRDocument): Buffer {
  // Step 1: Serialize Body Blocks
  const metadata = {
    ir_id: doc.ir_id,
    meta: doc.meta,
    observability: doc.observability,
    x_debug: doc.x_debug,
    print_spec: doc.print_spec,
    music_spec: doc.music_spec,
    pixel_spec: doc.pixel_spec,
    font_spec: doc.font_spec,
    mockup_spec: doc.mockup_spec,
  };

  const canvasStyle = {
    canvas: doc.canvas,
    style_context: doc.style_context,
  };

  const nodeTree = {
    objects: doc.objects,
  };

  const assetPool = {
    assets: (doc as unknown as Record<string, unknown>).assets,
  };

  // Block 1, 2, 3: MsgPack + LZ4
  const block1Compressed = compressLZ4(encodeMsgPack(metadata));
  const block2Compressed = compressLZ4(encodeMsgPack(canvasStyle));
  const block3Compressed = compressLZ4(encodeMsgPack(nodeTree));
  // Block 4: MsgPack only
  const block4Uncompressed = encodeMsgPack(assetPool);

  // Combine into body payload
  const bodyPayload = Buffer.concat([
    // Prefix each block with 32-bit length header for clean boundary parsing
    (() => {
      const lengths = Buffer.alloc(16);
      lengths.writeUInt32BE(block1Compressed.length, 0);
      lengths.writeUInt32BE(block2Compressed.length, 4);
      lengths.writeUInt32BE(block3Compressed.length, 8);
      lengths.writeUInt32BE(block4Uncompressed.length, 12);
      return lengths;
    })(),
    block1Compressed,
    block2Compressed,
    block3Compressed,
    block4Uncompressed,
  ]);

  // Step 2: Build 64-byte Header
  const header = Buffer.alloc(64);
  // 1. Byte 0-3: Magic Number "GIR!"
  header.write('GIR!', 0, 'ascii');
  // 2. Byte 4-5: Binary Version (0x0001)
  header.writeUInt16BE(1, 4);
  // 3. Byte 6-9: Schema Version (100)
  header.writeUInt32BE(100, 6);
  // 4. Byte 10-11: Domain index (0-16)
  const domains = [
    'visual', 'image_edit', 'video', 'audio', 'motion', 'print', 'signage', 'packaging',
    'data_viz', 'interactive', '3d', 'document', 'music_production', 'pixel_art', 'diagram',
    'mockup', 'font_design'
  ];
  const domainIdx = domains.indexOf(doc.meta?.domain) !== -1 ? domains.indexOf(doc.meta.domain) : 0;
  header.writeUInt16BE(domainIdx, 10);

  // 5. Byte 12-15: Flags (e.g. Bit 1: LZ4 compression used)
  header.writeUInt32BE(0x02, 12);
  // 6. Byte 16-31: UUID Dokumen in 16-byte raw format
  const uuidClean = doc.ir_id.replace(/-/g, '');
  const uuidBuf = Buffer.from(uuidClean, 'hex');
  if (uuidBuf.length === 16) {
    uuidBuf.copy(header, 16);
  }
  // 7. Byte 32-39: Timestamp epoch in ms (64-bit BigInt)
  const ts = doc.meta?.created_at ? new Date(doc.meta.created_at).getTime() : Date.now();
  header.writeBigInt64BE(BigInt(ts), 32);
  // 8. Byte 40-51: Reserved (all 0x00)
  header.fill(0, 40, 52);

  // 9. Byte 52-63: Checksum (first 12 bytes = 96 bits of SHA-256 of bodyPayload)
  const sha256 = crypto.createHash('sha256').update(bodyPayload).digest();
  sha256.copy(header, 52, 0, 12);

  return Buffer.concat([header, bodyPayload]);
}

export function deserializeFromGIR(buffer: Buffer): IRDocument {
  // Step 1: Validate Header
  if (buffer.length < 64) {
    throw new Error('Buffer is too small for a valid .gir file');
  }

  const magic = buffer.toString('ascii', 0, 4);
  if (magic !== 'GIR!') {
    throw new Error('Invalid magic number: Must start with "GIR!"');
  }

  const binaryVersion = buffer.readUInt16BE(4);
  const schemaVersion = buffer.readUInt32BE(6);
  const domainIdx = buffer.readUInt16BE(10);
  const flags = buffer.readUInt32BE(12);

  // Parse UUID
  const uuidBuf = buffer.subarray(16, 32);
  const uuidHex = uuidBuf.toString('hex');
  const ir_id = [
    uuidHex.slice(0, 8),
    uuidHex.slice(8, 12),
    uuidHex.slice(12, 16),
    uuidHex.slice(16, 20),
    uuidHex.slice(20, 32)
  ].join('-');

  const timestamp = Number(buffer.readBigInt64BE(32));
  const checksum = buffer.subarray(52, 64);

  // Extract body payload
  const bodyPayload = buffer.subarray(64);

  // Verify integrity Checksum
  const computedSha256 = crypto.createHash('sha256').update(bodyPayload).digest();
  const computedChecksum = computedSha256.subarray(0, 12);
  if (!checksum.equals(computedChecksum)) {
    throw new Error('SHA-256 Checksum validation failed: Payload modified or corrupt');
  }

  // Parse block sizes
  const b1Len = bodyPayload.readUInt32BE(0);
  const b2Len = bodyPayload.readUInt32BE(4);
  const b3Len = bodyPayload.readUInt32BE(8);
  const b4Len = bodyPayload.readUInt32BE(12);

  let offset = 16;
  const b1Data = bodyPayload.subarray(offset, offset + b1Len);
  offset += b1Len;
  const b2Data = bodyPayload.subarray(offset, offset + b2Len);
  offset += b2Len;
  const b3Data = bodyPayload.subarray(offset, offset + b3Len);
  offset += b3Len;
  const b4Data = bodyPayload.subarray(offset, offset + b4Len);

  // Decompress and Decode Blocks
  const metadata = decodeMsgPack(decompressLZ4(b1Data)) as Record<string, unknown>;
  const canvasStyle = decodeMsgPack(decompressLZ4(b2Data)) as Record<string, unknown>;
  const nodeTree = decodeMsgPack(decompressLZ4(b3Data)) as Record<string, unknown>;
  const assetPool = decodeMsgPack(b4Data) as Record<string, unknown>;

  const domains = [
    'visual', 'image_edit', 'video', 'audio', 'motion', 'print', 'signage', 'packaging',
    'data_viz', 'interactive', '3d', 'document', 'music_production', 'pixel_art', 'diagram',
    'mockup', 'font_design'
  ];

  return {
    ir_id,
    domain: domains[domainIdx] || 'visual',
    meta: metadata.meta,
    canvas: canvasStyle.canvas,
    style_context: canvasStyle.style_context,
    objects: nodeTree.objects,
    assets: assetPool.assets,
    observability: metadata.observability,
    x_debug: metadata.x_debug,
    print_spec: metadata.print_spec,
    music_spec: metadata.music_spec,
    pixel_spec: metadata.pixel_spec,
    font_spec: metadata.font_spec,
    mockup_spec: metadata.mockup_spec,
  } as unknown as IRDocument;
}

// ==========================================
// 4. MIGRATION SYSTEM (DECISION #22, #26)
// ==========================================
export class MigrationRegistry {
  private scripts = new Map<string, IRMigrationScript>();

  registerScript(script: IRMigrationScript) {
    if (!script.id) {
      throw new Error('Migration script must have an "id" (script_id)');
    }
    this.scripts.set(script.id, script);
  }

  getScript(id: string): IRMigrationScript | undefined {
    return this.scripts.get(id);
  }

  /**
   * Run migration script on document.
   * Modifies fields only using declarative operator transforms (Decision #22).
   */
  runMigration(doc: IRDocument, scriptId: string): { doc: IRDocument; script_id: string } {
    const script = this.getScript(scriptId);
    if (!script) {
      throw new Error(`Migration script "${scriptId}" not found`);
    }

    // Keep checkpoint for rollback if required
    const checkpoint = JSON.parse(JSON.stringify(doc));

    try {
      let migrated = JSON.parse(JSON.stringify(doc));

      for (const transform of script.transforms) {
        switch (transform.op) {
          case 'rename_field': {
            migrated = this.transformRename(migrated, transform.path, transform.new_key);
            break;
          }
          case 'remove_field': {
            migrated = this.transformRemove(migrated, transform.path);
            break;
          }
          case 'add_field': {
            migrated = this.transformAdd(migrated, transform.path, transform.default_value);
            break;
          }
          case 'change_type': {
            migrated = this.transformChangeType(migrated, transform.path, transform.to_type);
            break;
          }
          case 'restructure': {
            migrated = this.transformRestructure(migrated, transform.transformer);
            break;
          }
        }
      }

      // Record migration script_id in x_debug (Decision #26)
      if (!migrated.x_debug) migrated.x_debug = {};
      if (!migrated.x_debug.migration_history) migrated.x_debug.migration_history = [];
      migrated.x_debug.migration_history.push({
        script_id: scriptId,
        migrated_at: new Date().toISOString(),
        from_version: script.from_version,
        to_version: script.to_version,
      });

      // Update schema version metadata
      if (!migrated.meta) migrated.meta = {} as any;
      migrated.meta.schema_version = script.to_version;

      return { doc: migrated, script_id: scriptId };
    } catch (err: unknown) {
      // Revert checkpoint on failure
      return { doc: checkpoint, script_id: scriptId };
    }
  }

  /**
   * Rollback migration to previous checkpoint.
   */
  rollbackMigration(currentDoc: IRDocument, originalDoc: IRDocument): IRDocument {
    return JSON.parse(JSON.stringify(originalDoc));
  }

  private transformRename(obj: unknown, path: string, newKey: string): unknown {
    const parts = path.split('.');
    const lastKey = parts.pop()!;
    let current = obj as Record<string, unknown>;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part] as Record<string, unknown>;
      }
    }
    if (current && typeof current === 'object' && lastKey in current) {
      current[newKey] = current[lastKey];
      delete current[lastKey];
    }
    return obj;
  }

  private transformRemove(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    const lastKey = parts.pop()!;
    let current = obj as Record<string, unknown>;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part] as Record<string, unknown>;
      }
    }
    if (current && typeof current === 'object' && lastKey in current) {
      delete current[lastKey];
    }
    return obj;
  }

  private transformAdd(obj: unknown, path: string, defaultValue: unknown): unknown {
    const parts = path.split('.');
    const lastKey = parts.pop()!;
    let current = obj as Record<string, unknown>;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }
    }
    if (current && typeof current === 'object' && !(lastKey in current)) {
      current[lastKey] = defaultValue;
    }
    return obj;
  }

  private transformChangeType(obj: unknown, path: string, toType: string): unknown {
    const parts = path.split('.');
    const lastKey = parts.pop()!;
    let current = obj as Record<string, unknown>;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part] as Record<string, unknown>;
      }
    }
    if (current && typeof current === 'object' && lastKey in current) {
      const val = current[lastKey];
      if (toType === 'string') current[lastKey] = String(val);
      else if (toType === 'number') current[lastKey] = Number(val);
      else if (toType === 'boolean') current[lastKey] = Boolean(val);
    }
    return obj;
  }

  private transformRestructure(obj: unknown, transformer: IRMigrationTransformer): unknown {
    if (transformer.type === 'map_nodes' && Array.isArray((obj as Record<string, unknown>).objects)) {
      (obj as Record<string, unknown>).objects = ((obj as Record<string, unknown>).objects as unknown[]).map((node: unknown) => {
        let mapped: Record<string, unknown> = { ...(node as object) };
        if (transformer.field_mapping) {
          for (const [from, to] of Object.entries(transformer.field_mapping)) {
            if (from in mapped) {
              mapped[to] = mapped[from];
              delete mapped[from];
            }
          }
        }
        if (transformer.defaults) {
          for (const [k, v] of Object.entries(transformer.defaults)) {
            if (!(k in mapped)) {
              mapped[k] = v;
            }
          }
        }
        return mapped;
      });
    }
    return obj;
  }
}
