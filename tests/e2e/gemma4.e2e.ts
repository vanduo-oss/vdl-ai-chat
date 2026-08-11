import { test, expect } from '@playwright/test';

test.describe('Gemma 4 E2B LiteRT local inference', () => {
  test('loads model and generates non-empty text', async ({ page }) => {
    test.setTimeout(45 * 60 * 1000);

    page.on('console', (msg) => console.log(`[browser:${msg.type()}]`, msg.text()));
    page.on('pageerror', (err) => console.error('[browser:error]', err));

    await page.goto('/harness.html', { waitUntil: 'domcontentloaded' });

    await page.waitForFunction(
      () => {
        const s = window.__vdlE2E?.status;
        return s === 'done' || s === 'error';
      },
      { timeout: 40 * 60 * 1000 },
    );

    const state = await page.evaluate(() => window.__vdlE2E);
    if (state.status === 'error') {
      throw new Error(`e2e failed: ${state.error}`);
    }

    expect(state.webgpu).toBe(true);
    expect(String(state.reply || '').trim().length).toBeGreaterThan(0);
  });
});
