/**
 * @stability STABLE
 */
export type AssetType = 'image' | 'video' | 'audio' | 'font' | '3d_mesh' | 'other';

/**
 * @stability STABLE
 */
export interface IRAssetRef {
  asset_id: string; // UUID v4
  uri: `asset://${string}`; // Decision #34: asset://[UUID]
  type: AssetType;
  checksum: string; // SHA-256 hash of the content
  mime_type: string;
  metadata: {
    dimensions?: { width: number; height: number }; // For image/video
    duration_ms?: number; // For audio/video
    [key: string]: unknown;
  };
}

/**
 * @stability STABLE
 */
export interface IRAssetPool {
  assets: Record<string, IRAssetRef>;
}

/**
 * Build an asset URI from an asset ID.
 * @stability STABLE
 */
export function buildAssetURI(assetId: string): string {
  if (assetId.startsWith('asset://')) return assetId;
  return `asset://${assetId}`;
}

/**
 * Parse an asset ID from an asset URI.
 * @stability STABLE
 */
export function parseAssetURI(uri: string): string | null {
  if (!uri.startsWith('asset://')) return null;
  return uri.slice(8);
}
