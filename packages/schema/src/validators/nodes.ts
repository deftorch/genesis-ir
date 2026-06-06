import { ValidationResult, ValidationError } from './types.js';
import { isNodeAllowedInDomain } from '@genesis/types';

/**
 * Validate Node registry constraints, geometries, transforms, and content fields.
 * @stability BETA
 */
export function validateNodes(doc: any): ValidationResult {
  const errors: ValidationError[] = [];
  const domain = doc.meta?.domain;
  const nodes = doc.objects;

  if (!nodes || !Array.isArray(nodes)) return { valid: true, errors: [] };

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const basePath = `objects[${i}]`;

    // 1. Tipe node diperbolehkan di domain
    if (domain && node.type) {
      if (!isNodeAllowedInDomain(node.type, domain)) {
        errors.push({
          path: `${basePath}.type`,
          message: `Node type "${node.type}" is not allowed in domain "${domain}"`,
          keyword: 'node-domain-mismatch',
        });
      }
    }

    // 2. IRGeometry validation
    if (node.geometry) {
      const geo = node.geometry;
      if (typeof geo.width === 'number' && geo.width < 0) {
        errors.push({ path: `${basePath}.geometry.width`, message: 'Geometry width cannot be negative', keyword: 'geometry-width-negative' });
      }
      if (typeof geo.height === 'number' && geo.height < 0) {
        errors.push({ path: `${basePath}.geometry.height`, message: 'Geometry height cannot be negative', keyword: 'geometry-height-negative' });
      }
      if (typeof geo.rotation === 'number') {
        if (geo.rotation < 0 || geo.rotation > 360) {
          errors.push({ path: `${basePath}.geometry.rotation`, message: 'Geometry rotation must be between 0 and 360 degrees', keyword: 'geometry-rotation-out-of-bounds' });
        }
      }
    }

    // 3. Node content fields validation
    if (node.content) {
      const content = node.content;
      const kind = content.kind;

      if (kind === 'text') {
        if (content.raw === undefined || content.raw === null || typeof content.raw !== 'string') {
          errors.push({ path: `${basePath}.content.raw`, message: 'Text content raw field is required and must be a string', keyword: 'required-raw' });
        }
      } else if (kind === 'image') {
        if (content.asset_id === undefined || content.asset_id === null) {
          errors.push({ path: `${basePath}.content.asset_id`, message: 'Image content asset_id field is required', keyword: 'required-asset_id' });
        }
        if (content.fit === undefined || content.fit === null) {
          errors.push({ path: `${basePath}.content.fit`, message: 'Image content fit field is required', keyword: 'required-fit' });
        }
      } else if (kind === 'video_clip') {
        if (typeof content.in_point_ms === 'number' && typeof content.out_point_ms === 'number') {
          if (content.in_point_ms > content.out_point_ms) {
            errors.push({ path: `${basePath}.content.in_point_ms`, message: 'Video in_point_ms cannot be greater than out_point_ms', keyword: 'video-timeline-invalid' });
          }
        }
      } else if (kind === 'shape') {
        if (content.shape_type === 'polygon') {
          if (typeof content.sides !== 'number' || content.sides < 3) {
            errors.push({ path: `${basePath}.content.sides`, message: 'Polygon shape must have at least 3 sides', keyword: 'shape-sides-range' });
          }
        }
      } else if (kind === 'svg_path') {
        if (content.d === undefined || content.d === null || content.d === '') {
          errors.push({ path: `${basePath}.content.d`, message: 'SVG path d field cannot be empty', keyword: 'required-d' });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
