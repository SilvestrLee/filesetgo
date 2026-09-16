import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { fixturePath, waitForStatus } from '../helpers/app';

const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007f-website-image-optimizer');
const captureEvidence = process.env.FSG_CAPTURE_WEBSITE_OPTIMIZER === '1';

async function preparePage(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/website-image-optimizer');
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
  const page = locator.page();
  await page.locator('.fsg-header, .fsg-skip-link').evaluateAll((elements) => {
    elements.forEach((element) => {
      (element as HTMLElement).dataset.evidenceVisibility = (element as HTMLElement).style.visibility;
      (element as HTMLElement).style.visibility = 'hidden';
    });
  });

  try {
    await locator.screenshot({
      path: path.join(EVIDENCE_DIR, filename),
      animations: 'disabled',
    });
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

test('captures the complete FSG-007F Website Image Optimizer review inventory', async ({ page }) => {
  test.skip(!captureEvidence, 'Run with FSG_CAPTURE_WEBSITE_OPTIMIZER=1 for the focused evidence set.');
  test.setTimeout(240_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  await preparePage(page, 1440, 960);
  await useTheme(page, 'light');
  await captureViewport(page, '01-desktop-hero.png');
  await captureRegion(page.locator('.fsg-optimizer-signature'), '02-desktop-source-to-three-destinations.png');
  await captureRegion(page.locator('.fsg-placement-story--hero'), '03-desktop-hero-destination.png');
  await captureRegion(page.locator('.fsg-placement-story--content'), '04-desktop-content-destination.png');
  await captureRegion(page.locator('.fsg-placement-story--card'), '05-desktop-card-destination.png');
  await captureRegion(page.locator('.fsg-placement-system'), '06-desktop-same-source-different-job.png');
  await captureRegion(page.locator('.fsg-focus-story'), '07-desktop-user-controlled-crop.png');
  await captureRegion(page.locator('.fsg-guided-journey'), '08-desktop-guided-fit-workflow.png');
  await captureRegion(page.locator('.fsg-optimizer-processing__inner'), '09-desktop-file-set-go-processing.png');
  await captureRegion(page.locator('.fsg-result-example'), '10-desktop-measured-example.png');
  await captureRegion(page.locator('.fsg-optimizer-trust'), '11-desktop-browser-local-trust.png');
  await captureRegion(page.locator('.fsg-optimizer-final'), '12-desktop-final-cta.png');
  await captureFullPage(page, '13-desktop-full-page.png');

  await preparePage(page, 1440, 960);
  await useTheme(page, 'dark');
  await captureViewport(page, '14-dark-hero.png');
  await captureRegion(page.locator('.fsg-placement-system'), '15-dark-destination-comparison.png');
  await captureRegion(page.locator('.fsg-focus-story'), '16-dark-crop.png');
  await captureRegion(page.locator('.fsg-optimizer-processing__inner'), '17-dark-processing.png');

  await preparePage(page, 320, 720);
  await useTheme(page, 'light');
  await captureRegion(page.locator('.fsg-optimizer-hero'), '18-mobile-320-hero.png');

  await preparePage(page, 390, 844);
  await useTheme(page, 'light');
  await captureRegion(page.locator('.fsg-placement-system'), '19-mobile-390-destination-comparison.png');
  await captureRegion(page.locator('.fsg-focus-story'), '20-mobile-390-crop.png');
  await captureRegion(page.locator('.fsg-optimizer-final'), '21-mobile-390-final-cta.png');
  await captureFullPage(page, '22-mobile-390-full-page.png');

  await preparePage(page, 810, 1080);
  await useTheme(page, 'light');
  await captureViewport(page, '23-tablet.png');

  await preparePage(page, 1440, 960);
  await useTheme(page, 'light');
  await page.getByRole('link', { name: 'Optimize my image', exact: true }).first().click();
  await expect(page).toHaveURL(/\/\?mode=guided-fit$/);
  await expect(page.locator('#source-required-dialog')).toBeVisible();
  await captureViewport(page, '24-cta-guided-fit-source-gate.png');

  const chooser = page.waitForEvent('filechooser');
  await page.locator('#source-required-choose').click();
  await (await chooser).setFiles(fixturePath('sample.png'));
  await waitForStatus(page, 'ready');
  await expect(page.locator('#guided-fit-dialog')).toBeVisible();
  await captureViewport(page, '25-guided-fit-resumed-after-source.png');

  await preparePage(page, 1440, 960);
  await useTheme(page, 'light');
  await captureRegion(page.locator('.fsg-footer'), '26-footer-product-family-regression.png');
});
