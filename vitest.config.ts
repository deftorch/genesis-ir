import { defineConfig } from 'vitest/config';

/**
 * Global Vitest Configuration
 * Enforces the strict 80% coverage gate.
 * @stability STABLE
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      exclude: ['node_modules/**', 'dist/**', '**/*.test.ts', 'playwright.config.ts', 'tests/**'],
    },
  },
});
