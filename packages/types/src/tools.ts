/**
 * @stability STABLE
 * Definisi formal dari tool yang terdaftar dalam ekosistem compiler (Keputusan #40).
 */
export interface IRTool {
  tool_id: string;
  name: string;
  description: string;
  version: string;
  callable_by: string[];
  risk_level: "safe" | "moderate" | "dangerous" | "irreversible";
  input_schema: object;
  output_schema: object;
  ir_reads: string[];
  ir_writes: string[];
  produces_delta: boolean;
  timeout_ms: number;
  handler: string;
}

/**
 * @stability STABLE
 * Registry penampung seluruh tool terdaftar yang dapat diakses oleh compiler dan agen.
 */
export interface IRToolRegistry {
  registry_version: "1.0";
  tools: IRTool[];
  loaded_at: string;
}

/**
 * @stability STABLE
 * Plugin manifest interface (Keputusan #17, #21, #29, #30).
 */
export interface IRPluginManifest {
  namespace: string;
  name: string;
  version: string;
  trust_level: "official" | "verified" | "community";
  declared_ir_access: string[];
  strict_ir_access: boolean;
}

/**
 * @stability STABLE
 * Agent message interface (Keputusan #20).
 */
export interface IRAgentMessage {
  message_id: string;
  from_agent: string;
  to_agent: string;
  payload_type: "task_request" | "task_response" | "status_update" | "escalation" | "handoff";
  payload: unknown;
  timestamp: string;
}

/**
 * 9 built-in tools wajib (Keputusan #40) — tool_id dikunci permanen.
 * @stability STABLE
 */
export const IR_BUILTIN_TOOLS: readonly IRTool[] = Object.freeze([
  {
    tool_id: "validate_accessibility",
    name: "Validate Accessibility",
    description: "Validasi IRNode atau seluruh IRDocument terhadap WCAG constraints.",
    version: "1.0",
    callable_by: ["orchestrator", "generator", "validator", "editor"],
    risk_level: "safe" as const,
    input_schema: { type: "object", properties: { node_id: { type: "string" }, wcag_level: { type: "string", enum: ["A", "AA", "AAA"] } } },
    output_schema: { type: "object", properties: { passed: { type: "boolean" }, violations: { type: "array" }, score: { type: "number" } } },
    ir_reads: ["objects[*].accessibility", "constraints.accessibility", "style_context"],
    ir_writes: [],
    produces_delta: false,
    timeout_ms: 2000,
    handler: "tools.validateAccessibility",
  },
  {
    tool_id: "apply_brand",
    name: "Apply Brand",
    description: "Terapkan profil brand ke satu IRNode atau seluruh dokumen. Mengembalikan IRDelta.",
    version: "1.0",
    callable_by: ["orchestrator", "generator", "editor"],
    risk_level: "moderate" as const,
    input_schema: { type: "object", required: ["brand_profile_id"], properties: { node_id: { type: "string" }, brand_profile_id: { type: "string" }, strength: { type: "number" } } },
    output_schema: { type: "object", properties: { delta: { type: "object" }, tokens_applied: { type: "number" }, conflicts: { type: "array" } } },
    ir_reads: ["style_context", "objects[*].style_override", "constraints.brand_profile_id"],
    ir_writes: ["style_context.theme_tokens", "objects[*].style_override"],
    produces_delta: true,
    timeout_ms: 3000,
    handler: "tools.applyBrand",
  },
  {
    tool_id: "check_contrast",
    name: "Check Color Contrast",
    description: "Hitung rasio kontras warna antara foreground dan background sesuai WCAG.",
    version: "1.0",
    callable_by: ["orchestrator", "generator", "validator", "editor", "specialist"],
    risk_level: "safe" as const,
    input_schema: { type: "object", required: ["color_foreground", "color_background"], properties: { color_foreground: { type: "string" }, color_background: { type: "string" } } },
    output_schema: { type: "object", properties: { ratio: { type: "number" }, passes_aa: { type: "boolean" }, passes_aaa: { type: "boolean" } } },
    ir_reads: [],
    ir_writes: [],
    produces_delta: false,
    timeout_ms: 500,
    handler: "tools.checkContrast",
  },
  {
    tool_id: "resolve_token",
    name: "Resolve Design Token",
    description: "Resolusi referensi token desain menjadi nilai konkret.",
    version: "1.0",
    callable_by: ["orchestrator", "generator", "editor", "specialist"],
    risk_level: "safe" as const,
    input_schema: { type: "object", required: ["token_ref"], properties: { token_ref: { type: "string" }, fallback: { type: "string" } } },
    output_schema: { type: "object", properties: { resolved_value: { type: "string" }, found: { type: "boolean" } } },
    ir_reads: ["style_context.theme_tokens", "style_context.component_styles"],
    ir_writes: [],
    produces_delta: false,
    timeout_ms: 200,
    handler: "tools.resolveToken",
  },
  {
    tool_id: "get_ir_slice",
    name: "Get IR Slice",
    description: "Ambil potongan (slice) IRDocument berdasarkan relevant_paths.",
    version: "1.0",
    callable_by: ["orchestrator"],
    risk_level: "safe" as const,
    input_schema: { type: "object", required: ["relevant_paths"], properties: { relevant_paths: { type: "array", items: { type: "string" } } } },
    output_schema: { type: "object", properties: { ir_slice: { type: "object" }, estimated_tokens: { type: "number" } } },
    ir_reads: ["*"],
    ir_writes: [],
    produces_delta: false,
    timeout_ms: 1000,
    handler: "tools.getIrSlice",
  },
  {
    tool_id: "validate_ir",
    name: "Validate IR",
    description: "Jalankan Pass 1 (skema) dan Pass 3 (semantik) untuk validasi cepat.",
    version: "1.0",
    callable_by: ["orchestrator", "generator", "validator"],
    risk_level: "safe" as const,
    input_schema: { type: "object", properties: { ir_document: { type: "object" }, ir_delta: { type: "object" } } },
    output_schema: { type: "object", properties: { valid: { type: "boolean" }, schema_errors: { type: "array" }, semantic_errors: { type: "array" } } },
    ir_reads: ["*"],
    ir_writes: [],
    produces_delta: false,
    timeout_ms: 2000,
    handler: "tools.validateIr",
  },
  {
    tool_id: "diff_ir",
    name: "Diff IR Documents",
    description: "Hitung delta perubahan antara dua dokumen IR.",
    version: "1.0",
    callable_by: ["orchestrator", "editor", "validator"],
    risk_level: "safe" as const,
    input_schema: { type: "object", required: ["before", "after"], properties: { before: { type: "object" }, after: { type: "object" } } },
    output_schema: { type: "object", properties: { delta: { type: "object" }, ops_count: { type: "number" } } },
    ir_reads: [],
    ir_writes: [],
    produces_delta: true,
    timeout_ms: 1500,
    handler: "tools.diffIr",
  },
  {
    tool_id: "visual_analysis",
    name: "Visual Analysis Extension",
    description: "Analisis visual berbasis psikologi Gestalt.",
    version: "1.0",
    callable_by: ["orchestrator", "generator", "validator", "specialist"],
    risk_level: "safe" as const,
    input_schema: { type: "object", properties: { node_id: { type: "string" } } },
    output_schema: { type: "object", properties: { gestalt_analysis: { type: "object" } } },
    ir_reads: ["canvas", "objects[*]"],
    ir_writes: [],
    produces_delta: false,
    timeout_ms: 2500,
    handler: "tools.visualAnalysis",
  },
  {
    tool_id: "check_readability",
    name: "Check Typographic Readability",
    description: "Hitung tingkat keterbacaan teks berdasarkan ukuran font, tinggi baris, dan kontras.",
    version: "1.0",
    callable_by: ["orchestrator", "generator", "validator", "specialist"],
    risk_level: "safe" as const,
    input_schema: { type: "object", required: ["node_id"], properties: { node_id: { type: "string" } } },
    output_schema: { type: "object", properties: { readability_score: { type: "number" }, issues: { type: "array" } } },
    ir_reads: ["objects[*]"],
    ir_writes: [],
    produces_delta: false,
    timeout_ms: 1000,
    handler: "tools.checkReadability",
  },
]) as IRTool[];

