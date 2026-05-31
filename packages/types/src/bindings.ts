/**
 * @stability STABLE
 */
export type SecretRef = `env:${string}` | `vault:${string}` | `secret:${string}`;

/**
 * Check if a value is a valid SecretRef.
 * @stability STABLE
 */
export function validateSecretRef(value: unknown): value is SecretRef {
  if (typeof value !== 'string') return false;
  return value.startsWith('env:') || value.startsWith('vault:') || value.startsWith('secret:');
}

/**
 * @stability STABLE
 */
export interface IRDataBinding {
  source: 'api_rest' | 'websocket' | 'graphql' | 'local_state';
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string | SecretRef>;
  auth?: {
    token?: string | SecretRef;
  };
  transforms?: { op: string; params?: Record<string, unknown> }[];
  fallback?: unknown;
}

/**
 * @stability STABLE
 */
export type IRAction =
  | { type: 'navigate'; target_id: string; url?: string }
  | { type: 'toggle_state'; target_id: string; variable_name?: string }
  | { type: 'play_animation'; animation_id: string }
  | { type: 'open_modal'; modal_id: string }
  | { type: 'scroll_to'; target_id: string }
  | { type: 'custom'; handler_id: string; payload?: Record<string, unknown> };

/**
 * @stability STABLE
 */
export interface IRTransition {
  trigger: 'click' | 'hover' | 'keypress' | string;
  target_state: string;
  actions?: IRAction[];
}

/**
 * @stability STABLE
 */
export interface IRState {
  id: string;
  transitions?: IRTransition[];
}

/**
 * @stability STABLE
 */
export interface IRInteractionModel {
  states: Record<string, IRState>;
  initial_state: string;
  variables?: Record<string, any>;
}

/**
 * @stability STABLE
 */
export type IRDSLExpression = string;
