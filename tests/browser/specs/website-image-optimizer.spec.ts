import { expect, test, type Locator, type Page } from '@playwright/test';
import { PRESET_CATALOG } from '../../../resources/js/presets/catalog';
import { fixturePath, waitForStatus } from '../helpers/app';

const acquisitionRoutes = [
  '/prepare-logo-for-website',
  '/transparent-logo-for-website',
  '/favicon-generator',
  '/website-image-optimizer',
  '/compress-image-for-website',
  '/convert-image-to-webp',
] as const;

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const sizes = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth + 1);
}

async function aspectRatio(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!.width / box!.height;
}

test.describe('FSG-007F Website Image Optimizer acquisition page', () => {
  test('renders one H1, real destination geometry and no acquisition uploader or stale boundary wording', async ({ page }) => {
    await page.goto('/website-image-optimizer');

    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Prepare the image for where it will live on your website.');
    await expect(page.locator('input[type="file"]')).toHaveCount(0);

    for (const preset of PRESET_CATALOG) {
      const destination = page.locator(`.fsg-placement-story[data-preset-id="${preset.id}"]`);
      await expect(destination).toBeVisible();
      await expect(destination).toContainText(`${preset.requirements.maxWidth} × ${preset.requirements.maxHeight}`);
      await expect(destination).toContainText('WebP');
      await expect(destination).toContainText(`Under ${preset.requirements.targetBytes! / 1024} KB`);
    }

    await expect(page.getByText(/up to 1600|up to 1200|up to 800/i)).toHaveCount(0);
    await expect(page.getByText('File. Set. Go. never decides the crop for you.')).toBeVisible();
    await expect(page.getByText(/automatic crop|automatically crops/i)).toHaveCount(0);
  });

  test('shows measurably different 16:9, 3:2 and 4:3 destination frames', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.goto('/website-image-optimizer');

    const heroImage = page.locator('.fsg-placement-story--hero img');
    const contentImage = page.locator('.fsg-placement-story--content img');
    const cardImage = page.locator('.fsg-placement-story--card img');

    expect(await aspectRatio(heroImage)).toBeCloseTo(16 / 9, 2);
    expect(await aspectRatio(contentImage)).toBeCloseTo(3 / 2, 2);
    expect(await aspectRatio(cardImage)).toBeCloseTo(4 / 3, 2);

    const heroBox = await heroImage.boundingBox();
    const contentBox = await contentImage.boundingBox();
    const cardBox = await cardImage.boundingBox();
    expect(heroBox!.width).toBeGreaterThan(contentBox!.width);
    expect(contentBox!.width).toBeGreaterThan(cardBox!.width);
  });

  test('primary CTA preserves Guided Fit intent through the source gate and resumes after source selection', async ({ page }) => {
    await page.goto('/website-image-optimizer');
    await page.getByRole('link', { name: 'Optimize my image', exact: true }).first().click();

    await expect(page).toHaveURL(/\/\?mode=guided-fit$/);
    await expect(page.locator('#mode-tab-guided-fit')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#source-required-dialog')).toBeVisible();
    await expect(page.locator('#guided-fit-dialog')).toBeHidden();

    const chooser = page.waitForEvent('filechooser');
    await page.locator('#source-required-choose').click();
    await (await chooser).setFiles(fixturePath('sample.png'));
    await waitForStatus(page, 'ready');

    await expect(page.locator('#source-required-dialog')).toBeHidden();
    await expect(page.locator('#guided-fit-dialog')).toBeVisible();
    await expect(page.locator('#guided-fit-source-name')).toHaveText('sample.png');
  });

  for (const width of [320, 390, 430]) {
    test(`keeps the destination, crop and CTA story inside ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/website-image-optimizer');

      await expectNoHorizontalOverflow(page);
      await expect(page.locator('.fsg-optimizer-signature__outputs')).toBeVisible();
      await expect(page.locator('.fsg-focus-demo')).toBeVisible();
      await expect(page.locator('.fsg-optimizer-final .fsg-primary-action')).toBeVisible();
    });
  }

  test('keeps the placements anchor clear of the sticky header', async ({ page }) => {
    await page.setViewportSize({ width: 810, height: 1080 });
    await page.goto('/website-image-optimizer');
    await page.getByRole('link', { name: 'See the website placements', exact: true }).click();
    await expect(page).toHaveURL(/#website-placements$/);

    await expect.poll(async () => page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('[data-site-header]');
      const heading = document.querySelector<HTMLElement>('#website-placements-title');
      return header && heading ? heading.getBoundingClientRect().top - header.getBoundingClientRect().bottom : -1;
    })).toBeGreaterThanOrEqual(16);
  });

  test('renders the hero, crop, processing and final CTA intentionally in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/website-image-optimizer');
    await page.locator('[data-theme-toggle]').click();

    await expect(page.locator('html')).toHaveAttribute('data-theme-resolved', 'dark');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('color', 'rgb(248, 250, 252)');
    await expect(page.locator('.fsg-focus-demo__frame')).toHaveCSS('border-top-color', 'rgb(248, 250, 252)');
    const readyNode = page.locator('.fsg-processing-story__state--ready [data-stage="go"] .fsg-processing-rail__node');
    await expect(readyNode).toHaveCSS('border-top-style', 'solid');
    await expect(readyNode.locator('[data-node-icon="check"]')).toBeVisible();
    await expect(page.locator('.fsg-optimizer-final .fsg-primary-action')).toBeVisible();
  });

  test('preserves the frozen acquisition family and footer', async ({ page }) => {
    for (const route of acquisitionRoutes) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
    }

    const mailProduct = page.locator('.fsg-footer__product').filter({ hasText: 'Mail. Set. Go.' });
    await expect(mailProduct).toContainText('Coming soon');
    await expect(mailProduct.locator('a')).toHaveCount(0);
  });
});
