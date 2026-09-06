import { expect, test } from '@playwright/test';
import { gotoApp, selectMode } from '../helpers/app';

/**
 * FSG-007 curated acquisition/public-surface suite (directive §41). Runs
 * against the same real, built application as every other browser spec —
 * these tests exercise the actual product's CTA/deep-link wiring, never a
 * synthetic reimplementation.
 */

const ACQUISITION_PAGES: Array<{ path: string; heading: string; cta: string; mode: 'quick-fit' | 'guided-fit' | 'logo-pack' }> = [
  { path: '/prepare-logo-for-website', heading: 'Prepare your logo for your website', cta: 'Prepare my logo', mode: 'logo-pack' },
  { path: '/transparent-logo-for-website', heading: 'Get a transparent logo for your website', cta: 'Prepare a transparent logo', mode: 'logo-pack' },
  { path: '/favicon-generator', heading: 'Create a favicon for your website', cta: 'Create my website logo pack', mode: 'logo-pack' },
  { path: '/website-image-optimizer', heading: 'Optimize an image for your website', cta: 'Optimize my website image', mode: 'guided-fit' },
  { path: '/compress-image-for-website', heading: 'Compress an image for your website', cta: 'Reduce my image size', mode: 'quick-fit' },
  { path: '/convert-image-to-webp', heading: 'Convert an image to WebP', cta: 'Convert my image to WebP', mode: 'quick-fit' },
];

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe('Homepage (public surface)', () => {
  test('boots and every mode tab still works', async ({ page }) => {
    await gotoApp(page);

    await selectMode(page, 'guided-fit');
    await expect(page.locator('#guided-fit-panel')).toBeVisible();

    await selectMode(page, 'logo-pack');
    await expect(page.locator('#logo-pack-panel')).toBeVisible();

    await selectMode(page, 'quick-fit');
    await expect(page.locator('#mode-tab-quick-fit')).toHaveAttribute('aria-selected', 'true');
  });
});

for (const acquisitionPage of ACQUISITION_PAGES) {
  test.describe(`Acquisition page: ${acquisitionPage.path}`, () => {
    test('renders its H1 and CTA navigates to the working product with the intended mode preselected', async ({ page }) => {
      await page.goto(acquisitionPage.path);
      await expect(page.getByRole('heading', { level: 1, name: acquisitionPage.heading })).toBeVisible();

      await page.getByRole('link', { name: acquisitionPage.cta, exact: true }).first().click();

      await expect(page).toHaveURL(new RegExp(`\\/\\?mode=${acquisitionPage.mode}$`));
      await expect(page.locator('#quick-fit-app')).toBeVisible();
      await expect(page.locator(`#mode-tab-${acquisitionPage.mode}`)).toHaveAttribute('aria-selected', 'true');

      // The deep link only ever preselects a mode — it never selects a
      // source, starts processing, or (for Logo Pack) chooses a background.
      await expect(page.locator('#source-panel')).toBeHidden();
      if (acquisitionPage.mode === 'logo-pack') {
        await expect(page.locator('#logo-pack-mode-transparent')).not.toBeChecked();
        await expect(page.locator('#logo-pack-mode-original')).not.toBeChecked();
      }
    });

    test('no horizontal overflow at 320px and the CTA stays reachable', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(acquisitionPage.path);

      await assertNoHorizontalOverflow(page);
      await expect(page.getByRole('link', { name: acquisitionPage.cta, exact: true }).first()).toBeVisible();
    });
  });
}

test.describe('Deep-linking safety (directive §9)', () => {
  test('an unrecognised ?mode= value is a safe no-op, not an error', async ({ page }) => {
    await page.goto('/?mode=not-a-real-mode');

    await expect(page.locator('#quick-fit-app')).toBeVisible();
    await expect(page.locator('#mode-tab-quick-fit')).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Keyboard access (directive §45)', () => {
  test('primary navigation and an acquisition page CTA are keyboard-reachable', async ({ page }) => {
    await page.goto('/prepare-logo-for-website');

    const cta = page.getByRole('link', { name: 'Prepare my logo', exact: true }).first();
    await cta.focus();
    await expect(cta).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/\?mode=logo-pack$/);
  });
});

test.describe('404 surface', () => {
  test('an unknown route returns a real 404 with a way back in', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('link', { name: 'Go to File. Set. Go.' })).toBeVisible();
  });
});
