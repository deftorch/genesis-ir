import { describe, it, expect } from 'vitest';
import { createAgentAction } from '../index.js';

const context = describe;

describe('agent', () => {
  context('createAgentAction', () => {
    it('should create an agent action with timestamp and correct description', () => {
      const action = createAgentAction('test_type', 'test description');
      expect(action.action_type).toBe('test_type');
      expect(action.description).toBe('test description');
      expect(action.confidence).toBe(1.0);
      expect(action.timestamp).toBeDefined();
    });
  });
});
