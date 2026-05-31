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

/**
 * Parse a hex color string to sRGB components.
 */
function parseHexColor(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
  }
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Calculate relative luminance of a color according to WCAG 2.0.
 * @stability STABLE
 */
export function getRelativeLuminance(color: string): number {
  const { r, g, b } = parseHexColor(color);
  const rs = r / 255;
  const gs = g / 255;
  const bs = b / 255;

  const R = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const G = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const B = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculate contrast ratio between two colors according to WCAG 2.0.
 * @stability STABLE
 */
export function calculateContrastRatio(fg: string, bg: string): number {
  const l1 = getRelativeLuminance(fg);
  const l2 = getRelativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio complies with WCAG standards for level A, AA, or AAA.
 * @stability STABLE
 */
export function checkWCAGCompliance(ratio: number, level: 'A' | 'AA' | 'AAA', fontSize: number): boolean {
  const isLargeText = fontSize >= 18;
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7.0;
  }
  if (level === 'AA') {
    return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
  }
  // Level A
  return ratio >= 3.0;
}
