import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runCompilerPipeline } from '../pipeline.js';
import { IRDocument } from '@genesis/types';

import { validateHIR, runPass3 } from '@genesis/schema';
import { isNodeAllowedInDomain } from '@genesis/types';
import { computeLayout, runPass5 } from '@genesis/renderer';
import { evaluateRLVRR } from '../rlvrr.js';
import { serializeToGIR } from '../binary.js';

// Mock dependensi eksternal agar kita bisa memverifikasi urutan pemanggilannya
vi.mock('@genesis/schema', () => ({
  validateHIR: vi.fn((doc) => ({ valid: true, errors: [] })),
  runPass3: vi.fn((doc) => ({ valid: true, errors: [] })),
}));

vi.mock('@genesis/types', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    isNodeAllowedInDomain: vi.fn(() => true),
  };
});

vi.mock('@genesis/renderer', () => ({
  computeLayout: vi.fn((doc) => ({ 'n1': { x: 0, y: 0, width: 100, height: 100 } })),
  runPass5: vi.fn((doc) => ({ success: true, resolvedNotes: [] })),
}));

vi.mock('../rlvrr.js', () => ({
  evaluateRLVRR: vi.fn(() => ({
    signals: {},
    total_reward: 0.9,
    quality: 'HIGH_POSITIVE',
  })),
}));

vi.mock('../binary.js', () => ({
  serializeToGIR: vi.fn(() => Buffer.from('mock-binary-gir')),
}));

describe('Compiler Pipeline Orchestrator', () => {
  let mockDoc: IRDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDoc = {
      ir_id: 'test-id',
      meta: { domain: 'visual' },
      canvas: { width: 1920, height: 1080 },
      objects: [
        { id: 'n1', type: 'text', parent_id: null, children: [] },
      ],
      style_context: {},
      constraints: { max_nodes: 100, max_depth: 8, rules: [] },
      nodes: {},
      assets: [],
    } as unknown as IRDocument;
  });

  it('harus mengeksekusi pipeline secara berurutan dan mengembalikan LIR', () => {
    const lirResult = runCompilerPipeline(mockDoc);

    // Verifikasi Pass 0 (Validasi) & Pass 3 (Semantic)
    expect(validateHIR).toHaveBeenCalledWith(mockDoc);
    expect(runPass3).toHaveBeenCalledWith(mockDoc);

    // Verifikasi Pass 1 (Node Validation)
    expect(isNodeAllowedInDomain).toHaveBeenCalledWith('text', 'visual');

    // Verifikasi Pass 4 (Layout) & Pass 5 (Temporal)
    expect(computeLayout).toHaveBeenCalledWith(mockDoc);
    expect(runPass5).toHaveBeenCalledWith(mockDoc, mockDoc.assets);

    // Verifikasi Pass 6 (RLVRR)
    expect(evaluateRLVRR).toHaveBeenCalledWith(mockDoc, mockDoc);

    // Verifikasi Pass 7 (Binary Transform)
    expect(serializeToGIR).toHaveBeenCalledWith(mockDoc);

    // Verifikasi Pass 8 (LIR Dispatch)
    expect(lirResult).toBeDefined();
    expect(lirResult.target).toBe('web');
    expect(lirResult.lir.type).toBe('web');
    // Memastikan binary payload tertempel
    expect((lirResult as any).binary_payload).toBeDefined();
  });

  it('harus melempar error jika Pass 0 (Validasi HIR) gagal', () => {
    // Memaksa Pass 0 gagal
    (validateHIR as any).mockReturnValueOnce({ valid: false, errors: [{ message: 'Schema mismatch' }] });

    expect(() => runCompilerPipeline(mockDoc)).toThrow(/Pass 0 Failed/);
  });

  it('harus melempar error jika Pass 1 (Node Validation) gagal', () => {
    // Memaksa node tidak diizinkan di domain
    (isNodeAllowedInDomain as any).mockReturnValueOnce(false);

    expect(() => runCompilerPipeline(mockDoc)).toThrow(/Pass 1 Failed/);
  });
});
