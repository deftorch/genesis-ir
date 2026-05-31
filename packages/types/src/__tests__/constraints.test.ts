import { describe, it, expect } from 'vitest';
import { calculateContrastRatio, checkWCAGCompliance } from '../constraints.js';

describe('WCAG Engine', () => {
  describe('calculateContrastRatio', () => {
    it('should calculate 1:1 contrast ratio for same colors (white on white)', () => {
      const ratio = calculateContrastRatio('#FFFFFF', '#FFFFFF');
      expect(ratio).toBeCloseTo(1.0, 1);
    });

    it('should calculate 21:1 contrast ratio for black on white', () => {
      const ratio = calculateContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21.0, 1);
    });

    it('should calculate correct contrast ratio for gray colors', () => {
      const ratio = calculateContrastRatio('#808080', '#FFFFFF');
      // Relative luminance of #808080 is around 0.2199
      // Relative luminance of #FFFFFF is 1.0
      // (1.0 + 0.05) / (0.21586 + 0.05) = 1.05 / 0.26586 ≈ 3.95
      expect(ratio).toBeCloseTo(3.95, 1);
    });
  });

  describe('checkWCAGCompliance', () => {
    it('should check AA compliance correctly for normal text (under 18px)', () => {
      // AA normal text requires 4.5:1
      expect(checkWCAGCompliance(4.5, 'AA', 16)).toBe(true);
      expect(checkWCAGCompliance(4.4, 'AA', 16)).toBe(false);
    });

    it('should check AA compliance correctly for large text (18px or above)', () => {
      // AA large text requires 3.0:1
      expect(checkWCAGCompliance(3.0, 'AA', 18)).toBe(true);
      expect(checkWCAGCompliance(2.9, 'AA', 18)).toBe(false);
    });

    it('should check AAA compliance correctly for normal text (under 18px)', () => {
      // AAA normal text requires 7.0:1
      expect(checkWCAGCompliance(7.0, 'AAA', 16)).toBe(true);
      expect(checkWCAGCompliance(6.9, 'AAA', 16)).toBe(false);
    });

    it('should check AAA compliance correctly for large text (18px or above)', () => {
      // AAA large text requires 4.5:1
      expect(checkWCAGCompliance(4.5, 'AAA', 18)).toBe(true);
      expect(checkWCAGCompliance(4.4, 'AAA', 18)).toBe(false);
    });
  });
});
