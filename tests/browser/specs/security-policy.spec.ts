import { expect, test } from '@playwright/test';
import { collectConsoleProblems, gotoApp } from '../helpers/app';

// `style-src` carries a fresh, unguessable per-request nonce (FSG-007
// closeout §3 — `@fonts()`'s self-hosted Instrument Sans `@font-face` rules
// are the one legitimate inline `<style>` block, tagged via
// `Vite::useCspNonce()` rather than a blanket `'unsafe-inline'`), so the
// full header can no longer be a single fixed string; every other
// directive remains byte-identical and is asserted exactly.
const EXPECTED_CSP_PREFIX = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'nonce-";
const EXPECTED_CSP_SUFFIX = [
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
    const csp = response!.headers()['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp.startsWith(EXPECTED_CSP_PREFIX)).toBe(true);
    expect(csp.endsWith(`'; ${EXPECTED_CSP_SUFFIX}`)).toBe(true);
    // The nonce itself: whatever sits between the opening `'nonce-` and the
    // closing `'` must be a real, non-empty, unguessable-looking token —
    // not a static placeholder and not `'unsafe-inline'`.
    const nonce = csp.slice(EXPECTED_CSP_PREFIX.length, csp.indexOf("'", EXPECTED_CSP_PREFIX.length));
    expect(nonce.length).toBeGreaterThanOrEqual(16);
    expect(csp).not.toContain('unsafe-inline');
    expect(response!.headers()['x-content-type-options']).toBe('nosniff');
    expect(response!.headers()['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response!.headers()['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(response!.headers()['strict-transport-security']).toBeUndefined();
    expect(csp).not.toContain("'unsafe-eval'");

    await expect(page.locator('#quick-fit-app')).toBeVisible();
    console_.assertClean();
  });

  test('the style-src nonce changes on every request (not a fixed value)', async ({ page }) => {
    const first = await page.goto('/');
    const firstNonceCsp = first!.headers()['content-security-policy'];
    const second = await page.goto('/');
    const secondNonceCsp = second!.headers()['content-security-policy'];

    expect(firstNonceCsp).not.toBe(secondNonceCsp);
  });

  test('the application remains usable under the production policy', async ({ page }) => {
    const console_ = collectConsoleProblems(page);
    await gotoApp(page);
    await expect(page.locator('#mode-tab-guided-fit')).toBeEnabled();
    await expect(page.locator('#mode-tab-logo-pack')).toBeEnabled();

    await page.locator('[data-theme-toggle]').click();
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
