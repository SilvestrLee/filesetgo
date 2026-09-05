import { expect, test } from '@playwright/test';
import { gotoApp, setSimpleRequirement, uploadFile, waitForStatus } from '../helpers/app';

test.describe('Reset / Start again certification (directive §32)', () => {
  test('reset from a successful Quick Fit result restores the initial workspace', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await setSimpleRequirement(page);
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    const downloadHrefBefore = await page.locator('#download-link').getAttribute('href');
    expect(downloadHrefBefore).toMatch(/^blob:/);

    await page.locator('#reset-button').click();
    await waitForStatus(page, 'idle');

    await expect(page.locator('#source-panel')).toBeHidden();
    await expect(page.locator('#requirements-form')).toBeHidden();
    await expect(page.locator('#result-content')).toBeHidden();
    await expect(page.locator('#drop-zone-label')).toHaveText('Drop an image here, or choose a file');

    await uploadFile(page, 'sample.png');
    await waitForStatus(page, 'ready');
  });

  test('reset from a rejected file recovers cleanly', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'corrupted.jpg');
    await waitForStatus(page, 'error');

    await page.locator('#reset-button').click();
    await waitForStatus(page, 'idle');

    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
  });
});
