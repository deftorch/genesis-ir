import { IRDocument, IRNode } from '@genesis/types';
import { computeLayout, ComputedLayoutMap } from './layout.js';

/**
 * Render IRDocument to an SVG String.
 * @stability BETA
 */
export function renderToSVG(doc: IRDocument): string {
  const layoutMap = computeLayout(doc);
  const nodes = doc.objects || [];
  const nodeMap = new Map<string, IRNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // Identify roots
  const roots = nodes.filter(node => !node.parent_id || !nodeMap.has(node.parent_id));

  // Canvas size
  const width = (doc.canvas as any).width ?? 800;
  const height = (doc.canvas as any).height ?? 600;

  let svgContent = '';

  function renderNode(nodeId: string): string {
    const node = nodeMap.get(nodeId);
    const layout = layoutMap[nodeId];
    if (!node || !layout) return '';

    let contentStr = '';
    const style = node.style || {};

    const fill = (style.fill as string) ?? 'none';
    const stroke = (style.stroke as string) ?? 'none';
    const strokeWidth = (style.stroke_width as number) ?? 1;
    const opacity = (style.opacity as number) ?? 1;
    const blendMode = (style.blend_mode as string) ?? 'normal';

    const commonAttrs = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"${
      opacity !== 1 ? ` opacity="${opacity}"` : ''
    }${blendMode !== 'normal' ? ` style="mix-blend-mode: ${blendMode};"` : ''}`;

    if (node.content) {
      const content = node.content;
      if (content.kind === 'shape') {
        const type = content.shape_type;
        if (type === 'rect') {
          const rx = content.corner_radius
            ? Array.isArray(content.corner_radius)
              ? content.corner_radius[0]
              : content.corner_radius
            : 0;
          contentStr = `<rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" rx="${rx}" ${commonAttrs} />`;
        } else if (type === 'ellipse') {
          const cx = layout.x + layout.width / 2;
          const cy = layout.y + layout.height / 2;
          const rx = layout.width / 2;
          const ry = layout.height / 2;
          contentStr = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${commonAttrs} />`;
        } else if (type === 'polygon' || type === 'triangle') {
          const sides = type === 'triangle' ? 3 : (content.sides ?? 3);
          const cx = layout.x + layout.width / 2;
          const cy = layout.y + layout.height / 2;
          const rx = layout.width / 2;
          const ry = layout.height / 2;

          const points: string[] = [];
          for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            const px = cx + rx * Math.cos(angle);
            const py = cy + ry * Math.sin(angle);
            points.push(`${px},${py}`);
          }
          contentStr = `<polygon points="${points.join(' ')}" ${commonAttrs} />`;
        } else {
          // Fallback rect for other shape types
          contentStr = `<rect x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" ${commonAttrs} />`;
        }
      } else if (content.kind === 'svg_path') {
        // Path
        contentStr = `<g transform="translate(${layout.x}, ${layout.y})"><path d="${content.d}" ${commonAttrs} /></g>`;
      } else if (content.kind === 'text') {
        const fontFamily = (style.font_family as string) ?? 'sans-serif';
        const fontSize = (style.font_size as number) ?? 16;
        const fontWeight = (style.font_weight as string | number) ?? 'normal';
        // Add absolute position, align vertical baseline roughly with fontSize
        contentStr = `<text x="${layout.x}" y="${layout.y + fontSize}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" ${commonAttrs}>${
          content.raw || ''
        }</text>`;
      } else if (content.kind === 'image') {
        const preserveRatio = (content.fit as string) === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice';
        contentStr = `<image href="${content.asset_id}" x="${layout.x}" y="${layout.y}" width="${layout.width}" height="${layout.height}" preserveAspectRatio="${preserveRatio}" ${commonAttrs} />`;
      }
    }

    // Children rendering
    let childrenStr = '';
    for (const childId of node.children || []) {
      childrenStr += renderNode(childId);
    }

    // Handle transforms on group wrapper if rotation exists
    const rotation = node.geometry?.rotation ?? 0;
    if (rotation !== 0) {
      const cx = layout.x + layout.width / 2;
      const cy = layout.y + layout.height / 2;
      return `<g transform="rotate(${rotation} ${cx} ${cy})">${contentStr}${childrenStr}</g>`;
    }

    return contentStr + childrenStr;
  }

  for (const root of roots) {
    svgContent += renderNode(root.id);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${svgContent}</svg>`;
}
