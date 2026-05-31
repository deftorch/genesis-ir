import { describe, it, expect } from 'vitest';
import { createIRDocument } from '@genesis/types';
import { PDFXRenderer, convertSRGBToCMYK, DXFExporter } from '../pdfx.js';

describe('PDF/X-4 & DXF Renderer Backend', () => {
  describe('PDFXRenderer', () => {
    it('produces an output containing %PDF-1.6 header', async () => {
      const doc = createIRDocument({
        domain: 'print',
        canvas: {
          width: 210,
          height: 297,
          dpi: 300,
          color_space: 'CMYK',
        },
      });

      const renderer = new PDFXRenderer();
      const buffer = await renderer.render(doc);
      const outputStr = buffer.toString('utf-8');

      expect(outputStr.startsWith('%PDF-1.6')).toBe(true);
    });

    it('retains CMYK colors and includes CMYK rendering operators', async () => {
      const doc = createIRDocument({
        domain: 'print',
        canvas: {
          width: 210,
          height: 297,
          dpi: 300,
          color_space: 'CMYK',
        },
      });

      const renderer = new PDFXRenderer();
      const buffer = await renderer.render(doc);
      const outputStr = buffer.toString('utf-8');

      // Should contain CMYK fill/stroke operators (k/K)
      expect(outputStr).toContain('k');
      expect(outputStr).toContain('K');
      // Should not fall back to RGB operators (rg/RG)
      expect(outputStr).not.toMatch(/\srg\s/);
    });

    it('embeds fonts inside the PDF stream instead of just referencing them', async () => {
      const doc = createIRDocument({
        domain: 'print',
        canvas: {
          width: 210,
          height: 297,
          dpi: 300,
          color_space: 'CMYK',
        },
      });

      const renderer = new PDFXRenderer();
      const buffer = await renderer.render(doc);
      const outputStr = buffer.toString('utf-8');

      // Should contain FontDescriptor and FontFile2 (embedded font stream descriptor)
      expect(outputStr).toContain('/FontDescriptor');
      expect(outputStr).toContain('/FontFile2');
    });
  });

  describe('Color Space Conversion (sRGB -> CMYK)', () => {
    it('performs mathematical sRGB -> CMYK conversion correctly', () => {
      // White color (255, 255, 255) -> CMYK (0, 0, 0, 0)
      const white = convertSRGBToCMYK(255, 255, 255);
      expect(white).toEqual({ c: 0, m: 0, y: 0, k: 0 });

      // Black color (0, 0, 0) -> CMYK (0, 0, 0, 1)
      const black = convertSRGBToCMYK(0, 0, 0);
      expect(black).toEqual({ c: 0, m: 0, y: 0, k: 1 });

      // Red color (255, 0, 0) -> CMYK (0, 1, 1, 0)
      const red = convertSRGBToCMYK(255, 0, 0);
      expect(red).toEqual({ c: 0, m: 1, y: 1, k: 0 });
    });

    it('supports ICC profile simulation (e.g. Coated_Fogra39)', () => {
      const cmyk = convertSRGBToCMYK(255, 0, 0, 'Coated_Fogra39.icc');
      // Fogra39 conversion simulates slightly different scale
      expect(cmyk.c).toBeCloseTo(0, 2);
      expect(cmyk.m).toBeCloseTo(0.95, 2);
    });
  });

  describe('DXF Exporter', () => {
    it('generates a valid DXF dieline drawing exchange file structure', () => {
      const exporter = new DXFExporter();
      const output = exporter.exportDieline('M 0 0 L 100 100');

      expect(output).toContain('SECTION');
      expect(output).toContain('HEADER');
      expect(output).toContain('ENTITIES');
      expect(output).toContain('LINE');
      expect(output).toContain('EOF');
    });
  });
});
