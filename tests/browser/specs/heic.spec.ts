import { expect, test } from '@playwright/test';
import { gotoApp, selectLogoPackBackgroundMode, selectMode, uploadFile, waitForStatus } from '../helpers/app';

test.describe('HEIC certification (directive §20)', () => {
  test('a real HEIC source decodes and produces a successful WebP output', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.heic');
    await waitForStatus(page, 'ready');

    await expect(page.locator('#source-format')).toHaveText(/heic/i);
    // HEIC cannot be an output format — the UI must say so truthfully rather
    // than silently substituting it.
    await expect(page.locator('#heic-output-note')).toBeVisible();
    await expect(page.locator('#heic-output-note')).toHaveText(/WebP/);

    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    await expect(page.locator('#result-format')).toHaveText(/webp/i);
    await expect(page.locator('#download-link')).toHaveAttribute('href', /^blob:/);
  });

  test('a HEIC source completes the new Transparent Logo Pack path (FSG-006 delta recertification §30)', async ({ page }) => {
    await gotoApp(page);
    // sample.heic (64×48) is too small for Logo Pack's 512px icon canvas
    // (required upscale > 4×, correctly blocking); flat-logo.heic is the
    // same flat-background fixture used elsewhere, converted to a real
    // HEIC file, large enough to exercise this path without an unrelated
    // suitability block.
    await uploadFile(page, 'flat-logo.heic');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'transparent');

    // FSG-005C's transparent-master stage decodes and operates on the same
    // real decoded HEIC pixels the Quick Fit path already proves work.
    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#logo-pack-preview-confidence')).not.toHaveText('');

    const createButton = page.locator('#logo-pack-create-button');
    await expect(createButton).toBeEnabled();
    await createButton.click();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#logo-pack-result')).toBeVisible();
  });

  test('a HEIC source still completes the simpler Original Logo Pack path (FSG-006 delta recertification §31 — no regression)', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'flat-logo.heic');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'original');

    const createButton = page.locator('#logo-pack-create-button');
    await expect(createButton).toBeEnabled();
    await createButton.click();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#logo-pack-result')).toBeVisible();
  });
});
