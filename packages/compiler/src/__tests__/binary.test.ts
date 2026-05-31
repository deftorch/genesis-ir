import { describe, it, expect } from 'vitest';
import { createIRDocument } from '@genesis/types';
import {
  serializeToGIR,
  deserializeFromGIR,
  MigrationRegistry,
  compressLZ4,
  decompressLZ4,
  encodeMsgPack,
  decodeMsgPack
} from '../binary.js';

describe('FASE BINARY — MessagePack & LZ4', () => {
  it('encodes and decodes simple and complex values using MessagePack', () => {
    const original = {
      hello: 'world',
      num: 42,
      neg: -10,
      bool: true,
      nil: null,
      arr: [1, 'two', { nested: true }],
      obj: { key: 'value' }
    };
    const encoded = encodeMsgPack(original);
    const decoded = decodeMsgPack(encoded);
    expect(decoded).toEqual(original);
  });

  it('round-trips MsgPack for large nested objects', () => {
    const large = {
      items: Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        value: i * 3.14,
        active: i % 2 === 0,
      })),
    };
    const decoded = decodeMsgPack(encodeMsgPack(large));
    expect(decoded).toEqual(large);
  });

  it('compresses and decompresses data using LZ4', () => {
    const input = Buffer.from(
      'hello world! hello world! hello world! hello world! hello world!',
      'utf-8'
    );
    const compressed = compressLZ4(input);
    const decompressed = decompressLZ4(compressed);
    expect(decompressed.toString('utf-8')).toBe(input.toString('utf-8'));
  });

  it('LZ4 compresses to smaller size for repetitive data', () => {
    // Highly repetitive data should compress well
    const input = Buffer.from('AAAA'.repeat(500), 'utf-8');
    const compressed = compressLZ4(input);
    expect(compressed.length).toBeLessThan(input.length);
    const decompressed = decompressLZ4(compressed);
    expect(decompressed.equals(input)).toBe(true);
  });

  it('LZ4 round-trips small buffers', () => {
    const input = Buffer.from('hi', 'utf-8');
    const compressed = compressLZ4(input);
    const decompressed = decompressLZ4(compressed);
    expect(decompressed.toString('utf-8')).toBe('hi');
  });
});

describe('FASE BINARY — .gir Binary Format', () => {
  const sampleDoc = createIRDocument({
    domain: 'visual',
    canvas: {
      width: 1920,
      height: 1080,
      color_space: 'sRGB',
    },
  });
  sampleDoc.objects = [
    {
      id: 'node-1',
      kind: 'visual',
      type: 'shape',
      name: 'Background Shape',
      geometry: { x: 0, y: 0, width: 100, height: 100 },
      style_override: {},
    }
  ];

  it('header .gir byte 0-3 must always be "GIR!"', () => {
    const buffer = serializeToGIR(sampleDoc);
    const magic = buffer.subarray(0, 4).toString('ascii');
    expect(magic).toBe('GIR!');
    expect(buffer[0]).toBe(0x47); // G
    expect(buffer[1]).toBe(0x49); // I
    expect(buffer[2]).toBe(0x52); // R
    expect(buffer[3]).toBe(0x21); // !
  });

  it('header has total size of 64 bytes before payload', () => {
    const buffer = serializeToGIR(sampleDoc);
    expect(buffer.length).toBeGreaterThanOrEqual(64);
    // Binary version
    expect(buffer.readUInt16BE(4)).toBe(1);
    // Schema version
    expect(buffer.readUInt32BE(6)).toBe(100);
  });

  it('Document UUID in byte 16-31 must be identical to ir_id after parse', () => {
    const buffer = serializeToGIR(sampleDoc);
    const parsed = deserializeFromGIR(buffer);
    expect(parsed.ir_id).toBe(sampleDoc.ir_id);

    // Verify UUID raw bytes in header
    const uuidClean = sampleDoc.ir_id.replace(/-/g, '');
    const uuidBuf = Buffer.from(uuidClean, 'hex');
    const headerUuid = buffer.subarray(16, 32);
    expect(headerUuid.equals(uuidBuf)).toBe(true);
  });

  it('checksum SHA-256 (byte 52-63) must detect modified payload', () => {
    const buffer = serializeToGIR(sampleDoc);
    // Tamper with body payload (byte 64 onwards)
    buffer[64] = buffer[64] ^ 0xff;

    expect(() => {
      deserializeFromGIR(buffer);
    }).toThrow(/Checksum validation failed/);
  });

  it('serialization -> deserialization must produce identical document structure', () => {
    const buffer = serializeToGIR(sampleDoc);
    const parsed = deserializeFromGIR(buffer);
    expect(parsed.ir_id).toBe(sampleDoc.ir_id);
    expect(parsed.meta.domain).toBe(sampleDoc.meta.domain);
    expect(parsed.canvas).toEqual(sampleDoc.canvas);
    expect(parsed.objects).toEqual(sampleDoc.objects);
  });

  it('benchmark: serializing/deserializing a document with 100 nodes takes < 500ms', () => {
    const doc100 = createIRDocument({
      domain: 'visual',
      canvas: { width: 100, height: 100, color_space: 'sRGB' },
    });
    doc100.objects = Array.from({ length: 100 }, (_, i) => ({
      id: `node-${i}`,
      kind: 'visual',
      type: 'shape',
      name: `Node ${i}`,
      geometry: { x: i, y: i, width: 10, height: 10 },
      style_override: {},
    }));

    const start = performance.now();
    const buffer = serializeToGIR(doc100);
    const end = performance.now();
    const duration = end - start;

    expect(duration).toBeLessThan(500);

    // Also verify deserialization performance
    const start2 = performance.now();
    const parsed = deserializeFromGIR(buffer);
    const end2 = performance.now();
    expect(end2 - start2).toBeLessThan(500);
    expect(parsed.objects.length).toBe(100);
  });
});

