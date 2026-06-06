import { describe, it, expect } from 'vitest';
import { computeEdgeRouting } from '../routing.js';
import { createIRDocument } from '@genesis/types';

describe('FASE 10B — Sub-pass 4b: Diagram Edge Auto-Routing', () => {
  it('computes 4 waypoints (Z-shape) for a diagram_edge between two nodes', () => {
    const doc = createIRDocument({
      domain: 'diagram',
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
    });

    doc.objects = [
      { id: 'nodeA', type: 'diagram_node' } as any,
      { id: 'nodeB', type: 'diagram_node' } as any,
      { id: 'edge1', type: 'diagram_edge', source_id: 'nodeA', target_id: 'nodeB' } as any,
    ];

    const layout = {
      'nodeA': { x: 100, y: 100, width: 100, height: 50 },
      'nodeB': { x: 400, y: 300, width: 100, height: 50 },
    };

    const routes = computeEdgeRouting(doc, layout);
    expect(routes).toHaveProperty('edge1');
    
    const waypoints = routes['edge1'];
    expect(waypoints).toHaveLength(4);
    
    // nodeA bottom: (150, 150). nodeB top: (450, 300).
    // MidY = (150 + 300) / 2 = 225
    expect(waypoints[0]).toEqual({ x: 150, y: 150 });
    expect(waypoints[1]).toEqual({ x: 150, y: 225 });
    expect(waypoints[2]).toEqual({ x: 450, y: 225 });
    expect(waypoints[3]).toEqual({ x: 450, y: 300 });

    // Ensure it was attached to the edge object
    expect((doc.objects[2] as any).computed_waypoints).toEqual(waypoints);
  });

  it('computes horizontal waypoints when nodes are side-by-side', () => {
    const doc = createIRDocument({
      domain: 'diagram',
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
    });

    doc.objects = [
      { id: 'nodeA', type: 'diagram_node' } as any,
      { id: 'nodeB', type: 'diagram_node' } as any,
      { id: 'edge1', type: 'diagram_edge', source_id: 'nodeA', target_id: 'nodeB' } as any,
    ];

    const layout = {
      'nodeA': { x: 100, y: 100, width: 100, height: 50 },
      'nodeB': { x: 400, y: 120, width: 100, height: 50 },
    };

    const routes = computeEdgeRouting(doc, layout);
    const waypoints = routes['edge1'];
    
    // side-by-side because deltaX (300) > deltaY (20)
    // start: nodeA right edge (200, 125). end: nodeB left edge (400, 145)
    expect(waypoints).toHaveLength(4);
    expect(waypoints[0]).toEqual({ x: 200, y: 125 });
    expect(waypoints[3]).toEqual({ x: 400, y: 145 });
  });

  it('returns empty routes for non-diagram domains', () => {
    const doc = createIRDocument({
      domain: 'visual',
      canvas: { width: 800, height: 600, color_space: 'sRGB' },
    });
    
    doc.objects = [
      { id: 'nodeA', type: 'diagram_node' } as any,
      { id: 'nodeB', type: 'diagram_node' } as any,
      { id: 'edge1', type: 'diagram_edge', source_id: 'nodeA', target_id: 'nodeB' } as any,
    ];

    const routes = computeEdgeRouting(doc, {});
    expect(Object.keys(routes)).toHaveLength(0);
  });
});
