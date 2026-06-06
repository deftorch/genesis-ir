import { validateHIR } from '@genesis/schema';
import { runCompilerPipeline } from './pipeline.js';
import { IRDocument } from '@genesis/types';

export * from './profiler.js';
export * from './binary.js';
export * from './rlvrr.js';
export * from './font.js';
export * from './native_wasm.js';
export * from './pipeline.js';

/**
 * @stability BETA
 */
export interface CompilationResult {
  success: boolean;
  errors: string[];
  lir?: any;
}

/**
 * Compile pipeline entrypoint
 * @stability BETA
 */
export async function compileDocument(doc: unknown): Promise<CompilationResult> {
  const typedDoc = doc as IRDocument;
  
  if (typedDoc.meta?.lifecycle_status === 'archived') {
    return { success: false, errors: ['Cannot compile archived document'] };
  }

  try {
    const lir = await runCompilerPipeline(typedDoc);
    return { success: true, errors: [], lir };
  } catch (error: any) {
    return {
      success: false,
      errors: [error.message || 'Unknown compilation error'],
    };
  }
}
