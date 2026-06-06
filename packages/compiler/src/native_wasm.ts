import { IRDocument } from '@genesis/types';
import { computeLayout, ComputedLayoutMap } from '@genesis/renderer';

let nativeWasmModule: any = null;

try {
  // Attempt dynamic import of the native Rust/WASM compiled package if available
  // @ts-ignore
  nativeWasmModule = await import('@genesis/native');
} catch (e) {
  // Silent fallback to JS implementation
  nativeWasmModule = null;
}

/**
 * Transparent layout solver.
 * Uses Rust WASM layout engine when available, otherwise falls back to pure JS.
 * @stability BETA
 */
export function nativeComputeLayout(doc: IRDocument): ComputedLayoutMap {
  if (nativeWasmModule && typeof nativeWasmModule.compute_layout === 'function') {
    try {
      // In a real WASM call, we pass the serialized document or structure
      const resultJson = nativeWasmModule.compute_layout(JSON.stringify(doc));
      return JSON.parse(resultJson);
    } catch (err) {
      // Graceful fallback on WASM execution failure
      return computeLayout(doc);
    }
  }

  // Pure JS transparent fallback
  return computeLayout(doc);
}

/**
 * Run benchmark comparison between JS layout engine and Rust WASM layout engine.
 * @stability BETA
 */
export function runLayoutBenchmark(
  doc: IRDocument,
  iterations: number = 100
): {
  jsDurationMs: number;
  wasmDurationMs: number | null;
  wasmSpeedupMultiplier: number | null;
  wasmAvailable: boolean;
  note?: string;
} {
  const startJs = Date.now();
  for (let i = 0; i < iterations; i++) {
    computeLayout(doc);
  }
  const jsDurationMs = Date.now() - startJs;

  let wasmDurationMs = 0;
  const wasmAvailable = !!(nativeWasmModule && typeof nativeWasmModule.compute_layout === 'function');

  if (wasmAvailable) {
    const startWasm = Date.now();
    for (let i = 0; i < iterations; i++) {
      try {
        nativeWasmModule.compute_layout(JSON.stringify(doc));
      } catch (e) {
        // ignore
      }
    }
    wasmDurationMs = Date.now() - startWasm;
    return {
      jsDurationMs,
      wasmDurationMs,
      wasmSpeedupMultiplier: wasmDurationMs > 0 ? jsDurationMs / wasmDurationMs : 1.0,
      wasmAvailable,
    };
  } else {
    return {
      jsDurationMs,
      wasmDurationMs: null,
      wasmSpeedupMultiplier: null,
      wasmAvailable,
      note: "WASM not available — benchmark skipped"
    };
  }
}
