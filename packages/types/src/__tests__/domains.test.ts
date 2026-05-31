import { describe, it, expect } from 'vitest';
import { isValidIRDomain, ALL_IR_DOMAINS } from '../domains.js';

const context = describe;

describe('domains', () => {
  context('ALL_IR_DOMAINS', () => {
    it('should contain exactly 17 domains', () => {
      expect(ALL_IR_DOMAINS.length).toBe(17);
    });
  });

  context('isValidIRDomain', () => {
    it('should return true for valid official domains', () => {
      expect(isValidIRDomain('visual')).toBe(true);
      expect(isValidIRDomain('pixel_art')).toBe(true);
      expect(isValidIRDomain('music_production')).toBe(true);
    });

    it('should return false for non-official domains', () => {
      expect(isValidIRDomain('3d_render')).toBe(false);
      expect(isValidIRDomain('')).toBe(false);
      expect(isValidIRDomain('custom_domain')).toBe(false);
    });
  });
});
