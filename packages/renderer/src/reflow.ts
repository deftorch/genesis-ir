import { IRDocument, IRNode } from '@genesis/types';
import { ComputedLayoutMap } from './layout.js';

export interface ReflowResult {
  pages: {
    pageNumber: number;
    nodeIds: string[];
  }[];
  totalHeight: number;
}

/**
 * Sub-pass 4a: Multi-page Text Reflow Engine
 * Simple algorithm to paginate document nodes into multiple pages based on canvas height.
 * @stability BETA
 */
export function computeTextReflow(doc: IRDocument, layout: ComputedLayoutMap): ReflowResult {
  const isDocument = doc.meta.domain === 'document' || doc.meta.active_domains?.includes('document');
  if (!isDocument) {
    return { pages: [], totalHeight: 0 };
  }

  const canvasHeight = typeof (doc.canvas as any)?.height === 'number' ? (doc.canvas as any).height : 1122; // Default A4 at 96 DPI

  const pages: { pageNumber: number; nodeIds: string[] }[] = [];
  let currentPage = 1;
  let currentNodes: string[] = [];

  const objects = doc.objects || [];
  
  // Sort objects by their Y position from the layout map
  const sortedObjects = [...objects].sort((a, b) => {
    const yA = layout[a.id]?.y ?? 0;
    const yB = layout[b.id]?.y ?? 0;
    return yA - yB;
  });

  let maxTotalHeight = 0;

  for (const obj of sortedObjects) {
    const nodeLayout = layout[obj.id];
    if (!nodeLayout) continue;

    // Determine the page this node should belong to based on its absolute Y position
    const nodeBottom = nodeLayout.y + nodeLayout.height;
    maxTotalHeight = Math.max(maxTotalHeight, nodeBottom);

    const pageIndex = Math.floor(nodeLayout.y / canvasHeight);
    const assignedPage = pageIndex + 1;

    // Fast-forward empty pages if there's a big gap
    while (currentPage < assignedPage) {
      if (currentNodes.length > 0) {
        pages.push({ pageNumber: currentPage, nodeIds: currentNodes });
        currentNodes = [];
      }
      currentPage++;
    }

    // Add to current page
    currentNodes.push(obj.id);
  }

  // Push the last page
  if (currentNodes.length > 0) {
    pages.push({ pageNumber: currentPage, nodeIds: currentNodes });
  }

  return {
    pages,
    totalHeight: maxTotalHeight
  };
}
