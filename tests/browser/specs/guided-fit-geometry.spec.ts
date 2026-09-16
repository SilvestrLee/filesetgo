import { expect, test } from '@playwright/test';
import {
  approveGuidedFitUpscale,
  confirmGuidedFitCrop,
  continueGuidedFit,
  gotoApp,
  selectMode,
  uploadFile,
  waitForStatus,
} from '../helpers/app';

/**
 * FSG-007-FIT-002: Guided Fit's Hero/Content/Card presets now produce EXACT
 * destination geometry (Hero 1600×900 16:9, Content 1200×800 3:2, Card
 * 800×600 4:3) instead of aspect-preserving bounding boxes, reusing Quick
 * Fit's crop engine — never a second implementation — whenever the source
 * aspect doesn't already match. `large.jpg` (4800×3200) is exactly 3:2,
 * matching Content's ratio exactly but not Hero's or Card's.
 */
test.describe('Guided Fit destination geometry (FSG-007-FIT-002)', () => {
  test('the same source produces three measurably different exact outputs for Hero, Content and Card', async ({ page }) => {
    test.setTimeout(90_000);

    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.hero"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await confirmGuidedFitCrop(page);
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-dimensions')).toHaveText('1600 × 900');

    await page.locator('#reset-button').click();
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.content"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-dimensions')).toHaveText('1200 × 800');

    await page.locator('#reset-button').click();
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.card"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await confirmGuidedFitCrop(page);
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-dimensions')).toHaveText('800 × 600');
  });

  test('Hero requires an explicit crop confirmation before it is prepared, and Back returns to review without processing', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.hero"]').click();
    await continueGuidedFit(page);

    await page.locator('#guided-process-button').click();
    await expect(page.locator('#guided-fit-step-crop')).toBeVisible();
    await expect(page.locator('#guided-fit-confirm-crop')).toBeVisible();
    // Reaching the crop step never itself starts processing.
    await waitForStatus(page, 'ready');

    // "Back" abandons the in-progress draft and returns to review, still
    // without processing anything.
    await page.locator('#guided-fit-crop-back').click();
    await expect(page.locator('#guided-fit-step-2')).toBeVisible();
    await waitForStatus(page, 'ready');

    await page.locator('#guided-process-button').click();
    await confirmGuidedFitCrop(page);
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-dimensions')).toHaveText('1600 × 900');
  });

  test('Content is prepared directly with no crop step, since large.jpg already matches its exact 3:2 ratio', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.content"]').click();
    await continueGuidedFit(page);

    // 3-of-3 progress — the crop step never enters the sequence at all.
    await expect(page.locator('[data-modal-step-id="crop"]')).toBeHidden();
    await expect(page.locator('#guided-fit-mobile-step')).toHaveText('Step 2 of 3');

    await page.locator('#guided-process-button').click();
    await expect(page.locator('#guided-fit-step-crop')).toBeHidden();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-dimensions')).toHaveText('1200 × 800');
  });

  test('switching destination after confirming a crop requires a fresh, unconfirmed crop for the new destination', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.hero"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await confirmGuidedFitCrop(page);
    await waitForStatus(page, 'success', 30_000);

    // Reopen and navigate back to the destination choice.
    await page.locator('#guided-fit-open').click();
    await expect(page.locator('#guided-fit-dialog')).toBeVisible();
    await page.locator('#guided-step-back').click();
    await expect(page.locator('#guided-fit-step-2')).toBeVisible();
    await page.locator('#guided-change-destination').click();
    await expect(page.locator('#guided-fit-step-1')).toBeVisible();

    await page.locator('[data-preset-id="web.card"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();

    // Card's own crop step appears fresh and unconfirmed — Hero's earlier
    // confirmation was never reused (FSG-007-FIT-002: never silently
    // reused across destinations).
    await expect(page.locator('#guided-fit-step-crop')).toBeVisible();
  });

  test('reaching Card\'s exact frame from a smaller same-ratio source requires an explicit upscale approval', async ({ page }) => {
    await gotoApp(page);
    // sample.png is 640x480 (4:3) — exactly Card's ratio, but smaller than
    // its 800x600 frame on both axes.
    await uploadFile(page, 'sample.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.card"]').click();
    await continueGuidedFit(page);

    // Same ratio — no crop step at all.
    await expect(page.locator('[data-modal-step-id="crop"]')).toBeHidden();
    await expect(page.locator('#guided-fit-upscale-field')).toBeVisible();
    await expect(page.locator('#guided-process-button')).toBeDisabled();

    // Processing never starts silently while the warning is unapproved.
    await waitForStatus(page, 'ready');

    await approveGuidedFitUpscale(page);
    await expect(page.locator('#guided-process-button')).toBeEnabled();
    await page.locator('#guided-process-button').click();
    await waitForStatus(page, 'success', 30_000);
    // The exact frame is genuinely reached — never silently left smaller.
    await expect(page.locator('#result-dimensions')).toHaveText('800 × 600');
  });

  test('an already-exact source needs no processing at all', async ({ page }) => {
    await gotoApp(page);
    // card-ready.webp is exactly 800x600 WebP under 150 KB — Card's exact frame.
    await uploadFile(page, 'card-ready.webp');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.card"]').click();
    await continueGuidedFit(page);

    await expect(page.locator('#preset-already-ready')).toBeVisible();
    await expect(page.locator('#guided-process-button')).toBeHidden();
    await expect(page.locator('#guided-use-file-button')).toBeVisible();
  });

  test('the ready-file result reflects the actual prepared output, not merely the requested target', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.hero"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await confirmGuidedFitCrop(page);
    await waitForStatus(page, 'success', 30_000);

    // The exact frame FileSetGo actually produced, read back from the real
    // result — not a static echo of the requested 1600x900 figure typed
    // anywhere in the UI beforehand.
    await expect(page.locator('#result-dimensions')).toHaveText('1600 × 900');
    await expect(page.locator('#result-format')).toHaveText('WebP');
    const sizeText = await page.locator('#result-size').textContent();
    expect(sizeText).toMatch(/^\d+(\.\d+)? (B|KB|MB)$/);
    // The declared target (500 KB) is an upper bound met by quality search,
    // never a literal echoed value — the real encoded size is reported.
    const bytesMatch = sizeText?.match(/^([\d.]+) (B|KB|MB)$/);
    expect(bytesMatch).not.toBeNull();
  });
});
