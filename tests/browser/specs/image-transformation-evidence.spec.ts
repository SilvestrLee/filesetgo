import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007e-image-transformation');
const captureEvidence = process.env.FSG_CAPTURE_IMAGE_TRANSFORMATION === '1';

async function preparePage(page: Page, route: string, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
}

async function useTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  if ((await page.locator('html').getAttribute('data-theme-resolved')) !== theme) {
    await page.locator('[data-theme-toggle]').click();
  }

  await expect(page.locator('html')).toHaveAttribute('data-theme-resolved', theme);
}

async function captureViewport(page: Page, filename: string): Promise<void> {
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, filename),
    animations: 'disabled',
    style: '.fsg-skip-link { visibility: hidden !important; }',
  });
}

async function captureFullPage(page: Page, filename: string): Promise<void> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, filename),
    animations: 'disabled',
    fullPage: true,
    style: '.fsg-skip-link { visibility: hidden !important; }',
  });
}

async function captureRegion(locator: Locator, filename: string): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await locator.page().evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await locator.screenshot({
    path: path.join(EVIDENCE_DIR, filename),
    animations: 'disabled',
    style: '.fsg-header, .fsg-skip-link { visibility: hidden !important; }',
  });
}

async function activateAnchor(
  page: Page,
  linkName: string,
  targetHash: string,
  headingSelector: string,
): Promise<void> {
  await page.getByRole('link', { name: linkName, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${targetHash}$`));
  await expect(page.locator(headingSelector)).toBeVisible();
  await expect.poll(async () => page.evaluate((selector) => {
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    const heading = document.querySelector<HTMLElement>(selector);

    if (!header || !heading) {
      return Number.NEGATIVE_INFINITY;
    }

    return heading.getBoundingClientRect().top - header.getBoundingClientRect().bottom;
  }, headingSelector)).toBeGreaterThanOrEqual(16);
  await expect(page.locator('.fsg-skip-link')).not.toBeInViewport();
}

test('captures the FSG-007E image transformation acquisition family', async ({ page }) => {
  test.skip(!captureEvidence, 'Run with FSG_CAPTURE_IMAGE_TRANSFORMATION=1 for the focused evidence set.');
  test.setTimeout(180_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  await preparePage(page, '/compress-image-for-website', 1440, 960);
  await useTheme(page, 'light');
  await captureViewport(page, '01-compress-desktop-hero.png');
  await activateAnchor(page, 'See how it works', '#compress-proof', '#compress-proof-title');
  await captureViewport(page, '02-compress-desktop-size-target-transformation.png');
  await captureRegion(page.locator('.fsg-quality-proof'), '03-compress-desktop-quality-proof.png');
  await captureRegion(page.locator('.fsg-dimension-story'), '04-compress-desktop-dimension-size-explanation.png');
  await captureFullPage(page, '05-compress-desktop-full-page.png');

  await preparePage(page, '/compress-image-for-website', 1440, 960);
  await useTheme(page, 'dark');
  await captureViewport(page, '06-compress-dark-hero.png');
  await activateAnchor(page, 'See how it works', '#compress-proof', '#compress-proof-title');
  await captureViewport(page, '07-compress-dark-transformation.png');

  await preparePage(page, '/compress-image-for-website', 320, 720);
  await useTheme(page, 'light');
  await captureViewport(page, '08-compress-mobile-320-hero.png');
  await preparePage(page, '/compress-image-for-website', 390, 844);
  await useTheme(page, 'light');
  await activateAnchor(page, 'See how it works', '#compress-proof', '#compress-proof-title');
  await captureViewport(page, '09-compress-mobile-390-transformation.png');
  await captureFullPage(page, '10-compress-mobile-390-full-page.png');
  await preparePage(page, '/compress-image-for-website', 810, 1080);
  await useTheme(page, 'light');
  await captureViewport(page, '11-compress-tablet.png');

  await preparePage(page, '/convert-image-to-webp', 1440, 960);
  await useTheme(page, 'light');
  await captureViewport(page, '12-webp-desktop-hero.png');
  await activateAnchor(page, 'See the difference', '#webp-proof', '#webp-proof-title');
  await captureViewport(page, '13-webp-desktop-source-to-webp.png');
  await captureRegion(page.locator('.fsg-webp-proof__comparison'), '14-webp-desktop-format-size-proof.png');
  await captureRegion(page.locator('.fsg-webp-change'), '15-webp-desktop-what-changes-stays.png');
  await captureFullPage(page, '16-webp-desktop-full-page.png');

  await preparePage(page, '/convert-image-to-webp', 1440, 960);
  await useTheme(page, 'dark');
  await captureViewport(page, '17-webp-dark-hero.png');
  await activateAnchor(page, 'See the difference', '#webp-proof', '#webp-proof-title');
  await captureViewport(page, '18-webp-dark-transformation.png');

  await preparePage(page, '/convert-image-to-webp', 320, 720);
  await useTheme(page, 'light');
  await captureViewport(page, '19-webp-mobile-320-hero.png');
  await preparePage(page, '/convert-image-to-webp', 390, 844);
  await useTheme(page, 'light');
  await activateAnchor(page, 'See the difference', '#webp-proof', '#webp-proof-title');
  await captureViewport(page, '20-webp-mobile-390-transformation.png');
  await captureFullPage(page, '21-webp-mobile-390-full-page.png');
  await preparePage(page, '/convert-image-to-webp', 810, 1080);
  await useTheme(page, 'light');
  await captureViewport(page, '22-webp-tablet.png');
});
