import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

import {
  continueGuidedFit,
  gotoApp,
  reviewLogoPackBackground,
  selectLogoPackBackgroundMode,
  selectMode,
  uploadFile,
  waitForStatus,
} from '../helpers/app';

const EVIDENCE_DIR = path.join(import.meta.dirname, '..', '.artifacts', 'fsg-007b-modal-step-discipline');

async function createWideBrandFixture(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 240;
    const context = canvas.getContext('2d', { alpha: true });

    if (context === null) {
      throw new Error('Modal evidence fixture canvas is unavailable.');
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#2563eb';
    context.beginPath();
    context.arc(120, 120, 92, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffffff';
    context.font = '700 112px Arial, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('N', 120, 130);
    context.fillStyle = '#0f172a';
    context.textAlign = 'left';
    context.font = '700 104px Arial, sans-serif';
    context.fillText('NORTHSTAR', 270, 128);
    return canvas.toDataURL('image/png').split(',')[1];
  });

  return Buffer.from(base64, 'base64');
}

async function capture(page: Page, filename: string, selector?: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);

  if (selector === undefined) {
    await page.screenshot({ path: path.join(EVIDENCE_DIR, filename) });
    return;
  }

  await page.locator(selector).screenshot({ path: path.join(EVIDENCE_DIR, filename) });
}

async function setRangeValue(page: Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    input.value = nextValue;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

async function openWideLogoPack(page: Page): Promise<void> {
  await uploadFile(page, {
    name: 'northstar-horizontal.png',
    mimeType: 'image/png',
    buffer: await createWideBrandFixture(page),
  });
  await waitForStatus(page, 'ready');
  await selectMode(page, 'logo-pack');
}

async function reachLogoPackIconStep(page: Page): Promise<void> {
  await selectLogoPackBackgroundMode(page, 'original');
  await reviewLogoPackBackground(page);
  await page.locator('#logo-pack-step-continue').click();
  await expect(page.locator('#logo-pack-step-4')).toBeVisible();
  await page.locator('#logo-pack-favicon-option-crop').check();
  await setRangeValue(page, '#logo-pack-favicon-crop-x', '0');
  await setRangeValue(page, '#logo-pack-favicon-crop-y', '0');
  await setRangeValue(page, '#logo-pack-favicon-crop-width', '240');
  await setRangeValue(page, '#logo-pack-favicon-crop-height', '240');
  await expect(page.locator('#logo-pack-favicon-preview')).toBeVisible();
}

test('captures the FSG-007B disciplined modal workflow inventory', async ({ page }) => {
  test.setTimeout(180_000);
  await mkdir(EVIDENCE_DIR, { recursive: true });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoApp(page);
  await uploadFile(page, 'large.jpg');
  await waitForStatus(page, 'ready');

  await selectMode(page, 'guided-fit');
  await page.locator('#guided-fit-close').click();
  await expect(page.locator('#guided-fit-dialog')).toBeHidden();
  await capture(page, '01-stable-homepage-guided-fit-state.png', '#quick-fit');

  await page.locator('#guided-fit-open').click();
  await capture(page, '02-guided-fit-step-1.png');
  // large.jpg is exactly 3:2 — Content's exact frame ratio (FSG-007-FIT-002),
  // so this capture flow needs no crop step (kept simple/happy-path; Hero's
  // crop-required flow is captured by the dedicated FIT-002 evidence spec).
  await page.locator('[data-preset-id="web.content"]').click();
  await continueGuidedFit(page);
  await capture(page, '03-guided-fit-step-2.png');
  await page.locator('#guided-process-button').click();
  // FSG-007-FIT-003-R3: the dialog closes the instant processing starts —
  // the transition itself is shown on the full-page overlay, captured
  // separately by processing-transition-evidence.spec.ts.
  await expect(page.locator('#guided-fit-dialog')).toBeHidden();
  await expect(page.locator('#fsg-processing-overlay')).toBeVisible();
  await capture(page, '04-guided-fit-processing-overlay.png');

  await waitForStatus(page, 'success', 30_000);
  await gotoApp(page);
  await openWideLogoPack(page);
  await capture(page, '05-logo-pack-step-1.png');
  await page.locator('#logo-pack-step-continue').click();
  await expect(page.locator('#logo-pack-step-2')).toBeVisible();
  await page.locator('#logo-pack-mode-original').check();
  await capture(page, '06-logo-pack-step-2.png');
  await reviewLogoPackBackground(page);
  await capture(page, '07-logo-pack-step-3.png');
  await page.locator('#logo-pack-step-continue').click();
  await expect(page.locator('#logo-pack-step-4')).toBeVisible();
  await page.locator('#logo-pack-favicon-option-crop').check();
  await capture(page, '08-logo-pack-step-4-selection.png');
  await page.locator('#logo-pack-favicon-preview-dark').click();
  await capture(page, '09-logo-pack-step-4-previews.png');
  await page.locator('#logo-pack-favicon-fine-tune summary').click();
  await page.locator('#logo-pack-favicon-crop-x').fill('0');
  await page.locator('#logo-pack-favicon-crop-y').fill('0');
  await page.locator('#logo-pack-favicon-crop-width').fill('240');
  await page.locator('#logo-pack-favicon-crop-height').fill('240');
  await capture(page, '10-logo-pack-step-4-fine-tune.png');
  await page.locator('#logo-pack-favicon-confirm').click();
  await expect(page.locator('#logo-pack-step-5')).toBeVisible();
  await capture(page, '11-logo-pack-step-5-review.png');
  await page.locator('#logo-pack-create-button').click();
  await waitForStatus(page, 'success', 30_000);
  await capture(page, '12-logo-pack-final-result.png', '#logo-pack-result');

  await page.setViewportSize({ width: 390, height: 844 });
  await gotoApp(page);
  await uploadFile(page, 'sample.jpg');
  await waitForStatus(page, 'ready');
  await selectMode(page, 'guided-fit');
  await capture(page, '13-guided-fit-mobile.png');
  await page.locator('#guided-fit-close').click();

  await openWideLogoPack(page);
  await capture(page, '14-logo-pack-mobile-step-1.png');
  await reachLogoPackIconStep(page);
  await capture(page, '15-logo-pack-mobile-step-4.png');
  await page.locator('#logo-pack-favicon-confirm').click();
  await expect(page.locator('#logo-pack-step-5')).toBeVisible();
  await capture(page, '16-logo-pack-mobile-step-5.png');
});
