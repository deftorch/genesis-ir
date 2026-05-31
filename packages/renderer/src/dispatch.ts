import { IRDocument } from '@genesis/types';
import { renderToSVG } from './svg.js';
import { PDFXRenderer } from './pdfx.js';
import { ThreeDWebGLRenderer } from './three_webgl.js';

export interface DispatchOutput {
  svg?: string;
  pdf?: Buffer;
  audio?: Buffer;
  three_d_html?: string;
}

/**
 * Dispatch rendering to appropriate domain renderers based on active_domains.
 * @stability BETA
 */
export async function dispatchMultiRenderer(doc: IRDocument, targetContexts?: string[]): Promise<DispatchOutput> {
  const domain = doc.meta?.domain;
  const activeDomains = doc.meta?.active_domains || [domain];
  const output: DispatchOutput = {};

  const wants = (type: string) => !targetContexts || targetContexts.includes(type);

  // 1. Visual/Print/Signage/Packaging rendering
  const hasVisual = activeDomains.includes('visual') ||
                    activeDomains.includes('print') ||
                    activeDomains.includes('packaging') ||
                    activeDomains.includes('signage') ||
                    domain === 'visual' ||
                    domain === 'print' ||
                    domain === 'packaging' ||
                    domain === 'signage';

  if (hasVisual) {
    if (wants('svg')) {
      output.svg = renderToSVG(doc);
    }
    if ((activeDomains.includes('print') || activeDomains.includes('packaging') || domain === 'print' || domain === 'packaging') && wants('pdf')) {
      const pdfRenderer = new PDFXRenderer();
      output.pdf = await pdfRenderer.render(doc);
    }
  }

  // 2. Audio rendering
  const hasAudio = activeDomains.includes('audio') ||
                   activeDomains.includes('music_production') ||
                   domain === 'audio' ||
                   domain === 'music_production';

  if (hasAudio && wants('audio')) {
    output.audio = Buffer.from('RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00', 'binary');
  }

  // 3. 3D rendering
  const has3D = activeDomains.includes('3d') || domain === '3d' || (doc.canvas as any)?.canvas_type === '3d';

  if (has3D && wants('three_d')) {
    const webglRenderer = new ThreeDWebGLRenderer();
    output.three_d_html = webglRenderer.renderToHtml(doc);
  }

  return output;
}
