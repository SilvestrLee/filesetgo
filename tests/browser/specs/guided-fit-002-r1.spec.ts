import { expect, test, type Page } from '@playwright/test';
import {
  approveGuidedFitUpscale,
  confirmGuidedFitCrop,
  continueGuidedFit,
  gotoApp,
  uploadFile,
  waitForStatus,
} from '../helpers/app';

/**
 * FSG-007-FIT-002-R1: truthfulness and responsive-containment remediation
 * on top of the already-approved FIT-002 destination geometry. Nothing here
 * touches geometry, crop, upscale-approval, or worker behavior — only
 * destination-card wording, GO result narrative, and the homepage
 * selected-source metadata layout.
 */

/** No two elements' bounding boxes overlap — same real-geometry check used by the FIT-001B-R2 evidence spec. */
function boxesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

async function assertSourceMetadataIsCoherent(page: Page): Promise<void> {
  const formatBox = await page.locator('#source-format').boundingBox();
  const dimensionsBox = await page.locator('#source-dimensions').boundingBox();
  const sizeBox = await page.locator('#source-size').boundingBox();

  expect(formatBox).not.toBeNull();
  expect(dimensionsBox).not.toBeNull();
  expect(sizeBox).not.toBeNull();

  if (formatBox && dimensionsBox && sizeBox) {
    expect(boxesOverlap(formatBox, dimensionsBox)).toBe(false);
    expect(boxesOverlap(dimensionsBox, sizeBox)).toBe(false);
    expect(boxesOverlap(formatBox, sizeBox)).toBe(false);
  }

  // The three raw text values must remain separate strings — never visibly
  // concatenated because a grid column ran out of room (directive §9/§10).
  await expect(page.locator('#source-dimensions')).toHaveText('4800 × 3200');
  await expect(page.locator('#source-size')).toHaveText('440.9 KB');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('Destination cards use truthful, non-"up to" geometry language (FSG-007-FIT-002-R1)', () => {
  test('Hero, Content and Card destination cards state the exact governed frame, never "up to"', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#mode-tab-guided-fit').click();
    await page.locator('#guided-fit-open').click();

    const hero = page.locator('[data-preset-id="web.hero"] .preset-card-summary');
    const content = page.locator('[data-preset-id="web.content"] .preset-card-summary');
    const card = page.locator('[data-preset-id="web.card"] .preset-card-summary');

    await expect(hero).toHaveText('WebP · 1600 × 900 px · under 500.0 KB');
    await expect(content).toHaveText('WebP · 1200 × 800 px · under 300.0 KB');
    await expect(card).toHaveText('WebP · 800 × 600 px · under 150.0 KB');

    for (const summary of [hero, content, card]) {
      await expect(summary).not.toContainText('up to');
    }
  });

  test('the review step also states the exact frame, never "up to"', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#mode-tab-guided-fit').click();
    await page.locator('#guided-fit-open').click();
    await page.locator('[data-preset-id="web.hero"]').click();
    await continueGuidedFit(page);

    await expect(page.locator('#preset-recommendation-summary')).toHaveText(/1600 × 900 px/);
    await expect(page.locator('#preset-recommendation-summary')).not.toContainText('up to');
  });
});

