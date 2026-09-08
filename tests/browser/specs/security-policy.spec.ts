import { expect, test } from '@playwright/test';
import { collectConsoleProblems, gotoApp } from '../helpers/app';

const EXPECTED_CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self'",
  "img-src 'self' blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

test.describe('Production security policy (FSG-006R)', () => {
  test('the built homepage emits the exact governed security headers without broad eval permission', async ({ page }) => {
    const console_ = collectConsoleProblems(page);
    const response = await page.goto('/');

    expect(response).not.toBeNull();
    expect(response!.headers()['content-security-policy']).toBe(EXPECTED_CSP);
    expect(response!.headers()['x-content-type-options']).toBe('nosniff');
    expect(response!.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response!.headers()['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(response!.headers()['strict-transport-security']).toBeUndefined();
    expect(EXPECTED_CSP).not.toContain("'unsafe-eval'");

    await expect(page.locator('#quick-fit-app')).toBeVisible();
    console_.assertClean();
  });

  test('the application remains usable under the production policy', async ({ page }) => {
    const console_ = collectConsoleProblems(page);
    await gotoApp(page);
    await expect(page.locator('#mode-tab-guided-fit')).toBeEnabled();
    await expect(page.locator('#mode-tab-logo-pack')).toBeEnabled();

    await page.locator('.fsg-theme > summary').click();
    await page.getByRole('button', { name: /Dark Always dark/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    console_.assertClean();
  });

  test('content and legal surfaces have no CSP console violations', async ({ page }) => {
    const console_ = collectConsoleProblems(page);

    for (const path of ['/compress-image-for-website', '/convert-image-to-webp', '/privacy', '/terms']) {
      await page.goto(path);
    }

    console_.assertClean();
  });
});
