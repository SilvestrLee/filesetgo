import { expect, test, type Page } from '@playwright/test';

const PUBLIC_PATHS = [
  '/',
  '/prepare-logo-for-website',
  '/transparent-logo-for-website',
  '/favicon-generator',
  '/website-image-optimizer',
  '/compress-image-for-website',
  '/convert-image-to-webp',
  '/privacy',
  '/terms',
  '/this-page-does-not-exist',
] as const;

async function scrollTo(page: Page, position: number): Promise<void> {
  await page.evaluate((top) => window.scrollTo(0, top), position);
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe('Global header state', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('uses stable top and compact states with a hysteresis gap', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('[data-site-header]');

    await expect(header).toHaveAttribute('data-header-state', 'top');
    const topBox = await header.boundingBox();

    await scrollTo(page, 80);
    await expect(header).toHaveAttribute('data-header-state', 'scrolled');
    const compactBox = await header.boundingBox();

    expect(topBox).not.toBeNull();
    expect(compactBox).not.toBeNull();
    if (topBox !== null && compactBox !== null) {
      expect(compactBox.height).toBeLessThan(topBox.height);
    }

    await scrollTo(page, 40);
    await expect(header).toHaveAttribute('data-header-state', 'scrolled');

    await scrollTo(page, 20);
    await expect(header).toHaveAttribute('data-header-state', 'top');
  });

  test('removes non-essential header animation when reduced motion is requested', async ({ page }) => {
    await page.goto('/');

    const transitionsAreEffectivelyDisabled = await page.locator('[data-site-header]').evaluate((header) => {
      return getComputedStyle(header).transitionDuration.split(',').every((duration) => {
        const trimmedDuration = duration.trim();
        const milliseconds = trimmedDuration.endsWith('ms')
          ? Number.parseFloat(trimmedDuration)
          : Number.parseFloat(trimmedDuration) * 1000;

        return milliseconds <= 1;
      });
    });

    expect(transitionsAreEffectivelyDisabled).toBe(true);
  });

  test('uses the same shared header on every governed public surface', async ({ page }) => {
    for (const path of PUBLIC_PATHS) {
      await page.goto(path);
      await expect(page.locator('[data-site-header]')).toHaveCount(1);
      await expect(page.getByRole('navigation', { name: 'Primary' })).toHaveCount(1);
      await expect(page.locator('[data-theme-toggle]')).toBeVisible();
    }
  });

  test('theme switching remains immediate and persistent in both header states', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto('/');

    const toggle = page.locator('[data-theme-toggle]');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark theme');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await scrollTo(page, 100);
    await expect(page.locator('[data-site-header]')).toHaveAttribute('data-header-state', 'scrolled');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to light theme');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('Website Tasks disclosure', () => {
  test('opens by click, closes outside, and restores trigger focus after Escape', async ({ page }) => {
    await page.goto('/');

    const disclosure = page.locator('[data-task-navigation]');
    const trigger = disclosure.locator('summary');

    await trigger.click();
    await expect(disclosure).toHaveAttribute('open', '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await page.locator('.fsg-hero h1').click();
    await expect(disclosure).not.toHaveAttribute('open', '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(disclosure).not.toHaveAttribute('open', '');
    await expect(trigger).toBeFocused();
  });

  test('supports keyboard entry and exposes six real task links', async ({ page }) => {
    await page.goto('/');

    const disclosure = page.locator('[data-task-navigation]');
    const trigger = disclosure.locator('summary');
    const links = disclosure.locator('.fsg-task-menu > a');

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(disclosure).toHaveAttribute('open', '');
    await expect(links).toHaveCount(6);

    await page.keyboard.press('Tab');
    await expect(links.first()).toBeFocused();
  });

  test('marks the current task with text and aria-current', async ({ page }) => {
    await page.goto('/compress-image-for-website');
    await page.locator('[data-task-navigation] summary').click();

    const current = page.locator('.fsg-task-menu a[aria-current="page"]');
    await expect(current).toHaveCount(1);
    await expect(current).toContainText('Meet a size limit');
    await expect(current.locator('.fsg-task-menu__current')).toHaveText('Current');
  });

  test('stays contained and operable at all required narrow widths', async ({ page }) => {
    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 760 });
      await page.goto('/');
      await assertNoHorizontalOverflow(page);

      const trigger = page.locator('[data-task-navigation] summary');
      const toggle = page.locator('[data-theme-toggle]');
      const triggerBox = await trigger.boundingBox();
      const toggleBox = await toggle.boundingBox();

      expect(triggerBox?.height).toBeGreaterThanOrEqual(42);
      expect(toggleBox?.height).toBeGreaterThanOrEqual(42);

      await trigger.click();
      const menu = page.locator('.fsg-task-menu');
      await expect(menu).toHaveAttribute('role', 'dialog');
      await expect(menu).toHaveAttribute('aria-modal', 'true');
      await expect.poll(async () => (await menu.boundingBox())?.x ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(0.5);
      await expect(page.locator('html')).toHaveClass(/fsg-nav-is-open/);
      await expect(page.locator('body')).toHaveClass(/fsg-nav-is-open/);

      const menuBox = await menu.boundingBox();
      expect(menuBox).not.toBeNull();
      if (menuBox !== null) {
        expect(menuBox.x).toBeGreaterThanOrEqual(0);
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(width + 1);
        expect(menuBox.y).toBeLessThanOrEqual(1);
        expect(menuBox.height).toBeGreaterThanOrEqual(759);
      }

      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
      await expect(page.locator('html')).not.toHaveClass(/fsg-nav-is-open/);
    }
  });

  test('morphs one menu control, reverses it, and restores focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');

    const disclosure = page.locator('[data-task-navigation]');
    const trigger = disclosure.locator('summary');
    const lines = trigger.locator('.fsg-nav__mobile-icon > span');

    await expect(lines).toHaveCount(3);
    expect(await lines.nth(1).evaluate((line) => getComputedStyle(line).opacity)).toBe('1');

    await trigger.evaluate((element: HTMLElement) => element.click());
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect.poll(() => lines.nth(1).evaluate((line) => getComputedStyle(line).opacity)).toBe('0');
    expect(await lines.first().evaluate((line) => getComputedStyle(line).transform)).not.toBe('none');
    expect(await lines.last().evaluate((line) => getComputedStyle(line).transform)).not.toBe('none');

    await trigger.click();
    await expect(disclosure).not.toHaveAttribute('open', '');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await expect.poll(() => lines.nth(1).evaluate((line) => getComputedStyle(line).opacity)).toBe('1');
  });

  test('preserves scroll position and confines mobile focus while open', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 640 });
    await page.goto('/');
    await scrollTo(page, 500);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(450);
    const before = await page.evaluate(() => window.scrollY);

    const disclosure = page.locator('[data-task-navigation]');
    const trigger = disclosure.locator('summary');
    await trigger.evaluate((element: HTMLElement) => element.click());

    await expect(page.locator('body')).toHaveCSS('position', 'fixed');
    const lockedTop = Number.parseFloat(await page.locator('body').evaluate((body) => body.style.top));
    expect(Math.abs(lockedTop + before)).toBeLessThanOrEqual(1);
    await expect(page.locator('main')).toHaveAttribute('inert', '');
    await expect(page.locator('.fsg-footer')).toHaveAttribute('inert', '');

    const themeToggle = page.locator('[data-theme-toggle]');
    await themeToggle.focus();
    await page.keyboard.press('Tab');
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Shift+Tab');
    await expect(themeToggle).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    const restored = await page.evaluate(() => window.scrollY);
    expect(Math.abs(restored - before)).toBeLessThanOrEqual(5);
    await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  });

  test('uses immediate drawer and icon state changes for reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const disclosure = page.locator('[data-task-navigation]');
    const trigger = disclosure.locator('summary');
    await trigger.click();

    const durations = await page.locator('.fsg-task-menu').evaluate((menu) => getComputedStyle(menu).transitionDuration);
    expect(durations.split(',').every((duration) => Number.parseFloat(duration) <= 0.01)).toBe(true);

    await trigger.click();
    await expect(disclosure).not.toHaveAttribute('open', '');
  });

  test('keeps the mobile hero to three deliberate lines at governed widths', async ({ page }) => {
    for (const width of [320, 375, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');

      const geometry = await page.locator('.fsg-hero h1').evaluate((heading) => {
        const lines = Array.from(heading.querySelectorAll<HTMLElement>('.fsg-hero__mobile-line'));
        return {
          lineCount: lines.reduce((count, line) => count + line.getClientRects().length, 0),
          overflowing: lines.some((line) => line.scrollWidth > line.clientWidth + 1),
        };
      });

      expect(geometry.lineCount).toBe(3);
      expect(geometry.overflowing).toBe(false);
      await assertNoHorizontalOverflow(page);
    }
  });

  test('centers the complete mobile privacy assurance', async ({ page }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');

      const trust = page.locator('.fsg-trust');
      const heading = trust.locator('.fsg-trust__heading');
      const body = trust.locator('.fsg-trust__body');
      const icon = trust.locator('.fsg-trust__icon');

      await expect(heading).toHaveCSS('text-align', 'center');
      await expect(body).toHaveCSS('text-align', 'center');

      const [trustBox, iconBox] = await Promise.all([trust.boundingBox(), icon.boundingBox()]);
      expect(trustBox).not.toBeNull();
      expect(iconBox).not.toBeNull();
      if (trustBox !== null && iconBox !== null) {
        const trustCenter = trustBox.x + trustBox.width / 2;
        const iconCenter = iconBox.x + iconBox.width / 2;
        expect(Math.abs(trustCenter - iconCenter)).toBeLessThanOrEqual(2);
      }

      await assertNoHorizontalOverflow(page);
    }
  });
});
