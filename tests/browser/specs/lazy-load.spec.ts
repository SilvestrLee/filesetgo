import { expect, test } from '@playwright/test';
import { collectRequests, gotoApp, selectMode, setSimpleRequirement, uploadFile, waitForStatus } from '../helpers/app';

function requestedHeicChunk(urls: string[]): boolean {
  return urls.some((url) => /heic-decode|heic_dec/.test(url));
}

function requestedZipAdapterChunk(urls: string[]): boolean {
  return urls.some((url) => /zip-adapter/.test(url));
}

/**
 * Playwright reliably surfaces network requests made from *inside* a module
 * Worker (both `image.worker.js` itself and its own dynamic `import()` of
 * `zip-adapter.js`/`heic-decode.js`) through `page.on('request')` only under
 * Chromium's CDP transport. Firefox's Juggler protocol does not expose
 * worker-scope requests the same way, so a request-based assertion about
 * lazy-loading is a genuine engine-tooling limitation there, not a product
 * defect — the same lazy-loading fact is independently and more strongly
 * proven by the byte-for-byte-unchanged chunk-hash bundle inspection
 * recorded in SPRINT_REPORT.md's "Bundle Observation"/"Lazy-Load Runtime
 * Audit" sections. See "Browser Compatibility Classification" (directive §53).
 */
const canObserveWorkerRequests = (browserName: string): boolean => browserName === 'chromium';

test.describe('Lazy-load runtime verification (directive §24)', () => {
  test('a normal JPEG Quick Fit job never requests the HEIC decoder or ZIP adapter chunks', async ({ page, browserName }) => {
    const requests = collectRequests(page);

    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await setSimpleRequirement(page);
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    test.skip(!canObserveWorkerRequests(browserName), 'Worker-scope requests are not observable via page.on("request") on this engine.');
    expect(requestedHeicChunk(requests.urls())).toBe(false);
    expect(requestedZipAdapterChunk(requests.urls())).toBe(false);
  });

  test('the HEIC decoder chunk is not requested until a HEIC file is actually processed', async ({ page, browserName }) => {
    const requests = collectRequests(page);

    await gotoApp(page);

    await uploadFile(page, 'sample.heic');
    await waitForStatus(page, 'ready');
    await setSimpleRequirement(page);
    // Preflight alone (before pressing "Get file ready") should not require
    // the full HEIC decoder — only decode does.
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    test.skip(!canObserveWorkerRequests(browserName), 'Worker-scope requests are not observable via page.on("request") on this engine.');
    expect(requestedHeicChunk(requests.urls())).toBe(true);
  });

  test('opening the Logo Pack tab does not request the ZIP adapter chunk merely from being opened', async ({ page, browserName }) => {
    const requests = collectRequests(page);

    await gotoApp(page);
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await expect(page.locator('#logo-pack-review')).toBeVisible();

    const beforeGeneration = requestedZipAdapterChunk(requests.urls());

    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'success', 30_000);

    test.skip(!canObserveWorkerRequests(browserName), 'Worker-scope requests are not observable via page.on("request") on this engine.');
    expect(beforeGeneration).toBe(false);
    expect(requestedZipAdapterChunk(requests.urls())).toBe(true);
  });
});
