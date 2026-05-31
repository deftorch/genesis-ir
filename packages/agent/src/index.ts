import { IRAgentAction } from '@genesis/types';

/**
 * Factory for creating an IRAgentAction
 * @stability BETA
 */
export function createAgentAction(type: string, description: string): IRAgentAction {
  return {
    timestamp: new Date().toISOString(),
    action_type: type,
    description,
    confidence: 1.0,
  };
}
