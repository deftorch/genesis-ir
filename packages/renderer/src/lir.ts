import { IRMIRDocument, PlatformTarget, IRLIRDocument, WebLIR, PrintLIR, VideoLIR, PixelLIR, FontLIR } from '@genesis/types';
import { renderToSVG } from './svg.js';
import { computeLayout } from './layout.js';
import { renderToHTMLDOM } from './interactive.js';
import { generateWebAudioLIR } from './webaudio.js';
import { packSpriteSheet } from './spritesheet.js';
import { compileOpenTypeFont } from './opentype.js';

/**
 * Generate Low-Level IR (LIR) from Medium-Level IR (MIR) document.
 * @stability BETA
 */
export function generateLIR(mir: IRMIRDocument, target: PlatformTarget): IRLIRDocument {
  if (target === 'web') {
    const domain = mir.meta.domain;

    if (domain === 'music_production') {
      const webLir = generateWebAudioLIR(mir);
      return {
        target,
        lir: webLir,
      };
    }

    if (domain === 'font_design') {
      const fontResult = compileOpenTypeFont(mir);
      const fontLir: FontLIR = {
        type: 'font',
        font_format: fontResult.format,
        binary_buffer: fontResult.buffer.toString('base64'),
      };
      return {
        target,
        lir: fontLir,
      };
    }

    if (domain === 'pixel_art') {
      const spec = (mir as any).pixel_spec;
      if (!spec) {
        throw new Error('pixel_art domain document is missing pixel_spec');
      }
      const { atlasBuffer, manifest } = packSpriteSheet([spec], mir.objects || []);
      const pixelLir: PixelLIR = {
        type: 'pixel',
        atlas: atlasBuffer.toString('base64'),
        manifest,
      };
      return {
        target,
        lir: pixelLir,
      };
    }

    if (domain === 'interactive' || domain === 'document') {
      const { html, scripts } = renderToHTMLDOM(mir);
      const webLir: WebLIR = {
        type: 'web',
        dom_instructions: {
          format: 'html_dom',
          html,
          scripts,
        },
      };
      return {
        target,
        lir: webLir,
      };
    }

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
