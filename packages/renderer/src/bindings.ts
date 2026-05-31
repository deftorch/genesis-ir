import { IRDataBinding, IRAction } from '@genesis/types';

/**
 * Sandboxed DSL Evaluator.
 * Shadowing global scope variables to prevent access inside sandbox.
 * @stability BETA
 */
export function evaluateDSL(expr: string, context: Record<string, unknown>): unknown {
  const lowerExpr = expr.toLowerCase();
  const blockedTokens = ['eval', 'function', 'constructor', 'prototype', '__proto__', 'import'];
  for (const token of blockedTokens) {
    if (lowerExpr.includes(token)) {
      throw new Error(`DSL Evaluation Error: Access to "${token}" is blocked for security`);
    }
  }

  const varPattern = /\$[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*/g;
  const matches = expr.match(varPattern) || [];

  const localVars: Record<string, any> = {};
  let evalExpr = expr;

  matches.forEach((match, idx) => {
    const path = match.slice(1).split('.');
    let val: any = context;
    for (const part of path) {
      if (val === undefined || val === null || !(part in val)) {
        throw new ReferenceError(`Variable ${match} is not defined`);
      }
      val = val[part];
    }
    const varName = `_v_${idx}`;
    localVars[varName] = val;
    evalExpr = evalExpr.split(match).join(varName);
  });

  const varNames = Object.keys(localVars);
  const varValues = Object.values(localVars);

  const shadowGlobals = ['window', 'global', 'process', 'globalThis', 'document', 'module', 'require'];
  const shadowArgs = shadowGlobals.map(() => undefined);

  try {
    const fn = new Function(...shadowGlobals, ...varNames, `"use strict"; return (${evalExpr});`);
    return fn(...shadowArgs, ...varValues);
  } catch (e: any) {
    if (e instanceof ReferenceError) {
      throw e;
    }
    throw new Error(`DSL Evaluation Error: ${e.message}`);
  }
}

/**
 * Production-grade Circuit Breaker.
 * @stability BETA
 */
export class CircuitBreaker {
  state: 'CLOSED' | 'OPEN' | 'HALF-OPEN' = 'CLOSED';
  failureCount = 0;
  failureThreshold = 3;
  cooldownMs = 1000;
  lastFailureTime = 0;

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (now - this.lastFailureTime > this.cooldownMs) {
        this.state = 'HALF-OPEN';
      } else {
        throw new Error('Circuit Breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF-OPEN') {
        this.state = 'CLOSED';
        this.failureCount = 0;
      }
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
      }
      throw err;
    }
  }
}

/**
 * Retry helper with simple attempts loop.
 * @stability BETA
 */
export async function retry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= retries) {
        throw err;
      }
    }
  }
}

/**
 * Evaluates and executes data binding actions.
 * @stability BETA
 */
export async function resolveDataBinding(
  binding: IRDataBinding,
  fetchFn: () => Promise<unknown>,
  breaker?: CircuitBreaker,
  retries = 3
): Promise<unknown> {
  const runner = () => retry(fetchFn, retries);
  if (breaker) {
    return breaker.execute(runner);
  }
  return runner();
}

/**
 * State Machine and Transition Evaluation Engine.
 * @stability BETA
 */
export class InteractionEngine {
  currentState: string;
  variables: Record<string, any>;
  model: any;
  actionsExecuted: IRAction[] = [];

  constructor(model: any) {
    this.model = model;
    this.currentState = model.initial_state;
    this.variables = { ...(model.variables || {}) };
  }

  trigger(eventName: string) {
    const stateObj = this.model.states[this.currentState];
    if (!stateObj) return;

    const transitions = stateObj.transitions || [];
    const matchedTransition = transitions.find((t: any) => t.trigger === eventName);

    if (matchedTransition) {
      const actions = matchedTransition.actions || [];
      for (const action of actions) {
        this.executeAction(action);
      }
      this.currentState = matchedTransition.target_state;
    }
  }

  executeAction(action: IRAction) {
    this.actionsExecuted.push(action);
    if (action.type === 'toggle_state') {
      const varName = action.variable_name || 'value';
      if (this.variables[varName] !== undefined) {
        this.variables[varName] = !this.variables[varName];
      } else {
        this.variables[varName] = true;
      }
    }
  }
}
