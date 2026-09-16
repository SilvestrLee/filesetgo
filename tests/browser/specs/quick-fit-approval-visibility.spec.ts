import { expect, test } from '@playwright/test';
import { gotoApp, uploadFile, waitForStatus } from '../helpers/app';

/**
 * FSG-007 Quick Fit approval-visibility closeout: when reaching an exact
 * output requires enlargement, the approval control must be visible with
 * the primary action — or automatically brought into view when it becomes
 * required — and the CTA must never accept a click that would silently
 * no-op while approval is outstanding.
 */
test.describe('Quick Fit enlargement-approval visibility', () => {
  test('desktop: the approval control is automatically brought into view, the CTA is disabled until approved, and enabled after', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page);
    // sample.png is 640x480 (4:3) — an exact 4000x3000 (4:3) request needs
    // no crop (same ratio) but is a large enlargement.
    await uploadFile(page, 'sample.png');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await page.locator('#max-width').fill('4000');
    await page.locator('#max-height').fill('3000');

    await expect(page.locator('#quick-fit-upscale-field')).toBeVisible();
    await expect(page.locator('#process-button')).toBeDisabled();

    // Brought into view without the test itself scrolling — the real
    // governed behavior, not merely "visible if you happen to scroll."
    await expect(page.locator('#quick-fit-upscale-approve')).toBeInViewport();
    await expect(page.locator('#quick-fit-upscale-field')).toBeInViewport();

    // The CTA never silently no-ops — it is truthfully disabled, not merely
    // clickable-but-ineffective.
    await expect(page.locator('#process-button')).toBeDisabled();

    await page.locator('#quick-fit-upscale-approve').check();
    await expect(page.locator('#process-button')).toBeEnabled();

    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-dimensions')).toHaveText('4000 × 3000');
  });

  test('one shared approval state — a single control, checking it is reflected everywhere the state is read', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.png');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await page.locator('#max-width').fill('4000');
    await page.locator('#max-height').fill('3000');

    // Exactly one interactive approval control exists in the DOM — no
    // second, independent checkbox/status was introduced to solve visibility.
    await expect(page.locator('#quick-fit-upscale-approve')).toHaveCount(1);

    await page.locator('#quick-fit-upscale-approve').check();
    // The single control's own state is what the CTA reads — toggling it
    // off again truthfully re-disables, proving there is no second,
    // independently-tracked "approved" flag.
    await expect(page.locator('#process-button')).toBeEnabled();
    await page.locator('#quick-fit-upscale-approve').uncheck();
    await expect(page.locator('#process-button')).toBeDisabled();
  });

  test('crop-pending is not blocked by the upscale gate — clicking still opens crop review, not a no-op', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    // 4800x3200 (3:2) vs a 1:1 request — crop is required; this specific
    // exact size is also smaller than the source, so no upscale applies at
    // this stage (upscale is only ever evaluated once a crop is confirmed).
    await page.locator('#max-width').fill('800');
    await page.locator('#max-height').fill('800');

    await expect(page.locator('#process-button')).toHaveText('Choose image focus');
    await expect(page.locator('#process-button')).toBeEnabled();
    await page.locator('#process-button').click();
    await expect(page.locator('#quick-fit-step-crop')).toBeVisible();
  });

  test('mobile (390px): the approval control and resulting CTA are both reachable without guessing why the CTA is unavailable', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoApp(page);
    await uploadFile(page, 'sample.png');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await page.locator('#max-width').fill('4000');
    await page.locator('#max-height').fill('3000');

    await expect(page.locator('#quick-fit-upscale-field')).toBeVisible();
    await expect(page.locator('#process-button')).toBeDisabled();
    await expect(page.locator('#quick-fit-upscale-approve')).toBeInViewport();

    await page.locator('#quick-fit-upscale-approve').check();
    await expect(page.locator('#process-button')).toBeEnabled();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('changing a dimension after approval re-requires approval for the new requirement, and re-reveals the control', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.png');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await page.locator('#max-width').fill('4000');
    await page.locator('#max-height').fill('3000');
    await page.locator('#quick-fit-upscale-approve').check();
    await expect(page.locator('#process-button')).toBeEnabled();

    // Still exactly 4:3 (matching the source ratio, so this remains an
    // upscale-only case, not a new crop requirement) but a larger request —
    // approval must be required again from scratch.
    await page.locator('#max-width').fill('6000');
    await page.locator('#max-height').fill('4500');
    await expect(page.locator('#quick-fit-upscale-approve')).not.toBeChecked();
    await expect(page.locator('#process-button')).toBeDisabled();
    await expect(page.locator('#quick-fit-upscale-approve')).toBeInViewport();
  });

  test('respects prefers-reduced-motion — the control still becomes visible, just without an animated scroll', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoApp(page);
    await uploadFile(page, 'sample.png');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await page.locator('#max-width').fill('4000');
    await page.locator('#max-height').fill('3000');

    await expect(page.locator('#quick-fit-upscale-approve')).toBeInViewport();
    await expect(page.locator('#process-button')).toBeDisabled();
  });
});
