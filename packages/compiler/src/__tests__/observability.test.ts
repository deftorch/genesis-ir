import { describe, it, expect, vi } from 'vitest';
import {
  CompilerProfiler,
  validateAccessibility,
  recordAgentProvenance,
  createDebugExtension,
} from '../index.js';
import { createIRDocument } from '@genesis/types';

describe('FASE 9 — Observability & Telemetry', () => {
  describe('CompilerProfiler', () => {
    it('records start_time_ms, end_time_ms, and duration_ms for each pass', () => {
      const profiler = new CompilerProfiler();

      profiler.startPass('pass_0', 'Parse & Validate');
      // Simulate a small delay
      const timing = profiler.endPass('pass_0');

      expect(timing.pass_id).toBe('pass_0');
      expect(timing.pass_name).toBe('Parse & Validate');
      expect(typeof timing.start_time_ms).toBe('number');
      expect(typeof timing.end_time_ms).toBe('number');
      expect(typeof timing.duration_ms).toBe('number');
      expect(timing.end_time_ms).toBeGreaterThanOrEqual(timing.start_time_ms);
      expect(timing.duration_ms).toBe(timing.end_time_ms - timing.start_time_ms);
    });

    it('flags timeout_exceeded when pass exceeds timeout_ms', () => {
      // Set timeout to 0ms so any pass exceeds it
      const profiler = new CompilerProfiler({ timeout_ms: 0 });

      profiler.startPass('pass_1', 'Layout Compute');
      const timing = profiler.endPass('pass_1');

      expect(timing.timeout_exceeded).toBe(true);
      expect(profiler.hasTimeoutWarnings()).toBe(true);
      expect(profiler.getTimeoutWarnings()).toHaveLength(1);
    });

    it('does not flag timeout_exceeded for fast passes', () => {
      const profiler = new CompilerProfiler({ timeout_ms: 60000 });

      profiler.startPass('pass_0', 'Quick Pass');
      const timing = profiler.endPass('pass_0');

      expect(timing.timeout_exceeded).toBe(false);
      expect(profiler.hasTimeoutWarnings()).toBe(false);
    });

    it('builds IRCompilationProfile from collected pass data', () => {
      const profiler = new CompilerProfiler();

      profiler.startPass('pass_0');
      profiler.endPass('pass_0');
      profiler.startPass('pass_1');
      profiler.endPass('pass_1');

      const profile = profiler.buildProfile(42, 15, 3);

      expect(profile.node_count).toBe(42);
      expect(profile.resolved_styles_count).toBe(15);
      expect(profile.asset_count).toBe(3);
      expect(typeof profile.total_compile_ms).toBe('number');
      expect('pass_0' in profile.pass_times_ms).toBe(true);
      expect('pass_1' in profile.pass_times_ms).toBe(true);
    });

    it('builds a complete IRObservability record', () => {
      const profiler = new CompilerProfiler();

      profiler.startPass('pass_0');
      profiler.endPass('pass_0');

      const obs = profiler.buildObservability('core', 10, 5, 2, {
        maxDepth: 4,
        cacheHits: 8,
        cacheMisses: 2,
      });

      expect(obs.tier_used).toBe('core');
      expect(typeof obs.compiled_at).toBe('string');
      expect(obs.compilation_profile.node_count).toBe(10);
      expect(obs.metrics.total_nodes).toBe(10);
      expect(obs.metrics.max_depth).toBe(4);
      expect(obs.metrics.cache_hits).toBe(8);
      expect(obs.metrics.cache_misses).toBe(2);
    });

    it('throws when endPass is called on a pass that was not started', () => {
      const profiler = new CompilerProfiler();
      expect(() => profiler.endPass('nonexistent')).toThrow("Pass 'nonexistent' was not started");
    });
  });

  describe('Accessibility Audit System', () => {
    it('produces a WCAG fail for text nodes without aria_label in interactive domain', () => {
      const doc = createIRDocument({
        domain: 'interactive' as any,
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        { id: 'txt1', type: 'text', content: { kind: 'text', body: 'Hello' } } as any,
      ];

      const results = validateAccessibility(doc);
      expect(results.length).toBeGreaterThan(0);
      const fail = results.find(r => r.rule_id === 'text-aria-label');
      expect(fail).toBeDefined();
      expect(fail!.status).toBe('fail');
      expect(fail!.wcag_criterion).toBe('4.1.2');
      expect(fail!.message).toContain('aria_label');
    });

    it('produces a WCAG warning for image nodes without alt_text', () => {
      const doc = createIRDocument({
        domain: 'visual',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        { id: 'img1', type: 'image' } as any,
      ];

      const results = validateAccessibility(doc);
      const warning = results.find(r => r.rule_id === 'image-alt-text');
      expect(warning).toBeDefined();
      expect(warning!.status).toBe('warning');
      expect(warning!.wcag_criterion).toBe('1.1.1');
    });

    it('IRAccessibilityAuditResult with status: "fail" must have message and wcag_criterion', () => {
      const doc = createIRDocument({
        domain: 'interactive' as any,
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        { id: 'txt_no_aria', type: 'text' } as any,
      ];

      const results = validateAccessibility(doc);
      const failResults = results.filter(r => r.status === 'fail');

      for (const r of failResults) {
        expect(r.message).toBeTruthy();
        expect(r.wcag_criterion).toBeTruthy();
      }
    });
  });

  describe('x_debug & Provenance Tracking', () => {
    it('records AI agent provenance entries with timestamp', () => {
      const xDebug = createDebugExtension();

      recordAgentProvenance(xDebug, {
        agent_id: 'genesis-agent-v1',
        model: 'gemini-2.5-pro',
        action: 'auto_layout',
        path: 'objects[0].geometry',
        before: { x: 0, y: 0 },
        after: { x: 100, y: 50 },
        confidence: 0.92,
      });

      expect(xDebug.agent_provenance).toHaveLength(1);
      const entry = xDebug.agent_provenance[0];
      expect(entry.agent_id).toBe('genesis-agent-v1');
      expect(entry.model).toBe('gemini-2.5-pro');
      expect(entry.action).toBe('auto_layout');
      expect(entry.path).toBe('objects[0].geometry');
      expect(typeof entry.timestamp).toBe('string');
      expect(entry.confidence).toBe(0.92);
    });

    it('starts with empty compilation_trace and agent_provenance', () => {
      const xDebug = createDebugExtension();
      expect(xDebug.compilation_trace).toEqual([]);
      expect(xDebug.agent_provenance).toEqual([]);
      expect(xDebug.diff_snapshot).toBeUndefined();
    });
  });
});
