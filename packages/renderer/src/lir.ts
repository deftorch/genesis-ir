import { IRMIRDocument, PlatformTarget, IRLIRDocument, WebLIR, PrintLIR, VideoLIR } from '@genesis/types';
import { renderToSVG } from './svg.js';
import { computeLayout } from './layout.js';

/**
 * Generate Low-Level IR (LIR) from Medium-Level IR (MIR) document.
 * @stability BETA
 */
export function generateLIR(mir: IRMIRDocument, target: PlatformTarget): IRLIRDocument {
  if (target === 'web') {
    const domain = mir.meta.domain;

    if (domain === 'visual') {
      const svgString = renderToSVG(mir);
      const webLir: WebLIR = {
        type: 'web',
        dom_instructions: {
          format: 'svg',
          svg: svgString,
        },
      };
      return {
        target,
        lir: webLir,
      };
    } else {
      // Default / image_edit / canvas-oriented target
      const layout = computeLayout(mir);
      const instructions = Object.entries(layout).map(([id, lay]) => {
        const node = (mir.objects || []).find(n => n.id === id);
        return {
          id,
          type: node?.type || 'unknown',
          x: lay.x,
          y: lay.y,
          width: lay.width,
          height: lay.height,
          style: node?.style || {},
        };
      });

      const webLir: WebLIR = {
        type: 'web',
        dom_instructions: {
          format: 'canvas2d',
          instructions,
        },
      };
      return {
        target,
        lir: webLir,
      };
    }
  }

  if (target === 'print') {
    const canvas = mir.canvas as any;
    const printLir: PrintLIR = {
      type: 'print',
      pdf_instructions: {
        document_id: mir.ir_id,
        pages: [
          {
            width: canvas?.width || 800,
            height: canvas?.height || 600,
          },
        ],
      },
    };
    return {
      target,
      lir: printLir,
    };
  }

  // Video or default LIR target fallback
  const videoLir: VideoLIR = {
    type: 'video',
    render_tracks: {
      duration_ms: (mir.timeline as any)?.duration_ms || 0,
      tracks: [],
    },
  };
  return {
    target,
    lir: videoLir,
  };
}
