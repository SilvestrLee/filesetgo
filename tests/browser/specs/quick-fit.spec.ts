import { expect, test } from '@playwright/test';
import { collectConsoleProblems, gotoApp, uploadFile, waitForStatus } from '../helpers/app';

test.describe('Quick Fit certification (directive §15)', () => {
  test('a real target-size job completes through the actual worker/runtime', async ({ page }) => {
    const console_ = collectConsoleProblems(page);

    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    // Preflight facts render truthfully.
    await expect(page.locator('#source-format')).toHaveText(/jpeg/i);
    await expect(page.locator('#source-dimensions')).toHaveText('640 × 480');
    await expect(page.locator('#source-name')).toHaveText('sample.jpg');
    await expect(page.locator('#source-panel')).toBeVisible();

    await page.locator('#target-size-value').fill('50');
    await page.locator('#target-size-unit').selectOption('KB');

    // The job may complete faster than this tiny fixture's "processing"
    // state can be observed in between two round-trips, so we assert the
    // real terminal state rather than racing an intermediate one.
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    await expect(page.locator('#result-content')).toBeVisible();
    await expect(page.locator('#result-dimensions')).not.toHaveText('');
    await expect(page.locator('#result-format')).not.toHaveText('');
    await expect(page.locator('#result-size')).not.toHaveText('');

    const downloadLink = page.locator('#download-link');
    await expect(downloadLink).toHaveAttribute('href', /^blob:/);
    const downloadName = await downloadLink.getAttribute('download');
    expect(downloadName).toBeTruthy();
    expect(downloadName).toMatch(/^[\w.-]+\.\w+$/);
    await expect(page.locator('#result-filename')).toHaveText(downloadName ?? '');

    console_.assertClean();
  });

  test('a plain output-format conversion (no target size) completes and offers a real download', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.png');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    await page.locator('#output-format').selectOption('webp');
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    await expect(page.locator('#result-format')).toHaveText(/webp/i);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#download-link').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.webp$/);
  });

  test('a larger representative image processes without a canvas/worker/resource problem (directive §51)', async ({ page }) => {
    // 4800x3200 (15.36 MP) — comfortably under the 24 MP decoded-pixel and
    // 15 MB source safety limits, but large enough to catch obvious
    // canvas/worker/resource issues a tiny fixture would never exercise.
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await expect(page.locator('#source-dimensions')).toHaveText('4800 × 3200');
    await page.locator('#quick-fit-open').click();

    await page.locator('#max-width').fill('1200');
    await page.locator('#max-height').fill('800');
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 45_000);

    await expect(page.locator('#result-dimensions')).toHaveText(/1200|800/);
    await expect(page.locator('#download-link')).toHaveAttribute('href', /^blob:/);
  });

  test('an unreachable target-size job is presented as unreachable, not a system failure, and recovers via Adjust settings', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    // An impossibly small target for a 640x480 JPEG with dimension reduction
    // disabled is a deterministic unreachable case (directive §35) — it must
    // not weaken FSG-002's guardrails to force a success.
    await page.locator('#target-size-value').fill('1');
    await page.locator('#target-size-unit').selectOption('KB');
    const allowReduction = page.locator('#allow-dimension-reduction');
    if (await allowReduction.isVisible()) {
      await allowReduction.uncheck();
    }

    await page.locator('#process-button').click();
    await waitForStatus(page, 'unreachable', 30_000);

    await expect(page.locator('#result-unreachable')).toBeVisible();
    await expect(page.locator('#unreachable-message')).not.toHaveText('');

    const adjustButton = page.locator('#unreachable-adjust-button');
    if (await adjustButton.isVisible()) {
      await adjustButton.click();
      await expect(page.locator('#requirements-form')).toBeVisible();
    }
  });
});

