import { validateHIR } from '@genesis/schema';
export * from './profiler.js';

/**
 * @stability BETA
 */
export interface CompilationResult {
  success: boolean;
  errors: string[];
}

/**
 * Compile pipeline entrypoint
 * @stability BETA
 */
export function compileDocument(doc: unknown): CompilationResult {
  const validationResult = validateHIR(doc);
  if (!validationResult.valid) {
    return {
      success: false,
      errors: [
        'Invalid HIR Document Schema',
        ...validationResult.errors.map(e => `${e.path}: ${e.message}`),
      ],
    };
  }
  const typedDoc = doc as { meta?: { lifecycle_status?: string } };
  if (typedDoc.meta?.lifecycle_status === 'archived') {
    return { success: false, errors: ['Cannot compile archived document'] };
  }
  return { success: true, errors: [] };
}
