import { IRDocument } from '@genesis/types';
import { ValidationResult, ValidationError, TIER_CONSTRAINTS, getTreeDepth, hasExternalAssets, hasPlugins } from './types.js';

/**
 * Validate tier limits for document size and capabilities.
 * @stability BETA
 */
export function validateTierLimits(doc: IRDocument): ValidationResult {
  const errors: ValidationError[] = [];
  const tier = doc.meta?.tier;

  if (tier !== 'nano' && tier !== 'core' && tier !== 'full') {
    return {
      valid: false,
      errors: [{ path: 'meta.tier', message: `Invalid document tier: ${tier}`, keyword: 'tier' }],
    };
  }

  const constraints = TIER_CONSTRAINTS[tier];
  const nodeCount = doc.objects ? doc.objects.length : 0;
  const depth = doc.objects ? getTreeDepth(doc.objects) : 0;

  if (nodeCount > constraints.maxNodes) {
    errors.push({
      path: 'objects',
      message: `Node count ${nodeCount} exceeds max node limit of ${constraints.maxNodes} for tier ${tier}`,
      keyword: 'node-limit',
    });
  }

  if (depth > constraints.maxTreeDepth) {
    errors.push({
      path: 'objects',
      message: `Tree depth ${depth} exceeds max tree depth of ${constraints.maxTreeDepth} for tier ${tier}`,
      keyword: 'tree-depth-limit',
    });
  }

  if (!constraints.allowExternalAssets && hasExternalAssets(doc.objects)) {
    errors.push({
      path: 'objects',
      message: `Document of tier ${tier} contains external asset references, which are not allowed`,
      keyword: 'external-assets-limit',
    });
  }

  if (!constraints.allowPlugins && hasPlugins(doc)) {
    errors.push({
      path: '',
      message: `Document of tier ${tier} contains plugin references, which are not allowed`,
      keyword: 'plugins-limit',
    });
  }

  return { valid: errors.length === 0, errors };
}
