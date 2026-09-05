import { expect, test } from '@playwright/test';
import { gotoApp, selectMode, uploadFile, waitForStatus } from '../helpers/app';

const CARD_PRESET_CARD = '[data-preset-id="web.card"]';

test.describe('Guided Fit certification (directive §16)', () => {
  test('selecting a preset shows a recommendation review before any processing starts', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');

    await selectMode(page, 'guided-fit');
    await page.locator(CARD_PRESET_CARD).click();

    await expect(page.locator('#preset-recommendation')).toBeVisible();
    await expect(page.locator('#preset-recommendation-title')).toHaveText(/Card.*thumbnail/i);
    // Selecting a preset must not itself start processing.
    await waitForStatus(page, 'ready');

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
    await expect(page.locator('#preset-recommendation')).toBeVisible();

    await page.locator('#guided-adjust-button').click();

    await expect(page.locator('#mode-tab-quick-fit')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#requirements-form')).toBeVisible();
    // Same source retained — no second preflight, format still shown.
    await expect(page.locator('#source-format')).toHaveText(/jpeg/i);
    // web.card preset values (catalog.ts): 150 KB, 800x800, WebP.
    await expect(page.locator('#target-size-value')).toHaveValue('150');
    await expect(page.locator('#target-size-unit')).toHaveValue('KB');
    await expect(page.locator('#max-width')).toHaveValue('800');
    await expect(page.locator('#max-height')).toHaveValue('800');
    await expect(page.locator('#output-format')).toHaveValue('webp');
  });

  test('an already-ready source is reported as needing no processing', async ({ page }) => {
    await gotoApp(page);
    // sample.webp is 640x480 WebP under 150 KB — already satisfies web.card.
    await uploadFile(page, 'sample.webp');
    await waitForStatus(page, 'ready');

    await selectMode(page, 'guided-fit');
    await page.locator(CARD_PRESET_CARD).click();

    await expect(page.locator('#preset-already-ready')).toBeVisible();
    await expect(page.locator('#guided-process-button')).toBeHidden();

    const useFileButton = page.locator('#guided-use-file-button');
    await expect(useFileButton).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      useFileButton.click(),
    ]);
    // The original file, not a re-encode — truthful original filename.
    expect(download.suggestedFilename()).toBe('sample.webp');
  });
});
