/**
 * @stability STABLE
 */
export interface IRAgentAction {
  timestamp: string;
  action_type: string;
  description: string;
  confidence: number;
}

/**
 * @stability STABLE
 */
export interface IRAgentContext {
  agent_id: string;
  agent_type: string;
  session_id: string;
  actions_taken: readonly IRAgentAction[];
}

/**
 * @stability STABLE
 */
export interface IRAgentContract {
  capabilities: string[];
  decision_rules: Record<string, unknown>;
  coordination: Record<string, unknown>;
  escalation: {
    requires_human_approval_for_irreversible: boolean;
  };
}

/**
 * @stability STABLE
 */
export interface IRTaskContext {
  task_id: string;
  intent: string;
  relevant_paths: string[];
  delta_only: boolean;
  ir_slice?: Record<string, unknown>;
}
