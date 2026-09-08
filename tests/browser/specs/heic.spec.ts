import { expect, test } from '@playwright/test';
import { gotoApp, selectLogoPackBackgroundMode, selectMode, uploadFile, waitForStatus } from '../helpers/app';

test.describe('HEIC certification (directive §20)', () => {
  test('a cancelled HEIC workflow hard-terminates its stalled worker and recovers with a fresh worker', async ({ page }) => {
    await page.addInitScript(() => {
      const NativeWorker = window.Worker;
      let workerCount = 0;
      let terminateCount = 0;

      class ObservableWorker extends NativeWorker {
        private readonly stalled: boolean;

        public constructor(scriptURL: string | URL, options?: WorkerOptions) {
          super(scriptURL, options);
          workerCount += 1;
          this.stalled = workerCount === 1;
        }

        public override postMessage(message: unknown, optionsOrTransfer?: StructuredSerializeOptions | Transferable[]): void {
          if (this.stalled) {
            return;
          }

          super.postMessage(message, optionsOrTransfer as StructuredSerializeOptions);
        }

        public override terminate(): void {
          terminateCount += 1;
          super.terminate();
        }
      }

      Object.defineProperty(window, 'Worker', { configurable: true, value: ObservableWorker });
      Object.defineProperty(window, '__fsgWorkerLifecycle', {
        configurable: true,
        value: () => ({ workerCount, terminateCount }),
      });
    });

    await gotoApp(page);
    await uploadFile(page, 'sample.heic');
    await waitForStatus(page, 'ready');

    await page.locator('#process-button').click();
    await waitForStatus(page, 'processing');
    await page.locator('#cancel-button').click();
    await waitForStatus(page, 'cancelled');
    await expect(page.locator('#result-content')).toBeHidden();

    expect(await page.evaluate(() => (
      window as unknown as { __fsgWorkerLifecycle(): { workerCount: number; terminateCount: number } }
    ).__fsgWorkerLifecycle())).toEqual({ workerCount: 1, terminateCount: 1 });

    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-format')).toHaveText(/webp/i);

    expect(await page.evaluate(() => (
      window as unknown as { __fsgWorkerLifecycle(): { workerCount: number; terminateCount: number } }
    ).__fsgWorkerLifecycle())).toEqual({ workerCount: 2, terminateCount: 2 });
  });

  test('a real HEIC source decodes and produces a successful WebP output', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.heic');
    await waitForStatus(page, 'ready');

    await expect(page.locator('#source-format')).toHaveText(/heic/i);
    // HEIC cannot be an output format — the UI must say so truthfully rather
    // than silently substituting it.
    await expect(page.locator('#heic-output-note')).toBeVisible();
    await expect(page.locator('#heic-output-note')).toHaveText(/WebP/);

    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    await expect(page.locator('#result-format')).toHaveText(/webp/i);
    await expect(page.locator('#download-link')).toHaveAttribute('href', /^blob:/);
  });

  test('a HEIC source completes the new Transparent Logo Pack path (FSG-006 delta recertification §30)', async ({ page }) => {
    await gotoApp(page);
    // sample.heic (64×48) is too small for Logo Pack's 512px icon canvas
    // (required upscale > 4×, correctly blocking); flat-logo.heic is the
    // same flat-background fixture used elsewhere, converted to a real
    // HEIC file, large enough to exercise this path without an unrelated
    // suitability block.
    await uploadFile(page, 'flat-logo.heic');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'transparent');

    // FSG-005C's transparent-master stage decodes and operates on the same
    // real decoded HEIC pixels the Quick Fit path already proves work.
    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#logo-pack-preview-confidence')).not.toHaveText('');

    const createButton = page.locator('#logo-pack-create-button');
    await expect(createButton).toBeEnabled();
    await createButton.click();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#logo-pack-result')).toBeVisible();
  });

  test('a HEIC source still completes the simpler Original Logo Pack path (FSG-006 delta recertification §31 — no regression)', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'flat-logo.heic');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'original');

    const createButton = page.locator('#logo-pack-create-button');
    await expect(createButton).toBeEnabled();
    await createButton.click();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#logo-pack-result')).toBeVisible();
  });
});
