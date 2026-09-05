import { expect, test } from '@playwright/test';
import { collectConsoleProblems, gotoApp, uploadFile, waitForStatus } from '../helpers/app';

test.describe('Quick Fit certification (directive §15)', () => {
  test('a real target-size job completes through the actual worker/runtime', async ({ page }) => {
    const console_ = collectConsoleProblems(page);

    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');

    // Preflight facts render truthfully.
    await expect(page.locator('#source-format')).toHaveText(/jpeg/i);
    await expect(page.locator('#source-dimensions')).toHaveText('640 × 480');
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

    console_.assertClean();
  });

  test('a plain output-format conversion (no target size) completes and offers a real download', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.png');
    await waitForStatus(page, 'ready');

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
