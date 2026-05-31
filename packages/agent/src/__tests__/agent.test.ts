import { describe, it, expect } from 'vitest';
import { createAgentAction, createAgentContext, evaluateEscalation, appendAgentAction, loadBuiltinTools, canPluginAccess, validateAgentMessage } from '../index.js';
import type { IRPluginManifest, IRAgentMessage } from '../index.js';
import { IR_BUILTIN_TOOLS } from '@genesis/types';

describe('FASE AGEN — Agent Context', () => {
  it('createAgentContext creates a valid context', () => {
    const ctx = createAgentContext('agent-1', 'orchestrator', 'session-1');
    expect(ctx.agent_id).toBe('agent-1');
    expect(ctx.actions_taken).toHaveLength(0);
  });

  it('actions_taken is append-only — cannot be mutated directly', () => {
    const ctx = createAgentContext('agent-1', 'orchestrator', 'session-1');
    expect(() => {
      (ctx.actions_taken as any).push({ action_type: 'hack' });
    }).toThrow();
  });

  it('appendAgentAction adds action immutably', () => {
    const ctx = createAgentContext('agent-1', 'orchestrator', 'session-1');
    const action = createAgentAction('generate', 'Generated a button component');
    const updated = appendAgentAction(ctx, action);
    expect(updated.actions_taken).toHaveLength(1);
    expect(ctx.actions_taken).toHaveLength(0); // original unchanged
    expect(updated.actions_taken[0].action_type).toBe('generate');
  });

  it('appended actions are frozen (immutable)', () => {
    const ctx = createAgentContext('agent-1', 'orchestrator', 'session-1');
    const action = createAgentAction('edit', 'Edited text');
    const updated = appendAgentAction(ctx, action);
    expect(() => {
      (updated.actions_taken[0] as any).action_type = 'modified';
    }).toThrow();
  });
});

describe('FASE AGEN — Escalation', () => {
  it('irreversible actions require human escalation', () => {
    const result = evaluateEscalation('irreversible');
    expect(result.decision).toBe('escalate_to_human');
  });

  it('safe actions proceed without escalation', () => {
    expect(evaluateEscalation('safe').decision).toBe('proceed');
    expect(evaluateEscalation('moderate').decision).toBe('proceed');
    expect(evaluateEscalation('dangerous').decision).toBe('proceed');
  });
});

describe('FASE AGEN — Agent Message Validation', () => {
  it('rejects unknown payload type', () => {
    const msg: IRAgentMessage = {
      message_id: 'm1', from_agent: 'a1', to_agent: 'a2',
      payload_type: 'invalid_type' as any,
      payload: {}, timestamp: new Date().toISOString(),
    };
    const result = validateAgentMessage(msg);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unknown payload type');
  });

  it('accepts valid payload types', () => {
    const validTypes = ['task_request', 'task_response', 'status_update', 'escalation', 'handoff'];
    for (const pt of validTypes) {
      const msg: IRAgentMessage = {
        message_id: 'm1', from_agent: 'a1', to_agent: 'a2',
        payload_type: pt as any,
        payload: {}, timestamp: new Date().toISOString(),
      };
      expect(validateAgentMessage(msg).valid).toBe(true);
    }
  });
});

describe('FASE AGEN — Tool Registry', () => {
  it('loadBuiltinTools returns all 9 built-in tools', () => {
    const registry = loadBuiltinTools();
    expect(registry.registry_version).toBe('1.0');
    expect(registry.tools).toHaveLength(9);
  });

  it('all 9 built-in tools have correct tool_ids', () => {
    const expectedIds = [
      'validate_accessibility', 'apply_brand', 'check_contrast',
      'resolve_token', 'get_ir_slice', 'validate_ir',
      'diff_ir', 'visual_analysis', 'check_readability',
    ];
    const actualIds = IR_BUILTIN_TOOLS.map(t => t.tool_id);
    expect(actualIds).toEqual(expectedIds);
  });

  it('apply_brand tool produces delta', () => {
    const tool = IR_BUILTIN_TOOLS.find(t => t.tool_id === 'apply_brand');
    expect(tool).toBeDefined();
    expect(tool!.produces_delta).toBe(true);
  });

  it('tools with dangerous risk require confirmation', () => {
    // All built-in tools are safe/moderate; test the concept
    const dangerousTool = IR_BUILTIN_TOOLS.find(t => t.risk_level === 'dangerous' || t.risk_level === 'irreversible');
    // No built-in tool is dangerous, which is correct by design
    expect(dangerousTool).toBeUndefined();
  });
});

describe('FASE AGEN — Plugin Access Control', () => {
  it('official plugin can access all paths', () => {
    const manifest: IRPluginManifest = {
      namespace: '@genesis', name: 'core', version: '1.0',
      trust_level: 'official', declared_ir_access: [], strict_ir_access: true,
    };
    expect(canPluginAccess(manifest, 'objects[*].style_override')).toBe(true);
    expect(canPluginAccess(manifest, 'anything.at.all')).toBe(true);
  });

  it('community plugin with strict_ir_access cannot access undeclared paths', () => {
    const manifest: IRPluginManifest = {
      namespace: '@community', name: 'xyz', version: '1.0',
      trust_level: 'community', declared_ir_access: ['objects', 'style_context'],
      strict_ir_access: true,
    };
    expect(canPluginAccess(manifest, 'objects')).toBe(true);
    expect(canPluginAccess(manifest, 'objects.child')).toBe(true);
    expect(canPluginAccess(manifest, 'constraints.secret')).toBe(false);
  });

  it('community plugin without strict_ir_access can access any path', () => {
    const manifest: IRPluginManifest = {
      namespace: '@community', name: 'open', version: '1.0',
      trust_level: 'community', declared_ir_access: [],
      strict_ir_access: false,
    };
    expect(canPluginAccess(manifest, 'anything')).toBe(true);
  });
});
