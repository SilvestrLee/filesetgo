import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007d-logo-acquisition');
const ANCHOR_EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007d-anchor-closeout');
const captureAnchorCloseout = process.env.FSG_ACQUISITION_ANCHOR_ONLY === '1';

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

async function capturePage(page: Page, filename: string, fullPage = false): Promise<void> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, filename),
    fullPage,
    style: '.fsg-skip-link { display: none !important; }',
  });
}

async function captureRegion(locator: Locator, filename: string): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await locator.page().evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await locator.screenshot({
    path: path.join(EVIDENCE_DIR, filename),
    style: '.fsg-header, .fsg-skip-link { display: none !important; }',
  });
}

test('captures the FSG-007D logo acquisition family', async ({ page }) => {
  test.skip(captureAnchorCloseout, 'The anchor-closeout run captures its own focused evidence set.');
  test.setTimeout(180_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });

  await preparePage(page, '/transparent-logo-for-website', 1440, 960);
  await useTheme(page, 'light');
  await capturePage(page, '01-transparent-desktop-hero.png');
  await captureRegion(page.locator('#transparent-proof'), '02-transparent-desktop-transformation.png');
  await captureRegion(page.locator('.fsg-transparent-review'), '03-transparent-desktop-review.png');
  await capturePage(page, '04-transparent-desktop-full-page.png', true);

  await useTheme(page, 'dark');
  await captureRegion(page.locator('.fsg-transparent-hero'), '05-transparent-dark-hero.png');
  await captureRegion(page.locator('#transparent-proof'), '06-transparent-dark-proof.png');

  await preparePage(page, '/transparent-logo-for-website', 320, 720);
  await useTheme(page, 'light');
  await capturePage(page, '07-transparent-mobile-320-hero.png');

  await preparePage(page, '/transparent-logo-for-website', 390, 844);
  await useTheme(page, 'light');
  await captureRegion(page.locator('#transparent-proof'), '08-transparent-mobile-390-transformation.png');
  await capturePage(page, '09-transparent-mobile-390-full-page.png', true);

  await preparePage(page, '/transparent-logo-for-website', 810, 1080);
  await useTheme(page, 'light');
  await capturePage(page, '10-transparent-tablet.png');

  await preparePage(page, '/favicon-generator', 1440, 960);
  await useTheme(page, 'light');
  await capturePage(page, '11-favicon-desktop-hero.png');
  await captureRegion(page.locator('.fsg-favicon-selection-story'), '12-favicon-desktop-compact-story.png');
  await captureRegion(page.locator('.fsg-favicon-actual'), '13-favicon-actual-size-evidence.png');
  await captureRegion(page.locator('.fsg-favicon-outputs'), '14-favicon-desktop-outputs.png');
  await capturePage(page, '15-favicon-desktop-full-page.png', true);

  await useTheme(page, 'dark');
  await captureRegion(page.locator('.fsg-favicon-hero'), '16-favicon-dark-hero.png');
  await captureRegion(page.locator('.fsg-favicon-actual'), '17-favicon-dark-proof.png');

  await preparePage(page, '/favicon-generator', 320, 720);
  await useTheme(page, 'light');
  await capturePage(page, '18-favicon-mobile-320-hero.png');

  await preparePage(page, '/favicon-generator', 390, 844);
  await useTheme(page, 'light');
  await captureRegion(page.locator('.fsg-favicon-selection-story'), '19-favicon-mobile-390-compact-story.png');
  await capturePage(page, '20-favicon-mobile-390-full-page.png', true);

  await preparePage(page, '/favicon-generator', 810, 1080);
  await useTheme(page, 'light');
  await capturePage(page, '21-favicon-tablet.png');
});

interface AnchorEvidenceCase {
  route: string;
  linkName: string;
  targetHash: string;
  headingSelector: string;
  beforeFilename: string;
  after390Filename: string;
  after320Filename: string;
  skipLinkFilename: string;
}