describe('FASE BINARY — Migration System', () => {
  it('IRMigrationScript without id (script_id) must fail registration', () => {
    const registry = new MigrationRegistry();
    const scriptWithoutId = {
      from_version: '1.0',
      to_version: '1.1',
      transforms: [],
    } as any;

    expect(() => {
      registry.registerScript(scriptWithoutId);
    }).toThrow(/must have an "id"/);
  });

  it('declarative operator rename_field renames field without losing data', () => {
    const doc = createIRDocument({
      domain: 'visual',
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
    });
    (doc.canvas as any).grid_layout = { columns: 12, rows: 12 };

    const registry = new MigrationRegistry();
    registry.registerScript({
      id: 'mig-rename',
      from_version: '1.0',
      to_version: '1.1',
      breaking: false,
      description: 'Rename grid_layout to canvas_grid',
      strategy: 'big_bang',
      estimated_duration_per_1k_ms: 10,
      dry_run_required: false,
      checkpoint_before: true,
      transforms: [
        { op: 'rename_field', path: 'canvas.grid_layout', new_key: 'canvas_grid' },
      ],
      post_migration_checks: [],
      reversible: true,
    });

    const { doc: migrated } = registry.runMigration(doc, 'mig-rename');
    expect((migrated.canvas as any).canvas_grid).toEqual({ columns: 12, rows: 12 });
    expect((migrated.canvas as any).grid_layout).toBeUndefined();
    expect(migrated.meta.schema_version).toBe('1.1');
    expect((migrated as any).x_debug?.migration_history?.[0].script_id).toBe('mig-rename');
  });

  it('declarative operator add_field adds new field with default value', () => {
    const doc = createIRDocument({
      domain: 'visual',
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
    });

    const registry = new MigrationRegistry();
    registry.registerScript({
      id: 'mig-add',
      from_version: '1.0',
      to_version: '1.1',
      breaking: false,
      description: 'Add responsive flag',
      strategy: 'big_bang',
      estimated_duration_per_1k_ms: 5,
      dry_run_required: false,
      checkpoint_before: false,
      transforms: [
        { op: 'add_field', path: 'meta.responsive', default_value: true, required: false },
      ],
      post_migration_checks: [],
      reversible: true,
    });

    const { doc: migrated } = registry.runMigration(doc, 'mig-add');
    expect((migrated.meta as any).responsive).toBe(true);
  });

  it('rollback restores document to state before migration', () => {
    const doc = createIRDocument({
      domain: 'visual',
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
    });
    const registry = new MigrationRegistry();
    registry.registerScript({
      id: 'mig-remove',
      from_version: '1.0',
      to_version: '1.1',
      breaking: true,
      description: 'Remove color_space',
      strategy: 'big_bang',
      estimated_duration_per_1k_ms: 10,
      dry_run_required: false,
      checkpoint_before: true,
      transforms: [
        { op: 'remove_field', path: 'canvas.color_space', reason: 'deprecated' },
      ],
      post_migration_checks: [],
      reversible: true,
    });

    const { doc: migrated } = registry.runMigration(doc, 'mig-remove');
    expect((migrated.canvas as any).color_space).toBeUndefined();

    // Rollback
    const rolledBack = registry.rollbackMigration(migrated, doc);
    expect((rolledBack.canvas as any).color_space).toBe('sRGB');
  });

  it('unregistered script id throws error', () => {
    const doc = createIRDocument({
      domain: 'visual',
      canvas: { width: 100, height: 100, color_space: 'sRGB' },
    });
    const registry = new MigrationRegistry();
    expect(() => registry.runMigration(doc, 'nonexistent')).toThrow(/not found/);
  });
});
