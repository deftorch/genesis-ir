import { IRDocument, IRNode } from '@genesis/types';

/**
 * RLVRR (Reinforcement Learning from Visual Rendering Rules) Heuristic Evaluator
 * Keputusan #39 Weights: Schema(0.40) -> Brand(0.25) -> Render(0.20) -> Budget(0.10) -> Semantic(0.05)
 * @stability BETA
 */
export class RlvrrEvaluator {
  private static WEIGHTS = {
    schema: 0.40,
    brand: 0.25,
    render: 0.20,
    budget: 0.10,
    semantic: 0.05,
  };

  /**
   * Evaluates an IRNode array against a target document context.
   * Returns a score between 0.0 and 1.0.
   */
  public evaluate(nodes: IRNode[], contextDoc?: IRDocument): number {
    let score = 0;

    // 1. Schema Validation (0.40)
    // Heuristic: Do nodes have correct required fields? Are they within allowed domains?
    const schemaScore = this.evaluateSchema(nodes);
    score += schemaScore * RlvrrEvaluator.WEIGHTS.schema;

    // 2. Brand Compliance (0.25)
    // Heuristic: Do colors and typography match the document's design tokens?
    const brandScore = this.evaluateBrand(nodes, contextDoc);
    score += brandScore * RlvrrEvaluator.WEIGHTS.brand;

    // 3. Render / Layout (0.20)
    // Heuristic: Are there overlapping absolute positioned elements without flex? (Simplified)
    const renderScore = this.evaluateRender(nodes);
    score += renderScore * RlvrrEvaluator.WEIGHTS.render;

    // 4. Budget / Performance (0.10)
    // Heuristic: Are there too many nodes? Max 1000 nodes for optimal performance.
    const budgetScore = this.evaluateBudget(nodes);
    score += budgetScore * RlvrrEvaluator.WEIGHTS.budget;

    // 5. Semantic WCAG (0.05)
    // Heuristic: Do text nodes have sufficient contrast? (Simplified to baseline check)
    const semanticScore = this.evaluateSemantic(nodes);
    score += semanticScore * RlvrrEvaluator.WEIGHTS.semantic;

    return Math.min(Math.max(score, 0), 1.0);
  }

  private evaluateSchema(nodes: IRNode[]): number {
    if (nodes.length === 0) return 0.5;
    let validCount = 0;
    for (const n of nodes) {
      if (n.id && n.type && n.content && n.content.kind) validCount++;
    }
    return validCount / nodes.length;
  }

  private evaluateBrand(nodes: IRNode[], doc?: IRDocument): number {
    // If no brand tokens, baseline score
    if (!doc || !doc.style_context || !doc.style_context.theme_tokens || !doc.style_context.theme_tokens.colors) return 0.8;
    
    const allowedColors = Object.values(doc.style_context.theme_tokens.colors).map((c: any) => c.value.toLowerCase());
    let matchCount = 0;
    let colorCheckCount = 0;

    for (const n of nodes) {
      if (n.style && n.style.fill) {
        colorCheckCount++;
        const fill = (n.style.fill as string).toLowerCase();
        // Allow none, transparent, or a token match
        if (fill === 'none' || fill === 'transparent' || allowedColors.includes(fill)) {
          matchCount++;
        }
      }
    }
    
    return colorCheckCount === 0 ? 1.0 : matchCount / colorCheckCount;
  }

  private evaluateRender(nodes: IRNode[]): number {
    // Punish deeply nested empty groups
    let emptyGroups = 0;
    for (const n of nodes) {
      if (!n.content && (!n.children || n.children.length === 0)) {
        emptyGroups++;
      }
    }
    return emptyGroups > 0 ? 0.5 : 1.0;
  }

  private evaluateBudget(nodes: IRNode[]): number {
    // Penalty if too many nodes
    const MAX_OPTIMAL = 500;
    if (nodes.length <= MAX_OPTIMAL) return 1.0;
    return Math.max(0, 1.0 - ((nodes.length - MAX_OPTIMAL) / MAX_OPTIMAL));
  }

  private evaluateSemantic(nodes: IRNode[]): number {
    let score = 1.0;
    for (const n of nodes) {
      if (n.content?.kind === 'text') {
        const fill = n.style?.fill;
        // Basic heuristic: punish white text on empty (white) background
        if (fill === '#ffffff' || fill === 'white') {
           // We would ideally check parent background, but as a heuristic we deduct a tiny fraction
           score -= 0.05;
        }
      }
    }
    return Math.max(score, 0);
  }
}
