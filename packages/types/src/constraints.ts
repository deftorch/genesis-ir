/**
 * @stability STABLE
 */
export interface IRSemanticRule {
  rule_id: string; // e.g. "WCAG-AA-CONTRAST"
  severity: 'info' | 'warning' | 'error';
  evaluate_at: 'pass1' | 'pass3' | 'pass7';
  condition: string;
}

/**
 * @stability STABLE
 */
export interface IRConstraintSet {
  max_nodes: number;
  max_depth: number;
  rules: IRSemanticRule[];
}
