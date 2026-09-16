import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { gotoApp, uploadFile, waitForStatus } from '../helpers/app';

/**
 * FSG-007-FIT Quick Fit compact-content & persistent-footer visual evidence
 * — Playwright, real application interaction only. Gated behind
 * `FSG_CAPTURE_QUICK_FIT_COMPACT=1` (playwright.config.ts), run with
 * `--workers=1` for deterministic capture.
 */
const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007-fit-quick-fit-compact-content');

async function capture(page: Page, filename: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, filename) });
}

test('captures the FSG-007-FIT Quick Fit compact-content inventory', async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  // --- 1: Quick Fit default desktop ---
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoApp(page);
  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');
  await page.locator('#quick-fit-open').click();
  await capture(page, '01-quick-fit-default-desktop.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();

  // --- 2/3: 150 KB / 500x500 / JPEG with upscale warning, footer visible ---
  await page.locator('#reset-button').click();
  await uploadFile(page, 'wide-logo.png');
  await waitForStatus(page, 'ready');
  await page.locator('#quick-fit-open').click();
  await page.locator('#target-size-value').fill('150');
  await page.locator('#max-width').fill('500');
  await page.locator('#max-height').fill('500');
  await page.locator('#output-format').selectOption('jpeg');
  await expect(page.locator('#quick-fit-upscale-field')).toBeVisible();
  await capture(page, '02-quick-fit-upscale-warning-desktop.png');
  await expect(page.locator('#process-button')).toBeInViewport();
  await expect(page.locator('#process-button')).toHaveText('Choose image focus');
  await capture(page, '03-quick-fit-footer-visible-desktop.png');

  // --- 4: crop step with visible Back + Confirm crop ---
  await page.locator('#process-button').click();
  await expect(page.locator('#quick-fit-step-crop')).toBeVisible();
  await expect(page.locator('#quick-fit-crop-back')).toBeInViewport();
  await expect(page.locator('#quick-fit-confirm-crop')).toBeInViewport();
  await capture(page, '04-quick-fit-crop-step-footer-desktop.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();

  // --- 5: mobile requirements ---
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#reset-button').click();
  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');
  await page.locator('#quick-fit-open').click();
  await capture(page, '05-quick-fit-mobile-requirements.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();

  // --- 6: mobile warning + footer ---
  await page.locator('#reset-button').click();
  await uploadFile(page, 'wide-logo.png');
  await waitForStatus(page, 'ready');
  await page.locator('#quick-fit-open').click();
  await page.locator('#target-size-value').fill('150');
  await page.locator('#max-width').fill('500');
  await page.locator('#max-height').fill('500');
  await page.locator('#output-format').selectOption('jpeg');
  await expect(page.locator('#quick-fit-upscale-field')).toBeVisible();
  await page.locator('#process-button').scrollIntoViewIfNeeded();
  await expect(page.locator('#process-button')).toBeInViewport();
  await capture(page, '06-quick-fit-mobile-warning-footer.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();

  // --- 7: tablet state ---
  await page.setViewportSize({ width: 810, height: 1080 });
  await page.locator('#reset-button').click();
  await uploadFile(page, 'wide-logo.png');
  await waitForStatus(page, 'ready');
  await page.locator('#quick-fit-open').click();
  await page.locator('#target-size-value').fill('150');
  await page.locator('#max-width').fill('500');
  await page.locator('#max-height').fill('500');
  await page.locator('#output-format').selectOption('jpeg');
  await capture(page, '07-quick-fit-tablet.png');
});
