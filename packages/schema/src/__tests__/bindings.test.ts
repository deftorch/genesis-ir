import { describe, it, expect } from 'vitest';
import { validateHIR } from '../index.js';
import { createIRDocument } from '@genesis/types';

describe('Schema Data Binding & Interaction Validation', () => {
  describe('Data Binding Constraints', () => {
    it('fails if auth.token is a literal string', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 100, height: 100 },
        bindings: {
          fetchData: {
            source: 'api_rest',
            endpoint: 'https://api.example.com/data',
            auth: {
              token: 'Bearer abc123', // Literal!
            },
          },
        },
      });

      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'secret-ref-required')).toBe(true);
    });

    it('passes if auth.token is a SecretRef reference', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 100, height: 100 },
        bindings: {
          fetchData: {
            source: 'api_rest',
            endpoint: 'https://api.example.com/data',
            auth: {
              token: 'env:API_TOKEN', // SecretRef!
            },
          },
        },
      });

      const res = validateHIR(doc);
      expect(res.valid).toBe(true);
    });

    it('fails if source is api_rest but endpoint is missing', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 100, height: 100 },
        bindings: {
          fetchData: {
            source: 'api_rest',
            auth: {
              token: 'env:API_TOKEN',
            },
          },
        },
      });

      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'required-endpoint')).toBe(true);
    });

    it('fails if transform is filter but params is missing', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 100, height: 100 },
        bindings: {
          fetchData: {
            source: 'api_rest',
            endpoint: 'https://api.example.com/data',
            transforms: [
              { op: 'filter' }, // Missing params!
            ],
          },
        },
      });

      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'required-params')).toBe(true);
    });
  });

  describe('Interaction Model Constraints', () => {
    it('fails if navigate action is missing target_id', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 100, height: 100 },
        interaction_model: {
          initial_state: 'idle',
          states: {
            idle: {
              id: 'idle',
              transitions: [
                {
                  trigger: 'click',
                  target_state: 'active',
                  actions: [
                    { type: 'navigate' }, // Missing target_id!
                  ],
                },
              ],
            },
            active: { id: 'active' },
          },
        },
      });

      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'required-target')).toBe(true);
    });
  });
});
