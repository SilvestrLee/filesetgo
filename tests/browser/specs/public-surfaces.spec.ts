import { expect, test } from '@playwright/test';
import { gotoApp, selectMode, uploadFile, waitForStatus } from '../helpers/app';

/**
 * FSG-007 curated acquisition/public-surface suite (directive §41). Runs
 * against the same real, built application as every other browser spec —
 * these tests exercise the actual product's CTA/deep-link wiring, never a
 * synthetic reimplementation.
 */

const ACQUISITION_PAGES: Array<{ path: string; heading: string; cta: string; mode: 'quick-fit' | 'guided-fit' | 'logo-pack' }> = [
  { path: '/prepare-logo-for-website', heading: 'Turn one logo into a website-ready logo system.', cta: 'Prepare my logo', mode: 'logo-pack' },
  { path: '/transparent-logo-for-website', heading: 'Remove the box around your logo. Keep the logo intact.', cta: 'Make my logo transparent', mode: 'logo-pack' },
  { path: '/favicon-generator', heading: 'Turn the right part of your logo into a favicon people can actually see.', cta: 'Create my favicon', mode: 'logo-pack' },
  { path: '/website-image-optimizer', heading: 'Prepare the image for where it will live on your website.', cta: 'Optimize my image', mode: 'guided-fit' },
  { path: '/compress-image-for-website', heading: 'Make the image lighter without making it useless.', cta: 'Compress my image', mode: 'quick-fit' },
  { path: '/convert-image-to-webp', heading: 'Turn your image into a web-ready WebP.', cta: 'Convert to WebP', mode: 'quick-fit' },
];

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function assertReadySystemAnchorClearance(
  page: import('@playwright/test').Page,
  viewport: { width: number; height: number },
): Promise<void> {
  await page.setViewportSize(viewport);
  await page.goto('/prepare-logo-for-website');

  const skipLink = page.locator('.fsg-skip-link');
  const readySystemHeading = page.getByRole('heading', { level: 2, name: 'From one file to a ready logo system.' });

  await page.getByRole('link', { name: 'See what you get', exact: true }).click();
  await expect(page).toHaveURL(/#ready-system$/);
  await expect(readySystemHeading).toBeVisible();

  await expect.poll(async () => page.evaluate(() => {
    const header = document.querySelector<HTMLElement>('[data-site-header]');
    const heading = document.querySelector<HTMLElement>('#prepare-system-title');

    if (!header || !heading) {
      return Number.NEGATIVE_INFINITY;
    }

    return heading.getBoundingClientRect().top - header.getBoundingClientRect().bottom;
  })).toBeGreaterThanOrEqual(16);

  const skipLinkBottom = await skipLink.evaluate((element) => element.getBoundingClientRect().bottom);
  expect(skipLinkBottom).toBeLessThanOrEqual(0);
  await assertNoHorizontalOverflow(page);
}

test.describe('Homepage (public surface)', () => {
  test('boots and every mode tab still works', async ({ page }) => {
    await gotoApp(page);
    // A launcher button needs an active source to open its real dialog
    // rather than the source-required gate (FSG-007-FIT-001B directive §30).
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');

    await selectMode(page, 'guided-fit');
    await expect(page.locator('#guided-fit-panel')).toBeVisible();

    await selectMode(page, 'logo-pack');
    await expect(page.locator('#logo-pack-panel')).toBeVisible();

    await selectMode(page, 'quick-fit');
    await expect(page.locator('#mode-tab-quick-fit')).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Theme preference', () => {
  test('follows the system initially and persists an explicit choice across reloads and navigation', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 23, 42)');

    const themeControl = page.locator('[data-theme-toggle]');
    await themeControl.focus();
    await expect(themeControl).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(themeControl).toHaveAttribute('aria-label', 'Switch to dark theme');
    expect(await page.evaluate(() => window.localStorage.getItem('filesetgo-theme'))).toBe('light');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.goto('/compress-image-for-website');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.locator('[data-theme-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 23, 42)');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(15, 23, 42)');
    await expect(page.locator('.fsg-task-visual')).toHaveCSS('background-color', 'rgb(23, 32, 51)');
  });

  test('uses the approved wordmark variant without changing its intrinsic ratio', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const lightLogo = page.locator('.fsg-header .fsg-brand__logo--light');
    const darkLogo = page.locator('.fsg-header .fsg-brand__logo--dark');
    await expect(lightLogo).toBeVisible();
    await expect(darkLogo).toBeHidden();
    await expect(lightLogo).toHaveAttribute('src', '/brand/filesetgo-logo-light-bg.png');

    const ratio = await lightLogo.evaluate((image: HTMLImageElement) => image.naturalWidth / image.naturalHeight);
    expect(ratio).toBeCloseTo(2018 / 442, 4);

    await page.locator('[data-theme-toggle]').click();
    await expect(lightLogo).toBeHidden();
    await expect(darkLogo).toBeVisible();
    await expect(darkLogo).toHaveAttribute('src', '/brand/filesetgo-logo-dark-bg.png');
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

test.describe('Prepare Logo acquisition prototype', () => {
  test('uses one real workflow launch and has no parallel upload control', async ({ page }) => {
    await page.goto('/prepare-logo-for-website');

    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 2, name: 'From one file to a ready logo system.' })).toBeVisible();
    await expect(page.locator('.fsg-prepare-demo img')).toHaveCount(5);

    // No source is selected yet — the deep link preserves the intended mode
    // and shows the source-required gate instead of opening a Logo Pack
    // dialog with nothing to review (FSG-007-FIT-001B directive §24/§25).
    // Logo Pack itself has no upload control of its own any more — the gate's
    // "Choose image" leads to the one central source input, not a duplicate.
    await page.getByRole('link', { name: 'Prepare my logo', exact: true }).first().click();
    await expect(page).toHaveURL(/\/\?mode=logo-pack$/);
    await expect(page.locator('#source-required-dialog')).toBeVisible();
    await expect(page.locator('#logo-pack-dialog')).toBeHidden();
    await expect(page.locator('#logo-pack-source-file')).toHaveCount(0);
  });

  test('includes Mail. Set. Go. as an unavailable family product without a dead link', async ({ page }) => {
    await page.goto('/prepare-logo-for-website');

    const mailProduct = page.locator('.fsg-footer__product').filter({ hasText: 'Mail. Set. Go.' });
    await expect(mailProduct).toContainText('Coming soon');
    await expect(mailProduct.locator('a')).toHaveCount(0);
  });

  for (const width of [320, 390, 430]) {
    test(`keeps the product story within a ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/prepare-logo-for-website');

      await assertNoHorizontalOverflow(page);
      await expect(page.getByRole('link', { name: 'Prepare my logo', exact: true }).first()).toBeVisible();
      await expect(page.locator('.fsg-prepare-system__outputs')).toBeVisible();
    });
  }

  for (const viewport of [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 430, height: 860 },
    { width: 810, height: 1080 },
    { width: 1440, height: 960 },
  ]) {
    test(`keeps the ready-system anchor below the sticky header at ${viewport.width}px`, async ({ page }) => {
      await assertReadySystemAnchorClearance(page, viewport);
    });
  }

  test('reveals the skip link for keyboard focus and moves focus to main content', async ({ page }) => {
    await page.goto('/prepare-logo-for-website');

    const skipLink = page.getByRole('link', { name: 'Skip to content' });
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    expect(await skipLink.evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
    await expect(page.locator('#main-content')).toBeFocused();
  });
});

test.describe('Logo acquisition family', () => {
  test('uses the governed workflow and truthful transparency review language without a duplicate upload', async ({ page }) => {
    await page.goto('/transparent-logo-for-website');

    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.getByText('Needs Review', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Careful is better than confidently wrong.')).toBeVisible();

    // Same source-required gate as the other acquisition CTAs — no source
    // yet, so the deep link preserves intent rather than opening an empty
    // dialog (FSG-007-FIT-001B directive §24/§25); Logo Pack has no upload
    // control of its own any more.
    await page.getByRole('link', { name: 'Make my logo transparent', exact: true }).first().click();
    await expect(page).toHaveURL(/\/\?mode=logo-pack$/);
    await expect(page.locator('#source-required-dialog')).toBeVisible();
    await expect(page.locator('#logo-pack-dialog')).toBeHidden();
    await expect(page.locator('#logo-pack-source-file')).toHaveCount(0);
  });

  test('renders genuine actual-size favicon evidence and launches the existing Logo Pack', async ({ page }) => {
    await page.goto('/favicon-generator');

    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    const icon16 = page.locator('.fsg-favicon-actual-16');
    const icon32 = page.locator('.fsg-favicon-actual__stage .fsg-favicon-actual-32');

    await expect(icon16).toHaveCSS('width', '16px');
    await expect(icon16).toHaveCSS('height', '16px');
    await expect(icon32).toHaveCSS('width', '32px');
    await expect(icon32).toHaveCSS('height', '32px');
    await expect(page.getByText('Actual 16 px icon', { exact: true })).toBeVisible();
    await expect(page.getByText('Actual 32 px icon', { exact: true })).toBeVisible();

    // Same source-required gate as the other acquisition CTAs (FSG-007-FIT-001B
    // directive §24/§25) — no source yet, so the deep link preserves intent
    // rather than opening an empty dialog.
    await page.getByRole('link', { name: 'Create my favicon', exact: true }).first().click();
    await expect(page).toHaveURL(/\/\?mode=logo-pack$/);
    await expect(page.locator('#source-required-dialog')).toBeVisible();
    await expect(page.locator('#logo-pack-dialog')).toBeHidden();
  });

  test('keeps Mail. Set. Go. in the frozen footer family', async ({ page }) => {
    await page.goto('/favicon-generator');

    const mailProduct = page.locator('.fsg-footer__product').filter({ hasText: 'Mail. Set. Go.' });
    await expect(mailProduct).toContainText('Coming soon');
    await expect(mailProduct.locator('a')).toHaveCount(0);
  });

  test('keeps both product demonstrations intentional in dark mode', async ({ page }) => {
    await page.goto('/transparent-logo-for-website');
    await page.locator('[data-theme-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-resolved', 'dark');
    await expect(page.locator('.fsg-transparent-proof__surface--dark')).toHaveCSS('background-color', 'rgb(15, 23, 42)');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('color', 'rgb(248, 250, 252)');

    await page.goto('/favicon-generator');
    await expect(page.locator('html')).toHaveAttribute('data-theme-resolved', 'dark');
    await expect(page.locator('.fsg-favicon-browser-proof--light')).toHaveCSS('background-color', 'rgb(248, 250, 252)');
    await expect(page.locator('.fsg-favicon-browser-proof--dark')).toHaveCSS('background-color', 'rgb(15, 23, 42)');
  });

  test('keeps both primary actions keyboard reachable and preserves the skip link', async ({ page }) => {
    for (const route of ['/transparent-logo-for-website', '/favicon-generator']) {
      await page.goto(route);
      const primaryAction = page.locator('.fsg-logo-hero .fsg-primary-action');
      await primaryAction.focus();
      await expect(primaryAction).toBeFocused();

      await page.goto(route);
      const skipLink = page.getByRole('link', { name: 'Skip to content' });
      await page.keyboard.press('Tab');
      await expect(skipLink).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('#main-content')).toBeFocused();
    }
  });

  for (const width of [320, 390, 430]) {
    for (const route of ['/transparent-logo-for-website', '/favicon-generator']) {
      test(`${route} stays within the ${width}px viewport`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(route);

        await assertNoHorizontalOverflow(page);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      });
    }
  }

  for (const anchorCase of [
    { path: '/transparent-logo-for-website', link: 'See the surface proof', target: '#transparent-proof' },
    { path: '/favicon-generator', link: 'See actual sizes', target: '#favicon-proof' },
  ]) {
    test(`${anchorCase.path} keeps its proof heading below the sticky header`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(anchorCase.path);
      await page.getByRole('link', { name: anchorCase.link, exact: true }).click();

      await expect(page).toHaveURL(new RegExp(`${anchorCase.target}$`));
      await expect.poll(async () => page.evaluate((target) => {
        const header = document.querySelector<HTMLElement>('[data-site-header]');
        const heading = document.querySelector<HTMLElement>(`${target} h2`);

        if (!header || !heading) {
          return Number.NEGATIVE_INFINITY;
        }

        return heading.getBoundingClientRect().top - header.getBoundingClientRect().bottom;
      }, anchorCase.target)).toBeGreaterThanOrEqual(16);

      await assertNoHorizontalOverflow(page);
    });
  }
});

test.describe('Image transformation acquisition family', () => {
  test('uses real governed fixture evidence and launches Quick Fit without a duplicate upload', async ({ page }) => {
    await page.goto('/compress-image-for-website');

    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.locator('.fsg-compress-demo')).toContainText('440.9 KB');
    await expect(page.locator('.fsg-compress-demo')).toContainText('Under 30 KB');
    await expect(page.locator('.fsg-compress-demo')).toContainText('27.1 KB');
    await expect(page.locator('.fsg-compress-demo')).toContainText('2947 × 1965');

    await page.getByRole('link', { name: 'Compress my image', exact: true }).first().click();
    await expect(page).toHaveURL(/\/\?mode=quick-fit$/);
    await expect(page.locator('#quick-fit-app')).toBeVisible();
  });

  test('labels the real PNG to WebP example without promising a universal reduction', async ({ page }) => {
    await page.goto('/convert-image-to-webp');

    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.locator('.fsg-webp-demo')).toContainText('PNG');
    await expect(page.locator('.fsg-webp-demo')).toContainText('101.5 KB');
    await expect(page.locator('.fsg-webp-demo')).toContainText('WebP');
    await expect(page.locator('.fsg-webp-demo')).toContainText('1.9 KB');
    await expect(page.getByText('File-size change varies by image.')).toBeVisible();

    await page.getByRole('link', { name: 'Convert to WebP', exact: true }).first().click();
    await expect(page).toHaveURL(/\/\?mode=quick-fit$/);
    await expect(page.locator('#quick-fit-app')).toBeVisible();
  });

  test('keeps both transformation demonstrations intentional in dark mode', async ({ page }) => {
    await page.goto('/compress-image-for-website');
    await page.locator('[data-theme-toggle]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme-resolved', 'dark');
    await expect(page.locator('.fsg-transform-demo')).toHaveCSS('background-color', 'rgb(23, 32, 51)');
    await expect(page.locator('#compress-proof')).toHaveCSS('background-color', 'rgb(11, 18, 32)');

    await page.goto('/convert-image-to-webp');
    await expect(page.locator('html')).toHaveAttribute('data-theme-resolved', 'dark');
    await expect(page.locator('.fsg-webp-proof')).toHaveCSS('background-color', 'rgb(11, 18, 32)');
  });

  for (const width of [320, 390, 430]) {
    for (const route of ['/compress-image-for-website', '/convert-image-to-webp']) {
      test(`${route} stays within the ${width}px viewport`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(route);

        await assertNoHorizontalOverflow(page);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      });
    }
  }

  for (const anchorCase of [
    { path: '/compress-image-for-website', link: 'See how it works', target: '#compress-proof', heading: '#compress-proof-title' },
    { path: '/convert-image-to-webp', link: 'See the difference', target: '#webp-proof', heading: '#webp-proof-title' },
  ]) {
    test(`${anchorCase.path} keeps its proof heading below the sticky header`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(anchorCase.path);
      await page.getByRole('link', { name: anchorCase.link, exact: true }).click();

      await expect(page).toHaveURL(new RegExp(`${anchorCase.target}$`));
      await expect.poll(async () => page.evaluate((headingSelector) => {
        const header = document.querySelector<HTMLElement>('[data-site-header]');
        const heading = document.querySelector<HTMLElement>(headingSelector);

        if (!header || !heading) {
          return Number.NEGATIVE_INFINITY;
        }

        return heading.getBoundingClientRect().top - header.getBoundingClientRect().bottom;
      }, anchorCase.heading)).toBeGreaterThanOrEqual(16);

      await expect(page.locator('.fsg-skip-link')).not.toBeInViewport();
      await assertNoHorizontalOverflow(page);
    });
  }

  test('preserves the keyboard skip link and frozen Mail. Set. Go. footer entry', async ({ page }) => {
    await page.goto('/compress-image-for-website');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();

    await page.goto('/convert-image-to-webp');
    const mailProduct = page.locator('.fsg-footer__product').filter({ hasText: 'Mail. Set. Go.' });
    await expect(mailProduct).toContainText('Coming soon');
    await expect(mailProduct.locator('a')).toHaveCount(0);
  });
});

test.describe('404 surface', () => {
  test('an unknown route returns a real 404 with a way back in', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('link', { name: 'Go to FileSetGo' })).toBeVisible();
  });
});
