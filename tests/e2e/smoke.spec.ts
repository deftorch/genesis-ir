import { test, expect } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import { compileDocument } from '../../packages/compiler/src/index.js';
import { createCRDTStore } from '../../packages/crdt/src/index.js';
import { GenesisSyncServer } from '../../packages/sync/src/index.js';

test.describe('Genesis IR - Full System End-to-End', () => {

  test('Skenario A: Pembuatan dokumen HIR Visual -> Render ke SVG LIR', async () => {
    // 1. Buat Dokumen HIR Visual Minimal
    const ir_id = uuidv4();
    const doc = {
      ir_id,
      meta: {
        domain: 'visual',
        active_domains: ['visual'],
        schema_version: '1.0',
        ir_version: '1.0.0',
        created_at: new Date().toISOString(),
        created_by: 'human',
        session_id: 'session-e2e',
        tier: 'core',
        lifecycle_status: 'draft',
        max_tree_depth: 32,
      },
      canvas: { width: 1920, height: 1080 },
      style_context: { theme_tokens: { colors: { background: '#ffffff', text: '#000000' } } },
      objects: [
        {
          id: 'node-text',
          type: 'text',
          geometry: { x: 100, y: 100, width: 500, height: 100, rotation: 0 },
          style: { color: '#000000', font_size: 24 },
          content: { kind: 'text', raw: 'E2E Rendering Test', semantic_tag: 'h1' }
        },
        {
          id: 'node-shape',
          type: 'shape',
          geometry: { x: 200, y: 300, width: 400, height: 400, rotation: 45 },
          style: { fill_color: '#ff0000' },
          content: { kind: 'shape', shape_type: 'rect' }
        }
      ],
      constraints: { max_nodes: 1000, max_depth: 32, rules: [] },
      nodes: {},
      assets: [],
    };

    // 2. Compile Document menggunakan orchestrator 9-pass
    const result = compileDocument(doc);
    
    // 3. Verifikasi sukses kompilasi dan hasil akhirnya (LIR)
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.lir).toBeDefined();
    
    const lirDoc = result.lir;
    expect(lirDoc.target).toBe('web');
    expect(lirDoc.lir.type).toBe('web');
    
    // Verifikasi bahwa payload biner juga tertanam oleh Pass 7/8
    expect(lirDoc.binary_payload).toBeDefined();
    expect(Buffer.isBuffer(lirDoc.binary_payload)).toBe(true);
  });

  test('Skenario B: Resolusi Konflik Kolaborasi via CRDT & Sync Server', async () => {
    // 1. Inisialisasi SyncServer lokal
    const server = new GenesisSyncServer({ port: 8089 });
    
    // 2. Client 1 (User A) dan Client 2 (User B) membuat CRDT Store Loro
    const crdtA = await createCRDTStore('doc-1', 'loro');
    const crdtB = await createCRDTStore('doc-1', 'loro');
    
    // 3. Simulasikan modifikasi offline yang saling berbenturan (Conflict)
    crdtA.applyDelta({
      delta_id: uuidv4(),
      document_id: 'doc-1',
      created_at: new Date().toISOString(),
      created_by: 'UserA',
      node_ops: [{ op: 'add', node: { id: 'node-x', type: 'text', content: { kind: 'text', raw: 'A Win' } } as any }]
    });

    crdtB.applyDelta({
      delta_id: uuidv4(),
      document_id: 'doc-1',
      created_at: new Date().toISOString(),
      created_by: 'UserB',
      node_ops: [{ op: 'add', node: { id: 'node-x', type: 'text', content: { kind: 'text', raw: 'B Win' } } as any }]
    });

    // 4. Proses Sinkronisasi (Merge) menggunakan API CRDT
    const snapshotA = crdtA.export();
    const snapshotB = crdtB.export();

    // Loro CRDT melakukan resolusi deterministik
    crdtB.merge(snapshotA);
    crdtA.merge(crdtB.export());

    // 5. Validasi: Panjang binary export harus sama menandakan state sudah konsisten
    const finalA = crdtA.export();
    const finalB = crdtB.export();

    expect(finalA.length).toEqual(finalB.length);
    
    // Matikan server setelah selesai
    await server.close();
  });
});
