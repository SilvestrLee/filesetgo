import { expect, test } from '@playwright/test';
import { gotoApp, selectMode, setSimpleRequirement, uploadFile, waitForStatus } from '../helpers/app';

/**
 * Dedicated mobile viewport / responsive-layout suite (directive §11-§14).
 * Runs only against the mobile-* Playwright projects (see playwright.config.ts
 * testMatch) — desktop Chromium/Firefox run the full functional certification
 * suite instead.
 */

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
  });
  // A 1px tolerance for subpixel rounding.
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function assertTouchTarget(locator: import('@playwright/test').Locator, minSize = 44): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, 'element must have a bounding box').not.toBeNull();
  if (box !== null) {
    expect(box.height).toBeGreaterThanOrEqual(minSize - 2); // small CSS rounding tolerance
  }
}

test.describe('Mobile viewport / responsive audit (directive §11-§14)', () => {
  test('bootstrap: no horizontal overflow and mode controls remain usable', async ({ page }) => {
    await gotoApp(page);
    await assertNoHorizontalOverflow(page);

    await expect(page.locator('#drop-zone')).toBeVisible();
    await expect(page.locator('#mode-tab-quick-fit')).toBeVisible();

    for (const id of ['mode-tab-quick-fit', 'mode-tab-guided-fit', 'mode-tab-logo-pack']) {
      await assertTouchTarget(page.locator(`#${id}`));
    }
  });

  test('Quick Fit form: controls remain reachable, readable, and tappable at this width', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await assertNoHorizontalOverflow(page);

    await expect(page.locator('#requirements-form')).toBeVisible();
    await assertTouchTarget(page.locator('#process-button'));
    await setSimpleRequirement(page);

    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);
    await assertNoHorizontalOverflow(page);
    await assertTouchTarget(page.locator('#download-link'));

    // Status/progress messages wrap rather than overflowing.
    const statusBox = await page.locator('#status-message').boundingBox();
    const viewport = page.viewportSize();
    if (statusBox !== null && viewport !== null) {
      expect(statusBox.x + statusBox.width).toBeLessThanOrEqual(viewport.width + 1);
    }
  });

  test('Logo Pack: suitability content and seven asset results stack correctly with no overflow', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await assertNoHorizontalOverflow(page);

    await expect(page.locator('#logo-pack-review')).toBeVisible();
    await assertTouchTarget(page.locator('#logo-pack-create-button'));

    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'success', 30_000);
    await assertNoHorizontalOverflow(page);

    const assetItems = page.locator('#logo-pack-assets li');
    await expect(assetItems).toHaveCount(7);

    // Every asset row and its download control stay within the viewport
    // (they stack vertically rather than forcing horizontal scroll), and
    // individual downloads remain tappable.
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    if (viewport !== null) {
      const count = await assetItems.count();
      for (let index = 0; index < count; index += 1) {
        const box = await assetItems.nth(index).boundingBox();
        expect(box).not.toBeNull();
        if (box !== null) {
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
        }
      }
      const downloadLinks = page.locator('#logo-pack-assets a');
      const linkCount = await downloadLinks.count();
      for (let index = 0; index < linkCount; index += 1) {
        await assertTouchTarget(downloadLinks.nth(index));
      }
    }

    // The primary ZIP CTA is visually dominant: filled background, appears
    // before the secondary individual downloads in DOM order, and is at
    // least as tall as any individual download control.
    const primaryBox = await page.locator('#logo-pack-download-zip').boundingBox();
    const firstAssetLinkBox = await page.locator('#logo-pack-assets a').first().boundingBox();
    expect(primaryBox).not.toBeNull();
    if (primaryBox !== null && firstAssetLinkBox !== null) {
      expect(primaryBox.y).toBeLessThan(firstAssetLinkBox.y);
      expect(primaryBox.height).toBeGreaterThanOrEqual(firstAssetLinkBox.height - 2);
    }
  });

  test('footer does not collide with tool content', async ({ page }) => {
    await gotoApp(page);
    const toolSectionBox = await page.locator('#quick-fit').boundingBox();
    const footerBox = await page.locator('footer').boundingBox();
    expect(toolSectionBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    if (toolSectionBox !== null && footerBox !== null) {
      expect(footerBox.y).toBeGreaterThanOrEqual(toolSectionBox.y + toolSectionBox.height - 1);
    }
  });

  test('orientation/width transition: layout recovers with no stale overflow after resize', async ({ page }) => {
    await gotoApp(page);
    const initial = page.viewportSize() ?? { width: 390, height: 844 };

    // Simulate a portrait -> landscape transition and back.
    await page.setViewportSize({ width: initial.height, height: initial.width });
    await assertNoHorizontalOverflow(page);

    await page.setViewportSize(initial);
    await assertNoHorizontalOverflow(page);
    await expect(page.locator('#drop-zone')).toBeVisible();
  });
});
