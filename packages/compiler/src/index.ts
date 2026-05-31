import { validateHIR } from '@genesis/schema';

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
  if (!validateHIR(doc)) {
    return { success: false, errors: ['Invalid HIR Document Schema'] };
  }
  return { success: true, errors: [] };
}
