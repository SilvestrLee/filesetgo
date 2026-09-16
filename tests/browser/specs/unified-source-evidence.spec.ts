import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { fixturePath, gotoApp, uploadFile, waitForStatus } from '../helpers/app';

/**
 * FSG-007-FIT-001B deterministic visual evidence (Playwright, not
 * Claude-in-Chrome — the extension could not reliably control a tab under
 * severe host contention during the prior attempt). Gated behind
 * `FSG_CAPTURE_UNIFIED_SOURCE=1` (playwright.config.ts), same convention as
 * every other `*-evidence.spec.ts` file, and intended to be run with
 * `--workers=1` for deterministic, low-contention capture — real
 * application interaction only, no synthetic markup, no mocked state.
 */
const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007-fit-001b-unified-source');

async function capture(page: Page, filename: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, filename) });
}

/** A real decoded image, not just a src attribute — same check as the unit spec. */
async function expectRealThumbnail(page: Page, selector: string): Promise<void> {
  const thumbnail = page.locator(selector);
  await expect.poll(() => thumbnail.evaluate((image: HTMLImageElement) => image.src)).toMatch(/^blob:/);
  await expect.poll(() => thumbnail.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
}

test('captures the FSG-007-FIT-001B unified source-file experience inventory', async ({ page }) => {
  test.setTimeout(180_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });

  // --- 1/2/11: homepage empty state, thumbnail, and replacement ---
  await gotoApp(page);
  await expect(page.locator('#source-panel')).toBeHidden();
  await expect(page.locator('#drop-zone')).toBeVisible();
  await capture(page, '01-homepage-empty-source.png');

  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');
  await expectRealThumbnail(page, '#source-thumbnail');
  await expect(page.locator('#source-name')).toHaveText('sample.jpg');
  await expect(page.locator('#source-format')).toHaveText('JPEG');
  await expect(page.locator('#source-dimensions')).toHaveText('640 × 480');
  await expect(page.locator('#source-size')).not.toHaveText('-');
  await capture(page, '02-homepage-source-thumbnail.png');

  const firstThumbnailSrc = await page.locator('#source-thumbnail').evaluate((image: HTMLImageElement) => image.src);
  await uploadFile(page, 'flat-logo.png');
  await waitForStatus(page, 'ready');
  await expect(page.locator('#source-name')).toHaveText('flat-logo.png');
  await expect(page.locator('#source-format')).toHaveText('PNG');
  await expect
    .poll(() => page.locator('#source-thumbnail').evaluate((image: HTMLImageElement) => image.src))
    .not.toBe(firstThumbnailSrc);
  await capture(page, '11-homepage-replaced-source.png');

  // --- 6/10: Quick Fit source confirmation, then Change image into a
  // crop-required request, proving homepage → modal confirmation → crop
  // stage all refer to the same image (directive §17; FIT-001 untouched). ---
  await page.locator('#mode-tab-quick-fit').click();
  await page.locator('#quick-fit-open').click();
  await expect(page.locator('#quick-fit-source-confirmation')).toBeVisible();
  await expectRealThumbnail(page, '#quick-fit-source-thumbnail');
  await expect(page.locator('#quick-fit-source-name')).toHaveText('flat-logo.png');
  await expect(page.locator('#quick-fit-change-image')).toBeVisible();
  await capture(page, '06-quick-fit-source-confirmation.png');

  const quickFitFileChooserForCrop = page.waitForEvent('filechooser');
  await page.locator('#quick-fit-change-image').click();
  (await quickFitFileChooserForCrop).setFiles(fixturePath('large.jpg'));
  await waitForStatus(page, 'ready');
  await expect(page.locator('#quick-fit-source-name')).toHaveText('large.jpg');

  await page.locator('#max-width').fill('800');
  await page.locator('#max-height').fill('800');
  await page.locator('#process-button').click();
  await expect(page.locator('#quick-fit-step-crop')).toBeVisible();
  await expect(page.locator('#quick-fit-source-confirmation')).toBeVisible();
  await expect(page.locator('#quick-fit-source-name')).toHaveText('large.jpg');
  await expect(page.locator('#quick-fit-crop-selection [data-crop-handle]')).toHaveCount(8);
  await capture(page, '10-quick-fit-crop-source-continuity.png');

  await page.keyboard.press('Escape');
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();

  // --- 7: Guided Fit source confirmation (same active source: large.jpg) ---
  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
  await expect(page.locator('#guided-fit-source-confirmation')).toBeVisible();
  await expectRealThumbnail(page, '#guided-fit-source-thumbnail');
  await expect(page.locator('#guided-fit-source-name')).toHaveText('large.jpg');
  await expect(page.locator('#guided-fit-change-image')).toBeVisible();
  await expect(page.locator('[data-preset-id="web.hero"]')).toBeVisible();
  await capture(page, '07-guided-fit-source-confirmation.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#guided-fit-dialog')).toBeHidden();

  // --- 8/9: Logo Pack source confirmation, with no workflow-local uploader ---
  await page.locator('#mode-tab-logo-pack').click();
  await page.locator('#logo-pack-open').click();
  await expect(page.locator('#logo-pack-step-1')).toBeVisible();
  await expectRealThumbnail(page, '#logo-pack-source-thumbnail');
  await expect(page.locator('#logo-pack-modal-source-name')).toHaveText('large.jpg');
  await expect(page.locator('#logo-pack-change-image')).toBeVisible();
  await expect(page.locator('#logo-pack-source-file')).toHaveCount(0);
  await expect(page.locator('#logo-pack-source-drop-zone')).toHaveCount(0);
  await capture(page, '08-logo-pack-source-confirmation.png');
  await capture(page, '09-logo-pack-check-logo-no-uploader.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#logo-pack-dialog')).toBeHidden();

  // --- 3/12: no source → Quick Fit launcher → gate → upload → resumes ---
  await gotoApp(page);
  await page.locator('#mode-tab-quick-fit').click();
  await page.locator('#quick-fit-open').click();
  await expect(page.locator('#source-required-dialog')).toBeVisible();
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();
  await expect(page.locator('#source-required-title')).toHaveText('Choose an image first');
  await expect(page.locator('#source-required-choose')).toBeVisible();
  await capture(page, '03-quick-fit-source-required.png');

  const quickFitGateChooser = page.waitForEvent('filechooser');
  await page.locator('#source-required-choose').click();
  (await quickFitGateChooser).setFiles(fixturePath('sample.jpg'));
  await waitForStatus(page, 'ready');
  await expect(page.locator('#source-required-dialog')).toBeHidden();
  await expect(page.locator('#quick-fit-dialog')).toBeVisible();
  await expect(page.locator('#quick-fit-source-name')).toHaveText('sample.jpg');
  await capture(page, '12-pending-quick-fit-resumed.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();

  // --- 4/13: no source → Guided Fit launcher → gate → upload → resumes ---
  await gotoApp(page);
  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
  await expect(page.locator('#source-required-dialog')).toBeVisible();
  await expect(page.locator('#guided-fit-dialog')).toBeHidden();
  await capture(page, '04-guided-fit-source-required.png');

  const guidedFitGateChooser = page.waitForEvent('filechooser');
  await page.locator('#source-required-choose').click();
  (await guidedFitGateChooser).setFiles(fixturePath('sample.png'));
  await waitForStatus(page, 'ready');
  await expect(page.locator('#source-required-dialog')).toBeHidden();
  await expect(page.locator('#guided-fit-dialog')).toBeVisible();
  await expect(page.locator('#guided-fit-source-name')).toHaveText('sample.png');
  await capture(page, '13-pending-guided-fit-resumed.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#guided-fit-dialog')).toBeHidden();

  // --- 5/14: no source → Logo Pack launcher → gate → upload → resumes ---
  await gotoApp(page);
  await page.locator('#mode-tab-logo-pack').click();
  await page.locator('#logo-pack-open').click();
  await expect(page.locator('#source-required-dialog')).toBeVisible();
  await expect(page.locator('#logo-pack-dialog')).toBeHidden();
  await capture(page, '05-logo-pack-source-required.png');

  const logoPackGateChooser = page.waitForEvent('filechooser');
  await page.locator('#source-required-choose').click();
  (await logoPackGateChooser).setFiles(fixturePath('flat-logo.png'));
  await waitForStatus(page, 'ready');
  await expect(page.locator('#source-required-dialog')).toBeHidden();
  await expect(page.locator('#logo-pack-dialog')).toBeVisible();
  await expect(page.locator('#logo-pack-step-1')).toBeVisible();
  await expect(page.locator('#logo-pack-modal-source-name')).toHaveText('flat-logo.png');
  await expect(page.locator('#logo-pack-source-file')).toHaveCount(0);
  await capture(page, '14-pending-logo-pack-resumed.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#logo-pack-dialog')).toBeHidden();

  // --- 15/16: acquisition deep link with no source → gate → upload → resumes ---
  await page.goto('/?mode=logo-pack');
  await expect(page.locator('#quick-fit-app')).toBeVisible();
  await expect(page.locator('#mode-tab-logo-pack')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#source-required-dialog')).toBeVisible();
  await expect(page.locator('#logo-pack-dialog')).toBeHidden();
  await capture(page, '15-deeplink-logo-pack-source-gate.png');

  const deepLinkChooser = page.waitForEvent('filechooser');
  await page.locator('#source-required-choose').click();
  (await deepLinkChooser).setFiles(fixturePath('sample.jpg'));
  await waitForStatus(page, 'ready');
  await expect(page.locator('#source-required-dialog')).toBeHidden();
  await expect(page.locator('#logo-pack-dialog')).toBeVisible();
  await expect(page.locator('#logo-pack-modal-source-name')).toHaveText('sample.jpg');
  await expect(page.locator('#logo-pack-source-file')).toHaveCount(0);
  await capture(page, '16-deeplink-logo-pack-resumed.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#logo-pack-dialog')).toBeHidden();

  // --- 17/18/19: mobile viewport source confirmation for all three modes ---
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page);
  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');

  await page.locator('#mode-tab-quick-fit').click();
  await page.locator('#quick-fit-open').click();
  await expect(page.locator('#quick-fit-source-confirmation')).toBeVisible();
  await expect(page.locator('#quick-fit-change-image')).toBeVisible();
  const quickFitMobileOverflow = await page.locator('#quick-fit-dialog').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(quickFitMobileOverflow).toBeLessThanOrEqual(1);
  await capture(page, '17-quick-fit-mobile-source.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();

  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
  await expect(page.locator('#guided-fit-source-confirmation')).toBeVisible();
  const guidedFitMobileOverflow = await page.locator('#guided-fit-dialog').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(guidedFitMobileOverflow).toBeLessThanOrEqual(1);
  await capture(page, '18-guided-fit-mobile-source.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#guided-fit-dialog')).toBeHidden();

  await page.locator('#mode-tab-logo-pack').click();
  await page.locator('#logo-pack-open').click();
  await expect(page.locator('#logo-pack-step-1')).toBeVisible();
  const logoPackMobileOverflow = await page.locator('#logo-pack-dialog').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(logoPackMobileOverflow).toBeLessThanOrEqual(1);
  await capture(page, '19-logo-pack-mobile-source.png');
});
