import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { gotoApp, uploadFile, waitForStatus } from '../helpers/app';

/**
 * FSG-007-FIT-001B-R2 mobile source-containment visual evidence —
 * Playwright, real application interaction only. Gated behind
 * `FSG_CAPTURE_UNIFIED_SOURCE_R2=1` (playwright.config.ts), run with
 * `--workers=1` for deterministic capture.
 */
const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007-fit-001b-r2-mobile-source');

async function capture(page: Page, filename: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, filename) });
}

/** No two elements' bounding boxes overlap (directive §13). */
function boxesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function assertMobileSourceCardIsCoherent(page: Page): Promise<void> {
  const thumb = page.locator('#source-thumbnail');
  const name = page.locator('#source-name');
  const summary = page.locator('#source-summary');
  const replace = page.locator('#source-replace-image');

  await expect(thumb).toBeVisible();
  await expect(name).toBeVisible();
  await expect(page.locator('#source-format')).toBeVisible();
  await expect(page.locator('#source-dimensions')).toBeVisible();
  await expect(page.locator('#source-size')).toBeVisible();
  await expect(replace).toBeVisible();

  await expect(name).toHaveText('sample.jpg');
  await expect(page.locator('#source-format')).toHaveText('JPEG');
  await expect(page.locator('#source-dimensions')).toHaveText('640 × 480');
  // The value stays one coherent string, never split mid-value across lines
  // (directive §6) — a real rendered-width check, not just text content.
  // A single line at this font size renders ~20-24px tall; a wrapped value
  // would be roughly double that.
  const sizeBox = await page.locator('#source-size').boundingBox();
  expect(sizeBox?.height ?? 0).toBeLessThan(30);

  const thumbBox = await thumb.boundingBox();
  const nameBox = await name.boundingBox();
  const summaryBox = await summary.boundingBox();
  const replaceBox = await replace.boundingBox();
  expect(thumbBox).not.toBeNull();
  expect(nameBox).not.toBeNull();
  expect(summaryBox).not.toBeNull();
  expect(replaceBox).not.toBeNull();

  if (thumbBox && nameBox && summaryBox && replaceBox) {
    expect(boxesOverlap(thumbBox, nameBox)).toBe(false);
    expect(boxesOverlap(thumbBox, summaryBox)).toBe(false);
    expect(boxesOverlap(thumbBox, replaceBox)).toBe(false);
    expect(boxesOverlap(nameBox, summaryBox)).toBe(false);
    expect(boxesOverlap(summaryBox, replaceBox)).toBe(false);
    expect(boxesOverlap(nameBox, replaceBox)).toBe(false);
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test('captures the FSG-007-FIT-001B-R2 mobile source-containment inventory', async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  // --- 320 / 375 / 390 / 430: the recomposed card is coherent at every
  // governed mobile width, not tuned only for 390 (directive §8). ---
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await assertMobileSourceCardIsCoherent(page);

    if (width === 320) {
      await capture(page, '01-homepage-source-320.png');
    } else if (width === 390) {
      await capture(page, '02-homepage-source-390.png');
    } else if (width === 430) {
      await capture(page, '03-homepage-source-430.png');
    }
  }

  // --- 04: desktop regression — the approved desktop card is unchanged. ---
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoApp(page);
  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');
  await expect(page.locator('#drop-zone')).toBeHidden();
  await expect(page.locator('#source-panel')).toBeVisible();
  const thumbBoxDesktop = await page.locator('#source-thumbnail').boundingBox();
  expect(thumbBoxDesktop?.width ?? 0).toBeGreaterThan(100);
  expect(thumbBoxDesktop?.height ?? 0).toBeGreaterThan(100);
  await capture(page, '04-homepage-source-desktop-regression.png');

  // --- 05/06/07: task-modal source confirmation at 390px remains untouched
  // and overflow-free (directive §10). ---
  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page);
  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');

  await page.locator('#mode-tab-quick-fit').click();
  await page.locator('#quick-fit-open').click();
  await expect(page.locator('#quick-fit-source-confirmation')).toBeVisible();
  const quickFitOverflow = await page.locator('#quick-fit-dialog').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(quickFitOverflow).toBeLessThanOrEqual(1);
  await capture(page, '05-quick-fit-source-390.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#quick-fit-dialog')).toBeHidden();

  await page.locator('#mode-tab-guided-fit').click();
  await page.locator('#guided-fit-open').click();
  await expect(page.locator('#guided-fit-source-confirmation')).toBeVisible();
  const guidedFitOverflow = await page.locator('#guided-fit-dialog').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(guidedFitOverflow).toBeLessThanOrEqual(1);
  await capture(page, '06-guided-fit-source-390.png');
  await page.keyboard.press('Escape');
  await expect(page.locator('#guided-fit-dialog')).toBeHidden();

  await page.locator('#mode-tab-logo-pack').click();
  await page.locator('#logo-pack-open').click();
  await expect(page.locator('#logo-pack-step-1')).toBeVisible();
  const logoPackOverflow = await page.locator('#logo-pack-dialog').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(logoPackOverflow).toBeLessThanOrEqual(1);
  await capture(page, '07-logo-pack-source-390.png');
});
