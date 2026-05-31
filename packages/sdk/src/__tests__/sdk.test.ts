import { describe, it, expect } from 'vitest';
import {
  isValidIRDomain,
  validateHIR,
  compileDocument,
  renderToSVG,
  createAgentAction,
  mergeDeltas,
  createIRDocument,
} from '../index.js';

const context = describe;

describe('sdk', () => {
  context('exports', () => {
    it('should expose all sub-package functions', () => {
      expect(isValidIRDomain('visual')).toBe(true);

      const doc = createIRDocument({
        domain: 'visual',
        canvas: {
          width: 800,
          height: 600,
          color_space: 'sRGB',
        },
      });

      expect(validateHIR(doc).valid).toBe(true);
      expect(compileDocument(doc).success).toBe(true);
      expect(renderToSVG).toBeDefined();
      expect(createAgentAction).toBeDefined();
      expect(mergeDeltas).toBeDefined();
    });
  });
});
