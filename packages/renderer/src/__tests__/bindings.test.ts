import { describe, it, expect, vi } from 'vitest';
import {
  evaluateDSL,
  CircuitBreaker,
  retry,
  InteractionEngine,
} from '../bindings.js';

describe('Runtime Bindings & Interaction Engine', () => {
  describe('DSL Expression Engine', () => {
    it('evaluates $data.count > 10 to true if count is 15', () => {
      const context = {
        data: {
          count: 15,
        },
      };

      const result = evaluateDSL('$data.count > 10', context);
      expect(result).toBe(true);
    });

    it('throws ReferenceError if a referenced variable does not exist', () => {
      const context = {
        data: {
          count: 15,
        },
      };

      expect(() => evaluateDSL('$data.nonexistent > 10', context)).toThrow(ReferenceError);
    });

    it('does not allow expression to access global variables', () => {
      const context = {};
      // Attempting to access global variables like window or process should throw or return undefined.
      // E.g., typeof window !== 'undefined' should return false because window is shadowed as undefined.
      const result = evaluateDSL("typeof window !== 'undefined'", context);
      expect(result).toBe(false);
    });
  });

  describe('Retry & Circuit Breaker', () => {
    it('retries on failures up to the specified limit', async () => {
      let callCount = 0;
      const fn = vi.fn(async () => {
        callCount++;
        throw new Error('Failure');
      });

      await expect(retry(fn, 3)).rejects.toThrow('Failure');
      expect(callCount).toBe(3);
    });

    it('trips the circuit breaker to OPEN after threshold failures', async () => {
      const breaker = new CircuitBreaker();
      breaker.failureThreshold = 3;
      breaker.cooldownMs = 50;

      const fn = async () => {
        throw new Error('Error');
      };

      // 3 consecutive failures
      await expect(breaker.execute(fn)).rejects.toThrow('Error');
      await expect(breaker.execute(fn)).rejects.toThrow('Error');
      await expect(breaker.execute(fn)).rejects.toThrow('Error');

      // Now state must be OPEN, and executing should immediately fail fast
      expect(breaker.state).toBe('OPEN');
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit Breaker is OPEN');

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 60));

      // Execute again - should move to HALF-OPEN and try to execute
      // Since it fails again, it should trip back to OPEN
      await expect(breaker.execute(fn)).rejects.toThrow('Error');
      expect(breaker.state).toBe('OPEN');
    });
  });

  describe('Interaction State Machine', () => {
    it('transitions states active and inactive correctly on click trigger', () => {
      const model = {
        initial_state: 'inactive',
        variables: {
          value: false,
        },
        states: {
          inactive: {
            id: 'inactive',
            transitions: [
              {
                trigger: 'click',
                target_state: 'active',
                actions: [
                  { type: 'toggle_state', variable_name: 'value' },
                ],
              },
            ],
          },
          active: {
            id: 'active',
            transitions: [
              {
                trigger: 'click',
                target_state: 'inactive',
                actions: [
                  { type: 'toggle_state', variable_name: 'value' },
                ],
              },
            ],
          },
        },
      };

      const engine = new InteractionEngine(model);
      expect(engine.currentState).toBe('inactive');
      expect(engine.variables.value).toBe(false);

      // Trigger click
      engine.trigger('click');
      expect(engine.currentState).toBe('active');
      expect(engine.variables.value).toBe(true);

      // Trigger click again
      engine.trigger('click');
      expect(engine.currentState).toBe('inactive');
      expect(engine.variables.value).toBe(false);
    });
  });
});