/**
 * Load all built-in tools into an IRToolRegistry.
 * @stability BETA
 */
export function loadBuiltinTools(): IRToolRegistry {
  return {
    registry_version: "1.0",
    tools: [...IR_BUILTIN_TOOLS],
    loaded_at: new Date().toISOString(),
  };
}

/**
 * Append an agent action immutably. actions_taken is append-only (Keputusan #19).
 * @stability BETA
 */
export function appendAgentAction(
  ctx: { agent_id: string; agent_type: string; session_id: string; actions_taken: readonly any[] },
  action: any
): typeof ctx {
  const frozenAction = Object.freeze({ ...action });
  return {
    ...ctx,
    actions_taken: Object.freeze([...ctx.actions_taken, frozenAction]),
  };
}

/**
 * Check if an action requires human escalation (Keputusan #37).
 * @stability BETA
 */
export function requiresHumanEscalation(riskLevel: string): boolean {
  return riskLevel === 'irreversible';
}

/**
 * Validate agent message payload type (Keputusan #20).
 * @stability BETA
 */
const VALID_PAYLOAD_TYPES = new Set(["task_request", "task_response", "status_update", "escalation", "handoff"]);

export function validateAgentMessage(msg: IRAgentMessage): { valid: boolean; error?: string } {
  if (!VALID_PAYLOAD_TYPES.has(msg.payload_type)) {
    return { valid: false, error: `Unknown payload type: ${msg.payload_type}` };
  }
  return { valid: true };
}

/**
 * Build IR Slice from a document, extracting only relevant paths.
 * @stability BETA
 */
export function buildIRSlice(doc: any, paths: string[]): Record<string, unknown> {
  const slice: Record<string, unknown> = {};
  for (const path of paths) {
    const parts = path.split('.');
    let current: any = doc;
    let found = true;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        found = false;
        break;
      }
    }
    if (found) {
      slice[path] = current;
    }
  }
  return slice;
}

/**
 * Plugin access control: checks whether a plugin can access a given path.
 * @stability BETA
 */
export function canPluginAccess(manifest: IRPluginManifest, path: string): boolean {
  if (manifest.trust_level === 'official') return true;
  if (!manifest.strict_ir_access) return true;
  return manifest.declared_ir_access.some(allowed =>
    path === allowed || path.startsWith(allowed + '.')
  );
}
