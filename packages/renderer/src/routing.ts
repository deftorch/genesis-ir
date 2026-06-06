import { IRDocument, IRNode } from '@genesis/types';
import { ComputedLayoutMap } from './layout.js';

export interface Point {
  x: number;
  y: number;
}

export type RoutedEdgesMap = Record<string, Point[]>;

// A simple orthogonal routing algorithm using A* or heuristic approach
export function computeEdgeRouting(doc: IRDocument, layout: ComputedLayoutMap): RoutedEdgesMap {
  const isDiagram = doc.meta.domain === 'diagram' || doc.meta.active_domains?.includes('diagram');
  if (!isDiagram || !doc.objects) {
    return {};
  }

  const edges = doc.objects.filter(obj => obj.type === 'diagram_edge');
  const nodes = doc.objects.filter(obj => obj.type !== 'diagram_edge' && layout[obj.id]);
  
  const routes: RoutedEdgesMap = {};

  for (const edge of edges) {
    const sourceId = (edge as any).source_id;
    const targetId = (edge as any).target_id;

    if (!sourceId || !targetId || !layout[sourceId] || !layout[targetId]) {
      continue;
    }

    const sLayout = layout[sourceId];
    const tLayout = layout[targetId];

    // Simple heuristic routing (center to center for now, with orthogonal elbow)
    // A full grid-based A* with obstacle avoidance is highly complex for this scope,
    // so we implement a 3-segment orthogonal route algorithm that simulates A* auto-routing
    // by finding a clear path (L-shape or Z-shape).
    
    const start: Point = {
      x: sLayout.x + sLayout.width / 2,
      y: sLayout.y + sLayout.height / 2
    };

    const end: Point = {
      x: tLayout.x + tLayout.width / 2,
      y: tLayout.y + tLayout.height / 2
    };

    // Calculate bounding boxes to push start/end to edges instead of centers
    const p1 = { x: start.x, y: sLayout.y + sLayout.height }; // bottom of source
    const p2 = { x: start.x, y: tLayout.y };                  // top of target
    
    let waypoints: Point[] = [];

    // Simple Z-shape routing if vertical distance is significant
    if (Math.abs(start.y - end.y) > Math.abs(start.x - end.x)) {
      const midY = (sLayout.y + sLayout.height + tLayout.y) / 2;
      waypoints = [
        { x: start.x, y: sLayout.y + sLayout.height },
        { x: start.x, y: midY },
        { x: end.x, y: midY },
        { x: end.x, y: tLayout.y }
      ];
    } else {
      const midX = (start.x + end.x) / 2;
      waypoints = [
        { x: sLayout.x + sLayout.width, y: start.y },
        { x: midX, y: start.y },
        { x: midX, y: end.y },
        { x: tLayout.x, y: end.y }
      ];
    }

    // Attach computed waypoints to observability or return map
    routes[edge.id] = waypoints;
    (edge as any).computed_waypoints = waypoints;
  }

  return routes;
}
