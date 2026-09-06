import { expect, test } from '@playwright/test';
import { gotoApp, selectLogoPackBackgroundMode, selectMode, uploadFile, waitForStatus } from '../helpers/app';

test.describe('Cancellation certification (directive §30/§31)', () => {
  test('cancelling a Quick Fit job stops it, and a subsequent job can still complete', async ({ page }) => {
    await gotoApp(page);
    // large.jpg (4800x3200) gives a bounded target-size search a real
    // processing window — the tiny sample fixtures now complete faster than
    // a Cancel click round-trip can reliably land (directive §51/§59).
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');

    await page.locator('#target-size-value').fill('50');
    await page.locator('#target-size-unit').selectOption('KB');
    await page.locator('#process-button').click();

    await waitForStatus(page, 'processing');
    await page.locator('#cancel-button').click();
    await waitForStatus(page, 'cancelled', 15_000);

    // No later success silently replaces the cancellation.
    await page.waitForTimeout(500);
    await expect(page.locator('#status-message')).toHaveAttribute('data-state', 'cancelled');

    // Subsequent processing still works.
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);
  });

  test('cancelling a Logo Pack job stops it, and mode switching afterward remains functional', async ({ page, browserName }) => {
    // Even a large source's 7-asset+ICO+ZIP job can complete before a Cancel
    // click round-trip reliably lands on a fast engine/CPU. Delaying the
    // (real, separately-fetched) ZIP adapter chunk deterministically holds
    // the job open at its archiving stage — a genuine network condition, not
    // an artificial sleep — giving Cancel a guaranteed window without
    // touching product code or timing (directive §59). This route only
    // fires under Chromium's CDP transport: Firefox's Juggler protocol does
    // not route requests originating *inside* a Worker through
    // `page.route()` either (confirmed directly: 0 route hits observed for
    // the exact same worker-scope dynamic import), the identical tooling
    // limitation already documented for `lazy-load.spec.ts`'s three skipped
    // assertions. Firefox's *shared* cancellation architecture is already
    // proven by the Quick Fit cancellation test above (same single-job-slot
    // runtime, same cancellation primitives) — this test still runs the
    // full Logo Pack flow on Firefox, only skipping the specific
    // cancel-mid-flight assertion this tooling gap makes unreliable there.
    const canDelayWorkerRequests = browserName === 'chromium';

    await gotoApp(page);

    if (canDelayWorkerRequests) {
      await page.route('**/zip-adapter-*.js', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        await route.continue();
      });
    }

    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'original');

    await page.locator('#logo-pack-create-button').click();

    if (canDelayWorkerRequests) {
      await waitForStatus(page, 'processing');
      await page.locator('#cancel-button').click({ timeout: 10_000 });
      await waitForStatus(page, 'cancelled', 15_000);
      await expect(page.locator('#logo-pack-result')).toBeHidden();
    } else {
      // Firefox: cannot reliably manufacture a cancel-mid-flight window for
      // this job (see comment above) — let it complete instead so the rest
      // of this test (mode switching, subsequent generation) still runs
      // against a real, non-mocked Firefox session.
      await waitForStatus(page, 'success', 30_000);
    }

    // Mode switching remains functional in both directions, with no stale
    // processing lock left behind, whether the prior job was cancelled
    // (Chromium) or completed (Firefox).
    await selectMode(page, 'quick-fit');
    await expect(page.locator('#requirements-form')).toBeVisible();
    await expect(page.locator('#process-button')).toBeEnabled();

    await selectMode(page, 'guided-fit');
    await expect(page.locator('#guided-fit-panel')).toBeVisible();

    await selectMode(page, 'logo-pack');
    await expect(page.locator('#logo-pack-create-button')).toBeEnabled();

    // Subsequent Logo Pack generation still works.
    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'success', 30_000);
  });

  test('cancelling transparent-preview preparation stops it, and retry succeeds (FSG-006 delta recertification §35)', async ({ page }) => {
    // Two full large.jpg decodes (the cancelled attempt, then the retry)
    // sequentially can exceed Playwright's default 30s per-test timeout
    // under real CPU contention — a genuine processing cost, not a stall.
    test.setTimeout(60_000);
    await gotoApp(page);
    // large.jpg (4800x3200) gives real decode/normalize work a genuine
    // processing window before the bounded 1024px working raster is even
    // reached — the same "real processing window, not an artificial sleep"
    // pattern already established above and in quick-fit cancellation.
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');

    await selectLogoPackBackgroundMode(page, 'transparent');
    await page.locator('#cancel-button').click({ timeout: 10_000 });
    await waitForStatus(page, 'cancelled', 15_000);

    // The cancelled job never later surfaces a stale preview.
    await page.waitForTimeout(500);
    await expect(page.locator('#status-message')).toHaveAttribute('data-state', 'cancelled');
    await expect(page.locator('#logo-pack-preview')).toBeHidden();

    // Retry without a page refresh (directive §22 of FSG-005C) — the real
    // "Try again" button, since clicking an already-selected radio fires no
    // change event in any real browser.
    await expect(page.locator('#logo-pack-retry-preview-button')).toBeVisible();
    await page.locator('#logo-pack-retry-preview-button').click();
    // "Retry succeeds" means the retried job reaches a real, mechanically
    // verified terminal preview state (not necessarily VERIFIED — large.jpg
    // is a decode-time stress fixture, not a quality fixture, and was never
    // asserted to produce a clean background-removal result).
    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('#logo-pack-preview-confidence')).not.toHaveText('');
  });
});
