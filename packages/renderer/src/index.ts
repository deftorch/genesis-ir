import { IRDocument } from '@genesis/types';

/**
 * Render document to SVG string
 * @stability BETA
 */
export function renderToSVG(_doc: IRDocument): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>`;
}
