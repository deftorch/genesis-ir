import { IRDocument, IRNode } from '@genesis/types';

export interface ComputedLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ComputedLayoutMap = Record<string, ComputedLayout>;

/**
 * Compute Layout for document nodes based on Flexbox, Grid, and absolute/group structures.
 * @stability BETA
 */
export function computeLayout(doc: IRDocument): ComputedLayoutMap {
  const nodes = doc.objects || [];
  const nodeMap = new Map<string, IRNode>();
  const childrenToParent = new Map<string, string>();

  // Initialize mappings
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }
  for (const node of nodes) {
    for (const childId of node.children || []) {
      childrenToParent.set(childId, node.id);
    }
  }

  // Find root nodes (no parent or parent is not in the map)
  const roots = nodes.filter(node => !node.parent_id || !nodeMap.has(node.parent_id));

  const resolvedSizes: Record<string, { width: number; height: number }> = {};
  const computedLayout: ComputedLayoutMap = {};

  // Traversal 1: Bottom-up size resolution
  function resolveSizes(nodeId: string) {
    const node = nodeMap.get(nodeId);
    if (!node) return;

    // Resolve children sizes first
    for (const childId of node.children || []) {
      resolveSizes(childId);
    }

    let width = node.geometry?.width ?? 0;
    let height = node.geometry?.height ?? 0;

    const minWidth = (node.style?.min_width as number) ?? 0;
    const maxWidth = (node.style?.max_width as number) ?? Infinity;
    const minHeight = (node.style?.min_height as number) ?? 0;
    const maxHeight = (node.style?.max_height as number) ?? Infinity;

    if (node.type === 'group') {
      // Bounding box calculation for groups
      if (node.children && node.children.length > 0) {
        let minX = Infinity;
        let maxX = -Infinity;
        let minY = Infinity;
        let maxY = -Infinity;

        for (const childId of node.children) {
          const childNode = nodeMap.get(childId);
          const childSize = resolvedSizes[childId];
          if (childNode && childSize) {
            const cx = childNode.geometry?.x ?? 0;
            const cy = childNode.geometry?.y ?? 0;
            minX = Math.min(minX, cx);
            maxX = Math.max(maxX, cx + childSize.width);
            minY = Math.min(minY, cy);
            maxY = Math.max(maxY, cy + childSize.height);
          }
        }

        if (minX !== Infinity) {
          width = maxX - minX;
          height = maxY - minY;
        }
      }
    } else if (node.type === 'flex_container') {
      const direction = (node.style?.flex_direction as string) ?? 'row';
      const gap = (node.style?.gap as number) ?? 0;

      let contentW = 0;
      let contentH = 0;

      if (node.children && node.children.length > 0) {
        for (let i = 0; i < node.children.length; i++) {
          const childId = node.children[i];
          const childSize = resolvedSizes[childId];
          if (childSize) {
            if (direction === 'row') {
              contentW += childSize.width + (i > 0 ? gap : 0);
              contentH = Math.max(contentH, childSize.height);
            } else {
              contentH += childSize.height + (i > 0 ? gap : 0);
              contentW = Math.max(contentW, childSize.width);
            }
          }
        }
      }

      width = node.geometry?.width !== undefined ? node.geometry.width : contentW;
      height = node.geometry?.height !== undefined ? node.geometry.height : contentH;
    } else if (node.type === 'grid_container') {
      // Basic Grid tracks calculation
      const gap = (node.style?.gap as number) ?? 0;
      const colsTemplate = (node.style?.grid_template_columns as string) ?? '1fr';
      const colSpecs = colsTemplate.split(/\s+/).filter(Boolean);
      const colsCount = colSpecs.length;

      let contentW = 0;
      let contentH = 0;

      if (node.children && node.children.length > 0) {
        const rowsCount = Math.ceil(node.children.length / colsCount);
        // Compute column widths & row heights
        const colWidths = new Array(colsCount).fill(0);
        const rowHeights = new Array(rowsCount).fill(0);

        for (let i = 0; i < node.children.length; i++) {
          const childId = node.children[i];
          const childSize = resolvedSizes[childId];
          if (childSize) {
            const colIdx = i % colsCount;
            const rowIdx = Math.floor(i / colsCount);
            colWidths[colIdx] = Math.max(colWidths[colIdx], childSize.width);
            rowHeights[rowIdx] = Math.max(rowHeights[rowIdx], childSize.height);
          }
        }

        contentW = colWidths.reduce((sum, w) => sum + w, 0) + (colsCount - 1) * gap;
        contentH = rowHeights.reduce((sum, h) => sum + h, 0) + (rowsCount - 1) * gap;
      }

      width = node.geometry?.width !== undefined ? node.geometry.width : contentW;
      height = node.geometry?.height !== undefined ? node.geometry.height : contentH;
    }

    // Apply constraints
    width = Math.min(Math.max(width, minWidth), maxWidth);
    height = Math.min(Math.max(height, minHeight), maxHeight);

    resolvedSizes[nodeId] = { width, height };
  }

  // Traversal 2: Top-down position resolution
  function resolvePositions(nodeId: string, absParentX: number, absParentY: number) {
    const node = nodeMap.get(nodeId);
    const size = resolvedSizes[nodeId];
    if (!node || !size) return;

    let localX = node.geometry?.x ?? 0;
    let localY = node.geometry?.y ?? 0;

    const absX = absParentX + localX;
    const absY = absParentY + localY;

    computedLayout[nodeId] = {
      x: absX,
      y: absY,
      width: size.width,
      height: size.height,
    };

    if (node.type === 'flex_container') {
      const direction = (node.style?.flex_direction as string) ?? 'row';
      const gap = (node.style?.gap as number) ?? 0;
      const justifyContent = (node.style?.justify_content as string) ?? 'flex-start';
      const alignItems = (node.style?.align_items as string) ?? 'flex-start';

      const childIds = node.children || [];
      const totalChildren = childIds.length;

      let mainChildrenSize = 0;
      for (const cid of childIds) {
        const csz = resolvedSizes[cid];
        if (csz) {
          mainChildrenSize += direction === 'row' ? csz.width : csz.height;
        }
      }

      const totalGaps = Math.max(0, totalChildren - 1) * gap;
      const totalSize = mainChildrenSize + totalGaps;
      const containerMainSize = direction === 'row' ? size.width : size.height;

      let mainStartOffset = 0;
      let gapOffset = gap;

      if (justifyContent === 'flex-end') {
        mainStartOffset = containerMainSize - totalSize;
      } else if (justifyContent === 'center') {
        mainStartOffset = (containerMainSize - totalSize) / 2;
      } else if (justifyContent === 'space-between' && totalChildren > 1) {
        mainStartOffset = 0;
        gapOffset = (containerMainSize - mainChildrenSize) / (totalChildren - 1);
      } else if (justifyContent === 'space-around' && totalChildren > 0) {
        const extraSpace = containerMainSize - mainChildrenSize;
        gapOffset = extraSpace / totalChildren;
        mainStartOffset = gapOffset / 2;
      }

      let currentOffset = mainStartOffset;

      for (const childId of childIds) {
        const childNode = nodeMap.get(childId);
        const childSize = resolvedSizes[childId];
        if (!childNode || !childSize) continue;

        let childW = childSize.width;
        let childH = childSize.height;

        let childRelX = 0;
        let childRelY = 0;

        if (direction === 'row') {
          childRelX = currentOffset;
          // Align items on cross axis (height)
          if (alignItems === 'center') {
            childRelY = (size.height - childH) / 2;
          } else if (alignItems === 'flex-end') {
            childRelY = size.height - childH;
          } else if (alignItems === 'stretch') {
            childRelY = 0;
            childH = size.height;
            // Update child's resolved size for recursive layouts
            resolvedSizes[childId].height = childH;
          }
          currentOffset += childW + gapOffset;
        } else {
          childRelY = currentOffset;
          // Align items on cross axis (width)
          if (alignItems === 'center') {
            childRelX = (size.width - childW) / 2;
          } else if (alignItems === 'flex-end') {
            childRelX = size.width - childW;
          } else if (alignItems === 'stretch') {
            childRelX = 0;
            childW = size.width;
            resolvedSizes[childId].width = childW;
          }
          currentOffset += childH + gapOffset;
        }

        // Apply absolute offsets
        computedLayout[childId] = {
          x: absX + childRelX,
          y: absY + childRelY,
          width: childW,
          height: childH,
        };

        // Recursively resolve child's children
        resolvePositions(childId, absX + childRelX, absY + childRelY);
      }
    } else if (node.type === 'grid_container') {
      const gap = (node.style?.gap as number) ?? 0;
      const colsTemplate = (node.style?.grid_template_columns as string) ?? '1fr';
      const colSpecs = colsTemplate.split(/\s+/).filter(Boolean);
      const colsCount = colSpecs.length;

      const childIds = node.children || [];
      const totalChildren = childIds.length;
      const rowsCount = Math.ceil(totalChildren / colsCount);

      const colWidths = new Array(colsCount).fill(0);
      const rowHeights = new Array(rowsCount).fill(0);

      for (let i = 0; i < totalChildren; i++) {
        const childSize = resolvedSizes[childIds[i]];
        if (childSize) {
          const colIdx = i % colsCount;
          const rowIdx = Math.floor(i / colsCount);
          colWidths[colIdx] = Math.max(colWidths[colIdx], childSize.width);
          rowHeights[rowIdx] = Math.max(rowHeights[rowIdx], childSize.height);
        }
      }

      // Compute track positions
      const colPositions = new Array(colsCount).fill(0);
      for (let c = 1; c < colsCount; c++) {
        colPositions[c] = colPositions[c - 1] + colWidths[c - 1] + gap;
      }
      const rowPositions = new Array(rowsCount).fill(0);
      for (let r = 1; r < rowsCount; r++) {
        rowPositions[r] = rowPositions[r - 1] + rowHeights[r - 1] + gap;
      }

      for (let i = 0; i < totalChildren; i++) {
        const childId = childIds[i];
        const childSize = resolvedSizes[childId];
        if (!childSize) continue;

        const colIdx = i % colsCount;
        const rowIdx = Math.floor(i / colsCount);

        const childRelX = colPositions[colIdx];
        const childRelY = rowPositions[rowIdx];

        computedLayout[childId] = {
          x: absX + childRelX,
          y: absY + childRelY,
          width: childSize.width,
          height: childSize.height,
        };

        resolvePositions(childId, absX + childRelX, absY + childRelY);
      }
    } else {
      // Default: absolute or group traversal
      for (const childId of node.children || []) {
        resolvePositions(childId, absX, absY);
      }
    }
  }

  // Resolve sizes and positions for all roots
  for (const root of roots) {
    resolveSizes(root.id);
    resolvePositions(root.id, 0, 0);
  }

  return computedLayout;
}
