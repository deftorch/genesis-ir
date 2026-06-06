import { IRDocument, IRRLVRRSignals, IRRLVRRResult, IRRLVRRConfig, calculateContrastRatio, checkWCAGCompliance } from '@genesis/types';
import { validateHIR } from '@genesis/schema';

const DEFAULT_CONFIG: IRRLVRRConfig = {
  weights: {
    schema: 0.40,
    brand: 0.25,
    render: 0.20,
    budget: 0.10,
    semantic: 0.05,
  },
};

/**
 * RLVRR (Reinforcement Learning Visual-Rational Representation) evaluator.
 * Implements gated sequential evaluation with short-circuiting (Keputusan #39).
 * @stability BETA
 */
export function evaluateRLVRR(
  output: IRDocument,
  reference: IRDocument,
  config: IRRLVRRConfig = DEFAULT_CONFIG
): IRRLVRRResult {
  // Sinyal 1: Schema Compliance (Gate Utama, Weight: 0.40)
  const validationResult = validateHIR(output);
  const s1_passed = validationResult.valid;
  const s1_score = s1_passed ? 1.0 : 0.0;

  const signals: IRRLVRRSignals = {
    signal_1_schema_compliance: {
      passed: s1_passed,
      score: s1_score,
      gate: true,
    },
    signal_quality: 'HIGH_NEGATIVE',
    collection: {
      method: 'passive_observation',
      collected_at: new Date().toISOString(),
    },
  };

  // Sinyal 1 fails -> short-circuit immediately
  if (!s1_passed) {
    return {
      signals,
      total_reward: 0.0,
      quality: 'HIGH_NEGATIVE',
    };
  }

  // Sinyal 2: Brand Guard (Weight: 0.25)
  // Check if output violates brand profile in style context compared to reference
  const violations: string[] = [];
  if (output.style_context?.theme_tokens && reference.style_context?.theme_tokens) {
    const outTokens = output.style_context.theme_tokens;
    const refTokens = reference.style_context.theme_tokens;
    
    // 1. Check key presence
    if (refTokens.colors && outTokens.colors) {
      for (const key of Object.keys(refTokens.colors)) {
        if (!(key in outTokens.colors)) {
          violations.push(`Missing brand color token: ${key}`);
        }
      }
    }

    // 2. Palette validation: Check if output colors match reference colors
    if (outTokens.colors && refTokens.colors) {
      for (const [key, value] of Object.entries(outTokens.colors)) {
        const refValue = refTokens.colors[key];
        if (refValue && JSON.stringify(refValue) !== JSON.stringify(value)) {
          violations.push(`Invalid color for brand token colors.${key}: expected ${JSON.stringify(refValue)}, got ${JSON.stringify(value)}`);
        }
      }
    }

    // 3. Contrast check: check WCAG AA (4.5:1) for text/primary against background
    if (outTokens.colors) {
      const fgColor = outTokens.colors['text'] || outTokens.colors['primary'];
      const bgColor = outTokens.colors['background'];
      if (typeof fgColor === 'string' && typeof bgColor === 'string' && fgColor.startsWith('#') && bgColor.startsWith('#')) {
        const ratio = calculateContrastRatio(fgColor, bgColor);
        const compliant = checkWCAGCompliance(ratio, 'AA', 12);
        if (!compliant) {
          violations.push(`WCAG contrast compliance failed: contrast between text (${fgColor}) and background (${bgColor}) is ${ratio.toFixed(2)}:1 (minimum 4.5:1 required)`);
        }
      }
    }
  }
  const s2_passed = violations.length === 0;
  const s2_score = s2_passed ? 1.0 : Math.max(0.0, 1.0 - violations.length * 0.2);

  signals.signal_2_brand_guard = {
    passed: s2_passed,
    score: s2_score,
    violations,
    requires: 'signal_1',
  };

  if (!s2_passed) {
    return {
      signals,
      total_reward: config.weights.schema * s1_score, // keep accumulated score but stop evaluating further
      quality: 'AMBIGUOUS',
    };
  }

  // Sinyal 3: Render Error Rate (Weight: 0.20)
  // Target: error rate < 0.02
  const observability = output.observability as Record<string, unknown> | undefined;
  const auditLog = observability?.audit_log as Array<Record<string, unknown>> | undefined;
  const auditErrorsCount = auditLog?.filter(l => l.severity === 'error' || l.severity === 'critical')?.length || 0;
  
  // Calculate exceptions and out-of-bounds metrics based on computed_layout
  const computedLayout = observability?.computed_layout as Record<string, { x: number, y: number, width: number, height: number }> | undefined;
  const canvasRecord = output.canvas as unknown as Record<string, unknown> | undefined;
  const canvasWidth = (canvasRecord?.width as number) || 1920;
  const canvasHeight = (canvasRecord?.height as number) || 1080;
  
  let outOfBoundsCount = 0;
  const totalNodes = output.objects?.length || 0;

  if (computedLayout) {
    for (const layout of Object.values(computedLayout)) {
      if (layout.x < 0 || layout.y < 0 || layout.x + layout.width > canvasWidth || layout.y + layout.height > canvasHeight) {
        outOfBoundsCount++;
      }
    }
  }

  const geometry_error_rate = totalNodes > 0 ? outOfBoundsCount / totalNodes : 0.0;
  const error_rate = Math.min(1.0, geometry_error_rate + (auditErrorsCount * 0.1));
  const s3_passed = error_rate < 0.05;
  const s3_score = s3_passed ? 1.0 : Math.max(0.0, 1.0 - error_rate * 5);

  signals.signal_3_render_error_rate = {
    error_rate,
    score: s3_score,
    requires: 'signal_1+2',
  };

  if (!s3_passed) {
    return {
      signals,
      total_reward: (config.weights.schema * s1_score) + (config.weights.brand * s2_score),
      quality: 'AMBIGUOUS',
    };
  }

  // Sinyal 4: Budget Accuracy (Weight: 0.10)
  // Accuracy = 1 - difference ratio
  let s4_score = 0.5;
  let est = 0;
  let act = 0;
  let accuracy = 0.0;

  if (output.observability?.compilation_profile && output.observability?.metrics) {
    est = output.observability.compilation_profile.resolved_styles_count ?? 100;
    act = output.observability.metrics.token_resolutions ?? 100;
    accuracy = Math.max(0.0, 1.0 - Math.abs(est - act) / Math.max(est, act));
    s4_score = accuracy;
  } else {
    // Penalty if observability is missing
    s4_score = 0.5;
  }

  signals.signal_4_budget_accuracy = {
    estimated_tokens: est,
    actual_tokens: act,
    accuracy,
    score: s4_score,
    requires: 'signal_1+2+3',
  };

  // Sinyal 5: Semantic Quality (Weight: 0.05)
  // High quality when text size/contrast/semantic checks pass.
  let s5_score = 0.5;
  const accessibilityScore = (observability?.accessibility_audit as Record<string, unknown>)?.score as number | undefined;
  
  if (accessibilityScore !== undefined) {
    s5_score = accessibilityScore / 100.0;
  } else {
    // Check WCAG contrast ratio and semantic hierarchy
    let hasSemanticTags = false;
    let hasGoodContrast = true;
    let textNodesCount = 0;
    
    // Simple hierarchy validation (e.g. h1 -> h2)
    const headers: string[] = [];
    if (output.objects) {
      for (const node of output.objects) {
        if (node.type === 'text') {
          textNodesCount++;
          const semanticTag = (node.content as unknown as Record<string, unknown>)?.semantic_tag as string | undefined;
          if (semanticTag) {
            hasSemanticTags = true;
            if (semanticTag.startsWith('h')) {
              headers.push(semanticTag);
            }
          }
          
          // Contrast validation (simplified)
          const color = (node.style as Record<string, unknown>)?.color as string | undefined;
          const bgTokens = output.style_context?.theme_tokens as Record<string, unknown> | undefined;
          const bgColors = bgTokens?.colors as Record<string, string> | undefined;
          const bg = bgColors?.background;
          
          if (color && bg && color.startsWith('#') && bg.startsWith('#')) {
            const ratio = calculateContrastRatio(color, bg);
            if (!checkWCAGCompliance(ratio, 'AA', 14)) {
              hasGoodContrast = false;
            }
          }
        }
      }
    }
    
    let hierarchyValid = true;
    if (headers.length > 0) {
      // Validate h1 comes before h2, etc. (simplified check)
      let prevLevel = parseInt(headers[0].replace('h', ''));
      for (let i = 1; i < headers.length; i++) {
        const level = parseInt(headers[i].replace('h', ''));
        if (level > prevLevel + 1) { // Skipped a level (e.g., h1 -> h3)
          hierarchyValid = false;
        }
        prevLevel = level;
      }
    }
    
    if (textNodesCount === 0) {
      s5_score = 0.8; // Acceptable if no text
    } else {
      s5_score = 0.0;
      if (hasSemanticTags) s5_score += 0.4;
      if (hierarchyValid) s5_score += 0.3;
      if (hasGoodContrast) s5_score += 0.3;
    }
  }

  signals.signal_5_semantic_quality = {
    score: s5_score,
    criteria: ['contrast', 'readability'],
    requires: 'signal_1+2+3+4',
  };


  // Total reward calculation
  const total_reward =
    (config.weights.schema * s1_score) +
    (config.weights.brand * s2_score) +
    (config.weights.render * s3_score) +
    (config.weights.budget * s4_score) +
    (config.weights.semantic * s5_score);

  signals.total_reward = total_reward;

  const quality = total_reward >= 0.85 ? 'HIGH_POSITIVE' : total_reward >= 0.5 ? 'EXPLICIT' : 'AMBIGUOUS';
  signals.signal_quality = quality;

  return {
    signals,
    total_reward,
    quality,
  };
}
