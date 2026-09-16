import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import {
  approveGuidedFitUpscale,
  confirmGuidedFitCrop,
  continueGuidedFit,
  gotoApp,
  uploadFile,
  waitForStatus,
} from '../helpers/app';

/**
 * FSG-007-FIT-002-R1 truthfulness/containment visual evidence — Playwright,
 * real application interaction only. Gated behind
 * `FSG_CAPTURE_GUIDED_GEOMETRY_R1=1` (playwright.config.ts), run with
 * `--workers=1` for deterministic capture.
 */
const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007-fit-002-r1-truth-closeout');

async function capture(page: Page, filename: string, selector?: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);

  if (selector === undefined) {
    await page.screenshot({ path: path.join(EVIDENCE_DIR, filename) });
    return;
  }

  await page.locator(selector).screenshot({ path: path.join(EVIDENCE_DIR, filename) });
}

test('captures the FSG-007-FIT-002-R1 truth-closeout inventory', async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });

  // --- 1: Destination choice — corrected, no "up to" ---
  await gotoApp(page);
  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');
  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
  await expect(page.locator('[data-preset-id="web.hero"] .preset-card-summary')).toHaveText('WebP · 1600 × 900 px · under 500.0 KB');
  await capture(page, '01-destination-choice-corrected.png');

  // --- 2: Hero result — truthful narrative (source 4800x3200 -> 1600x900) ---
  await page.locator('#guided-fit-close').click();
  await expect(page.locator('#guided-fit-dialog')).toBeHidden();
  await page.locator('#reset-button').click();
  await uploadFile(page, 'large.jpg');
  await waitForStatus(page, 'ready');
  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
  await page.locator('[data-preset-id="web.hero"]').click();
  await continueGuidedFit(page);
  await page.locator('#guided-process-button').click();
  await confirmGuidedFitCrop(page);
  await waitForStatus(page, 'success', 30_000);
  await expect(page.locator('#result-detail')).not.toContainText('without reducing the dimensions');
  await capture(page, '02-hero-result-truthful.png', '#quick-fit');

  // --- 3: Content result — truthful narrative ---
  await page.locator('#reset-button').click();
  await uploadFile(page, 'large.jpg');
  await waitForStatus(page, 'ready');
  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
  await page.locator('[data-preset-id="web.content"]').click();
  await continueGuidedFit(page);
  await page.locator('#guided-process-button').click();
  await waitForStatus(page, 'success', 30_000);
  await expect(page.locator('#result-detail')).not.toContainText('without reducing the dimensions');
  await capture(page, '03-content-result-truthful.png', '#quick-fit');

  // --- 4: Card result (via crop) — truthful narrative ---
  await page.locator('#reset-button').click();
  await uploadFile(page, 'large.jpg');
  await waitForStatus(page, 'ready');
  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
  await page.locator('[data-preset-id="web.card"]').click();
  await continueGuidedFit(page);
  await page.locator('#guided-process-button').click();
  await confirmGuidedFitCrop(page);
  await waitForStatus(page, 'success', 30_000);
  await expect(page.locator('#result-detail')).not.toContainText('without reducing the dimensions');
  await capture(page, '04-card-result-truthful.png', '#quick-fit');

  // --- 5: Upscaled Card result — truthful narrative, real enlargement ---
  await page.locator('#reset-button').click();
  await uploadFile(page, 'sample.png');
  await waitForStatus(page, 'ready');
  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
  await page.locator('[data-preset-id="web.card"]').click();
  await continueGuidedFit(page);
  await approveGuidedFitUpscale(page);
  await page.locator('#guided-process-button').click();
  await waitForStatus(page, 'success', 30_000);
  await expect(page.locator('#result-detail')).not.toContainText('without reducing the dimensions');
  await capture(page, '05-upscaled-card-result-truthful.png', '#quick-fit');
  await page.locator('#reset-button').click();

  // --- 6/7: Source metadata containment at 1240px and 1024px ---
  for (const [width, filename] of [[1240, '06-source-metadata-1240.png'], [1024, '07-source-metadata-1024.png']] as const) {
    await page.setViewportSize({ width, height: 900 });
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await expect(page.locator('#source-dimensions')).toHaveText('4800 × 3200');
    await expect(page.locator('#source-size')).toHaveText('440.9 KB');
    await capture(page, filename, '#source-panel');
  }

  // --- 8: Mobile regression check (FIT-001B-R2 source card, unchanged) ---
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page);
  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');
  await capture(page, '08-mobile-regression.png', '#source-panel');
});
