import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const SCREENSHOT_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007a-brand-reconciliation');

async function readyFonts(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
}

async function capturePage(page: Page, filename: string, fullPage = false): Promise<void> {
  await readyFonts(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, filename), fullPage });
}

async function captureRegion(page: Page, selector: string, filename: string): Promise<void> {
  await readyFonts(page);
  await page.locator(selector).screenshot({ path: path.join(SCREENSHOT_DIR, filename) });
}

async function useDarkTheme(page: Page): Promise<void> {
  if ((await page.locator('html').getAttribute('data-theme-resolved')) !== 'dark') {
    await page.locator('[data-theme-toggle]').click();
  }

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
}

async function useLightTheme(page: Page): Promise<void> {
  if ((await page.locator('html').getAttribute('data-theme-resolved')) !== 'light') {
    await page.locator('[data-theme-toggle]').click();
  }

  await expect(page.locator('html')).toHaveAttribute('data-theme-resolved', 'light');
}

test('captures the governed FSG-007A brand reconciliation inventory', async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await useLightTheme(page);
  await capturePage(page, '01-homepage-light-desktop.png', true);

  await useDarkTheme(page);
  await capturePage(page, '02-homepage-dark-desktop.png', true);

  await useLightTheme(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await capturePage(page, '03-homepage-390.png', true);

  await page.setViewportSize({ width: 1440, height: 900 });
  await captureRegion(page, '.fsg-header', '04-header-light.png');
  await useDarkTheme(page);
  await captureRegion(page, '.fsg-header', '05-header-dark.png');

  await useLightTheme(page);
  await captureRegion(page, '.fsg-workspace', '06-workspace-light.png');
  await useDarkTheme(page);
  await captureRegion(page, '.fsg-workspace', '07-workspace-dark.png');

  await useLightTheme(page);
  await captureRegion(page, '#how-it-works', '08-three-decisions.png');
  await captureRegion(page, '.fsg-section--tasks', '09-task-discovery.png');
  await captureRegion(page, '.fsg-section--trust', '10-privacy-trust.png');
  await captureRegion(page, '.fsg-footer', '11-footer.png');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-task-navigation] summary').click();
  await capturePage(page, '12-mobile-drawer-light.png');
  await page.keyboard.press('Escape');
  await useDarkTheme(page);
  await page.locator('[data-task-navigation] summary').click();
  await capturePage(page, '13-mobile-drawer-dark.png');
  await page.keyboard.press('Escape');

  await useLightTheme(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  const acquisitionPages = [
    ['/prepare-logo-for-website', '14-prepare-logo.png'],
    ['/transparent-logo-for-website', '15-transparent-logo.png'],
    ['/favicon-generator', '16-favicon-generator.png'],
    ['/website-image-optimizer', '17-website-image-optimizer.png'],
    ['/compress-image-for-website', '18-compress-image.png'],
    ['/convert-image-to-webp', '19-convert-webp.png'],
  ] as const;

  for (const [route, filename] of acquisitionPages) {
    await page.goto(route);
    await capturePage(page, filename, true);
  }
});
