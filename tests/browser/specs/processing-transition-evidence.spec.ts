import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  approveFullLogoFaviconSource,
  confirmGuidedFitCrop,
  continueGuidedFit,
  gotoApp,
  selectLogoPackBackgroundMode,
  selectMode,
  uploadFile,
  waitForStatus,
} from '../helpers/app';

/**
 * FSG-007-FIT-003 + R1/R2/R3 processing-transition visual evidence —
 * Playwright, real application interaction only. Gated behind
 * `FSG_CAPTURE_PROCESSING_TRANSITION=1` (playwright.config.ts), run with
 * `--workers=1` for deterministic capture. Targets the full-page
 * application-level overlay (`#fsg-processing-overlay`) R3 moved the
 * transition to — the task dialogs themselves close at confirmation and
 * are not part of this evidence.
 *
 * No deterministic fixture exists in this suite that reaches a genuine
 * mid-processing `'failed'` outcome (the existing `corrupted.jpg`/
 * `truncated.jpg` fixtures are rejected at preflight, before `'ready'`,
 * never entering `'processing'`) — a dedicated "Failed" screenshot is
 * deliberately not included here rather than fabricating a fake failure
 * screen. The failure-copy mapping itself (including the
 * `OUTPUT_VALIDATION_FAILED` case) is covered directly and deterministically
 * at the unit level in `resources/js/shared/tests/processing-phase.test.ts`.
 */
const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007-fit-003-processing-transition');

async function capture(page: Page, filename: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(EVIDENCE_DIR, filename) });
}

async function fillSlowTargetSizeRequirement(page: Page): Promise<void> {
  await page.locator('#target-size-value').fill('200');
  await page.locator('#target-size-unit').selectOption('KB');
  await page.locator('#output-format').selectOption('jpeg');
}

/** Waits for the *live* element, using raf-polling — reliable enough for capturing a transient (~800ms/~500ms) state visually. */
async function waitForLiveText(page: Page, selector: string, text: string): Promise<void> {
  await page.waitForFunction(
    ({ selector, text }) => document.querySelector(selector)?.textContent === text,
    { selector, text },
    { timeout: 30_000 },
  );
}

test.describe('FSG-007-FIT-003-R3 full-page processing transition — screenshots', () => {
  test('desktop inventory', async ({ page }) => {
    test.setTimeout(120_000);
    await mkdir(EVIDENCE_DIR, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: 'light' });

    // --- 1: Quick Fit — full-page Preparing ---
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();
    await expect(page.locator('#quick-fit-dialog')).toBeHidden();
    await waitForStatus(page, 'processing');
    await capture(page, '01-quick-fit-preparing-desktop.png');

    // --- 2: Quick Fit — full-page Ready ---
    await waitForLiveText(page, '#fsg-processing-overlay-title', 'Your file is ready');
    await capture(page, '02-quick-fit-ready-desktop.png');

    // --- 3: Quick Fit — GO handoff (overlay gone, workspace + GO visible) ---
    await waitForStatus(page, 'success');
    await capture(page, '03-quick-fit-go-handoff-desktop.png');

    // --- 4/5/6: Guided Fit — Hero Preparing, Ready, GO handoff ---
    await page.locator('#reset-button').click();
    await waitForStatus(page, 'idle');
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.hero"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await confirmGuidedFitCrop(page);
    await expect(page.locator('#guided-fit-dialog')).toBeHidden();
    await waitForStatus(page, 'processing');
    await capture(page, '04-guided-fit-hero-preparing-desktop.png');

    await waitForLiveText(page, '#fsg-processing-overlay-title', 'Large website / hero image prepared');
    await capture(page, '05-guided-fit-hero-ready-desktop.png');

    await waitForStatus(page, 'success', 30_000);
    await capture(page, '06-guided-fit-go-handoff-desktop.png');

    // --- 7/8: Logo Pack — Preparing, Ready ---
    await page.locator('#reset-button').click();
    await waitForStatus(page, 'idle');
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'original');
    await approveFullLogoFaviconSource(page);
    await page.locator('#logo-pack-create-button').click();
    await expect(page.locator('#logo-pack-dialog')).toBeHidden();
    await capture(page, '07-logo-pack-preparing-desktop.png');
    await waitForLiveText(page, '#fsg-processing-overlay-title', 'Your logo pack is ready');
    await capture(page, '08-logo-pack-ready-desktop.png');
    await waitForStatus(page, 'success', 30_000);
  });

  test('mobile inventory (390px)', async ({ page }) => {
    test.setTimeout(90_000);
    await mkdir(EVIDENCE_DIR, { recursive: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'light' });

    // --- 9/9b: Quick Fit — Preparing, Ready (R5 directive §34 item 10) ---
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();
    await expect(page.locator('#quick-fit-dialog')).toBeHidden();
    await waitForStatus(page, 'processing');
    await capture(page, '09-quick-fit-preparing-mobile.png');
    await waitForLiveText(page, '#fsg-processing-overlay-title', 'Your file is ready');
    await capture(page, '09b-quick-fit-ready-mobile.png');
    await waitForStatus(page, 'success', 30_000);

    // --- 10: Guided Fit — Preparing ---
    await page.locator('#reset-button').click();
    await waitForStatus(page, 'idle');
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.content"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await expect(page.locator('#guided-fit-dialog')).toBeHidden();
    await waitForStatus(page, 'processing');
    await capture(page, '10-guided-fit-preparing-mobile.png');
    await waitForStatus(page, 'success', 30_000);

    // --- 11: Logo Pack — Preparing ---
    await page.locator('#reset-button').click();
    await waitForStatus(page, 'idle');
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'original');
    await approveFullLogoFaviconSource(page);
    await page.locator('#logo-pack-create-button').click();
    await expect(page.locator('#logo-pack-dialog')).toBeHidden();
    await capture(page, '11-logo-pack-preparing-mobile.png');
    await waitForStatus(page, 'success', 30_000);
  });

  test('reduced motion — Preparing', async ({ page }) => {
    test.setTimeout(60_000);
    await mkdir(EVIDENCE_DIR, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

    // --- 12: reduced motion — Preparing (static glyph) ---
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();
    await expect(page.locator('#quick-fit-dialog')).toBeHidden();
    await waitForStatus(page, 'processing');
    await capture(page, '12-reduced-motion-preparing.png');
    await waitForStatus(page, 'success', 30_000);
  });

  test('dark mode — Preparing and Ready (R4)', async ({ page }) => {
    test.setTimeout(60_000);
    await mkdir(EVIDENCE_DIR, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme: 'dark' });

    // --- 13/14: Quick Fit — dark mode Preparing, Ready ---
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();
    await expect(page.locator('#quick-fit-dialog')).toBeHidden();
    await waitForStatus(page, 'processing');
    await capture(page, '13-quick-fit-dark-preparing-desktop.png');

    await waitForLiveText(page, '#fsg-processing-overlay-title', 'Your file is ready');
    await capture(page, '14-quick-fit-dark-ready-desktop.png');
    await waitForStatus(page, 'success', 30_000);
  });

  test('tablet — Preparing (R4)', async ({ page }) => {
    test.setTimeout(60_000);
    await mkdir(EVIDENCE_DIR, { recursive: true });
    await page.setViewportSize({ width: 810, height: 1080 });
    await page.emulateMedia({ colorScheme: 'light' });

    // --- 15: tablet — Preparing ---
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();
    await expect(page.locator('#quick-fit-dialog')).toBeHidden();
    await waitForStatus(page, 'processing');
    await capture(page, '15-quick-fit-tablet-preparing.png');
    await waitForStatus(page, 'success', 30_000);
  });
});
