export * from './validators/types.js';
export * from './validators/ajv.js';
export * from './validators/canvas.js';
export * from './validators/nodes.js';
export * from './validators/tier.js';
export * from './validators/domains.js';
export * from './validators/advanced.js';

import { ajvValidateDocument } from './validators/ajv.js';
import { validateCanvas } from './validators/canvas.js';
import { validateNodes } from './validators/nodes.js';
import { validateTierLimits } from './validators/tier.js';
import {
  validatePhysicalAndPrint,
  validateDomainCompatibilities,
  validate3DViewportAndNodes,
  validateDocumentDomain,
  validateDiagramDomain,
  validateMusicDomain,
  validatePixelDomain,
  validateFontDomain,
  validateMockupDomain,
} from './validators/domains.js';
import {
  validateTimeline,
  validateDataBinding,
  validateInteractionModel,
} from './validators/advanced.js';
import { ValidationResult, ValidationError, SemanticValidationResult, getTreeDepth } from './validators/types.js';

/**
 * Validate HIR Document (Pass 1)
 * @stability BETA
 */
export function validateHIR(doc: unknown): ValidationResult {
  const schemaResult = ajvValidateDocument(doc);
  const errors: ValidationError[] = (ajvValidateDocument.errors || []).map((err: any) => ({
    path: err.instancePath || '',
    message: err.message || 'unknown validation error',
    keyword: err.keyword,
  }));

  if (!schemaResult) {
    return { valid: false, errors };
  }

  const canvasResult = validateCanvas(doc);
  if (!canvasResult.valid) errors.push(...canvasResult.errors);

  const nodesResult = validateNodes(doc);
  if (!nodesResult.valid) errors.push(...nodesResult.errors);

  const tierResult = validateTierLimits(doc as any);
  if (!tierResult.valid) errors.push(...tierResult.errors);

  const timelineResult = validateTimeline(doc);
  if (!timelineResult.valid) errors.push(...timelineResult.errors);

  const dataBindingResult = validateDataBinding(doc);
  if (!dataBindingResult.valid) errors.push(...dataBindingResult.errors);

  const interactionResult = validateInteractionModel(doc);
  if (!interactionResult.valid) errors.push(...interactionResult.errors);

  const threedResult = validate3DViewportAndNodes(doc);
  if (!threedResult.valid) errors.push(...threedResult.errors);

  const warnings: ValidationError[] = [];

  const physicalResult = validatePhysicalAndPrint(doc);
  if (!physicalResult.valid) errors.push(...physicalResult.errors);
  if (physicalResult.warnings) warnings.push(...physicalResult.warnings);

  const compatResult = validateDomainCompatibilities(doc);
  if (!compatResult.valid) errors.push(...compatResult.errors);

  const docDomainResult = validateDocumentDomain(doc);
  if (!docDomainResult.valid) errors.push(...docDomainResult.errors);

  const diagramResult = validateDiagramDomain(doc);
  if (!diagramResult.valid) errors.push(...diagramResult.errors);
  if (diagramResult.warnings) warnings.push(...diagramResult.warnings);

  const musicResult = validateMusicDomain(doc);
  if (!musicResult.valid) errors.push(...musicResult.errors);

  const pixelResult = validatePixelDomain(doc);
  if (!pixelResult.valid) errors.push(...pixelResult.errors);

  const fontResult = validateFontDomain(doc);
  if (!fontResult.valid) errors.push(...fontResult.errors);

  const mockupResult = validateMockupDomain(doc);
  if (!mockupResult.valid) errors.push(...mockupResult.errors);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Run Pass 3: Semantic Validation Engine
 * @stability BETA
 */
export function runPass3(doc: any): SemanticValidationResult {
  const errors: ValidationError[] = [];
  const domain = doc.meta?.domain;

  // 1. Validate tree depth against max_tree_depth limit
  const maxTreeDepth = doc.meta?.max_tree_depth || 32;
  const nodes = doc.objects || [];
  const currentDepth = getTreeDepth(nodes);
  if (currentDepth > maxTreeDepth) {
    errors.push({
      path: 'objects',
      message: `Tree depth ${currentDepth} exceeds maximum allowed tree depth of ${maxTreeDepth}`,
      keyword: 'tree-depth-exceeded',
    });
  }

  // 2. Domain coverage matrix validation
  if (domain) {
    const physicalRequiredDomains = ['print', 'signage', 'packaging'];
    if (physicalRequiredDomains.includes(domain)) {
      if (!doc.physical) {
        errors.push({ path: 'physical', message: `Physical spec is mandatory for domain "${domain}"`, keyword: 'missing-physical-spec' });
      }
    }

    const timelineRequiredDomains = ['video', 'audio', 'motion', 'music_production', 'pixel_art'];
    if (timelineRequiredDomains.includes(domain)) {
      if (!doc.timeline) {
        errors.push({ path: 'timeline', message: `Timeline is mandatory for domain "${domain}"`, keyword: 'missing-timeline' });
      }
    }

    const canvas = doc.canvas;
    if (canvas) {
      if (domain === 'audio' || domain === 'music_production') {
        if (canvas.sample_rate === undefined) {
          errors.push({ path: 'canvas', message: `Canvas type must be IRAudioCanvas for domain "${domain}"`, keyword: 'invalid-canvas-type' });
        }
      } else if (domain === '3d') {
        if (canvas.width !== undefined || canvas.sample_rate !== undefined) {
          errors.push({ path: 'canvas', message: `Canvas type must be IR3DViewport for domain "3d"`, keyword: 'invalid-canvas-type' });
        }
      } else {
        if (canvas.width === undefined) {
          errors.push({ path: 'canvas', message: `Canvas type must be IRCanvas for domain "${domain}"`, keyword: 'invalid-canvas-type' });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
