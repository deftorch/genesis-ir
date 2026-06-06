import { IRAgentAction, IRAgentContext } from '@genesis/types';
import { appendAgentAction, requiresHumanEscalation, loadBuiltinTools, canPluginAccess, IRPluginManifest, validateAgentMessage, IRAgentMessage } from '@genesis/types';
export * from './rlvrr.js';
export * from './orchestrator.js';

/**
 * Factory for creating an IRAgentAction.
 * @stability BETA
 */
export function createAgentAction(type: string, description: string, confidence: number = 1.0): IRAgentAction {
  return {
    timestamp: new Date().toISOString(),
    action_type: type,
    description,
    confidence,
  };
}

/**
 * Create a new agent context.
 * @stability BETA
 */
export function createAgentContext(agentId: string, agentType: string, sessionId: string): IRAgentContext {
  return {
    agent_id: agentId,
    agent_type: agentType,
    session_id: sessionId,
    actions_taken: Object.freeze([]),
  };
}

/**
 * Evaluate whether an action requires human escalation based on risk level.
 * @stability BETA
 */
export function evaluateEscalation(riskLevel: string): { decision: 'proceed' | 'escalate_to_human'; reason?: string } {
  if (requiresHumanEscalation(riskLevel)) {
    return {
      decision: 'escalate_to_human',
      reason: `Action with risk_level "${riskLevel}" requires human approval (Keputusan #37)`,
    };
  }
  return { decision: 'proceed' };
}

// Re-export all agent utilities
export { appendAgentAction, requiresHumanEscalation, loadBuiltinTools, canPluginAccess, validateAgentMessage };
export type { IRPluginManifest, IRAgentMessage };
