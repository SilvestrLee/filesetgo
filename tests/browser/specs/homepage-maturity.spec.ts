import { expect, test, type Page } from '@playwright/test';
import { gotoApp, uploadFile, waitForStatus } from '../helpers/app';

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const measurements = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(measurements.scrollWidth).toBeLessThanOrEqual(measurements.clientWidth + 1);
}

test.describe('FSG-007G homepage product maturity', () => {
  test('renders one H1, boots the frozen workspace and explains the three real work modes', async ({ page }) => {
    await gotoApp(page);

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Get your file ready for where it needs to go.' })).toBeVisible();
    await expect(page.locator('#quick-fit-app')).toBeVisible();
    await expect(page.locator('#status-message')).toHaveAttribute('data-state', 'idle');
    await expect(page.locator('.fsg-home-mode')).toHaveCount(3);
    await expect(page.getByRole('heading', { level: 3, name: 'Quick Fit' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Guided Fit' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 3, name: 'Logo Pack' })).toBeVisible();
  });

  test('keeps tabs as mode switches and launchers as the workflow action', async ({ page }) => {
    await gotoApp(page);

    await page.locator('#mode-tab-guided-fit').click();
    await expect(page.locator('#mode-tab-guided-fit')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#guided-fit-panel')).toBeVisible();
    await expect(page.locator('#guided-fit-dialog')).toBeHidden();
    await expect(page.locator('#source-required-dialog')).toBeHidden();

    await page.locator('#guided-fit-open').click();
    await expect(page.locator('#source-required-dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.locator('#mode-tab-logo-pack').click();
    await expect(page.locator('#mode-tab-logo-pack')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#logo-pack-dialog')).toBeHidden();
    await page.locator('#logo-pack-open').click();
    await expect(page.locator('#source-required-dialog')).toBeVisible();
  });

  test('preserves the unified selected-source state and all three real launchers', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');

    await expect(page.locator('#drop-zone')).toBeHidden();
    await expect(page.locator('#source-panel')).toBeVisible();
    await expect(page.locator('#source-name')).toHaveText('sample.jpg');
    await expect(page.locator('#source-format')).toHaveText('JPEG');
    await expect(page.locator('#source-dimensions')).toHaveText('640 × 480');
    await expect(page.locator('#quick-fit-open')).toBeEnabled();

    await page.locator('#mode-tab-guided-fit').click();
    await expect(page.locator('#guided-fit-open')).toBeEnabled();
    await page.locator('#mode-tab-logo-pack').click();
    await expect(page.locator('#logo-pack-open')).toBeEnabled();
  });

  test('uses governed destination geometry, user-control language and current processing grammar', async ({ page }) => {
    await gotoApp(page);

    const destinations = page.locator('.fsg-home-destinations');
    await expect(destinations).toContainText('1600 × 900');
    await expect(destinations).toContainText('1200 × 800');
    await expect(destinations).toContainText('800 × 600');
    await expect(destinations).not.toContainText(/up to/i);
    await expect(page.locator('.fsg-home-control')).toContainText('you choose what stays');
    await expect(page.locator('.fsg-home-control')).toContainText('No silent crop');
    await expect(page.locator('.fsg-home-control')).not.toContainText(/automatic crop|smart crop/i);

    await expect(page.locator('.fsg-home-processing__state .fsg-processing-rail')).toHaveCount(2);
    await expect(page.locator('.fsg-home-processing__state .fsg-processing-rail[data-phase="preparing"]')).toHaveCount(1);
    await expect(page.locator('.fsg-home-processing__state .fsg-processing-rail[data-phase="ready"]')).toHaveCount(1);
    for (const stage of ['file', 'set', 'go']) {
      await expect(page.locator(`.fsg-home-processing__state [data-stage="${stage}"]`)).toHaveCount(2);
    }
  });

  test('links the task directory to the governed acquisition routes and Quick Fit intent', async ({ page }) => {
    await gotoApp(page);

    const expectedLinks: Array<[string, string]> = [
      ['Prepare a logo', '/prepare-logo-for-website'],
      ['Make a logo transparent', '/transparent-logo-for-website'],
      ['Create a favicon', '/favicon-generator'],
      ['Optimize a website image', '/website-image-optimizer'],
      ['Compress an image', '/compress-image-for-website'],
      ['Convert to WebP', '/convert-image-to-webp'],
      ['Use Quick Fit', '/?mode=quick-fit'],
    ];

    for (const [name, href] of expectedLinks) {
      await expect(page.getByRole('link', { name, exact: true })).toHaveAttribute('href', href);
    }
  });

  for (const width of [320, 390, 430]) {
    test(`keeps the complete product story inside ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await gotoApp(page);

      await assertNoHorizontalOverflow(page);
      await expect(page.locator('.fsg-workspace')).toBeVisible();
      await expect(page.locator('.fsg-home-modes')).toBeVisible();
      await expect(page.locator('.fsg-home-destination-map')).toBeVisible();
      await expect(page.locator('.fsg-home-crop')).toBeVisible();
      await expect(page.locator('.fsg-home-processing')).toBeVisible();
      await expect(page.locator('.fsg-home-directory')).toBeVisible();
    });
  }

  test('renders the hero, workspace, destination, crop, processing and tasks intentionally in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await gotoApp(page);

    await expect(page.locator('html')).toHaveAttribute('data-theme-resolved', 'dark');
    await expect(page.locator('.fsg-workspace')).toHaveCSS('background-color', 'rgb(23, 32, 51)');
    await expect(page.locator('.fsg-home-mode--guided')).toBeVisible();
    await expect(page.locator('.fsg-home-destination-map')).toBeVisible();
    await expect(page.locator('.fsg-home-crop')).toBeVisible();
    await expect(page.locator('.fsg-home-processing__state').first()).toBeVisible();
    await expect(page.locator('.fsg-home-directory')).toHaveCSS('background-color', 'rgb(11, 18, 32)');
  });

  test('preserves the product-family footer and all frozen acquisition routes', async ({ page }) => {
    await gotoApp(page);

    const footer = page.locator('.fsg-footer');
    await expect(footer).toContainText('File. Set. Go.');
    await expect(footer).toContainText('Mail. Set. Go.');
    await expect(footer).toContainText('Coming soon');

    for (const path of [
      '/prepare-logo-for-website',
      '/transparent-logo-for-website',
      '/favicon-generator',
      '/website-image-optimizer',
      '/compress-image-for-website',
      '/convert-image-to-webp',
    ]) {
      const response = await page.request.get(path);
      expect(response.status()).toBe(200);
    }
  });
});
