import { expect, test } from '@playwright/test';
import { continueGuidedFit, gotoApp, selectMode, uploadFile, waitForStatus } from '../helpers/app';

const CARD_PRESET_CARD = '[data-preset-id="web.card"]';

test.describe('Guided Fit certification (directive §16)', () => {
  test('selecting a preset shows a recommendation review before any processing starts', async ({ page }) => {
    await gotoApp(page);
    // sample.jpg is 640x480 (4:3) — matches Card's new 4:3 exact frame, so
    // no crop is required, but the source is smaller than the 800x600
    // frame on both axes, so an explicit upscale approval is (FSG-007-FIT-002).
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');

    await selectMode(page, 'guided-fit');
    await page.locator(CARD_PRESET_CARD).click();
    await expect(page.locator('#preset-recommendation')).toBeHidden();
    await continueGuidedFit(page);

    await expect(page.locator('#preset-recommendation')).toBeVisible();
    await expect(page.locator('#preset-recommendation-title')).toHaveText(/Card.*thumbnail/i);
    await expect(page.locator('#preset-recommendation-summary')).toHaveText(/800 × 600 px/);
    // Selecting a preset must not itself start processing.
    await waitForStatus(page, 'ready');

    // The frame is reachable by upscaling alone (same aspect ratio), but
    // FileSetGo never enlarges silently — approval is required first.
    await expect(page.locator('#guided-fit-upscale-field')).toBeVisible();
    await expect(page.locator('#guided-process-button')).toBeDisabled();
    await page.locator('#guided-fit-upscale-approve').check();
    await expect(page.locator('#guided-process-button')).toBeEnabled();

    await page.locator('#guided-process-button').click();
    await waitForStatus(page, 'success', 30_000);

    // The result carries the selected preset's context.
    await expect(page.locator('#result-prepared-for')).toBeVisible();
    await expect(page.locator('#result-prepared-for-value')).toHaveText(/Card.*thumbnail/i);
  });

  test('Adjust settings switches to Quick Fit, retains the source, and prefills the preset values', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');

    await selectMode(page, 'guided-fit');
    await page.locator(CARD_PRESET_CARD).click();
    await continueGuidedFit(page);
    await expect(page.locator('#preset-recommendation')).toBeVisible();

    await page.locator('#guided-adjust-button').click();

    await expect(page.locator('#mode-tab-quick-fit')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#requirements-form')).toBeVisible();
    // Same source retained — no second preflight, format still shown.
    await expect(page.locator('#source-format')).toHaveText(/jpeg/i);
    // web.card preset values (catalog.ts, FSG-007-FIT-002): 150 KB, 800x600, WebP.
    await expect(page.locator('#target-size-value')).toHaveValue('150');
    await expect(page.locator('#target-size-unit')).toHaveValue('KB');
    await expect(page.locator('#max-width')).toHaveValue('800');
    await expect(page.locator('#max-height')).toHaveValue('600');
    await expect(page.locator('#output-format')).toHaveValue('webp');
  });

  test('an already-ready source is reported as needing no processing', async ({ page }) => {
    await gotoApp(page);
    // card-ready.webp is exactly 800x600 WebP under 150 KB — Card's exact
    // frame (FSG-007-FIT-002: "already ready" now requires an exact match,
    // not merely "no larger than").
    await uploadFile(page, 'card-ready.webp');
    await waitForStatus(page, 'ready');

    await selectMode(page, 'guided-fit');
    await page.locator(CARD_PRESET_CARD).click();
    await continueGuidedFit(page);

    await expect(page.locator('#preset-already-ready')).toBeVisible();
    await expect(page.locator('#guided-process-button')).toBeHidden();
    await expect(page.locator('#guided-fit-upscale-field')).toBeHidden();

    const useFileButton = page.locator('#guided-use-file-button');
    await expect(useFileButton).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      useFileButton.click(),
    ]);
    // The original file, not a re-encode — truthful original filename.
    expect(download.suggestedFilename()).toBe('card-ready.webp');
  });
});