const ANCHOR_CASES: AnchorEvidenceCase[] = [
  {
    route: '/transparent-logo-for-website',
    linkName: 'See the surface proof',
    targetHash: '#transparent-proof',
    headingSelector: '#transparent-proof-title',
    beforeFilename: 'transparent-390-before-anchor.png',
    after390Filename: 'transparent-390-after-surface-proof.png',
    after320Filename: 'transparent-320-after-surface-proof.png',
    skipLinkFilename: 'keyboard-skip-link-transparent.png',
  },
  {
    route: '/favicon-generator',
    linkName: 'See actual sizes',
    targetHash: '#favicon-proof',
    headingSelector: '#favicon-actual-title',
    beforeFilename: 'favicon-390-before-anchor.png',
    after390Filename: 'favicon-390-after-actual-sizes.png',
    after320Filename: 'favicon-320-after-actual-sizes.png',
    skipLinkFilename: 'keyboard-skip-link-favicon.png',
  },
];

async function waitForScrollToSettle(page: Page): Promise<void> {
  await page.evaluate(async () => new Promise<void>((resolve) => {
    let previousY = window.scrollY;
    let stableFrames = 0;
    let totalFrames = 0;

    const checkPosition = (): void => {
      const currentY = window.scrollY;
      stableFrames = Math.abs(currentY - previousY) < 0.5 ? stableFrames + 1 : 0;
      previousY = currentY;
      totalFrames += 1;

      if (stableFrames >= 5 || totalFrames >= 180) {
        resolve();
        return;
      }

      window.requestAnimationFrame(checkPosition);
    };

    window.requestAnimationFrame(checkPosition);
  }));
}

async function assertSkipLinkOffscreen(page: Page): Promise<void> {
  const skipLinkIntersectsViewport = await page.locator('.fsg-skip-link').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
  });

  expect(skipLinkIntersectsViewport).toBe(false);
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function assertAnchorClearance(page: Page, anchorCase: AnchorEvidenceCase): Promise<void> {
  const clearance = await page.evaluate((headingSelector) => {
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    const heading = document.querySelector<HTMLElement>(headingSelector);
    const governedClearance = Number.parseFloat(
      window.getComputedStyle(document.documentElement).getPropertyValue('--fsg-anchor-breathing-room'),
    );

    if (!header || !heading || !Number.isFinite(governedClearance)) {
      return null;
    }

    return {
      actual: heading.getBoundingClientRect().top - header.getBoundingClientRect().bottom,
      governed: governedClearance,
    };
  }, anchorCase.headingSelector);

  expect(clearance).not.toBeNull();
  expect(clearance?.actual).toBeGreaterThanOrEqual((clearance?.governed ?? 0) - 1);
}

async function activateAnchor(page: Page, anchorCase: AnchorEvidenceCase): Promise<void> {
  await page.getByRole('link', { name: anchorCase.linkName, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`${anchorCase.targetHash}$`));
  await waitForScrollToSettle(page);
  await expect(page.locator(anchorCase.headingSelector)).toBeVisible();
  await assertAnchorClearance(page, anchorCase);
  await expect(page.locator('[data-site-header]')).toBeVisible();
  await expect(page.locator('[data-site-header]')).toHaveClass(/is-compact/);
  await assertSkipLinkOffscreen(page);
  await assertNoHorizontalOverflow(page);
}

async function captureViewport(page: Page, filename: string): Promise<void> {
  await page.screenshot({
    path: path.join(ANCHOR_EVIDENCE_DIR, filename),
    animations: 'disabled',
  });
}

test('captures the FSG-007D mobile internal-anchor closeout through real interaction', async ({ page }) => {
  test.skip(!captureAnchorCloseout, 'Run with FSG_ACQUISITION_ANCHOR_ONLY=1 for the focused closeout evidence.');
  test.setTimeout(90_000);
  await mkdir(ANCHOR_EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light' });

  for (const anchorCase of ANCHOR_CASES) {
    await preparePage(page, anchorCase.route, 390, 844);
    await useTheme(page, 'light');
    await assertSkipLinkOffscreen(page);
    await assertNoHorizontalOverflow(page);
    await captureViewport(page, anchorCase.beforeFilename);
    await activateAnchor(page, anchorCase);
    await captureViewport(page, anchorCase.after390Filename);

    await preparePage(page, anchorCase.route, 320, 720);
    await useTheme(page, 'light');
    await activateAnchor(page, anchorCase);
    await captureViewport(page, anchorCase.after320Filename);

    await preparePage(page, anchorCase.route, 390, 844);
    await useTheme(page, 'light');
    const skipLink = page.getByRole('link', { name: 'Skip to content' });
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeInViewport();
    await captureViewport(page, anchorCase.skipLinkFilename);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
    await expect(page.locator('#main-content')).toBeFocused();
  }
});
