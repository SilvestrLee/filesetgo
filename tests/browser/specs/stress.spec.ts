import { expect, test } from '@playwright/test';
import { fixturePath, gotoApp, selectLogoPackBackgroundMode, selectMode, setSimpleRequirement, uploadFile, waitForStatus } from '../helpers/app';

const ITERATIONS = 5;

/**
 * Same-session controlled resource-lifecycle stress test (directive §50 /
 * Product Office gap §3). One page/session, repeated real cycles, observable
 * state transitions only — no arbitrary sleeps, no synthetic benchmarking.
 *
 * Blob URL lifecycle is instrumented via `page.addInitScript()` wrapping
 * `URL.createObjectURL`/`revokeObjectURL` *before* the app's own JS runs, so
 * every URL the app creates is tracked without touching production code.
 */
async function installBlobUrlTracker(page: import('@playwright/test').Page): Promise<void> {
  await page.addInitScript(() => {
    const live = new Set<string>();
    const originalCreate = URL.createObjectURL.bind(URL);
    const originalRevoke = URL.revokeObjectURL.bind(URL);

    URL.createObjectURL = (obj: Blob | MediaSource) => {
      const url = originalCreate(obj);
      live.add(url);
      return url;
    };
    URL.revokeObjectURL = (url: string) => {
      live.delete(url);
      originalRevoke(url);
    };

    (window as unknown as { __fsgLiveBlobUrlCount(): number }).__fsgLiveBlobUrlCount = () => live.size;
  });
}

function liveBlobUrlCount(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __fsgLiveBlobUrlCount(): number }).__fsgLiveBlobUrlCount());
}

