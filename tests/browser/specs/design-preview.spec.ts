import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { gotoApp, selectLogoPackBackgroundMode, selectMode, uploadFile, waitForStatus } from '../helpers/app';

const SCREENSHOT_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007d');

async function capture(page: import('@playwright/test').Page, filename: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage: true });
}

test('captures the governed FSG-007D visual review inventory', async ({ page }) => {
  test.setTimeout(180_000);
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  const desktopPages = [
    ['01-homepage-desktop.png', '/'],
    ['02-compress-image.png', '/compress-image-for-website'],
    ['03-convert-webp.png', '/convert-image-to-webp'],
    ['04-favicon-generator.png', '/favicon-generator'],
    ['05-prepare-logo.png', '/prepare-logo-for-website'],
    ['06-transparent-logo.png', '/transparent-logo-for-website'],
    ['07-website-image-optimizer.png', '/website-image-optimizer'],
    ['08-privacy.png', '/privacy'],
    ['09-not-found.png', '/this-page-does-not-exist'],
  ] as const;

  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const [filename, route] of desktopPages) {
    await page.goto(route);
    await capture(page, filename);
  }

  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/');
  await capture(page, '10-homepage-320.png');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await capture(page, '11-homepage-390.png');

  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('/compress-image-for-website');
  await capture(page, '12-acquisition-compress-320.png');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.locator('.fsg-nav details > summary').click();
  await expect(page.locator('.fsg-task-menu')).toBeVisible();
  await capture(page, '13-website-tasks-open.png');

  await gotoApp(page);
  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');
  await capture(page, '14-quick-fit-selected-source.png');

  await page.locator('#target-size-value').fill('50');
  await page.locator('#target-size-unit').selectOption('KB');
  await page.locator('#process-button').click();
  await waitForStatus(page, 'success', 30_000);
  await expect(page.locator('[data-product-context="quick-fit"]')).toBeVisible();
  await capture(page, '15-quick-fit-success.png');

  await gotoApp(page);
  await uploadFile(page, 'flat-logo.png');
  await waitForStatus(page, 'ready');
  await selectMode(page, 'logo-pack');
  await expect(page.locator('#logo-pack-review')).toBeVisible();
  await capture(page, '16-logo-pack-review.png');

  await selectLogoPackBackgroundMode(page, 'transparent');
  await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });
  await capture(page, '17-transparent-logo-preview.png');

  await page.locator('#logo-pack-create-button').click();
  await waitForStatus(page, 'success', 30_000);
  await expect(page.locator('[data-product-context="logo-pack"]')).toBeVisible();
  await capture(page, '18-logo-pack-final-result.png');

  await page.goto('/');
  await page.locator('.fsg-theme > summary').click();
  await page.getByRole('button', { name: /Dark Always dark/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await capture(page, '19-homepage-dark.png');

  await page.locator('.fsg-theme > summary').click();
  await expect(page.locator('.fsg-theme__menu')).toBeVisible();
  await capture(page, '20-theme-control-dark-open.png');
});
