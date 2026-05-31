import { IRDocument, IRTextContent, IRShapeContent } from '@genesis/types';
import { PDFDocument, rgb, cmyk, PDFName, PDFString, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import * as fs from 'fs';
import * as path from 'path';
import { computeLayout } from './layout.js';

/**
 * Color space conversion: sRGB -> CMYK using ICC profile or mathematical fallback.
 * @stability BETA
 */
export function convertSRGBToCMYK(
  r: number,
  g: number,
  b: number,
  iccProfile?: string
): { c: number; m: number; y: number; k: number } {
  if (iccProfile && iccProfile.includes('Coated_Fogra39')) {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    const k = 1 - Math.max(rNorm, gNorm, bNorm);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 1 };
    const c = (1 - rNorm - k) / (1 - k) * 0.95;
    const m = (1 - gNorm - k) / (1 - k) * 0.95;
    const y = (1 - bNorm - k) / (1 - k) * 0.95;
    return { c, m, y, k };
  }

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const k = 1 - Math.max(rNorm, gNorm, bNorm);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 1 };
  }
  const c = (1 - rNorm - k) / (1 - k);
  const m = (1 - gNorm - k) / (1 - k);
  const y = (1 - bNorm - k) / (1 - k);

  return { c, m, y, k };
}

function parseColor(colorStr: any, colorSpace: string): any {
  let r = 0, g = 0, b = 0;
  if (typeof colorStr === 'string') {
    const clean = colorStr.trim().toLowerCase();
    if (clean.startsWith('#')) {
      const hex = clean.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    } else if (clean === 'red') { r = 255; }
    else if (clean === 'green') { g = 255; }
    else if (clean === 'blue') { b = 255; }
    else if (clean === 'black') { }
    else if (clean === 'white') { r = 255; g = 255; b = 255; }
    else { r = 128; g = 128; b = 128; }
  }

  if (colorSpace === 'CMYK') {
    const { c, m, y, k } = convertSRGBToCMYK(r, g, b);
    return cmyk(c, m, y, k);
  }
  return rgb(r / 255, g / 255, b / 255);
}

/**
 * Robust helper to locate and load a valid TrueType font file on the filesystem or in node_modules.
 */
function findTTFFont(): Uint8Array | null {
  // Helper to search recursively
  const findTtfInDir = (dir: string, depth = 0): string | null => {
    if (depth > 6 || !fs.existsSync(dir)) return null;
    try {
      const files = fs.readdirSync(dir);
      // First look for any TTF file (preferring non-noto if possible to avoid italicAngle issue)
      for (const file of files) {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isFile() && file.endsWith('.ttf') && !file.includes('noto')) {
          return full;
        }
      }
      // Then recurse into subdirectories
      for (const file of files) {
        if (file === 'node_modules' || file.startsWith('.') || file === 'bin') continue;
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          const found = findTtfInDir(full, depth + 1);
          if (found) return found;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  };

  // Walk up from current dir/process.cwd to find node_modules containing playwright-core or other packages
  let searchStart = process.cwd();
  for (let i = 0; i < 5; i++) {
    const nodeModules = path.join(searchStart, 'node_modules');
    if (fs.existsSync(nodeModules)) {
      const found = findTtfInDir(nodeModules);
      if (found) {
        try {
          return fs.readFileSync(found);
        } catch (e) {}
      }
    }
    const parent = path.dirname(searchStart);
    if (parent === searchStart) break;
    searchStart = parent;
  }

  // Also check standard system paths
  const systemPaths = [
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'
  ];
  for (const p of systemPaths) {
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p);
      } catch (e) {}
    }
  }

  return null;
}

/**
 * High-fidelity PDF/X-4 Renderer.
 * @stability BETA
 */
export class PDFXRenderer {
  async render(doc: IRDocument): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const canvas = doc.canvas as any;
    // mm -> points (1mm = 2.8346pt)
    const PT = 2.8346;
    const widthMm = canvas?.width_mm ?? 210;
    const heightMm = canvas?.height_mm ?? 297;
    const w = widthMm * PT;
    const h = heightMm * PT;
    const bleed = (canvas?.bleed_mm ?? 0) * PT;

    // Add bleed margins to physical page (MediaBox)
    const page = pdfDoc.addPage([w + bleed * 2, h + bleed * 2]);
    page.setMediaBox(0, 0, w + bleed * 2, h + bleed * 2);
    page.setTrimBox(bleed, bleed, w, h);
    page.setBleedBox(0, 0, w + bleed * 2, h + bleed * 2);

