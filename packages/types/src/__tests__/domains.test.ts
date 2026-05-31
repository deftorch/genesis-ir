import { describe, it, expect } from 'vitest';
import { isValidIRDomain, ALL_IR_DOMAINS, getModeContext, IRMode } from '../domains.js';

const context = describe;

describe('domains', () => {
  context('ALL_IR_DOMAINS', () => {
    it('should contain exactly 17 domains', () => {
      expect(ALL_IR_DOMAINS.length).toBe(17);
    });
  });

  context('isValidIRDomain', () => {
    it('should return true for valid official domains', () => {
      expect(isValidIRDomain('visual')).toBe(true);
      expect(isValidIRDomain('pixel_art')).toBe(true);
      expect(isValidIRDomain('music_production')).toBe(true);
    });

    it('should return false for non-official domains', () => {
      expect(isValidIRDomain('3d_render')).toBe(false);
      expect(isValidIRDomain('')).toBe(false);
      expect(isValidIRDomain('custom_domain')).toBe(false);
    });
  });

  context('IRMode & IR_MODE_DOMAIN_MAP', () => {
    it('should have valid default modes in mapping', () => {
      const modes: IRMode[] = ['canvas_editor', 'video_editor', 'audio_editor', 'image_editor'];
      for (const mode of modes) {
        const ctx = getModeContext(mode);
        expect(ctx).toBeDefined();
        expect(ctx?.primary_domain).toBeDefined();
        expect(Array.isArray(ctx?.secondary_domains)).toBe(true);
        expect(typeof ctx?.timeline_required).toBe('boolean');
        expect(Array.isArray(ctx?.canvas_types)).toBe(true);
      }
    });

    it('video_editor should require timeline', () => {
      const ctx = getModeContext('video_editor');
      expect(ctx?.timeline_required).toBe(true);
    });

    it('canvas_editor should not require timeline', () => {
      const ctx = getModeContext('canvas_editor');
      expect(ctx?.timeline_required).toBe(false);
    });

    it('should return undefined for unknown modes', () => {
      // @ts-expect-error testing invalid mode
      expect(getModeContext('unknown_mode')).toBeUndefined();
    });
  });
});

