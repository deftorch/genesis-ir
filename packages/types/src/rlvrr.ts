/**
 * @stability BETA
 * Struktur data pengumpul sinyal reward berantai untuk pelatihan model AI (Keputusan #39).
 */
export interface IRRLVRRSignals {
  signal_1_schema_compliance: {
    passed: boolean;
    score: number; // 0.0 atau 1.0
    gate: true;
  };
  signal_2_brand_guard?: {
    passed: boolean;
    score: number; // 0.0 - 1.0
    violations: string[];
    requires: "signal_1";
  };
  signal_3_render_error_rate?: {
    error_rate: number; // 0.0 - 1.0
    score: number; // 0.0 - 1.0
    requires: "signal_1+2";
  };
  signal_4_budget_accuracy?: {
    estimated_tokens: number;
    actual_tokens: number;
    accuracy: number; // 0.0 - 1.0
    score: number;
    requires: "signal_1+2+3";
  };
  signal_5_semantic_quality?: {
    score: number; // 0.0 - 1.0
    criteria?: string[];
    requires: "signal_1+2+3+4";
  };
  total_reward?: number; // 0.0 - 1.0
  signal_quality: "HIGH_POSITIVE" | "HIGH_NEGATIVE" | "AMBIGUOUS" | "EXPLICIT";
  collection: {
    method: "passive_observation" | "active_probe" | "user_reported";
    collected_at: string;
    collector_agent?: string;
  };
  user_behavior?: {
    time_to_first_edit_ms?: number;
    edit_distance?: number;
    export_triggered?: boolean;
    collab_active?: boolean;
    session_duration_ms?: number;
  };
}

/**
 * @stability BETA
 */
export interface IRRLVRRConfig {
  weights: {
    schema: number;
    brand: number;
    render: number;
    budget: number;
    semantic: number;
  };
}

/**
 * @stability BETA
 */
export interface IRRLVRRResult {
  signals: IRRLVRRSignals;
  total_reward: number;
  quality: "HIGH_POSITIVE" | "HIGH_NEGATIVE" | "AMBIGUOUS" | "EXPLICIT";
}
