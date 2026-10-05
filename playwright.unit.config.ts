import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: /payment-integrity\.spec\.ts/,
  workers: 1,
  retries: 0,
  reporter: 'list',
});
