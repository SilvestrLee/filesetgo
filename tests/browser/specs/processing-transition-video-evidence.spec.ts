import { expect, test } from '@playwright/test';
import {
  confirmGuidedFitCrop,
  continueGuidedFit,
  gotoApp,
  selectMode,
  uploadFile,
  waitForStatus,
} from '../helpers/app';

/**
 * FSG-007-FIT-003-R3 directive §44: motion evidence proving the full-page
 * processing transition is perceptible at normal playback speed — no
 * frame-by-frame inspection required. Gated behind
 * `FSG_CAPTURE_PROCESSING_TRANSITION=1` (playwright.config.ts). Playwright
 * records these automatically (`video: 'on'`, below) into this test's own
 * output directory; the report step copies/renames the resulting files
 * into the evidence bundle.
 */
test.use({ video: 'on' });

test.describe('FSG-007-FIT-003-R3 full-page processing transition — video', () => {
  test('Quick Fit: confirm → full-page Preparing → Ready → GO', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await page.locator('#target-size-value').fill('200');
    await page.locator('#target-size-unit').selectOption('KB');
    await page.locator('#output-format').selectOption('jpeg');
    await page.locator('#process-button').click();

    await expect(page.locator('#quick-fit-dialog')).toBeHidden();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#fsg-processing-overlay')).toBeHidden();
    await expect(page.locator('#result-content')).toBeVisible();
  });

  test('Guided Fit: Prepare → full-page Preparing → Ready → GO', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.hero"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await confirmGuidedFitCrop(page);

    await expect(page.locator('#guided-fit-dialog')).toBeHidden();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#fsg-processing-overlay')).toBeHidden();
    await expect(page.locator('#result-content')).toBeVisible();
  });
});
