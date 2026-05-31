import { describe, it, expect } from 'vitest';
import { mergeDeltas } from '../index.js';

const context = describe;

describe('crdt', () => {
  context('mergeDeltas', () => {
    it('should combine local and remote delta lists', () => {
      const local = [
        {
          delta_id: 'd1',
          timestamp: '',
          operations: [],
        },
      ];
      const remote = [
        {
          delta_id: 'd2',
          timestamp: '',
          operations: [],
        },
      ];
      const merged = mergeDeltas(local, remote);
      expect(merged.length).toBe(2);
      expect(merged[0].delta_id).toBe('d1');
      expect(merged[1].delta_id).toBe('d2');
    });
  });
});