test.describe('GO result copy is truthful about destination-frame preparation (FSG-007-FIT-002-R1)', () => {
  test('Hero result never claims dimensions were preserved when the source was reduced from 4800x3200', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#mode-tab-guided-fit').click();
    await page.locator('#guided-fit-open').click();
    await page.locator('[data-preset-id="web.hero"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await confirmGuidedFitCrop(page);
    await waitForStatus(page, 'success', 30_000);

    const detail = await page.locator('#result-detail').textContent();
    expect(detail).not.toMatch(/without reducing the dimensions/);
    expect(detail).toMatch(/1600 × 900/);
    expect(detail).toMatch(/under 500\.0 KB/);
    expect(detail).toMatch(/\d+% smaller/);
    await expect(page.locator('#result-dimensions')).toHaveText('1600 × 900');
  });

  test('Content result truthfully states its own exact frame', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#mode-tab-guided-fit').click();
    await page.locator('#guided-fit-open').click();
    await page.locator('[data-preset-id="web.content"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await waitForStatus(page, 'success', 30_000);

    const detail = await page.locator('#result-detail').textContent();
    expect(detail).not.toMatch(/without reducing the dimensions/);
    expect(detail).toMatch(/1200 × 800/);
    await expect(page.locator('#result-dimensions')).toHaveText('1200 × 800');
  });

  test('Card result (via crop) truthfully states its own exact frame', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#mode-tab-guided-fit').click();
    await page.locator('#guided-fit-open').click();
    await page.locator('[data-preset-id="web.card"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await confirmGuidedFitCrop(page);
    await waitForStatus(page, 'success', 30_000);

    const detail = await page.locator('#result-detail').textContent();
    expect(detail).not.toMatch(/without reducing the dimensions/);
    expect(detail).toMatch(/800 × 600/);
    await expect(page.locator('#result-dimensions')).toHaveText('800 × 600');
  });

  test('an approved upscale is described truthfully, never as dimensions being preserved', async ({ page }) => {
    await gotoApp(page);
    // sample.png is 640x480 (4:3) — Card's exact ratio, but smaller on both axes.
    await uploadFile(page, 'sample.png');
    await waitForStatus(page, 'ready');
    await page.locator('#mode-tab-guided-fit').click();
    await page.locator('#guided-fit-open').click();
    await page.locator('[data-preset-id="web.card"]').click();
    await continueGuidedFit(page);
    await approveGuidedFitUpscale(page);
    await page.locator('#guided-process-button').click();
    await waitForStatus(page, 'success', 30_000);

    const detail = await page.locator('#result-detail').textContent();
    expect(detail).not.toMatch(/without reducing the dimensions/);
    expect(detail).toMatch(/800 × 600/);
    await expect(page.locator('#result-dimensions')).toHaveText('800 × 600');
  });

  test('the already-exact shortcut is preserved — no processing, "Use this file" still offered', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'card-ready.webp');
    await waitForStatus(page, 'ready');
    await page.locator('#mode-tab-guided-fit').click();
    await page.locator('#guided-fit-open').click();
    await page.locator('[data-preset-id="web.card"]').click();
    await continueGuidedFit(page);

    await expect(page.locator('#preset-already-ready')).toBeVisible();
    await expect(page.locator('#guided-process-button')).toBeHidden();
    await expect(page.locator('#guided-use-file-button')).toBeVisible();
  });
});

test.describe('Homepage selected-source metadata stays contained at intermediate desktop widths (FSG-007-FIT-002-R1)', () => {
  for (const width of [1024, 1100, 1200, 1240, 1280, 1440]) {
    test(`format/dimensions/size never collide at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await gotoApp(page);
      await uploadFile(page, 'large.jpg');
      await waitForStatus(page, 'ready');
      await assertSourceMetadataIsCoherent(page);
    });
  }

  test('the approved FIT-001B-R2 mobile source card is not regressed at 320/390/430px', async ({ page }) => {
    for (const width of [320, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      await gotoApp(page);
      await uploadFile(page, 'sample.jpg');
      await waitForStatus(page, 'ready');

      await expect(page.locator('#source-thumbnail')).toBeVisible();
      await expect(page.locator('#source-name')).toHaveText('sample.jpg');
      await expect(page.locator('#source-replace-image')).toBeVisible();

      const thumbBox = await page.locator('#source-thumbnail').boundingBox();
      const nameBox = await page.locator('#source-name').boundingBox();
      const replaceBox = await page.locator('#source-replace-image').boundingBox();

      if (thumbBox && nameBox && replaceBox) {
        expect(boxesOverlap(thumbBox, nameBox)).toBe(false);
        expect(boxesOverlap(nameBox, replaceBox)).toBe(false);
      }

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }
  });
});

test.describe('The upscale-approval warning remains fully reachable, not hidden behind the sticky footer (FSG-007-FIT-002-R1)', () => {
  test('warning copy and the approval checkbox are visible and enabled within the scrollable dialog content', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.png');
    await waitForStatus(page, 'ready');
    await page.locator('#mode-tab-guided-fit').click();
    await page.locator('#guided-fit-open').click();
    await page.locator('[data-preset-id="web.card"]').click();
    await continueGuidedFit(page);

    const field = page.locator('#guided-fit-upscale-field');
    const approve = page.locator('#guided-fit-upscale-approve');
    await expect(field).toBeVisible();
    await expect(approve).toBeVisible();
    await expect(approve).toBeEnabled();

    // Scroll-reachable, not necessarily visible without scrolling (directive
    // §13) — after scrolling, the checkbox and its warning text must land
    // fully inside the viewport, never permanently clipped behind the
    // sticky actions footer.
    await field.scrollIntoViewIfNeeded();
    await expect(field).toBeInViewport();
    await expect(approve).toBeInViewport();
  });
});
