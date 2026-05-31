import * as crypto from 'crypto';
import { IRDocument, IRMigrationScript, IRMigrationTransformer } from '@genesis/types';

// ==========================================
// 1. PURE JS MESSAGEPACK ENCODER/DECODER
// ==========================================
export function encodeMsgPack(val: any): Buffer {
  const buffers: Buffer[] = [];

  function write(v: any) {
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
        write(v[k]);
      }
    }
  }

  write(val);
  return Buffer.concat(buffers);
}

export function decodeMsgPack(buf: Buffer): any {
  let offset = 0;

  function read(): any {
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

  function readArray(len: number): any[] {
    const arr = [];
    for (let i = 0; i < len; i++) {
      arr.push(read());
    }
    return arr;
  }

  function readMap(len: number): any {
    const map: any = {};
    for (let i = 0; i < len; i++) {
      const k = read();
      const v = read();
      map[k] = v;
    }
    return map;
  }

  return read();
}

// ==========================================
// 2. LZ4 COMPRESSOR / DECOMPRESSOR (PURE JS)
// ==========================================
// Block-level LZ4 compressor/decompressor using hash-table match lookup.
// Each LZ4 sequence: token(1B) + [extra_lit_len] + literal_bytes + offset(2B LE) + [extra_match_len]
// The LAST sequence in a block has no match part (literals only).

function hashU32(buf: Buffer, pos: number): number {
  // Simple 4-byte hash for match lookup
  return ((buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16) | (buf[pos + 3] << 24)) * 2654435761) >>> 0;
}

function writeLitLen(out: number[], litLen: number, tokenPos: number): void {
  // Write literal length into the upper nibble of token at tokenPos,
  // and any extra length bytes after the token.
  const nibble = Math.min(litLen, 15);
  out[tokenPos] = (out[tokenPos] & 0x0f) | (nibble << 4);
  if (litLen >= 15) {
    let rem = litLen - 15;
    while (rem >= 255) {
      out.push(255);
      rem -= 255;
    }
    out.push(rem);
  }
}

function writeMatchLen(out: number[], matchLen: number, tokenPos: number): void {
  // Write match length (minus 4) into the lower nibble of token at tokenPos.
  const ml = matchLen - 4;
  const nibble = Math.min(ml, 15);
  out[tokenPos] = (out[tokenPos] & 0xf0) | nibble;
  if (ml >= 15) {
    let rem = ml - 15;
    while (rem >= 255) {
      out.push(255);
      rem -= 255;
    }
    out.push(rem);
  }
}

/**
 * Compress a Buffer using LZ4 block format.
 * @stability BETA
 */
export function compressLZ4(input: Buffer): Buffer {
  const len = input.length;
  if (len === 0) return Buffer.alloc(0);

  // For very small inputs, just emit a single literal-only sequence
  if (len < 13) {
    const out: number[] = [];
    const tokenPos = out.length;
    out.push(0); // placeholder token
    writeLitLen(out, len, tokenPos);
    for (let i = 0; i < len; i++) out.push(input[i]);
    return Buffer.from(out);
  }

  const TABLE_BITS = 12;
  const TABLE_SIZE = 1 << TABLE_BITS;
  const TABLE_MASK = TABLE_SIZE - 1;
  const hashTable = new Int32Array(TABLE_SIZE).fill(-1);

  const out: number[] = [];
  let anchor = 0; // start of current unmatched literal run
  let ip = 0;

  // Main compression loop — stop when we can no longer read a full 4-byte sequence
  // plus the last 5 bytes (last match copy requires ≥5 trailing literals in LZ4)
  const matchLimit = len - 5;

  while (ip < matchLimit) {
    // Hash current 4 bytes
    const h = (hashU32(input, ip) >>> (32 - TABLE_BITS)) & TABLE_MASK;
    const ref = hashTable[h];
    hashTable[h] = ip;

    // Check match: must be within 64KB window and match ≥4 bytes
    if (
      ref >= 0 &&
      ip - ref <= 65535 &&
      ip - ref >= 1 &&
      input[ref] === input[ip] &&
      input[ref + 1] === input[ip + 1] &&
      input[ref + 2] === input[ip + 2] &&
      input[ref + 3] === input[ip + 3]
    ) {
      // Extend match forward
      let matchLen = 4;
      while (ip + matchLen < len && input[ref + matchLen] === input[ip + matchLen]) {
        matchLen++;
      }

      // Emit sequence: literals + match
      const litLen = ip - anchor;
      const tokenPos = out.length;
      out.push(0); // placeholder token

      // Literal length nibble + extra bytes
      writeLitLen(out, litLen, tokenPos);

      // Literal bytes
      for (let i = anchor; i < ip; i++) out.push(input[i]);

      // Match offset (LE 16-bit)
      const offset = ip - ref;
      out.push(offset & 0xff);
      out.push((offset >> 8) & 0xff);

      // Match length nibble + extra bytes
      writeMatchLen(out, matchLen, tokenPos);

      ip += matchLen;
      anchor = ip;
    } else {
      ip++;
    }
  }

  // Emit final literal-only sequence (remaining bytes from anchor to end)
  {
    const litLen = len - anchor;
    const tokenPos = out.length;
    out.push(0);
    writeLitLen(out, litLen, tokenPos);
    for (let i = anchor; i < len; i++) out.push(input[i]);
  }

  return Buffer.from(out);
}

