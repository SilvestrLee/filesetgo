import { expect, test } from '@playwright/test';
import { gotoApp, uploadFile, waitForStatus } from '../helpers/app';

test.describe('HEIC certification (directive §20)', () => {
  test('a real HEIC source decodes and produces a successful WebP output', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.heic');
    await waitForStatus(page, 'ready');

    await expect(page.locator('#source-format')).toHaveText(/heic/i);
    // HEIC cannot be an output format — the UI must say so truthfully rather
    // than silently substituting it.
    await expect(page.locator('#heic-output-note')).toBeVisible();
    await expect(page.locator('#heic-output-note')).toHaveText(/WebP/);

    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    await expect(page.locator('#result-format')).toHaveText(/webp/i);
    await expect(page.locator('#download-link')).toHaveAttribute('href', /^blob:/);
  });
});
