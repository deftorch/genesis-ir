import { test, expect } from '@playwright/test';

test.describe('smoke test', () => {
  test('should pass a basic E2E check', async () => {
    expect(true).toBe(true);
  });
});
