import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { fixturePath, gotoApp, uploadFile, waitForStatus } from '../helpers/app';

test.describe('Invalid file / recovery certification (directive §26/§27)', () => {
  test('a file that is not an image at all is rejected with an understandable message, and a valid replacement then succeeds', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'corrupted.jpg');
    await waitForStatus(page, 'error');

    await expect(page.locator('#source-rejected-message')).toBeVisible();
    const message = await page.locator('#source-rejected-message').textContent();
    expect(message?.trim().length ?? 0).toBeGreaterThan(0);

    // The application remains usable — no reload required.
    await expect(page.locator('#drop-zone')).toBeVisible();

    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await expect(page.locator('#source-format')).toHaveText(/jpeg/i);
  });

  test('a truncated file with a valid signature but no data is rejected cleanly', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'truncated.jpg');
    await waitForStatus(page, 'error');
    await expect(page.locator('#source-rejected-message')).toBeVisible();

    await uploadFile(page, 'sample.png');
    await waitForStatus(page, 'ready');
  });

  test('binary content is authoritative over a mismatched filename/extension', async ({ page }) => {
    await gotoApp(page);

    // Real PNG bytes, but named and offered as if it were a JPEG. Binary
    // preflight must follow the actual magic bytes, not the extension.
    const buffer = fs.readFileSync(fixturePath('sample.png'));
    await uploadFile(page, { name: 'photo.jpg', mimeType: 'image/jpeg', buffer });

    await waitForStatus(page, 'ready');
    await expect(page.locator('#source-format')).toHaveText(/png/i);
  });
});
