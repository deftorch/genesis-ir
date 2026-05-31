/**
 * @stability BETA
 * Hasil audit aksesibilitas yang melekat pada node visual (Keputusan #36).
 */
export interface IRAccessibilityAuditResult {
  /** ID aturan aksesibilitas yang dievaluasi */
  rule_id: string;
  /** Kriteria sukses WCAG terkait (misalnya: "1.4.3") */
  wcag_criterion: string;
  /** ID node yang dinilai, opsional */
  node_id?: string;
  /** Hasil penilaian status */
  status: "pass" | "fail" | "warning" | "not_applicable";
  /** Penjelasan detail hasil evaluasi */
  message: string;
  /** Apakah masalah berhasil diperbaiki secara otomatis oleh compiler */
  auto_fixed: boolean;
}

/**
 * @stability BETA
 * Ekstensi anotasi aksesibilitas pada dokumen IR.
 */
export interface IRAccessibilityAnnotations {
  /** Target tingkat kepatuhan WCAG */
  wcag_level: "A" | "AA" | "AAA";
  /** Daftar hasil audit rinci */
  audit_results: IRAccessibilityAuditResult[];
  /** Simulasi tampilan visual bagi penyandang buta warna */
  color_blind_simulations?: Array<{
    type: "deuteranopia" | "protanopia" | "tritanopia" | "achromatopsia";
    thumbnail: string;
  }>;
  /** Matriks rasio kontras antar pasangan warna node terdeteksi */
  contrast_matrix?: Record<string, Record<string, number>>;
}

/**
 * @stability BETA
 * Ekstensi untuk hasil analisis kendala visual (Gestalt & Tipografi).
 */
export interface IRVisualConstraintExtension {
  /** Hasil analisis layout menggunakan prinsip Gestalt */
  gestalt_analysis?: {
    visual_weight_map?: number[][];
    focal_points?: Array<{ x: number; y: number; weight: number }>;
    symmetry_axes?: Array<{ x?: number; y?: number }>;
    grouping_suggestions?: string[][];
  };
  /** Hasil analisis kualitas keterbacaan teks */
  typography_analysis?: {
    readability_score?: number;
    issues?: Array<{ node_id: string; issue: string }>;
  };
}

/**
 * @stability BETA
 * Konfigurasi profil waktu pemrosesan pass kompilasi.
 */
export interface IRCompilationProfile {
  /** Waktu total kompilasi (ms) */
  total_compile_ms: number;
  /** Map nama pass kompilasi ke durasi pemrosesan masing-masing (ms) */
  pass_times_ms: Record<string, number>;
  /** Total jumlah node yang diproses */
  node_count: number;
  /** Total jumlah token gaya yang berhasil di-resolve */
  resolved_styles_count: number;
  /** Total jumlah aset eksternal dalam pool */
  asset_count: number;
  // Metrik spesifik domain
  glyph_count?: number;
  frame_count?: number;
  track_count?: number;
  polygon_count?: number;
  diagram_node_count?: number;
}

/**
 * @stability BETA
 * Per-pass timing entry recorded by CompilerProfiler.
 */
export interface IRPassTiming {
  pass_id: string;
  pass_name: string;
  start_time_ms: number;
  end_time_ms: number;
  duration_ms: number;
  timeout_exceeded: boolean;
}

/**
 * @stability BETA
 * Data observabilitas lengkap yang melekat pada dokumen IR.
 */
export interface IRObservability {
  compiled_at: string;
  compilation_ms: number;
  pass_durations: Record<string, number>;
  tier_used: "nano" | "core" | "full";
  compilation_profile: IRCompilationProfile;
  accessibility_annotations?: IRAccessibilityAnnotations;
  visual_constraints?: IRVisualConstraintExtension;
  metrics: {
    total_nodes: number;
    max_depth: number;
    token_resolutions: number;
    cache_hits: number;
    cache_misses: number;
    auto_fixes_applied: number;
    plugin_passes_run: number;
    render_time_ms?: number;
    formula_cycle_checks: number;
    sync_drop_frame_count?: number;
    asset_pool_hits?: number;
    timeline_layers?: number;
    keyframes_total?: number;
    export_size_kb?: number;
    suggestion_layers_count?: number;
  };
  plugin_write_conflicts?: Array<{
    pass_id: string;
    plugin_a: string;
    plugin_b: string;
    path: string;
    resolved_by: "priority" | "plugin_a_wins" | "plugin_b_wins" | "merge";
    value_a: unknown;
    value_b: unknown;
    resolved_to: unknown;
  }>;
  audit_log?: Array<{
    timestamp: string;
    actor: string;
    actor_type: "human" | "ai_agent" | "system" | "plugin";
    operation:
      | "create" | "edit" | "fork" | "validate" | "render"
      | "migrate" | "plugin_transform" | "asset_upload"
      | "export" | "collab_sync" | "suggestion_created"
      | "suggestion_accepted" | "suggestion_rejected";
    path?: string;
    before?: unknown;
    after?: unknown;
    session_id: string;
  }>;
}

/**
 * @stability BETA
 * Debug annotations (x_debug) — stripped in production exports.
 */
export interface IRDebugExtension {
  /** Trace log dari setiap pass kompilasi */
  compilation_trace: IRPassTiming[];
  /** Riwayat modifikasi oleh AI agent */
  agent_provenance: Array<{
    timestamp: string;
    agent_id: string;
    model: string;
    action: string;
    path: string;
    before?: unknown;
    after?: unknown;
    confidence?: number;
  }>;
  /** Snapshot diff state dokumen */
  diff_snapshot?: {
    base_ir_id: string;
    patches: Array<{
      op: "add" | "remove" | "replace" | "move";
      path: string;
      value?: unknown;
    }>;
  };
}
