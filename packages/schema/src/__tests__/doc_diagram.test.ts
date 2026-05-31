import { describe, it, expect } from 'vitest';
import { validateHIR } from '../index.js';
import { createIRDocument } from '@genesis/types';

describe('FASE 10A — Document Domain', () => {
  describe('doc_heading', () => {
    it('must have a level between 1 and 6', () => {
      const doc = createIRDocument({
        domain: 'document' as any,
        canvas: { width: 800, height: 1200, color_space: 'sRGB' },
      });
      doc.objects = [
        { id: 'h1', type: 'doc_heading', level: 1 } as any,
      ];
      expect(validateHIR(doc).valid).toBe(true);

      // level 7 should fail
      const doc2 = createIRDocument({
        domain: 'document' as any,
        canvas: { width: 800, height: 1200, color_space: 'sRGB' },
      });
      doc2.objects = [
        { id: 'h7', type: 'doc_heading', level: 7 } as any,
      ];
      const res = validateHIR(doc2);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'invalid-heading-level')).toBe(true);
    });
  });

  describe('doc_list_item', () => {
    it('must be inside a doc_list parent', () => {
      const doc = createIRDocument({
        domain: 'document' as any,
        canvas: { width: 800, height: 1200, color_space: 'sRGB' },
      });
      // A doc_list_item NOT inside a doc_list
      doc.objects = [
        { id: 'li1', type: 'doc_list_item', parent_id: 'orphan_parent' } as any,
      ];
      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'orphan-list-item')).toBe(true);
    });

    it('passes if doc_list_item is inside a doc_list', () => {
      const doc = createIRDocument({
        domain: 'document' as any,
        canvas: { width: 800, height: 1200, color_space: 'sRGB' },
      });
      doc.objects = [
        { id: 'list1', type: 'doc_list', list_type: 'bullet' } as any,
        { id: 'li1', type: 'doc_list_item', parent_id: 'list1' } as any,
      ];
      expect(validateHIR(doc).valid).toBe(true);
    });
  });

  describe('doc_code_block', () => {
    it('must have a language field', () => {
      const doc = createIRDocument({
        domain: 'document' as any,
        canvas: { width: 800, height: 1200, color_space: 'sRGB' },
      });
      doc.objects = [
        { id: 'cb1', type: 'doc_code_block', code: 'console.log("hello")' } as any, // missing language
      ];
      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'missing-code-language')).toBe(true);
    });

    it('passes if language is provided', () => {
      const doc = createIRDocument({
        domain: 'document' as any,
        canvas: { width: 800, height: 1200, color_space: 'sRGB' },
      });
      doc.objects = [
        { id: 'cb1', type: 'doc_code_block', language: 'typescript', code: 'const x = 1;' } as any,
      ];
      expect(validateHIR(doc).valid).toBe(true);
    });
  });
});

describe('FASE 10B — Diagram Domain', () => {
  describe('diagram_edge', () => {
    it('fails if source_id references a non-existent node (dangling reference)', () => {
      const doc = createIRDocument({
        domain: 'diagram',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        { id: 'nodeA', type: 'diagram_node' } as any,
        { id: 'edge1', type: 'diagram_edge', source_id: 'nonexistent', target_id: 'nodeA' } as any,
      ];
      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'dangling-edge-ref')).toBe(true);
    });
  });

  describe('cyclic graph detection', () => {
    it('detects and reports a cyclic diagram graph', () => {
      const doc = createIRDocument({
        domain: 'diagram',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        { id: 'A', type: 'diagram_node' } as any,
        { id: 'B', type: 'diagram_node' } as any,
        { id: 'C', type: 'diagram_node' } as any,
        { id: 'e1', type: 'diagram_edge', source_id: 'A', target_id: 'B' } as any,
        { id: 'e2', type: 'diagram_edge', source_id: 'B', target_id: 'C' } as any,
        { id: 'e3', type: 'diagram_edge', source_id: 'C', target_id: 'A' } as any, // cycle!
      ];
      const res = validateHIR(doc);
      expect(res.warnings).toBeDefined();
      expect(res.warnings!.some(w => w.keyword === 'cyclic-graph')).toBe(true);
    });
  });

  describe('bpmn_element', () => {
    it('must have a valid bpmn_type', () => {
      const doc = createIRDocument({
        domain: 'diagram',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        { id: 'bp1', type: 'bpmn_element', bpmn_type: 'invalid_type' } as any,
      ];
      const res = validateHIR(doc);
      expect(res.valid).toBe(false);
      expect(res.errors.some(e => e.keyword === 'invalid-bpmn-type')).toBe(true);
    });

    it('passes with valid bpmn_type values', () => {
      const doc = createIRDocument({
        domain: 'diagram',
        canvas: { width: 800, height: 600, color_space: 'sRGB' },
      });
      doc.objects = [
        { id: 'bp1', type: 'bpmn_element', bpmn_type: 'start_event' } as any,
        { id: 'bp2', type: 'bpmn_element', bpmn_type: 'end_event' } as any,
        { id: 'bp3', type: 'bpmn_element', bpmn_type: 'task' } as any,
        { id: 'bp4', type: 'bpmn_element', bpmn_type: 'gateway' } as any,
      ];
      expect(validateHIR(doc).valid).toBe(true);
    });
  });
});