test.describe('Quick Fit exact dimensions + user-controlled crop (FSG-007-FIT-001)', () => {
  test('exact dimensions requiring a crop: the crop step appears, keyboard move/resize work, and the confirmed crop produces exactly the requested dimensions', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    await page.locator('#max-width').fill('800');
    await page.locator('#max-height').fill('800');
    await expect(page.locator('#quick-fit-dimensions-help')).toContainText('Enter both dimensions for an exact-size result');
    await expect(page.locator('#allow-dimension-reduction')).toBeHidden();
    await expect(page.locator('#allow-dimension-reduction')).toBeDisabled();
    await expect(page.locator('#dimension-flexibility-icon')).toBeVisible();
    // A crop is still pending, so the button names the true next step
    // (FSG-007-FIT Quick Fit compact-content remediation directive §15).
    await expect(page.locator('#process-button')).toHaveText('Choose image focus');

    await page.locator('#process-button').click();

    // 4800x3200 (3:2) does not match the requested 1:1 — crop review is
    // mandatory (never a silent crop).
    await expect(page.locator('#quick-fit-step-crop')).toBeVisible();
    await expect(page.locator('#quick-fit-step-requirements')).toBeHidden();
    await expect(page.locator('#process-button')).toBeHidden();
    await expect(page.locator('#quick-fit-crop-selection [data-crop-handle]')).toHaveCount(8);

    // The largest centered 1:1 region within an 4800x3200 source is a
    // 3200x3200 square centered horizontally.
    const fineTune = page.locator('#quick-fit-crop-fine-tune');
    await expect(fineTune).not.toHaveAttribute('open', '');
    await fineTune.locator('summary').click();
    const cropX = page.locator('#quick-fit-crop-x');
    const cropWidth = page.locator('#quick-fit-crop-width');
    const cropHeight = page.locator('#quick-fit-crop-height');
    await expect(cropX).toHaveValue('800');
    await expect(cropWidth).toHaveValue('3200');
    await expect(cropHeight).toHaveValue('3200');

    const selection = page.locator('#quick-fit-crop-selection');
    await selection.focus();

    // Plain arrow keys move the selection.
    await selection.press('ArrowRight');
    await expect(cropX).toHaveValue('801');

    // Shift+arrow resizes — the locked ratio means width AND height change
    // together (unlike the freeform favicon crop, where they're independent).
    await selection.press('Shift+ArrowLeft');
    await expect(cropWidth).toHaveValue('3199');
    await expect(cropHeight).toHaveValue('3199');

    // Reset returns to the original centered suggestion.
    await page.locator('#quick-fit-crop-reset').click();
    await expect(cropX).toHaveValue('800');
    await expect(cropWidth).toHaveValue('3200');
    await expect(cropHeight).toHaveValue('3200');

    await page.locator('#quick-fit-confirm-crop').click();
    await waitForStatus(page, 'success', 30_000);

    await expect(page.locator('#quick-fit-dialog')).toBeHidden();
    await expect(page.locator('#result-dimensions')).toHaveText('800 × 800');
  });

  test('exact dimensions already matching the source ratio skip the crop step entirely', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    // 1200x800 is the same 3:2 ratio as the 4800x3200 source.
    await page.locator('#max-width').fill('1200');
    await page.locator('#max-height').fill('800');
    await page.locator('#process-button').click();

    await expect(page.locator('#quick-fit-step-crop')).toBeHidden();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-dimensions')).toHaveText('1200 × 800');
  });

  test('"Back" during crop review returns to requirements without processing', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    await page.locator('#max-width').fill('800');
    await page.locator('#max-height').fill('800');
    await page.locator('#process-button').click();
    await expect(page.locator('#quick-fit-step-crop')).toBeVisible();

    await page.locator('#quick-fit-crop-back').click();

    await expect(page.locator('#quick-fit-step-requirements')).toBeVisible();
    await expect(page.locator('#quick-fit-step-crop')).toBeHidden();
    await expect(page.locator('#status-message')).toHaveAttribute('data-state', 'ready');
  });

  test('changing a dimension after confirming a crop invalidates it, requiring crop review again', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    await page.locator('#max-width').fill('800');
    await page.locator('#max-height').fill('800');
    await page.locator('#process-button').click();
    await expect(page.locator('#quick-fit-step-crop')).toBeVisible();
    await page.locator('#quick-fit-confirm-crop').click();
    await waitForStatus(page, 'success', 30_000);

    // Reopen and change the width to a different value that still mismatches
    // the source ratio — the previously confirmed crop must not be silently
    // reused against the new requirement.
    await page.locator('#quick-fit-open').click();
    await page.locator('#max-width').fill('900');
    await page.locator('#process-button').click();

    await expect(page.locator('#quick-fit-step-crop')).toBeVisible();
  });

  test('an exact-dimensions request combined with a target size preserves the exact geometry', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    await page.locator('#target-size-value').fill('200');
    await page.locator('#target-size-unit').selectOption('KB');
    await page.locator('#max-width').fill('800');
    await page.locator('#max-height').fill('800');
    await page.locator('#process-button').click();

    await expect(page.locator('#quick-fit-step-crop')).toBeVisible();
    await page.locator('#quick-fit-confirm-crop').click();
    await waitForStatus(page, 'success', 30_000);

    await expect(page.locator('#result-dimensions')).toHaveText('800 × 800');
  });

  test('an explicit format conversion is honored alongside exact dimensions', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    await page.locator('#max-width').fill('1200');
    await page.locator('#max-height').fill('800');
    await page.locator('#output-format').selectOption('png');
    await page.locator('#process-button').click();

    await expect(page.locator('#quick-fit-step-crop')).toBeHidden();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-dimensions')).toHaveText('1200 × 800');
    await expect(page.locator('#result-format')).toHaveText(/png/i);
  });

  test('an exact request that would require enlarging the source is blocked until explicitly approved', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await expect(page.locator('#source-dimensions')).toHaveText('640 × 480');
    await page.locator('#quick-fit-open').click();

    // Same 4:3 ratio as the source, but larger — no crop needed, but an
    // upscale is required.
    await page.locator('#max-width').fill('2000');
    await page.locator('#max-height').fill('1500');
    await expect(page.locator('#quick-fit-upscale-field')).toBeVisible();

    // Blocked: the action truthfully disables rather than accepting a click
    // that would silently no-op (FSG-007 Quick Fit approval-visibility
    // closeout directive §6) — nothing processed, still on requirements.
    await expect(page.locator('#process-button')).toBeDisabled();
    await expect(page.locator('#quick-fit-step-requirements')).toBeVisible();
    await expect(page.locator('#status-message')).toHaveAttribute('data-state', 'ready');

    await page.locator('#quick-fit-upscale-approve').check();
    await expect(page.locator('#process-button')).toBeEnabled();
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    await expect(page.locator('#result-dimensions')).toHaveText('2000 × 1500');
  });

  test('changing a dimension after approving an upscale requires re-approval', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();

    await page.locator('#max-width').fill('2000');
    await page.locator('#max-height').fill('1500');
    await page.locator('#quick-fit-upscale-approve').check();

    // Still requires an upscale, but the approval is for a different
    // request now — it must not be silently carried over.
    await page.locator('#max-width').fill('2200');
    await expect(page.locator('#quick-fit-upscale-approve')).not.toBeChecked();
  });
});
