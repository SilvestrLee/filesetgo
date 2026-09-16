import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { gotoApp, uploadFile, waitForStatus } from '../helpers/app';

/**
 * FSG-007 Quick Fit approval-visibility closeout visual evidence —
 * Playwright, real application interaction only. Gated behind
 * `FSG_CAPTURE_QUICK_FIT_APPROVAL=1` (playwright.config.ts), run with
 * `--workers=1` for deterministic capture.
 */
const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007-fit-quick-fit-approval-visibility');

async function capture(page: Page, filename: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, filename) });
}

test('captures the FSG-007 Quick Fit approval-visibility closeout inventory', async ({ page }) => {
  test.setTimeout(60_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  // --- 1/2: desktop enlargement-required, then enlargement-approved ---
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoApp(page);
  await uploadFile(page, 'sample.png');
  await waitForStatus(page, 'ready');
  await page.locator('#quick-fit-open').click();
  await page.locator('#max-width').fill('4000');
  await page.locator('#max-height').fill('3000');
  await expect(page.locator('#quick-fit-upscale-approve')).toBeInViewport();
  await expect(page.locator('#process-button')).toBeDisabled();
  await capture(page, '01-desktop-enlargement-required.png');

  await page.locator('#quick-fit-upscale-approve').check();
  await expect(page.locator('#process-button')).toBeEnabled();
  await capture(page, '02-desktop-enlargement-approved.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();

  // --- 3/4: mobile enlargement-required, then enlargement-approved ---
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#reset-button').click();
  await uploadFile(page, 'sample.png');
  await waitForStatus(page, 'ready');
  await page.locator('#quick-fit-open').click();
  await page.locator('#max-width').fill('4000');
  await page.locator('#max-height').fill('3000');
  await expect(page.locator('#quick-fit-upscale-approve')).toBeInViewport();
  await expect(page.locator('#process-button')).toBeDisabled();
  await capture(page, '03-mobile-enlargement-required.png');

  await page.locator('#quick-fit-upscale-approve').check();
  await expect(page.locator('#process-button')).toBeEnabled();
  await capture(page, '04-mobile-enlargement-approved.png');
});
