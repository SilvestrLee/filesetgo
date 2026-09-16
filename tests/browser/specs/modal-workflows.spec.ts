import { expect, test } from '@playwright/test';

import {
  continueGuidedFit,
  continueLogoPackToFaviconSource,
  gotoApp,
  selectLogoPackBackgroundMode,
  selectMode,
  uploadFile,
  waitForStatus,
} from '../helpers/app';

test.describe('FSG-007B disciplined modal workflows', () => {
  test('Escape closes a task dialog and restores focus to its launcher', async ({ page }) => {
    await gotoApp(page);
    // A launcher button needs an active source to open its real dialog
    // rather than the source-required gate (FSG-007-FIT-001B directive §30).
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    // The tab heading only switches which launcher panel is shown — it is
    // never itself a destination button; the panel's own primary button is.
    await page.locator('#mode-tab-guided-fit').click();
    await expect(page.locator('#guided-fit-dialog')).toBeHidden();
    await page.locator('#guided-fit-open').click();
    await expect(page.locator('#guided-fit-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#guided-fit-dialog')).toBeHidden();
    await expect(page.locator('#guided-fit-open')).toBeFocused();

    await page.locator('#guided-fit-open').click();
    await page.locator('#guided-fit-close').click();
    await expect(page.locator('#guided-fit-open')).toBeFocused();
  });

  test('Quick Fit dialog (FSG-007-FIT-001) closes on Escape and restores focus to its launcher', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'quick-fit');

    await page.locator('#quick-fit-open').click();
    await expect(page.locator('#quick-fit-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#quick-fit-dialog')).toBeHidden();
    await expect(page.locator('#quick-fit-open')).toBeFocused();

    await page.locator('#quick-fit-open').click();
    await expect(page.locator('#quick-fit-dialog')).toBeVisible();
    await page.locator('#quick-fit-close').click();
    await expect(page.locator('#quick-fit-dialog')).toBeHidden();
    await expect(page.locator('#quick-fit-open')).toBeFocused();
  });

  test('Guided Fit advances one decision at a time and preserves Back state', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');

    await expect(page.locator('#guided-fit-step-1')).toBeVisible();
    const dialogBox = await page.locator('#guided-fit-dialog').boundingBox();
    const viewport = page.viewportSize();
    expect(dialogBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(Math.abs((dialogBox?.x ?? 0) - ((viewport?.width ?? 0) - (dialogBox?.width ?? 0)) / 2)).toBeLessThanOrEqual(1);
    await expect(page.locator('#guided-fit-step-2')).toBeHidden();
    await expect(page.locator('#guided-step-continue')).toBeDisabled();
    await page.locator('[data-preset-id="web.card"]').click();
    await expect(page.locator('#preset-recommendation')).toBeHidden();
    await continueGuidedFit(page);

    await expect(page.locator('#guided-fit-step-1')).toBeHidden();
    await expect(page.locator('#guided-selected-summary-title')).toContainText('Card');
    await expect(page.locator('#preset-recommendation')).toBeVisible();
    await expect(page.locator('[data-preset-id="web.card"]')).toBeHidden();

    await page.locator('#guided-step-back').click();
    await expect(page.locator('[data-preset-id="web.card"] input')).toBeChecked();
    await continueGuidedFit(page);
    // sample.jpg (640x480, 4:3) matches Card's new 4:3 exact frame but is
    // smaller than its 800x600 on both axes — FileSetGo never enlarges
    // silently, so upscale approval is required first (FSG-007-FIT-002).
    await page.locator('#guided-fit-upscale-approve').check();
    await page.locator('#guided-process-button').click();
    // FSG-007-FIT-003-R3: the dialog itself closes the instant processing
    // starts — the transition is now shown on the full-page overlay, not
    // an in-dialog step.
    await expect(page.locator('#guided-fit-dialog')).toBeHidden();
    await expect(page.locator('#fsg-processing-overlay')).toBeVisible();
    await waitForStatus(page, 'success', 30_000);
  });

  test('Logo Pack isolates five decisions and Review pack contains summaries only', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'flat-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');

    await expect(page.locator('#logo-pack-step-1')).toBeVisible();
    await expect(page.locator('#logo-pack-mode-fieldset')).toBeHidden();
    await page.locator('#logo-pack-step-continue').click();
    await selectLogoPackBackgroundMode(page, 'original');
    await page.locator('#logo-pack-step-continue').click();
    await expect(page.locator('#logo-pack-step-3')).toBeVisible();
    await expect(page.locator('#logo-pack-mode-fieldset')).toBeHidden();
    await expect(page.locator('#logo-pack-original-review')).toBeVisible();

    await page.locator('#logo-pack-step-continue').click();
    await page.locator('#logo-pack-favicon-option-full').check();
    await page.locator('#logo-pack-favicon-confirm').click();

    await expect(page.locator('#logo-pack-step-5')).toBeVisible();
    await expect(page.locator('#logo-pack-final-review')).toBeVisible();
    await expect(page.locator('#logo-pack-favicon-source')).toBeHidden();
    await expect(page.locator('#logo-pack-favicon-crop-panel')).toBeHidden();
    await expect(page.locator('#logo-pack-favicon-fine-tune')).toBeHidden();
    await expect(page.locator('#logo-pack-final-favicon-source')).toHaveText('Full logo');

    await page.locator('#logo-pack-change-favicon').click();
    await expect(page.locator('#logo-pack-step-4')).toBeVisible();
    await expect(page.locator('#logo-pack-favicon-option-full')).toBeChecked();
  });

  test('freeform adjustment keeps direct manipulation primary and precision controls disclosed', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'flat-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'original');
    await continueLogoPackToFaviconSource(page);
    await page.locator('#logo-pack-favicon-option-crop').check();

    const fineTune = page.locator('#logo-pack-favicon-fine-tune');
    await expect(fineTune).not.toHaveAttribute('open', '');
    await expect(page.locator('#logo-pack-favicon-crop-x')).toBeHidden();
    await expect(page.locator('#logo-pack-favicon-crop-selection [data-crop-handle]')).toHaveCount(8);
    await fineTune.locator('summary').click();
    await expect(page.locator('#logo-pack-favicon-crop-x')).toBeVisible();

    const selection = page.locator('#logo-pack-favicon-crop-selection');
    const width = page.locator('#logo-pack-favicon-crop-width');
    const height = page.locator('#logo-pack-favicon-crop-height');
    await selection.focus();
    const initialWidth = Number(await width.inputValue());
    const initialHeight = Number(await height.inputValue());
    await selection.press('Shift+ArrowLeft');
    expect(Number(await width.inputValue())).toBe(initialWidth - 1);
    expect(Number(await height.inputValue())).toBe(initialHeight);
  });

  test('mobile uses compact progress without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await gotoApp(page);
    await uploadFile(page, 'flat-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');

    await expect(page.locator('#logo-pack-dialog .fsg-task-dialog__progress')).toBeHidden();
    await expect(page.locator('#logo-pack-mobile-step')).toHaveText('Step 1 of 5');
    await expect(page.locator('#logo-pack-mobile-title')).toHaveText('Check logo');
    const overflow = await page.locator('#logo-pack-dialog').evaluate((element) => element.scrollWidth - element.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
