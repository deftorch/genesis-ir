import { IRDocument, IRNode } from '@genesis/types';
import { computeLayout } from './layout.js';

/**
 * Render IRDocument using Canvas 2D context API.
 * @stability BETA
 */
export function renderToCanvas2D(doc: IRDocument, context: CanvasRenderingContext2D | unknown): void {
  const ctx = context as any;
  const layoutMap = computeLayout(doc);
  const nodes = doc.objects || [];
  const nodeMap = new Map<string, IRNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const roots = nodes.filter(node => !node.parent_id || !nodeMap.has(node.parent_id));

  function renderNode(nodeId: string) {
    const node = nodeMap.get(nodeId);
    const layout = layoutMap[nodeId];
    if (!node || !layout) return;

    ctx.save();

    const style = node.style || {};

    // Apply rotation transform
    const rotation = node.geometry?.rotation ?? 0;
    if (rotation !== 0) {
      const cx = layout.x + layout.width / 2;
      const cy = layout.y + layout.height / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    // Apply opacity
    if (style.opacity !== undefined) {
      ctx.globalAlpha = style.opacity;
    }

    // Apply blend mode
    if (style.blend_mode !== undefined && style.blend_mode !== 'normal') {
      ctx.globalCompositeOperation = mapBlendModeToCompositeOp(style.blend_mode as string);
    }

    // Apply filters
    if (style.filters && Array.isArray(style.filters)) {
      const filterStrings: string[] = [];
      for (const filter of style.filters) {
        if (filter.type === 'brightness') {
          filterStrings.push(`brightness(${filter.value * 100}%)`);
        } else if (filter.type === 'contrast') {
          filterStrings.push(`contrast(${filter.value * 100}%)`);
        } else if (filter.type === 'blur') {
          filterStrings.push(`blur(${filter.value}px)`);
        } else if (filter.type === 'sepia') {
          filterStrings.push(`sepia(${filter.value * 100}%)`);
        } else if (filter.type === 'invert') {
          filterStrings.push(`invert(${filter.value * 100}%)`);
        }
      }
      if (filterStrings.length > 0) {
        ctx.filter = filterStrings.join(' ');
      }
    }

    // Drawing content
    if (node.content) {
      const content = node.content;
      ctx.fillStyle = (style.fill as string) ?? 'transparent';
      ctx.strokeStyle = (style.stroke as string) ?? 'transparent';
      ctx.lineWidth = (style.stroke_width as number) ?? 1;

      if (content.kind === 'shape') {
        const type = content.shape_type;
        if (type === 'rect') {
          if (style.fill !== 'transparent' && style.fill !== undefined) {
            ctx.fillRect(layout.x, layout.y, layout.width, layout.height);
          }
          if (style.stroke !== 'transparent' && style.stroke !== undefined) {
            ctx.strokeRect(layout.x, layout.y, layout.width, layout.height);
          }
        } else if (type === 'ellipse') {
          ctx.beginPath();
          const cx = layout.x + layout.width / 2;
          const cy = layout.y + layout.height / 2;
          const rx = layout.width / 2;
          const ry = layout.height / 2;
          ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
          if (style.fill !== 'transparent' && style.fill !== undefined) {
            ctx.fill();
          }
          if (style.stroke !== 'transparent' && style.stroke !== undefined) {
            ctx.stroke();
          }
        } else if (type === 'polygon' || type === 'triangle') {
          ctx.beginPath();
          const sides = type === 'triangle' ? 3 : (content.sides ?? 3);
          const cx = layout.x + layout.width / 2;
          const cy = layout.y + layout.height / 2;
          const rx = layout.width / 2;
          const ry = layout.height / 2;
          for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
            const px = cx + rx * Math.cos(angle);
            const py = cy + ry * Math.sin(angle);
            if (i === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.closePath();
          if (style.fill !== 'transparent' && style.fill !== undefined) {
            ctx.fill();
          }
          if (style.stroke !== 'transparent' && style.stroke !== undefined) {
            ctx.stroke();
          }
        }
      } else if (content.kind === 'svg_path') {
        ctx.beginPath();
        if (typeof ctx.Path2D === 'function') {
          const path2d = new ctx.Path2D(content.d);
          ctx.translate(layout.x, layout.y);
          if (style.fill !== 'transparent' && style.fill !== undefined) {
            ctx.fill(path2d);
          }
          if (style.stroke !== 'transparent' && style.stroke !== undefined) {
            ctx.stroke(path2d);
          }
        }
      } else if (content.kind === 'text') {
        const fontFamily = (style.font_family as string) ?? 'sans-serif';
        const fontSize = (style.font_size as number) ?? 16;
        const fontWeight = (style.font_weight as string | number) ?? 'normal';
        ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        if (style.fill !== 'transparent' && style.fill !== undefined) {
          ctx.fillText(content.raw || '', layout.x, layout.y + fontSize);
        }
        if (style.stroke !== 'transparent' && style.stroke !== undefined) {
          ctx.strokeText(content.raw || '', layout.x, layout.y + fontSize);
        }
      } else if (content.kind === 'image') {
        if (ctx.drawImage) {
          ctx.drawImage(content.asset_id, layout.x, layout.y, layout.width, layout.height);
        }
      }
    }

    // Children
    for (const childId of node.children || []) {
      renderNode(childId);
    }

    ctx.restore();
  }

  for (const root of roots) {
    renderNode(root.id);
  }
}

function mapBlendModeToCompositeOp(blendMode: string): string {
  switch (blendMode) {
    case 'multiply': return 'multiply';
    case 'screen': return 'screen';
    case 'overlay': return 'overlay';
    case 'darken': return 'darken';
    case 'lighten': return 'lighten';
    case 'color-dodge': return 'color-dodge';
    case 'color-burn': return 'color-burn';
    case 'hard-light': return 'hard-light';
    case 'soft-light': return 'soft-light';
    case 'difference': return 'difference';
    case 'exclusion': return 'exclusion';
    default: return 'source-over';
  }
}
