import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007c-anchor-closeout');

async function openPrepareLogo(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.goto('/prepare-logo-for-website');
  await page.evaluate(() => document.fonts.ready);
}

async function activateReadySystemAnchor(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'See what you get', exact: true }).click();
  await expect(page).toHaveURL(/#ready-system$/);

  await expect.poll(async () => page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    const heading = document.querySelector<HTMLElement>('#prepare-system-title');

    if (!header || !heading) {
      return Number.NEGATIVE_INFINITY;
    }

    return heading.getBoundingClientRect().top - header.getBoundingClientRect().bottom;
  })).toBeGreaterThanOrEqual(16);
}

async function captureViewport(page: Page, filename: string): Promise<void> {
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, filename),
    animations: 'disabled',
  });
}

test('captures the FSG-007C sticky-header anchor closeout', async ({ page }) => {
  test.setTimeout(60_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  await openPrepareLogo(page, 390, 844);
  await captureViewport(page, 'mobile-390-before-anchor.png');
  await activateReadySystemAnchor(page);
  await captureViewport(page, 'mobile-390-after-see-what-you-get.png');

  await openPrepareLogo(page, 320, 720);
  await activateReadySystemAnchor(page);
  await captureViewport(page, 'mobile-320-after-see-what-you-get.png');

  await openPrepareLogo(page, 1440, 960);
  await activateReadySystemAnchor(page);
  await captureViewport(page, 'desktop-after-see-what-you-get.png');

  await openPrepareLogo(page, 390, 844);
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await page.keyboard.press('Tab');
  await expect(skipLink).toBeFocused();
  await captureViewport(page, 'keyboard-skip-link-focused.png');
});
