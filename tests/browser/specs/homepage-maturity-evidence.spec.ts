import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { gotoApp, uploadFile, waitForStatus } from '../helpers/app';

const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007g-homepage-maturity');
const captureEvidence = process.env.FSG_CAPTURE_HOMEPAGE_MATURITY === '1';

async function preparePage(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await gotoApp(page);
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
  const page = locator.page();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.locator('.fsg-header, .fsg-skip-link').evaluateAll((elements) => {
    elements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      htmlElement.dataset.evidenceVisibility = htmlElement.style.visibility;
      htmlElement.style.visibility = 'hidden';
    });
  });

  try {
    await locator.screenshot({ path: path.join(EVIDENCE_DIR, filename), animations: 'disabled' });
  } finally {
    await page.locator('.fsg-header, .fsg-skip-link').evaluateAll((elements) => {
      elements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        htmlElement.style.visibility = htmlElement.dataset.evidenceVisibility ?? '';
        delete htmlElement.dataset.evidenceVisibility;
      });
    });
  }
}

test('captures the complete FSG-007G homepage review inventory', async ({ page }) => {
  test.skip(!captureEvidence, 'Run with FSG_CAPTURE_HOMEPAGE_MATURITY=1 for the focused evidence set.');
  test.setTimeout(300_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  await preparePage(page, 1440, 900);
  await useTheme(page, 'light');
  await captureRegion(page.locator('.fsg-hero').first(), '01-desktop-hero.png');
  await captureViewport(page, '02-desktop-hero-workspace-fold.png');
  await captureRegion(page.locator('.fsg-workspace'), '03-desktop-workspace-empty.png');

  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');
  await captureRegion(page.locator('.fsg-workspace'), '04-desktop-workspace-selected-source.png');
  await captureRegion(page.locator('.fsg-workflow'), '05-desktop-quick-fit-launcher.png');
  await page.locator('#mode-tab-guided-fit').click();
  await captureRegion(page.locator('.fsg-workflow'), '06-desktop-guided-fit-launcher.png');
  await page.locator('#mode-tab-logo-pack').click();
  await captureRegion(page.locator('.fsg-workflow'), '07-desktop-logo-pack-launcher.png');

  await preparePage(page, 1440, 960);
  await useTheme(page, 'light');
  await captureRegion(page.locator('.fsg-home-modes'), '08-desktop-three-work-modes.png');
  await captureRegion(page.locator('.fsg-home-destinations'), '09-desktop-different-destinations.png');
  await captureRegion(page.locator('.fsg-home-control'), '10-desktop-crop-control.png');
  await captureRegion(page.locator('.fsg-home-processing'), '11-desktop-file-set-go-processing.png');
  await captureRegion(page.locator('.fsg-home-result-truth'), '12-desktop-result-truth.png');
  await captureRegion(page.locator('.fsg-home-trust'), '13-desktop-browser-local-trust.png');
  await captureRegion(page.locator('.fsg-home-directory'), '14-desktop-task-directory.png');
  await captureRegion(page.locator('.fsg-home-directory__header'), '15-desktop-final-cta.png');
  await captureFullPage(page, '16-desktop-full-homepage.png');

  await preparePage(page, 1440, 960);
  await useTheme(page, 'dark');
  await captureViewport(page, '17-dark-hero-workspace.png');
  await captureRegion(page.locator('.fsg-home-destinations'), '18-dark-destination.png');
  await captureRegion(page.locator('.fsg-home-processing'), '19-dark-processing.png');
  await captureFullPage(page, '20-dark-full-homepage.png');

  await preparePage(page, 320, 720);
  await useTheme(page, 'light');
  await captureRegion(page.locator('.fsg-hero').first(), '21-mobile-320-hero.png');
  await captureRegion(page.locator('.fsg-workspace'), '22-mobile-320-workspace.png');

  await preparePage(page, 390, 844);
  await useTheme(page, 'light');
  await captureRegion(page.locator('.fsg-home-modes'), '23-mobile-390-modes.png');
  await captureRegion(page.locator('.fsg-home-destinations'), '24-mobile-390-destination.png');
  await captureRegion(page.locator('.fsg-home-processing'), '25-mobile-390-processing.png');
  await captureRegion(page.locator('.fsg-home-directory'), '26-mobile-390-task-directory.png');
  await captureFullPage(page, '27-mobile-390-full-homepage.png');

  await preparePage(page, 810, 1080);
  await useTheme(page, 'light');
  await captureViewport(page, '28-tablet.png');
  await captureRegion(page.locator('.fsg-footer'), '29-footer-product-family-regression.png');
});
