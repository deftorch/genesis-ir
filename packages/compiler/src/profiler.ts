import { IRPassTiming, IRCompilationProfile, IRObservability, IRDebugExtension, IRAccessibilityAnnotations, IRAccessibilityAuditResult } from '@genesis/types';

/**
 * Compilation pass profiler that records per-pass timing.
 * @stability BETA
 */
export class CompilerProfiler {
  private passes: Map<string, { name: string; startTime: number }> = new Map();
  private completedPasses: IRPassTiming[] = [];
  private timeoutMs: number;

  constructor(opts?: { timeout_ms?: number }) {
    this.timeoutMs = opts?.timeout_ms ?? 30000;
  }

  /**
   * Start profiling a compilation pass.
   * @stability BETA
   */
  startPass(passId: string, passName?: string): void {
    this.passes.set(passId, {
      name: passName ?? passId,
      startTime: Date.now(),
    });
  }

  /**
   * End profiling a compilation pass.
   * @stability BETA
   */
  endPass(passId: string): IRPassTiming {
    const entry = this.passes.get(passId);
    if (!entry) {
      throw new Error(`Pass '${passId}' was not started`);
    }
    const endTime = Date.now();
    const duration = endTime - entry.startTime;
    const timing: IRPassTiming = {
      pass_id: passId,
      pass_name: entry.name,
      start_time_ms: entry.startTime,
      end_time_ms: endTime,
      duration_ms: duration,
      timeout_exceeded: duration >= this.timeoutMs,
    };
    this.completedPasses.push(timing);
    this.passes.delete(passId);
    return timing;
  }

  /**
   * Get all completed pass timings.
   * @stability BETA
   */
  getPassTimings(): IRPassTiming[] {
    return [...this.completedPasses];
  }

  /**
   * Check if any pass exceeded timeout.
   * @stability BETA
   */
  hasTimeoutWarnings(): boolean {
    return this.completedPasses.some(p => p.timeout_exceeded);
  }

  /**
   * Get warnings for passes that exceeded timeout.
   * @stability BETA
   */
  getTimeoutWarnings(): IRPassTiming[] {
    return this.completedPasses.filter(p => p.timeout_exceeded);
  }

  /**
   * Build IRCompilationProfile from collected data.
   * @stability BETA
   */
  buildProfile(nodeCount: number, resolvedStylesCount: number, assetCount: number): IRCompilationProfile {
    const passTimes: Record<string, number> = {};
    let totalMs = 0;
    for (const p of this.completedPasses) {
      passTimes[p.pass_id] = p.duration_ms;
      totalMs += p.duration_ms;
    }
    return {
      total_compile_ms: totalMs,
      pass_times_ms: passTimes,
      node_count: nodeCount,
      resolved_styles_count: resolvedStylesCount,
      asset_count: assetCount,
    };
  }

  /**
   * Build a complete IRObservability record.
   * @stability BETA
   */
  buildObservability(
    tier: "nano" | "core" | "full",
    nodeCount: number,
    resolvedStylesCount: number,
    assetCount: number,
    opts?: {
      accessibility?: IRAccessibilityAnnotations;
      maxDepth?: number;
      cacheHits?: number;
      cacheMisses?: number;
      autoFixes?: number;
      pluginPasses?: number;
    }
  ): IRObservability {
    const profile = this.buildProfile(nodeCount, resolvedStylesCount, assetCount);
    return {
      compiled_at: new Date().toISOString(),
      compilation_ms: profile.total_compile_ms,
      pass_durations: profile.pass_times_ms,
      tier_used: tier,
      compilation_profile: profile,
      accessibility_annotations: opts?.accessibility,
      metrics: {
        total_nodes: nodeCount,
        max_depth: opts?.maxDepth ?? 0,
        token_resolutions: resolvedStylesCount,
        cache_hits: opts?.cacheHits ?? 0,
        cache_misses: opts?.cacheMisses ?? 0,
        auto_fixes_applied: opts?.autoFixes ?? 0,
        plugin_passes_run: opts?.pluginPasses ?? 0,
        formula_cycle_checks: 0,
      },
    };
  }
}

/**
 * Validate accessibility (WCAG) on an IRDocument.
 * Built-in tool: validate_accessibility.
 * @stability BETA
 */
export function validateAccessibility(doc: any): IRAccessibilityAuditResult[] {
  const results: IRAccessibilityAuditResult[] = [];
  const domain = doc.meta?.domain;
  const objects = doc.objects || [];

  objects.forEach((obj: any) => {
    // Check text nodes for aria_label in interactive domain
    if (obj.type === 'text' || (obj.content && obj.content.kind === 'text')) {
      if (domain === 'interactive' || domain === 'web') {
        if (!obj.aria_label && !(obj.content && obj.content.aria_label)) {
          results.push({
            rule_id: 'text-aria-label',
            wcag_criterion: '4.1.2',
            node_id: obj.id,
            status: 'fail',
            message: `Text node '${obj.id}' in interactive domain is missing aria_label`,
            auto_fixed: false,
          });
        }
      }
    }

    // Check image nodes for alt text
    if (obj.type === 'image' || (obj.content && obj.content.kind === 'image')) {
      if (!obj.alt_text && !(obj.content && obj.content.alt_text)) {
        results.push({
          rule_id: 'image-alt-text',
          wcag_criterion: '1.1.1',
          node_id: obj.id,
          status: 'warning',
          message: `Image node '${obj.id}' is missing alt_text`,
          auto_fixed: false,
        });
      }
    }
  });

  return results;
}

/**
 * Record AI agent provenance into x_debug.
 * @stability BETA
 */
export function recordAgentProvenance(
  xDebug: IRDebugExtension,
  entry: {
    agent_id: string;
    model: string;
    action: string;
    path: string;
    before?: unknown;
    after?: unknown;
    confidence?: number;
  }
): void {
  xDebug.agent_provenance.push({
    timestamp: new Date().toISOString(),
    ...entry,
  });
}

/**
 * Create a fresh IRDebugExtension.
 * @stability BETA
 */
export function createDebugExtension(): IRDebugExtension {
  return {
    compilation_trace: [],
    agent_provenance: [],
  };
}
