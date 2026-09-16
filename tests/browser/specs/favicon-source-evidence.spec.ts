import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import { gotoApp, selectLogoPackBackgroundMode, selectMode, uploadFile, waitForStatus } from '../helpers/app';

const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007-favicon-source');

async function createWideBrandFixture(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 240;
    const context = canvas.getContext('2d', { alpha: true });

    if (context === null) {
      throw new Error('Evidence fixture canvas is unavailable.');
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#2563eb';
    context.beginPath();
    context.arc(120, 120, 92, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.moveTo(72, 132);
    context.lineTo(116, 78);
    context.lineTo(166, 116);
    context.lineTo(148, 140);
    context.lineTo(119, 119);
    context.lineTo(91, 153);
    context.closePath();
    context.fill();
    context.fillStyle = '#0f172a';
    context.font = '700 106px Arial, sans-serif';
    context.textBaseline = 'middle';
    context.fillText('NORTHSTAR', 268, 123);
    context.fillStyle = '#2563eb';
    context.beginPath();
    context.arc(1125, 56, 12, 0, Math.PI * 2);
    context.fill();
    return canvas.toDataURL('image/png').split(',')[1];
  });

  return Buffer.from(base64, 'base64');
}

async function createAlternateIconFixture(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d', { alpha: true });

    if (context === null) {
      throw new Error('Evidence alternate-icon canvas is unavailable.');
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#2563eb';
    context.beginPath();
    context.arc(128, 128, 102, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = '700 126px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('N', 128, 136);
    return canvas.toDataURL('image/png').split(',')[1];
  });

  return Buffer.from(base64, 'base64');
}

async function prepareWideLogo(page: Page, buffer: Buffer): Promise<void> {
  await uploadFile(page, { name: 'northstar-horizontal.png', mimeType: 'image/png', buffer });
  await waitForStatus(page, 'ready');
  await selectMode(page, 'logo-pack');
  await selectLogoPackBackgroundMode(page, 'original');
  await expect(page.locator('#logo-pack-favicon-source')).toBeVisible();
}

async function chooseSelectedMark(page: Page): Promise<void> {
  await page.locator('#logo-pack-favicon-option-crop').check();
  await page.locator('#logo-pack-favicon-crop-width').fill('240');
  await page.locator('#logo-pack-favicon-crop-height').fill('240');
  await page.locator('#logo-pack-favicon-crop-x').fill('0');
  await page.locator('#logo-pack-favicon-crop-y').fill('0');
}

test('captures the governed favicon-source selection flow', async ({ page }) => {
  test.setTimeout(120_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await gotoApp(page);
  const wideLogo = await createWideBrandFixture(page);
  await prepareWideLogo(page, wideLogo);

  await page.locator('#logo-pack-favicon-source').screenshot({ path: path.join(EVIDENCE_DIR, '01-wide-logo-warning-and-options.png') });
  await chooseSelectedMark(page);
  await page.locator('#logo-pack-favicon-source').screenshot({ path: path.join(EVIDENCE_DIR, '02-freeform-selection.png') });
  await page.locator('#logo-pack-favicon-preview').screenshot({ path: path.join(EVIDENCE_DIR, '03-selected-previews-light.png') });
  await page.locator('#logo-pack-favicon-preview-dark').click();
  await page.locator('#logo-pack-favicon-preview').screenshot({ path: path.join(EVIDENCE_DIR, '04-selected-previews-dark.png') });
  await page.locator('#logo-pack-favicon-confirm').click();
  await expect(page.locator('#logo-pack-favicon-confirmed')).toContainText('Selected compact mark');
  await page.locator('#logo-pack-favicon-source').screenshot({ path: path.join(EVIDENCE_DIR, '05-selected-source-confirmed.png') });

  await page.locator('#logo-pack-favicon-option-alternate').check();
  await page.locator('#logo-pack-favicon-alternate-file').setInputFiles({
    name: 'northstar-mark.png',
    mimeType: 'image/png',
    buffer: await createAlternateIconFixture(page),
  });
  await expect(page.locator('#logo-pack-favicon-alternate-status')).toContainText('Ready to confirm');
  await page.locator('#logo-pack-favicon-source').screenshot({ path: path.join(EVIDENCE_DIR, '06-alternate-icon-option.png') });

  await page.locator('#logo-pack-favicon-option-full').check();
  await page.locator('#logo-pack-favicon-source').screenshot({ path: path.join(EVIDENCE_DIR, '07-full-logo-fallback-warning.png') });

  await chooseSelectedMark(page);
  await page.locator('#logo-pack-favicon-confirm').click();
  await expect(page.locator('#logo-pack-favicon-confirmed')).toContainText('Selected compact mark');
  await page.locator('#logo-pack-create-button').click();
  await waitForStatus(page, 'success', 30_000);
  await page.locator('#logo-pack-result').screenshot({ path: path.join(EVIDENCE_DIR, '08-final-logo-pack-selected-favicon.png') });

  await page.locator('#reset-button').click();
  await waitForStatus(page, 'idle');
  await page.setViewportSize({ width: 390, height: 844 });
  await prepareWideLogo(page, wideLogo);
  await chooseSelectedMark(page);
  await page.locator('#logo-pack-favicon-heading').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '09-mobile-selection-390.png') });
  await page.locator('#logo-pack-favicon-preview').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(EVIDENCE_DIR, '10-mobile-previews-390.png') });
});
