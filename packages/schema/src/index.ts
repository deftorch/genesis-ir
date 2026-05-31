import { IRDocument } from '@genesis/types';
import { Ajv } from 'ajv';

/**
 * AJV Validator instance with strict rules
 * @stability BETA
 */
export const ajv = new Ajv({ strict: true, coerceTypes: false });

/**
 * Placeholder validation function for HIR Document
 * @stability BETA
 */
export function validateHIR(doc: unknown): doc is IRDocument {
  if (typeof doc !== 'object' || doc === null) return false;
  const d = doc as Record<string, unknown>;
  return typeof d.ir_id === 'string' && typeof d.meta === 'object';
}
