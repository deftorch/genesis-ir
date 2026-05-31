import { describe, it, expect } from 'vitest';
import { getOpenGaps, getGapById, IR_GAP_REGISTRY_V1 } from '../gaps.js';

const context = describe;

describe('gap registry', () => {
  context('IR_GAP_REGISTRY_V1 validation', () => {
    it('should have unique ids with prefix IRGAP-', () => {
      const ids = IR_GAP_REGISTRY_V1.map(entry => entry.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(ids.length);
      for (const id of ids) {
        expect(id).toMatch(/^IRGAP-\d{3}$/);
      }
    });

    it('should require resolved_in field if status is resolved', () => {
      for (const entry of IR_GAP_REGISTRY_V1) {
        if (entry.status === 'resolved') {
          expect(entry.resolved_in).toBeDefined();
          expect(entry.resolved_in?.length).toBeGreaterThan(0);
        }
      }
    });

    it('should contain 4 active entries', () => {
      expect(IR_GAP_REGISTRY_V1).toHaveLength(4);
      expect(getGapById('IRGAP-001')).toBeDefined();
      expect(getGapById('IRGAP-002')).toBeDefined();
      expect(getGapById('IRGAP-003')).toBeDefined();
      expect(getGapById('IRGAP-004')).toBeDefined();
    });
  });

  context('registry helper functions', () => {
    it('should return open or in_progress gaps with getOpenGaps()', () => {
      const openGaps = getOpenGaps();
      expect(openGaps.every(g => g.status === 'open' || g.status === 'in_progress')).toBe(true);
      // In the registry, IRGAP-004 is open, others are resolved
      expect(openGaps).toHaveLength(1);
      expect(openGaps[0].id).toBe('IRGAP-004');
    });

    it('should retrieve a specific gap by ID', () => {
      const gap = getGapById('IRGAP-002');
      expect(gap).toBeDefined();
      expect(gap?.owner).toBe('compiler-core-team');
      
      const nonExistent = getGapById('IRGAP-999');
      expect(nonExistent).toBeUndefined();
    });
  });
});