test.describe('Same-session resource-lifecycle stress test (directive §50)', () => {
  test(`${ITERATIONS} repeated Quick Fit cycles in one session leave no stuck state or Blob URL leak`, async ({ page }) => {
    await installBlobUrlTracker(page);
    await gotoApp(page);

    for (let i = 0; i < ITERATIONS; i += 1) {
      await uploadFile(page, i % 2 === 0 ? 'sample.jpg' : 'sample.png');
      await waitForStatus(page, 'ready');
      await setSimpleRequirement(page);
      await page.locator('#process-button').click();
      await waitForStatus(page, 'success', 30_000);

      // Exactly one result is visible — no accumulating visible result state.
      await expect(page.locator('#result-content')).toBeVisible();
      await expect(page.locator('#download-link')).toHaveAttribute('href', /^blob:/);

      await page.locator('#reset-button').click();
      await waitForStatus(page, 'idle');
      await expect(page.locator('#result-content')).toBeHidden();
    }

    // No unrecovered processing lock: the tool is still fully usable.
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');

    // The reset button explicitly revokes the previous result's Blob URL
    // (releaseOriginalFileUrl/download-link cleanup) — after N full
    // select→process→reset cycles, no more than a small constant number of
    // Blob URLs should still be alive (the current, not-yet-reset source
    // preview from the final upload above), not a count that grows with N.
    const finalLiveCount = await liveBlobUrlCount(page);
    expect(finalLiveCount).toBeLessThanOrEqual(2);
  });

  test(`${ITERATIONS} repeated Logo Pack generation cycles in one session leave no stuck state or accumulating asset list`, async ({ page }) => {
    await installBlobUrlTracker(page);
    await gotoApp(page);
    await selectMode(page, 'logo-pack');

    for (let i = 0; i < ITERATIONS; i += 1) {
      await uploadFile(page, 'good-logo.png');
      await waitForStatus(page, 'ready');
      await selectLogoPackBackgroundMode(page, 'original');

      await page.locator('#logo-pack-create-button').click();
      await waitForStatus(page, 'success', 30_000);

      // Exactly seven assets every time — never accumulating across cycles.
      await expect(page.locator('#logo-pack-assets li')).toHaveCount(7);

      await page.locator('#reset-button').click();
      await waitForStatus(page, 'idle');
      await expect(page.locator('#logo-pack-result')).toBeHidden();
      await selectMode(page, 'logo-pack');
    }

    const finalLiveCount = await liveBlobUrlCount(page);
    expect(finalLiveCount).toBeLessThanOrEqual(1);
  });

  test('source replacement cycles and a cancellation/restart cycle within one session recover correctly each time', async ({ page }) => {
    await gotoApp(page);

    // Repeated source-replacement cycles (select A, then B, confirm B wins).
    for (let i = 0; i < ITERATIONS; i += 1) {
      const input = page.locator('#source-file');
      await input.setInputFiles(fixturePath('sample.jpg'));
      await input.setInputFiles(fixturePath('sample.png'));
      await waitForStatus(page, 'ready');
      await expect(page.locator('#source-format')).toHaveText(/png/i);
    }

    // One cancellation/restart cycle, then confirm the tool still completes
    // a normal job afterward (no unrecovered processing lock).
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await setSimpleRequirement(page);
    await page.locator('#process-button').click();
    await waitForStatus(page, 'processing');
    await page.locator('#cancel-button').click();
    await waitForStatus(page, 'cancelled', 15_000);

    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);
  });

  test(`${ITERATIONS} repeated Transparent Logo Pack cycles (preview → package → reset, plus a strength change, an Original-mode cycle, and a cancel/retry) leave no stuck state`, async ({ page }) => {
    // Real, cumulative processing work (5× preview+strength-change+package,
    // plus an Original-mode cycle and a large.jpg cancel/retry cycle)
    // genuinely exceeds Playwright's default 30s per-test timeout.
    test.setTimeout(120_000);
    await installBlobUrlTracker(page);
    await gotoApp(page);
    await selectMode(page, 'logo-pack');

    for (let i = 0; i < ITERATIONS; i += 1) {
      await uploadFile(page, 'flat-logo.png');
      await waitForStatus(page, 'ready');
      await selectLogoPackBackgroundMode(page, 'transparent');
      await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });

      // A strength change replaces the preview, not accumulates a second one.
      await page.locator('#logo-pack-strength-gentle').check({ force: true });
      await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });

      await page.locator('#logo-pack-create-button').click();
      await waitForStatus(page, 'success', 30_000);
      await expect(page.locator('#logo-pack-assets li')).toHaveCount(7);

      await page.locator('#reset-button').click();
      await waitForStatus(page, 'idle');
      await expect(page.locator('#logo-pack-result')).toBeHidden();
      await expect(page.locator('#logo-pack-preview')).toBeHidden();
      await selectMode(page, 'logo-pack');
    }

    // One Original-mode cycle — the simpler single-stage path must still work
    // interleaved with repeated Transparent-mode cycles.
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');
    await selectLogoPackBackgroundMode(page, 'original');
    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'success', 30_000);
    await page.locator('#reset-button').click();
    await waitForStatus(page, 'idle');
    await selectMode(page, 'logo-pack');

    // One cancel/retry cycle against the preview-preparation stage.
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectLogoPackBackgroundMode(page, 'transparent');
    // A more generous action timeout than the dedicated cancellation spec
    // uses: by this point in the test, several prior heavy jobs have
    // already run in the same session/worker, and real CI hardware
    // (observed directly on a WebKit GitHub Actions run) can need more
    // than 10s for the cancel control to become actionable here.
    await page.locator('#cancel-button').click({ timeout: 20_000 });
    await waitForStatus(page, 'cancelled', 15_000);
    // Real "Try again" button — clicking an already-selected radio fires no
    // change event in any real browser.
    await page.locator('#logo-pack-retry-preview-button').click();
    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 30_000 });

    // No unbounded accumulation across the whole sequence above.
    const finalLiveCount = await liveBlobUrlCount(page);
    expect(finalLiveCount).toBeLessThanOrEqual(2);
  });
});