/**
 * Decompress an LZ4-compressed block.
 * @stability BETA
 */
export function decompressLZ4(input: Buffer): Buffer {
  const out: number[] = [];
  let ip = 0;
  const ilen = input.length;

  while (ip < ilen) {
    const token = input[ip++];

    // 1. Decode literal length
    let litLen = (token >> 4) & 0x0f;
    if (litLen === 15) {
      let s: number;
      do {
        s = input[ip++];
        litLen += s;
      } while (s === 255);
    }

    // 2. Copy literal bytes
    for (let i = 0; i < litLen; i++) {
      out.push(input[ip++]);
    }

    // If we've consumed all input, this was the last (literal-only) sequence
    if (ip >= ilen) break;

    // 3. Decode match offset (LE 16-bit)
    const offset = input[ip] | (input[ip + 1] << 8);
    ip += 2;

    // 4. Decode match length
    let matchLen = token & 0x0f;
    if (matchLen === 15) {
      let s: number;
      do {
        s = input[ip++];
        matchLen += s;
      } while (s === 255);
    }
    matchLen += 4;

    // 5. Copy match from output history
    const matchStart = out.length - offset;
    for (let i = 0; i < matchLen; i++) {
      out.push(out[matchStart + i]);
    }
  }

  return Buffer.from(out);
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
    assets: (doc as any).assets,
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
  const metadata = decodeMsgPack(decompressLZ4(b1Data));
  const canvasStyle = decodeMsgPack(decompressLZ4(b2Data));
  const nodeTree = decodeMsgPack(decompressLZ4(b3Data));
  const assetPool = decodeMsgPack(b4Data);

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
  } as any;
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
    } catch (err: any) {
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

  private transformRename(obj: any, path: string, newKey: string): any {
    const parts = path.split('.');
    const lastKey = parts.pop()!;
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      }
    }
    if (current && typeof current === 'object' && lastKey in current) {
      current[newKey] = current[lastKey];
      delete current[lastKey];
    }
    return obj;
  }

  private transformRemove(obj: any, path: string): any {
    const parts = path.split('.');
    const lastKey = parts.pop()!;
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
      }
    }
    if (current && typeof current === 'object' && lastKey in current) {
      delete current[lastKey];
    }
    return obj;
  }

  private transformAdd(obj: any, path: string, defaultValue: any): any {
    const parts = path.split('.');
    const lastKey = parts.pop()!;
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        if (!(part in current)) {
          current[part] = {};
        }
        current = current[part];
      }
    }
    if (current && typeof current === 'object' && !(lastKey in current)) {
      current[lastKey] = defaultValue;
    }
    return obj;
  }

  private transformChangeType(obj: any, path: string, toType: string): any {
    const parts = path.split('.');
    const lastKey = parts.pop()!;
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === 'object') {
        current = current[part];
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

  private transformRestructure(obj: any, transformer: IRMigrationTransformer): any {
    if (transformer.type === 'map_nodes' && Array.isArray(obj.objects)) {
      obj.objects = obj.objects.map((node: any) => {
        let mapped = { ...node };
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
