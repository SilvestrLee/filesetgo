import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007c-prepare-logo-prototype');

async function preparePage(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/prepare-logo-for-website');
  await page.evaluate(() => document.fonts.ready);
}

async function useTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  if ((await page.locator('html').getAttribute('data-theme-resolved')) !== theme) {
    await page.locator('[data-theme-toggle]').click();
  }

  await expect(page.locator('html')).toHaveAttribute('data-theme-resolved', theme);
}

async function capturePage(page: Page, filename: string, fullPage = false): Promise<void> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, filename),
    fullPage,
    style: '.fsg-skip-link { visibility: hidden !important; }',
  });
}

async function captureRegion(locator: Locator, filename: string): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await locator.page().evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await locator.screenshot({
    path: path.join(EVIDENCE_DIR, filename),
    style: '.fsg-header, .fsg-skip-link { visibility: hidden !important; }',
  });
}

test('captures the FSG-007C Prepare Logo acquisition prototype', async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  await preparePage(page, 1440, 960);
  await useTheme(page, 'light');
  await capturePage(page, '01-desktop-hero-above-fold.png');
  await captureRegion(page.locator('#ready-system'), '02-desktop-ready-logo-system.png');
  await captureRegion(page.locator('.fsg-prepare-evidence'), '03-desktop-transparency-favicon.png');
  await capturePage(page, '04-desktop-full-page.png', true);

  await useTheme(page, 'dark');
  await page.locator('.fsg-prepare-hero').scrollIntoViewIfNeeded();
  await captureRegion(page.locator('.fsg-prepare-hero'), '05-desktop-dark-hero.png');
  await captureRegion(page.locator('.fsg-prepare-demo'), '06-desktop-dark-product-demonstration.png');

  await preparePage(page, 320, 720);
  await useTheme(page, 'light');
  await capturePage(page, '07-mobile-320-hero.png');

  await preparePage(page, 390, 844);
  await useTheme(page, 'light');
  await capturePage(page, '08-mobile-390-hero.png');
  await captureRegion(page.locator('#ready-system'), '09-mobile-390-transformation-output.png');
  await capturePage(page, '10-mobile-390-full-page.png', true);

  await preparePage(page, 810, 1080);
  await useTheme(page, 'light');
  await capturePage(page, '11-tablet.png');

  await preparePage(page, 1440, 960);
  await useTheme(page, 'light');
  const footer = page.locator('.fsg-footer');
  await expect(footer).toContainText('Mail. Set. Go.');
  await captureRegion(footer, '12-footer-mail-set-go.png');
});
