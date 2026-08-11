import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Local-only Gemma 4 E2B WebGPU gate. Not run in GitHub Actions.
 * Chromium on Apple Silicon: enable WebGPU via feature flags.
 */
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.e2e\.ts/,
  timeout: 45 * 60 * 1000,
  expect: { timeout: 120_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    headless: true,
    trace: 'off',
    video: 'off',
    baseURL: 'http://127.0.0.1:4177',
    launchOptions: {
      args: [
        '--enable-unsafe-webgpu',
        '--enable-features=Vulkan,UseSkiaRenderer',
        '--ignore-gpu-blocklist',
        '--use-angle=metal',
      ],
    },
  },
  webServer: {
    command: 'node serve-harness.mjs',
    cwd: path.dirname(fileURLToPath(import.meta.url)),
    url: 'http://127.0.0.1:4177/harness.html',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
