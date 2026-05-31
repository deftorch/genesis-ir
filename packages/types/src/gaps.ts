/**
 * Representasi entri formal untuk mencatat ketidaklengkapan skema atau keputusan tertunda.
 * @stability STABLE
 */
export interface IRGapEntry {
  /** Kode unik registri dengan format "IRGAP-NNN" (e.g., "IRGAP-001") */
  id: string;

  /** Tingkat urgensi penyelesaian gap terhadap stabilitas sistem */
  severity: 'critical' | 'high' | 'medium' | 'low';

  /** Fase siklus pengembangan sistem yang diblokir oleh keberadaan gap ini */
  phase_blocking: 'training' | 'production' | 'collaborative' | null;

  /** Status penanganan gap saat ini */
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';

  /** Referensi nomor pasal atau bagian spesifikasi terkait (e.g., "§11.1 Music Spec") */
  section_ref: string;

  /** Deskripsi lengkap mengenai masalah atau inkonsistensi skema */
  description: string;

  /** Solusi alternatif sementara yang dapat digunakan pengguna sebelum gap diselesaikan */
  workaround?: string;

  /** Pengembang atau tim yang ditunjuk sebagai penanggung jawab penyelesaian gap */
  owner?: string;

  /** Target rilis versi mayor/minor skema tempat gap ini akan diselesaikan */
  target_version?: string;

  /** Versi skema resmi yang memuat resolusi permanen untuk gap ini */
  resolved_in?: string;

  /** Tanggal entri pertama kali dibuat (ISO 8601 UTC) */
  created_at: string;

  /** Tanggal pembaruan terakhir pada entri ini (ISO 8601 UTC) */
  updated_at: string;
}

/**
 * Registri Celah Aktif (Active Gap Registry)
 * @stability STABLE
 */
export const IR_GAP_REGISTRY_V1: ReadonlyArray<Readonly<IRGapEntry>> = [
  Object.freeze({
    id: 'IRGAP-001',
    severity: 'high',
    phase_blocking: 'production',
    status: 'resolved',
    section_ref: '§2.1.2 Metadata Context',
    description: 'Tanpa bidang task_context, AI Agent harus mengirimkan keseluruhan dokumen IRDocument yang berukuran besar untuk setiap perubahan kecil, sehingga memboroskan token.',
    workaround: 'Kirimkan seluruh dokumen IRDocument secara penuh ke context window LLM.',
    owner: 'agent-orchestration-team',
    target_version: '1.0',
    resolved_in: '1.0',
    created_at: '2026-01-15T08:00:00Z',
    updated_at: '2026-05-30T10:00:00Z',
  }),
  Object.freeze({
    id: 'IRGAP-002',
    severity: 'high',
    phase_blocking: 'production',
    status: 'resolved',
    section_ref: '§2.3.8 Tooling Core',
    description: 'Aturan IRSemanticRule tidak terintegrasi sebagai callable tool untuk LLM, sehingga AI Agent harus melakukan komputasi kontras WCAG secara mandiri tanpa jaminan verifikasi.',
    workaround: 'Sertakan deskripsi aturan WCAG secara manual di dalam system prompt AI.',
    owner: 'compiler-core-team',
    target_version: '1.0',
    resolved_in: '1.0',
    created_at: '2026-01-20T09:30:00Z',
    updated_at: '2026-05-30T11:15:00Z',
  }),
  Object.freeze({
    id: 'IRGAP-003',
    severity: 'medium',
    phase_blocking: 'collaborative',
    status: 'resolved',
    section_ref: '§2.2.4 Real-time Sync',
    description: 'Tidak adanya standardisasi delta stack untuk pelacakan Undo/Redo multi-pengguna menyebabkan kegagalan sinkronisasi CRDT pada kolaborasi real-time.',
    workaround: 'Lakukan sinkronisasi ulang seluruh dokumen jika terjadi konflik penyimpanan.',
    owner: 'sync-collaboration-team',
    target_version: '1.0',
    resolved_in: '1.0',
    created_at: '2026-02-05T14:00:00Z',
    updated_at: '2026-05-30T12:00:00Z',
  }),
  Object.freeze({
    id: 'IRGAP-004',
    severity: 'medium',
    phase_blocking: null,
    status: 'open',
    section_ref: '§2.1.7 Vector DB Integration',
    description: 'Belum adanya spesifikasi formal untuk memetakan dokumen IR ke dalam Vector Database untuk memori semantik jangka panjang AI Agent.',
    workaround: 'Lakukan konversi dokumen IR ke dalam representasi teks Markdown biasa sebelum diindeks ke Vector DB.',
    owner: 'agent-memory-team',
    target_version: '1.1',
    created_at: '2026-05-10T11:00:00Z',
    updated_at: '2026-05-28T16:45:00Z',
  }),
];

/**
 * Get all gaps that are open or in progress
 * @stability STABLE
 */
export function getOpenGaps(): IRGapEntry[] {
  return IR_GAP_REGISTRY_V1.filter(
    (g): g is IRGapEntry => g.status === 'open' || g.status === 'in_progress'
  );
}

/**
 * Retrieve a specific gap by its unique ID
 * @stability STABLE
 */
export function getGapById(id: string): IRGapEntry | undefined {
  return IR_GAP_REGISTRY_V1.find((g): g is IRGapEntry => g.id === id);
}
