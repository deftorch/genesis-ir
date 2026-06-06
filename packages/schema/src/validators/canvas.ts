import { ValidationResult, ValidationError } from './types.js';

/**
 * Validate Canvas constraints for digital, print, music domains and context structures.
 * @stability BETA
 */
export function validateCanvas(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const canvas = doc.canvas;
  const domain = doc.meta?.domain;

  if (!canvas) {
    return {
      valid: false,
      errors: [{ path: 'canvas', message: 'Canvas is required', keyword: 'required' }],
    };
  }

  // Width and height validation for standard canvas
  if ('width' in canvas && canvas.width <= 0) {
    errors.push({ path: 'canvas.width', message: 'Canvas width must be greater than 0', keyword: 'min-width' });
  }
  if ('height' in canvas && canvas.height <= 0) {
    errors.push({ path: 'canvas.height', message: 'Canvas height must be greater than 0', keyword: 'min-height' });
  }

  // Print domain requires dpi
  if (domain === 'print') {
    if (!('dpi' in canvas) || typeof canvas.dpi !== 'number' || canvas.dpi <= 0) {
      errors.push({
        path: 'canvas.dpi',
        message: 'Print domain documents require a positive dpi field on the canvas',
        keyword: 'required-dpi',
      });
    }
  }

  // Music production/Audio domain and canvas_type === 'audio' validation
  const activeDomains = doc.meta?.active_domains || [];
  const isAudio = canvas.canvas_type === 'audio' || domain === 'music_production' || domain === 'audio';

  if (isAudio) {
    if (!('sample_rate' in canvas) || typeof canvas.sample_rate !== 'number') {
      errors.push({
        path: 'canvas.sample_rate',
        message: 'Audio canvas requires a numerical sample_rate',
        keyword: 'required-sample_rate',
      });
    } else {
      const allowedRates = [44100, 48000, 96000];
      if (!allowedRates.includes(canvas.sample_rate)) {
        errors.push({
          path: 'canvas.sample_rate',
          message: 'Audio canvas sample_rate must be 44100, 48000, or 96000 Hz',
          keyword: 'invalid-sample-rate',
        });
      }
    }

    if (domain === 'music_production' || activeDomains.includes('music_production')) {
      if (!('bit_depth' in canvas) || canvas.bit_depth === undefined) {
        errors.push({
          path: 'canvas.bit_depth',
          message: 'Music production domain documents require a bit_depth field on the canvas',
          keyword: 'required-bit-depth',
        });
      } else {
        const allowedDepths = [16, 24, 32];
        if (!allowedDepths.includes(canvas.bit_depth)) {
          errors.push({
            path: 'canvas.bit_depth',
            message: 'Music production domain bit_depth must be 16, 24, or 32',
            keyword: 'invalid-bit-depth',
          });
        }
      }
    }
  }

  // Canvas Mode Context Validation
  if (canvas.context) {
    const ctx = canvas.context;
    if (typeof ctx !== 'object') {
      errors.push({ path: 'canvas.context', message: 'Canvas context must be an object', keyword: 'type' });
    } else {
      const type = ctx.type;
      const validTypes = ['pixel', 'multipage', 'music', 'font', 'diagram', '3d', 'mockup'];
      if (!validTypes.includes(type)) {
        errors.push({
          path: 'canvas.context.type',
          message: `Invalid canvas context type: ${type}`,
          keyword: 'enum',
        });
      } else {
        if (type === 'pixel') {
          if (typeof ctx.pixel_width !== 'number' || ctx.pixel_width < 8 || ctx.pixel_width > 512) {
            errors.push({
              path: 'canvas.context.pixel_width',
              message: 'pixel_width must be between 8 and 512 for pixel canvas context',
              keyword: 'range',
            });
          }
        } else if (type === 'music') {
          if (typeof ctx.bpm !== 'number' || ctx.bpm < 20 || ctx.bpm > 300) {
            errors.push({
              path: 'canvas.context.bpm',
              message: 'bpm must be between 20 and 300 for music canvas context',
              keyword: 'range',
            });
          }
        } else if (type === 'font') {
          if (ctx.em !== 1000 && ctx.em !== 2048) {
            errors.push({
              path: 'canvas.context.em',
              message: 'em font unit must be exactly 1000 or 2048',
              keyword: 'enum',
            });
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
