import { describe, it, expect } from 'vitest';
import { computeTextReflow } from '../reflow.js';
import { createIRDocument } from '@genesis/types';

describe('FASE 10A — Sub-pass 4a: Multi-page Text Reflow Engine', () => {
  it('paginates nodes based on their Y position and canvas height', () => {
    const doc = createIRDocument({
      domain: 'document',
      canvas: { width: 800, height: 1000, color_space: 'sRGB' },
    });

    // We simulate 3 paragraphs: 
    // p1 on page 1
    // p2 on page 2
    // p3 on page 4 (big gap)
    doc.objects = [
      { id: 'p1', type: 'doc_paragraph' } as any,
      { id: 'p2', type: 'doc_paragraph' } as any,
      { id: 'p3', type: 'doc_paragraph' } as any,
    ];

    const layout = {
      'p1': { x: 0, y: 100, width: 800, height: 50 },  // Ends at 150 -> Page 1
      'p2': { x: 0, y: 1100, width: 800, height: 50 }, // Ends at 1150 -> Page 2
      'p3': { x: 0, y: 3500, width: 800, height: 50 }, // Ends at 3550 -> Page 4
    };

    const result = computeTextReflow(doc, layout);

    expect(result.totalHeight).toBe(3550);
    expect(result.pages).toHaveLength(3); // Page 1, Page 2, Page 4
    
    expect(result.pages[0].pageNumber).toBe(1);
    expect(result.pages[0].nodeIds).toEqual(['p1']);

    expect(result.pages[1].pageNumber).toBe(2);
    expect(result.pages[1].nodeIds).toEqual(['p2']);

    expect(result.pages[2].pageNumber).toBe(4);
    expect(result.pages[2].nodeIds).toEqual(['p3']);
  });

  it('returns empty for non-document domains', () => {
    const doc = createIRDocument({
      domain: 'visual',
      canvas: { width: 800, height: 1000, color_space: 'sRGB' },
    });

    const result = computeTextReflow(doc, {});
    expect(result.pages).toHaveLength(0);
  });
});
