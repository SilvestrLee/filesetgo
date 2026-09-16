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
 * FSG-007-FIT-002 Guided Fit destination-geometry visual evidence —
 * Playwright, real application interaction only. Gated behind
 * `FSG_CAPTURE_GUIDED_GEOMETRY=1` (playwright.config.ts), run with
 * `--workers=1` for deterministic capture.
 */
const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007-fit-002-guided-geometry');

async function capture(page: Page, filename: string, selector?: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);

  if (selector === undefined) {
    await page.screenshot({ path: path.join(EVIDENCE_DIR, filename) });
    return;
  }

  await page.locator(selector).screenshot({ path: path.join(EVIDENCE_DIR, filename) });
}

async function startGuidedFit(page: Page, fixture: string): Promise<void> {
  await page.locator('#reset-button').click();
  await uploadFile(page, fixture);
  await waitForStatus(page, 'ready');
  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
}

test('captures the FSG-007-FIT-002 Guided Fit destination-geometry inventory', async ({ page }) => {
  test.setTimeout(180_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });

  // --- 1: Destination choice, nothing selected yet ---
  await gotoApp(page);
  await uploadFile(page, 'large.jpg');
  await waitForStatus(page, 'ready');
  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
  await expect(page.locator('#guided-fit-step-1')).toBeVisible();
  await capture(page, '01-destination-choice.png');

  // --- 2: Destination choice, Hero selected (before continuing) ---
  await page.locator('[data-preset-id="web.hero"]').click();
  await capture(page, '02-destination-hero-selected.png');

  // --- 3: Review — Hero's real exact-dimension copy (1600x900) ---
  await continueGuidedFit(page);
  await expect(page.locator('#preset-recommendation-summary')).toHaveText(/1600 × 900 px/);
  await capture(page, '03-review-hero-1600x900.png');

  // --- 4/5: Hero crop step — initial draft, then a real dragged adjustment ---
  await page.locator('#guided-process-button').click();
  await expect(page.locator('#guided-fit-step-crop')).toBeVisible();
  await capture(page, '04-hero-crop-initial-draft.png');
  const heroSelection = page.locator('#guided-fit-crop-selection');
  await heroSelection.focus();
  // Alt+ArrowDown nudges by 10px per press — a real, visibly different
  // frame from the neutral centered suggestion, not a 1px no-op.
  for (let i = 0; i < 30; i += 1) {
    await heroSelection.press('Alt+ArrowDown');
  }
  await capture(page, '05-hero-crop-adjusted-draft.png');

  // --- 6: Hero result — the actual prepared output ---
  await confirmGuidedFitCrop(page);
  await waitForStatus(page, 'success', 30_000);
  await expect(page.locator('#result-dimensions')).toHaveText('1600 × 900');
  await capture(page, '06-hero-result-1600x900.png', '#quick-fit');

  // --- 7: Review — Content's real exact-dimension copy (1200x800) ---
  await startGuidedFit(page, 'large.jpg');
  await page.locator('[data-preset-id="web.content"]').click();
  await continueGuidedFit(page);
  await expect(page.locator('#preset-recommendation-summary')).toHaveText(/1200 × 800 px/);
  await capture(page, '07-review-content-1200x800.png');

  // --- 8: Content is prepared directly, no crop step (large.jpg is exactly 3:2) ---
  await expect(page.locator('#guided-fit-step-crop')).toBeHidden();
  await page.locator('#guided-process-button').click();
  await expect(page.locator('#guided-fit-step-crop')).toBeHidden();
  await waitForStatus(page, 'success', 30_000);
  await capture(page, '08-content-result-1200x800.png', '#quick-fit');

  // --- 9: Review — Card's real exact-dimension copy (800x600) ---
  await startGuidedFit(page, 'large.jpg');
  await page.locator('[data-preset-id="web.card"]').click();
  await continueGuidedFit(page);
  await expect(page.locator('#preset-recommendation-summary')).toHaveText(/800 × 600 px/);
  await capture(page, '09-review-card-800x600.png');

  // --- 10/11: Card also requires a crop from large.jpg (4:3 vs 3:2) ---
  await page.locator('#guided-process-button').click();
  await expect(page.locator('#guided-fit-step-crop')).toBeVisible();
  await capture(page, '10-card-crop-draft.png');
  await confirmGuidedFitCrop(page);
  await waitForStatus(page, 'success', 30_000);
  await expect(page.locator('#result-dimensions')).toHaveText('800 × 600');
  await capture(page, '11-card-result-800x600.png', '#quick-fit');

  // --- 12/13/14: Card from a smaller same-ratio source — upscale warning,
  // disabled then enabled, then the genuinely-enlarged real result. ---
  await startGuidedFit(page, 'sample.png');
  await page.locator('[data-preset-id="web.card"]').click();
  await continueGuidedFit(page);
  await expect(page.locator('#guided-fit-upscale-field')).toBeVisible();
  await expect(page.locator('#guided-process-button')).toBeDisabled();
  await capture(page, '12-card-upscale-warning-disabled.png');
  await approveGuidedFitUpscale(page);
  await expect(page.locator('#guided-process-button')).toBeEnabled();
  await capture(page, '13-card-upscale-approved-enabled.png');
  await page.locator('#guided-process-button').click();
  await waitForStatus(page, 'success', 30_000);
  await expect(page.locator('#result-dimensions')).toHaveText('800 × 600');
  await capture(page, '14-card-upscaled-result-800x600.png', '#quick-fit');

  // --- 15: Destination-switch invalidation — Hero's confirmed crop does
  // not carry over to Card; Card's own crop step appears fresh. ---
  await startGuidedFit(page, 'large.jpg');
  await page.locator('[data-preset-id="web.hero"]').click();
  await continueGuidedFit(page);
  await page.locator('#guided-process-button').click();
  await confirmGuidedFitCrop(page);
  await waitForStatus(page, 'success', 30_000);
  await page.locator('#guided-fit-open').click();
  await page.locator('#guided-step-back').click();
  await page.locator('#guided-change-destination').click();
  await page.locator('[data-preset-id="web.card"]').click();
  await continueGuidedFit(page);
  await page.locator('#guided-process-button').click();
  await expect(page.locator('#guided-fit-step-crop')).toBeVisible();
  await capture(page, '15-destination-switch-fresh-crop.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#guided-fit-dialog')).toBeHidden();

  // --- 16: An already-exact source needs no processing at all ---
  await startGuidedFit(page, 'card-ready.webp');
  await page.locator('[data-preset-id="web.card"]').click();
  await continueGuidedFit(page);
  await expect(page.locator('#preset-already-ready')).toBeVisible();
  await expect(page.locator('#guided-process-button')).toBeHidden();
  await capture(page, '16-already-exact-no-processing.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#guided-fit-dialog')).toBeHidden();

  // --- 17: Mobile — dynamic step-count progress bar renders coherently ---
  await page.setViewportSize({ width: 390, height: 844 });
  await startGuidedFit(page, 'large.jpg');
  await page.locator('[data-preset-id="web.hero"]').click();
  await continueGuidedFit(page);
  await page.locator('#guided-process-button').click();
  await expect(page.locator('#guided-fit-mobile-step')).toHaveText('Step 3 of 4');
  const overflow = await page.locator('#guided-fit-dialog').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await capture(page, '17-mobile-crop-step-of-4.png');
});
