import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { continueGuidedFit, gotoApp, selectMode, uploadFile, waitForStatus } from '../helpers/app';

const OUTPUT_DIR = path.join(import.meta.dirname, '..', '..', '..', 'public', 'brand');
const generateFixtures = process.env.FSG_GENERATE_WEBSITE_OPTIMIZER_FIXTURES === '1';

const outputs = [
  { presetId: 'web.hero', filename: 'website-optimizer-hero-result.webp', dimensions: '1600 × 900' },
  { presetId: 'web.content', filename: 'website-optimizer-content-result.webp', dimensions: '1200 × 800' },
  { presetId: 'web.card', filename: 'website-optimizer-card-result.webp', dimensions: '800 × 600' },
] as const;

async function prepareOutput(
  page: Page,
  output: (typeof outputs)[number],
): Promise<void> {
  await gotoApp(page);
  await uploadFile(page, 'website-optimizer-source.jpg');
  await waitForStatus(page, 'ready');
  await selectMode(page, 'guided-fit');
  await page.locator(`[data-preset-id="${output.presetId}"]`).click();
  await continueGuidedFit(page);
  await page.locator('#guided-process-button').click();

  if (await page.locator('#guided-fit-step-crop').isVisible()) {
    await page.locator('#guided-fit-confirm-crop').click();
  }

  await waitForStatus(page, 'success', 30_000);
  await expect(page.locator('#result-dimensions')).toHaveText(output.dimensions);
  await expect(page.locator('#result-format')).toHaveText('WebP');

  await expect(page.locator('#download-link')).toHaveAttribute('href', /^blob:/);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download-link').click();
  const download = await downloadPromise;
  await download.saveAs(path.join(OUTPUT_DIR, output.filename));
}

test('generates the deterministic Website Image Optimizer acquisition fixtures through Guided Fit', async ({ page }) => {
  test.skip(!generateFixtures, 'Set FSG_GENERATE_WEBSITE_OPTIMIZER_FIXTURES=1 to regenerate the committed acquisition assets.');
  test.setTimeout(180_000);
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const output of outputs) {
    await prepareOutput(page, output);
  }
});
