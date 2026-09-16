import { expect, test } from '@playwright/test';
import { gotoApp, uploadFile, waitForStatus } from '../helpers/app';

/**
 * FSG-007-FIT Quick Fit compact content & persistent action footer.
 * The modal shell itself is unchanged (same 1152×724 shared task-dialog);
 * this covers Quick Fit's own content composition and the requirement that
 * the primary action is always visible without scrolling the page, even
 * with the tallest realistic content (target size + dimensions + upscale
 * warning all showing at once).
 */
test.describe('Quick Fit compact content & persistent action footer', () => {
  test('the primary action is visible without scrolling at the governed desktop viewport, even with every warning showing', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page);
    // wide-logo.png is 1200x150 (8:1) — a square crop can use at most 150x150
    // of source detail, so requesting 500x500 triggers both the crop-review
    // requirement and the upscale warning simultaneously (the directive's
    // own worked example), which is the tallest realistic requirements state.
    await uploadFile(page, 'wide-logo.png');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await page.locator('#target-size-value').fill('150');
    await page.locator('#max-width').fill('500');
    await page.locator('#max-height').fill('500');
    await page.locator('#output-format').selectOption('jpeg');

    await expect(page.locator('#quick-fit-upscale-field')).toBeVisible();
    await expect(page.locator('#process-button')).toBeInViewport();
    await expect(page.locator('#process-button')).toHaveText('Choose image focus');

    // The header stays put and the content area itself is what scrolls —
    // never the whole dialog surface growing past its fixed size.
    const contentOverflow = await page
      .locator('#quick-fit-dialog .fsg-task-dialog__content')
      .evaluate((el) => el.scrollHeight - el.clientHeight);
    expect(contentOverflow).toBeGreaterThan(0);
    await expect(page.locator('#quick-fit-dialog-title')).toBeInViewport();
  });

  test('the crop step footer (Back / Confirm crop) is visible without scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page);
    await uploadFile(page, 'wide-logo.png');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await page.locator('#max-width').fill('500');
    await page.locator('#max-height').fill('500');
    await page.locator('#process-button').click();

    await expect(page.locator('#quick-fit-step-crop')).toBeVisible();
    await expect(page.locator('#quick-fit-crop-back')).toBeInViewport();
    await expect(page.locator('#quick-fit-confirm-crop')).toBeInViewport();
  });

  test('the primary action names the real next step: "Get file ready" with no crop pending, "Choose image focus" with one pending', async ({ page }) => {
    await gotoApp(page);
    // sample.jpg (640x480, 4:3) matches an exact 400x300 (4:3) request — no
    // crop needed.
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await page.locator('#max-width').fill('400');
    await page.locator('#max-height').fill('300');
    await expect(page.locator('#process-button')).toHaveText('Get file ready');

    // A mismatched shape makes a crop necessary — the button says so before
    // the user ever clicks it.
    await page.locator('#max-width').fill('500');
    await page.locator('#max-height').fill('500');
    await expect(page.locator('#process-button')).toHaveText('Choose image focus');

    // Clearing back to no dimensions returns to the plain default label.
    await page.locator('#max-width').fill('');
    await page.locator('#max-height').fill('');
    await expect(page.locator('#process-button')).toHaveText('Get file ready');
  });

  test('one concise, dynamic helper replaces the two static paragraphs', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    await expect(page.locator('#quick-fit-dimensions-help')).toContainText('Enter both dimensions for an exact-size result');

    await page.locator('#max-width').fill('400');
    await expect(page.locator('#quick-fit-dimensions-help')).toHaveText("With one dimension, File. Set. Go. keeps the image's proportions.");

    await page.locator('#max-height').fill('300');
    await expect(page.locator('#quick-fit-dimensions-help')).toContainText('Enter both dimensions for an exact-size result');
    // Only one helper element exists — no second paragraph rendered alongside it.
    await expect(page.locator('#exact-dimensions-note')).toHaveCount(0);
  });

  test('the exact-dimensions lock notice is a compact status, not an oversized checkbox card', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await page.locator('#max-width').fill('400');
    await page.locator('#max-height').fill('300');

    await expect(page.locator('#dimension-flexibility-field')).toBeVisible();
    await expect(page.locator('#dimension-flexibility-icon')).toBeVisible();
    await expect(page.locator('#allow-dimension-reduction')).toBeHidden();
    await expect(page.locator('#allow-dimension-reduction')).toBeDisabled();
    await expect(page.locator('#dimension-flexibility-label')).toHaveText('Exact dimensions locked');
    await expect(page.locator('#dimension-flexibility-help')).toHaveText('File. Set. Go. will work toward the size target without changing 400 × 300.');
  });

  test('the form rail is bounded, not stretched to the full dialog width', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    const dialogBox = await page.locator('#quick-fit-dialog').boundingBox();
    const formBox = await page.locator('#requirements-form').boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(formBox).not.toBeNull();

    if (dialogBox && formBox) {
      // The bounded rail is meaningfully narrower than the 1152px shell —
      // never stretched to fill it.
      expect(formBox.width).toBeLessThan(dialogBox.width * 0.75);
    }
  });

  for (const [width, height] of [[320, 844], [390, 844], [430, 932], [810, 1080]] as const) {
    test(`no horizontal overflow and the footer stays reachable at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await gotoApp(page);
      await uploadFile(page, 'wide-logo.png');
      await waitForStatus(page, 'ready');
      await page.locator('#quick-fit-open').click();
      await page.locator('#target-size-value').fill('150');
      await page.locator('#max-width').fill('500');
      await page.locator('#max-height').fill('500');
      await page.locator('#output-format').selectOption('jpeg');

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);

      await page.locator('#process-button').scrollIntoViewIfNeeded();
      await expect(page.locator('#process-button')).toBeInViewport();
    });
  }

  test('footer actions remain keyboard-reachable in logical order after the body controls', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    await expect(page.locator('#process-button')).toHaveJSProperty('tagName', 'BUTTON');
    await page.locator('#output-format').focus();
    await page.keyboard.press('Tab');
    // The next focusable element after the last body control is the footer
    // action, never something visually below it in an unreachable order.
    const active = await page.evaluate(() => document.activeElement?.id);
    expect(['process-button', 'allow-dimension-reduction', 'quick-fit-upscale-approve']).toContain(active);
  });
});
