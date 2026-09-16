import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { approveFullLogoFaviconSource, gotoApp, reviewLogoPackBackground, selectLogoPackBackgroundMode, selectMode, waitForStatus } from '../helpers/app';

const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007-logo-readiness');

interface FixtureSpec {
  width: number;
  height: number;
  bounds: { left: number; top: number; width: number; height: number };
  background: 'opaque-white' | 'transparent';
}

async function createFixture(page: Page, spec: FixtureSpec): Promise<Buffer> {
  const base64 = await page.evaluate((fixture) => {
    const canvas = document.createElement('canvas');
    canvas.width = fixture.width;
    canvas.height = fixture.height;
    const context = canvas.getContext('2d', { alpha: true });

    if (context === null) {
      throw new Error('Canvas fixture context unavailable.');
    }

    if (fixture.background === 'opaque-white') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    context.fillStyle = '#1e3a8a';
    context.fillRect(fixture.bounds.left, fixture.bounds.top, fixture.bounds.width, fixture.bounds.height);
    return canvas.toDataURL('image/png').split(',')[1];
  }, spec);

  return Buffer.from(base64, 'base64');
}

async function uploadBuffer(page: Page, name: string, buffer: Buffer): Promise<void> {
  await page.locator('#source-file').setInputFiles({ name, mimeType: 'image/png', buffer });
  await waitForStatus(page, 'ready');
  await selectMode(page, 'logo-pack');
  await selectLogoPackBackgroundMode(page, 'transparent');
  await reviewLogoPackBackground(page);
  await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 30_000 });
}

async function preparedPreviewBytes(page: Page): Promise<Buffer> {
  const base64 = await page.locator('#logo-pack-preview-image').evaluate((image) => {
    const preview = image as HTMLImageElement;
    const canvas = document.createElement('canvas');
    canvas.width = preview.naturalWidth;
    canvas.height = preview.naturalHeight;
    const context = canvas.getContext('2d');

    if (context === null) {
      throw new Error('Evidence canvas context unavailable.');
    }

    context.drawImage(preview, 0, 0);
    return canvas.toDataURL('image/png').split(',')[1];
  });

  return Buffer.from(base64, 'base64');
}

test('captures source, pre-trim, final, and contextual review evidence', async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await gotoApp(page);

  const oversized = {
    width: 1080,
    height: 1080,
    bounds: { left: 160, top: 390, width: 760, height: 300 },
    background: 'opaque-white' as const,
  };
  const oversizedSource = await createFixture(page, oversized);
  const oversizedPreTrim = await createFixture(page, { ...oversized, background: 'transparent' });
  await writeFile(path.join(EVIDENCE_DIR, '01-case-a-source-1080x1080.png'), oversizedSource);
  await writeFile(path.join(EVIDENCE_DIR, '02-case-a-transparent-pre-trim-1080x1080.png'), oversizedPreTrim);
  await uploadBuffer(page, 'case-a-oversized-logo.png', oversizedSource);
  await expect(page.locator('#logo-pack-preview-original-dimensions')).toHaveText('1080 × 1080');
  // The removal pass retains one soft anti-aliased pixel around the hard
  // source mark, so the real browser result is 762×302 content + 9px
  // governed padding, not a clipped 760×300 hard edge.
  await expect(page.locator('#logo-pack-preview-prepared-dimensions')).toHaveText('780 × 320');
  await writeFile(path.join(EVIDENCE_DIR, '03-case-a-final-780x320.png'), await preparedPreviewBytes(page));

  for (const [background, filename] of [
    ['checkerboard', '04-case-a-checkerboard.png'],
    ['light', '05-case-a-light.png'],
    ['dark', '06-case-a-dark.png'],
  ] as const) {
    await page.locator(`#logo-pack-preview-bg-${background}`).click();
    await page.locator('#logo-pack-preview').screenshot({ path: path.join(EVIDENCE_DIR, filename) });
  }

  await approveFullLogoFaviconSource(page);
  await page.locator('#logo-pack-create-button').click();
  await waitForStatus(page, 'success', 30_000);
  await page.locator('#logo-pack-result').screenshot({ path: path.join(EVIDENCE_DIR, '07-case-a-logo-pack-result.png') });

  await page.locator('#reset-button').click();
  await waitForStatus(page, 'idle');
  const alreadyTransparent = {
    width: 1200,
    height: 800,
    bounds: { left: 200, top: 280, width: 800, height: 240 },
    background: 'transparent' as const,
  };
  const transparentSource = await createFixture(page, alreadyTransparent);
  await writeFile(path.join(EVIDENCE_DIR, '08-case-b-already-transparent-source-1200x800.png'), transparentSource);
  await uploadBuffer(page, 'case-b-already-transparent.png', transparentSource);
  await expect(page.locator('#logo-pack-preview-prepared-dimensions')).toHaveText('814 × 254');
  await writeFile(path.join(EVIDENCE_DIR, '09-case-b-final-814x254.png'), await preparedPreviewBytes(page));
  await page.locator('#logo-pack-preview').screenshot({ path: path.join(EVIDENCE_DIR, '10-case-b-review.png') });

  // The modal <dialog> is still open on the review step here (unlike case A,
  // which reaches reset only after Create closes it) — close it first so
  // #reset-button (outside the dialog) is reachable at all.
  await page.locator('#logo-pack-close').click();
  await page.locator('#reset-button').click();
  await waitForStatus(page, 'idle');
  const highResolution = {
    width: 2400,
    height: 1200,
    bounds: { left: 200, top: 300, width: 2000, height: 600 },
    background: 'transparent' as const,
  };
  const highResolutionSource = await createFixture(page, highResolution);
  await writeFile(path.join(EVIDENCE_DIR, '11-case-c-high-resolution-source-2400x1200.png'), highResolutionSource);
  await uploadBuffer(page, 'case-c-high-resolution.png', highResolutionSource);
  await expect(page.locator('#logo-pack-preview-prepared-dimensions')).toHaveText('2036 × 636');
  await writeFile(path.join(EVIDENCE_DIR, '12-case-c-final-2036x636.png'), await preparedPreviewBytes(page));
  await page.locator('#logo-pack-preview').screenshot({ path: path.join(EVIDENCE_DIR, '13-case-c-edge-review.png') });
});