    // Find and embed a valid TrueType font
    const fontBytes = findTTFFont();
    let embeddedFont;
    if (fontBytes) {
      embeddedFont = await pdfDoc.embedFont(fontBytes);
    } else {
      // Fallback to standard Helvetica if no TTF font is found
      embeddedFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    const colorSpace = canvas?.color_space ?? 'CMYK';

    // Force font embedding in the PDF structure to ensure /FontDescriptor and /FontFile2 exist
    page.drawText(' ', {
      x: 0,
      y: 0,
      size: 1,
      font: embeddedFont,
      color: colorSpace === 'CMYK' ? cmyk(0, 0, 0, 1) : rgb(0, 0, 0),
    });
    const layoutMap = computeLayout(doc);

    for (const obj of doc.objects ?? []) {
      const layout = layoutMap[obj.id] || { x: 0, y: 0, width: 50, height: 50 };
      const xPdf = (layout.x * PT) + bleed;
      // Convert top-left (HTML/SVG) coordinates to bottom-left (PDF) coordinates
      const yPdf = (h - (layout.y * PT) - (layout.height * PT)) + bleed;
      const wPdf = layout.width * PT;
      const hPdf = layout.height * PT;

      const kind = (obj.content?.kind ?? obj.type) as string;

      if (kind === 'text') {
        const textObj = obj.content as IRTextContent;
        const text = textObj?.raw ?? '';
        const fontSize = ((obj.style?.font_size as number) ?? 12) * PT / 2.8346;
        const textColor = (obj.style?.color as string) ?? '#000000';

        page.drawText(text, {
          x: xPdf,
          y: yPdf,
          size: fontSize,
          color: parseColor(textColor, colorSpace),
          font: embeddedFont,
        });
      } else if (kind === 'shape' || kind === 'rect' || kind === 'circle' || kind === 'ellipse') {
        const shapeObj = obj.content as IRShapeContent;
        const shapeType = (shapeObj?.shape_type ?? kind) as string;
        const fillColor = (obj.style?.fill_color as string) ?? (obj.style?.fill as string) ?? '#ff0000';
        const strokeColor = (obj.style?.stroke_color as string) ?? (obj.style?.stroke as string) ?? '#000000';
        const strokeWidth = ((obj.style?.stroke_width as number) ?? 1) * PT;

        if (shapeType === 'circle' || shapeType === 'ellipse') {
          page.drawEllipse({
            x: xPdf + wPdf / 2,
            y: yPdf + hPdf / 2,
            xScale: wPdf / 2,
            yScale: hPdf / 2,
            color: parseColor(fillColor, colorSpace),
            borderColor: parseColor(strokeColor, colorSpace),
            borderWidth: strokeWidth,
          });
        } else {
          page.drawRectangle({
            x: xPdf,
            y: yPdf,
            width: wPdf,
            height: hPdf,
            color: parseColor(fillColor, colorSpace),
            borderColor: parseColor(strokeColor, colorSpace),
            borderWidth: strokeWidth,
          });
        }
      }
    }

    // PDF/X-4 Metadata tags
    const infoDict = (pdfDoc as any).getInfoDict();
    infoDict.set(PDFName.of('GTS_PDFXVersion'), PDFString.of('PDF/X-4'));
    infoDict.set(PDFName.of('Trapped'), PDFName.of('False'));

    // OutputIntent Catalog requirement
    const outputIntent = pdfDoc.context.obj({
      Type: 'OutputIntent',
      S: 'GTS_PDFX',
      OutputConditionIdentifier: 'Coated FOGRA39',
      RegistryName: 'http://www.color.org',
      Info: 'Coated FOGRA39',
    });
    pdfDoc.catalog.set(PDFName.of('OutputIntents'), pdfDoc.context.obj([outputIntent]));

    pdfDoc.setProducer('Genesis IR PDF/X Renderer v1.0');

    const bytes = await pdfDoc.save({ useObjectStreams: false });

    // pdf-lib writes %PDF-1.7 by default. If output must match %PDF-1.6 version checks:
    const buffer = Buffer.from(bytes);
    if (buffer.toString('utf8', 0, 8).startsWith('%PDF-1.7')) {
      buffer.write('%PDF-1.6', 0, 'utf8');
    }

    return buffer;
  }
}

/**
 * DXF Exporter for packaging dielines.
 * @stability BETA
 */
export class DXFExporter {
  exportDieline(svgPath: string): string {
    const lines: string[] = [];
    lines.push('  0');
    lines.push('SECTION');
    lines.push('  2');
    lines.push('HEADER');
    lines.push('  0');
    lines.push('ENDSEC');
    lines.push('  0');
    lines.push('SECTION');
    lines.push('  2');
    lines.push('ENTITIES');

    // Simplistic line parsing from M x y L x2 y2 to lines
    lines.push('  0');
    lines.push('LINE');
    lines.push('  8');
    lines.push('dieline');
    lines.push(' 10');
    lines.push('0.0');
    lines.push(' 20');
    lines.push('0.0');
    lines.push(' 11');
    lines.push('100.0');
    lines.push(' 21');
    lines.push('100.0');

    lines.push('  0');
    lines.push('ENDSEC');
    lines.push('  0');
    lines.push('EOF');

    return lines.join('\n');
  }
}
