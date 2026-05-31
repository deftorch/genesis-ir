import { IRDomain } from './domains.js';

/**
 * @stability BETA
 * Struktur byte header 64-byte tepat untuk format .gir.
 */
export interface GIRHeader {
  magic: string; // Selalu "GIR!"
  binary_version: number; // 0x0001 (1.0)
  schema_version: number; // e.g. 100 untuk "1.0"
  domain: number; // Integer index 0-16
  flags: number; // Bit flags
  document_uuid: string; // 36 chars UUID v4
  timestamp: number; // Epoch milidetik (64-bit integer)
  reserved: Buffer; // 12 bytes padding (0x00)
  checksum: Buffer; // 12 bytes truncated SHA-256
}

/**
 * @stability STABLE
 * Struktur data transformasi pemetaan properti dokumen selama migrasi.
 */
export interface IRMigrationTransformer {
  type: "map_nodes" | "reshape_object" | "filter_array" | "aggregate" | "split" | "conditional_set";
  condition?: string;
  field_mapping?: Record<string, string>;
  defaults?: Record<string, unknown>;
  value_transforms?: Array<{
    path: string;
    op: "to_string" | "to_number" | "to_boolean" | "to_array" | "uppercase" | "lowercase" | "trim" | "multiply" | "add" | "replace";
    factor?: number;
    value?: unknown;
    search?: string;
  }>;
}

/**
 * @stability STABLE
 * Deklarasi skrip migrasi skema dokumen IR (Keputusan #26).
 */
export interface IRMigrationScript {
  id: string; // script_id wajib mencatat
  from_version: string;
  to_version: string;
  breaking: boolean;
  description: string;
  strategy: "expand_migrate_contract" | "big_bang";
  expand_migrate_contract?: {
    current_phase: "expand" | "migrate" | "contract" | "complete";
    migrate_progress?: {
      total_documents: number;
      migrated_count: number;
      last_batch_at?: string;
    };
    contract_threshold: number;
  };
  estimated_duration_per_1k_ms: number;
  dry_run_required: boolean;
  checkpoint_before: boolean;
  transforms: Array<
    | { op: "rename_field"; path: string; new_key: string }
    | { op: "remove_field"; path: string; reason: string }
    | { op: "add_field"; path: string; default_value: unknown; required: boolean }
    | { op: "change_type"; path: string; from_type: string; to_type: string; converter: string }
    | { op: "restructure"; description: string; transformer: IRMigrationTransformer }
  >;
  post_migration_checks: string[];
  reversible: boolean;
  rollback_script_id?: string;
}
