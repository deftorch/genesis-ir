import { describe, it, expect } from 'vitest';
import { buildAssetURI, parseAssetURI } from '../assets.js';

describe('assets helper functions', () => {
  it('should format asset ID as asset:// URI', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(buildAssetURI(id)).toBe(`asset://${id}`);
    expect(buildAssetURI(`asset://${id}`)).toBe(`asset://${id}`);
  });

  it('should parse asset ID from asset:// URI', () => {
    const id = '123e4567-e89b-12d3-a456-426614174000';
    expect(parseAssetURI(`asset://${id}`)).toBe(id);
    expect(parseAssetURI(`http://example.com/asset`)).toBeNull();
  });
});
