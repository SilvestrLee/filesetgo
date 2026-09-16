import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { fixturePath, gotoApp, uploadFile, waitForStatus } from '../helpers/app';

/**
 * FSG-007-FIT-001B-R1 remediation visual evidence — Playwright, real
 * application interaction only. Gated behind `FSG_CAPTURE_UNIFIED_SOURCE_R1=1`
 * (playwright.config.ts), same convention as every other `*-evidence.spec.ts`
 * file, run with `--workers=1` for deterministic capture.
 */
const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007-fit-001b-r1-unified-source');

async function capture(page: Page, filename: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, filename) });
}

test('captures the FSG-007-FIT-001B-R1 remediation inventory', async ({ page }) => {
  test.setTimeout(180_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  // --- 01: homepage selected source, desktop — ONE card: preview, filename,
  // format, dimensions, size, Replace image (directive §2-§5). ---
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoApp(page);
  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');
  await expect(page.locator('#drop-zone')).toBeHidden();
  await expect(page.locator('#source-panel')).toBeVisible();
  await expect(page.locator('#source-replace-image')).toBeVisible();
  await capture(page, '01-homepage-selected-source-desktop.png');

  // --- 03/04/05: same source, one shared confirmation pattern across all
  // three task modals (directive §6-§9). ---
  await page.locator('#mode-tab-quick-fit').click();
  await page.locator('#quick-fit-open').click();
  await expect(page.locator('#quick-fit-source-confirmation')).toBeVisible();
  await capture(page, '03-quick-fit-source-desktop.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();

  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
  await expect(page.locator('#guided-fit-source-confirmation')).toBeVisible();
  await capture(page, '04-guided-fit-source-desktop.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#guided-fit-dialog')).toBeHidden();

  await page.locator('#mode-tab-logo-pack').click();
  await page.locator('#logo-pack-open').click();
  await expect(page.locator('#logo-pack-step-1')).toBeVisible();
  await expect(page.locator('#logo-pack-source-file')).toHaveCount(0);
  await capture(page, '05-logo-pack-source-desktop.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#logo-pack-dialog')).toBeHidden();

  // --- 07: Quick Fit dimension language in context, an exact 800×800
  // request (directive §11-§14). ---
  await page.locator('#mode-tab-quick-fit').click();
  await page.locator('#quick-fit-open').click();
  await page.locator('#max-width').fill('800');
  await page.locator('#max-height').fill('800');
  await expect(page.locator('label[for="max-width"]')).toContainText('Output width');
  await expect(page.locator('label[for="max-height"]')).toContainText('Output height');
  await expect(page.locator('#quick-fit-dimensions-help')).toContainText('Enter both dimensions for an exact-size result');
  await capture(page, '07-quick-fit-dimensions-desktop.png');

  // --- Bonus: Crop Review still works correctly with the new wording, and
  // still shows the same source continuity (directive §14/§18 — no crop
  // regression). ---
  const changeImageChooser = page.waitForEvent('filechooser');
  await page.locator('#quick-fit-change-image').click();
  (await changeImageChooser).setFiles(fixturePath('large.jpg'));
  await waitForStatus(page, 'ready');
  await page.locator('#process-button').click();
  await expect(page.locator('#quick-fit-step-crop')).toBeVisible();
  await capture(page, '09-quick-fit-crop-review-desktop.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();

  // --- 02: homepage selected source, mobile ---
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page);
  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');
  await expect(page.locator('#drop-zone')).toBeHidden();
  const homepageOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(homepageOverflow).toBeLessThanOrEqual(1);
  await capture(page, '02-homepage-selected-source-mobile.png');

  // --- 06a/06b/06c: all three modals' source confirmation at the same
  // mobile width, so they can be compared side by side (directive §6/§21). ---
  await page.locator('#mode-tab-quick-fit').click();
  await page.locator('#quick-fit-open').click();
  await expect(page.locator('#quick-fit-source-confirmation')).toBeVisible();
  await capture(page, '06a-quick-fit-mobile-source.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();

  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
  await expect(page.locator('#guided-fit-source-confirmation')).toBeVisible();
  await capture(page, '06b-guided-fit-mobile-source.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#guided-fit-dialog')).toBeHidden();

  await page.locator('#mode-tab-logo-pack').click();
  await page.locator('#logo-pack-open').click();
  await expect(page.locator('#logo-pack-step-1')).toBeVisible();
  await capture(page, '06c-logo-pack-mobile-source.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#logo-pack-dialog')).toBeHidden();

  // --- 08: Quick Fit dimension language, mobile ---
  await page.locator('#mode-tab-quick-fit').click();
  await page.locator('#quick-fit-open').click();
  await page.locator('#max-width').fill('800');
  await page.locator('#max-height').fill('800');
  await expect(page.locator('#quick-fit-dimensions-help')).toContainText('Enter both dimensions for an exact-size result');
  await capture(page, '08-quick-fit-dimensions-mobile.png');
});
