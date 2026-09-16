import { expect, test, type Download, type Page } from '@playwright/test';

import {
  collectConsoleProblems,
  collectRequests,
  continueLogoPackToFaviconSource,
  gotoApp,
  selectLogoPackBackgroundMode,
  selectMode,
  uploadFile,
  waitForStatus,
  zipEntries,
} from '../helpers/app';

async function createWideBrandFixture(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 240;
    const context = canvas.getContext('2d', { alpha: true });

    if (context === null) {
      throw new Error('Synthetic brand fixture canvas is unavailable.');
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
      throw new Error('Alternate icon fixture canvas is unavailable.');
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

async function prepareWideLogo(page: Page): Promise<void> {
  await gotoApp(page);
  await uploadFile(page, {
    name: 'northstar-horizontal.png',
    mimeType: 'image/png',
    buffer: await createWideBrandFixture(page),
  });
  await waitForStatus(page, 'ready');
  await selectMode(page, 'logo-pack');
  await selectLogoPackBackgroundMode(page, 'original');
  await continueLogoPackToFaviconSource(page);
  await expect(page.locator('#logo-pack-favicon-source')).toBeVisible();
}

async function selectCompactMark(page: Page): Promise<void> {
  await page.locator('#logo-pack-favicon-option-crop').check();
  await expect(page.locator('#logo-pack-favicon-crop-panel')).toBeVisible();
  await page.locator('#logo-pack-favicon-fine-tune').evaluate((element: HTMLDetailsElement) => {
    element.open = true;
  });
  await page.locator('#logo-pack-favicon-crop-width').fill('240');
  await page.locator('#logo-pack-favicon-crop-height').fill('240');
  await page.locator('#logo-pack-favicon-crop-x').fill('0');
  await page.locator('#logo-pack-favicon-crop-y').fill('0');
  await expect(page.locator('#logo-pack-favicon-preview-16')).toBeVisible();
  await expect(page.locator('#logo-pack-favicon-preview-32')).toBeVisible();
  await expect(page.locator('#logo-pack-favicon-preview-180')).toBeVisible();
  await page.locator('#logo-pack-favicon-preview-dark').click();
  await expect(page.locator('#logo-pack-favicon-preview-dark')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#logo-pack-favicon-preview-light').click();
  await expect(page.locator('#logo-pack-favicon-preview-light')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#logo-pack-favicon-confirm').click();
  await expect(page.locator('#logo-pack-favicon-confirmed')).toContainText('Selected compact mark');
}

async function downloadLogoPack(page: Page): Promise<Download> {
  await page.locator('#logo-pack-create-button').click();
  await waitForStatus(page, 'success', 30_000);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#logo-pack-download-zip').click(),
  ]);

  return download;
}

test.describe('explicit favicon source selection', () => {
  test('a realistic wide logo routes the full artwork to headers and the selected compact mark to all five square assets', async ({ page, baseURL }) => {
    const console_ = collectConsoleProblems(page);
    const requests = collectRequests(page);
    await prepareWideLogo(page);

    await expect(page.locator('#logo-pack-favicon-guidance')).toContainText('28 × 5.6 px inside a 32 px favicon');
    await expect(page.locator('#logo-pack-create-button')).toBeDisabled();
    await selectCompactMark(page);
    await expect(page.locator('#logo-pack-final-favicon-preview')).toBeVisible();

    const entries = await zipEntries(await downloadLogoPack(page));
    expect(Object.keys(entries).sort()).toEqual([
      'apple-touch-icon.png',
      'favicon-32x32.png',
      'favicon.ico',
      'icon-192x192.png',
      'icon-512x512.png',
      'northstar-horizontal-original.png',
      'northstar-horizontal-original@2x.png',
    ]);
    await expect(page.locator('#logo-pack-result-sources')).toBeVisible();
    await expect(page.locator('#logo-pack-result-favicon-source')).toHaveText('Selected compact mark');

    const pixels = await page.evaluate(async ({ headerBytes, faviconBytes }) => {
      const inspect = async (bytes: number[]) => {
        const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)], { type: 'image/png' }));
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');

        if (context === null) {
          throw new Error('Downloaded asset inspection canvas is unavailable.');
        }

        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let navyPixels = 0;
        let bluePixels = 0;

        for (let index = 0; index < data.length; index += 4) {
          const [red, green, blue, alpha] = data.slice(index, index + 4);

          if (alpha > 100 && red < 50 && green < 70 && blue < 100) {
            navyPixels += 1;
          }

          if (alpha > 100 && red < 80 && green > 70 && blue > 150) {
            bluePixels += 1;
          }
        }

        return { width: canvas.width, height: canvas.height, navyPixels, bluePixels };
      };

      return {
        header: await inspect(headerBytes),
        favicon: await inspect(faviconBytes),
      };
    }, {
      headerBytes: Array.from(entries['northstar-horizontal-original.png']),
      faviconBytes: Array.from(entries['favicon-32x32.png']),
    });

    expect(pixels.header.width).toBeGreaterThan(pixels.header.height);
    expect(pixels.header.navyPixels).toBeGreaterThan(100);
    expect(pixels.header.bluePixels).toBeGreaterThan(100);
    expect(pixels.favicon.width).toBe(32);
    expect(pixels.favicon.height).toBe(32);
    expect(pixels.favicon.bluePixels).toBeGreaterThan(100);
    expect(pixels.favicon.navyPixels).toBe(0);

    const origin = new URL(baseURL ?? 'http://127.0.0.1:8123').origin;
    expect(requests.records().filter(({ url }) => new URL(url).origin !== origin)).toEqual([]);
    expect(requests.records().filter(({ method, postData }) => method !== 'GET' || postData !== null)).toEqual([]);
    console_.assertClean();
  });

  test('an alternate icon remains separate from the full header source', async ({ page }) => {
    await prepareWideLogo(page);
    await page.locator('#logo-pack-favicon-option-alternate').check();
    await page.locator('#logo-pack-favicon-alternate-file').setInputFiles({
      name: 'northstar-mark.png',
      mimeType: 'image/png',
      buffer: await createAlternateIconFixture(page),
    });
    await expect(page.locator('#logo-pack-favicon-alternate-status')).toContainText('Ready to confirm');
    await page.locator('#logo-pack-favicon-confirm').click();
    await expect(page.locator('#logo-pack-favicon-confirmed')).toContainText('Separate icon');

    await downloadLogoPack(page);

    await expect(page.locator('#logo-pack-result-favicon-source')).toHaveText('Separate icon');
  });

  test('the full-logo fallback is explicit and retains the truthful tiny-render warning', async ({ page }) => {
    await prepareWideLogo(page);
    await page.locator('#logo-pack-favicon-option-full').check();

    await expect(page.locator('#logo-pack-favicon-full-description')).toContainText('difficult to recognize');
    await expect(page.locator('#logo-pack-favicon-preview-16')).toBeVisible();
    await expect(page.locator('#logo-pack-favicon-preview-32')).toBeVisible();
    await page.locator('#logo-pack-favicon-confirm').click();
    await expect(page.locator('#logo-pack-favicon-confirmed')).toContainText('Full logo');

    await downloadLogoPack(page);

    await expect(page.locator('#logo-pack-result-favicon-source')).toHaveText('Full logo');
  });

  test('the freeform selection supports independent keyboard movement and resizing', async ({ page }) => {
    await prepareWideLogo(page);
    await page.locator('#logo-pack-favicon-option-crop').check();
    const selection = page.locator('#logo-pack-favicon-crop-selection');
    const x = page.locator('#logo-pack-favicon-crop-x');
    const width = page.locator('#logo-pack-favicon-crop-width');
    const height = page.locator('#logo-pack-favicon-crop-height');
    await selection.focus();
    const initialX = Number(await x.inputValue());
    const initialWidth = Number(await width.inputValue());
    const initialHeight = Number(await height.inputValue());

    await selection.press('Alt+ArrowRight');
    expect(Number(await x.inputValue())).toBe(initialX + 10);
    await selection.press('Shift+ArrowLeft');
    expect(Number(await width.inputValue())).toBe(initialWidth - 1);
    expect(Number(await height.inputValue())).toBe(initialHeight);
    await selection.press('Shift+ArrowUp');
    expect(Number(await height.inputValue())).toBe(initialHeight - 1);
  });

  test('the selection and preview remain usable without horizontal overflow at 320px and 390px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 760 });
    await prepareWideLogo(page);
    await page.locator('#logo-pack-favicon-option-crop').check();
    await expect(page.locator('#logo-pack-favicon-crop-stage')).toBeVisible();

    const overflow320 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow320).toBeLessThanOrEqual(1);
    await expect(page.locator('#logo-pack-favicon-confirm')).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    const overflow390 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow390).toBeLessThanOrEqual(1);
  });
});
