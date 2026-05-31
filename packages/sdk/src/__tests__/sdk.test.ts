import { describe, it, expect } from 'vitest';
import {
  isValidIRDomain,
  validateHIR,
  compileDocument,
  renderToSVG,
  createAgentAction,
  mergeDeltas,
} from '../index.js';

const context = describe;

describe('sdk', () => {
  context('exports', () => {
    it('should expose all sub-package functions', () => {
      expect(isValidIRDomain('visual')).toBe(true);
      expect(
        validateHIR({
          ir_id: 'e207908b-b8df-4158-963d-4c3e41416e9b',
          meta: { domain: 'visual', schema_version: '1.0' },
        }),
      ).toBe(true);
      expect(
        compileDocument({
          ir_id: 'e207908b-b8df-4158-963d-4c3e41416e9b',
          meta: { domain: 'visual', schema_version: '1.0' },
        }).success,
      ).toBe(true);
      expect(renderToSVG).toBeDefined();
      expect(createAgentAction).toBeDefined();
      expect(mergeDeltas).toBeDefined();
    });
  });
});
