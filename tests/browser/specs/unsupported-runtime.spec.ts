import { expect, test } from '@playwright/test';
import { collectConsoleProblems, gotoApp, setSimpleRequirement, uploadFile, waitForStatus } from '../helpers/app';

/**
 * Real browser-level capability-fallback certification (directive §21 /
 * Product Office gap §4). Uses `page.addInitScript()` to remove a required
 * capability *before* the application's own JS ever runs on the page — a
 * standard Playwright environment-simulation technique, not a
 * production-only test hook. `getRuntimeCapabilities()`
 * (`packages/core/src/runtime/capabilities.ts`) feature-detects
 * `typeof Worker`/`typeof OffscreenCanvas`/`typeof createImageBitmap`
 * directly, so deleting the global is a faithful simulation of a browser
 * that genuinely lacks it — not a mock of FileSetGo's own code.
 */
test.describe('Unsupported-runtime capability fallback (directive §21)', () => {
  test('a browser without Worker shows a clean unsupported-runtime message, no exception, no half-enabled controls', async ({ page }) => {
    const console_ = collectConsoleProblems(page);

    await page.addInitScript(() => {
      // @ts-expect-error deliberately removing a required global to simulate an unsupported runtime
      delete window.Worker;
    });

    await page.goto('/');

    await expect(page.locator('#runtime-unsupported')).toBeVisible();
    await expect(page.locator('#runtime-unsupported')).toHaveText(
      "This browser doesn't support the processing features FileSetGo needs.",
    );

    // The whole tool workspace is hidden, not left in a broken half-enabled
    // state where some controls remain clickable without working.
    await expect(page.locator('#quick-fit-app')).toBeHidden();

    console_.assertClean();
  });

  test('a browser without OffscreenCanvas shows the same clean unsupported-runtime message', async ({ page }) => {
    const console_ = collectConsoleProblems(page);

    await page.addInitScript(() => {
      // @ts-expect-error deliberately removing a required global to simulate an unsupported runtime
      delete window.OffscreenCanvas;
    });

    await page.goto('/');

    await expect(page.locator('#runtime-unsupported')).toBeVisible();
    await expect(page.locator('#quick-fit-app')).toBeHidden();

    console_.assertClean();
  });

  test('a browser without createImageBitmap shows the same clean unsupported-runtime message', async ({ page }) => {
    const console_ = collectConsoleProblems(page);

    await page.addInitScript(() => {
      // @ts-expect-error deliberately removing a required global to simulate an unsupported runtime
      delete window.createImageBitmap;
    });

    await page.goto('/');

    await expect(page.locator('#runtime-unsupported')).toBeVisible();
    await expect(page.locator('#quick-fit-app')).toBeHidden();

    console_.assertClean();
  });

  test('a browser without WebAssembly still runs ordinary JPEG/PNG/WebP processing cleanly (HEIC is the only WASM-dependent path)', async ({ page }) => {
    const console_ = collectConsoleProblems(page);

    await page.addInitScript(() => {
      // @ts-expect-error deliberately removing WebAssembly to simulate a runtime that cannot run the lazy HEIC decoder
      delete window.WebAssembly;
    });

    await gotoApp(page);

    // The core capability contract (Worker/OffscreenCanvas/createImageBitmap)
    // does not require WebAssembly — only the lazy HEIC decoder does — so
    // the main workspace must remain fully usable for supported formats.
    await expect(page.locator('#quick-fit-app')).toBeVisible();

    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await setSimpleRequirement(page);
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    console_.assertClean();
  });
});
