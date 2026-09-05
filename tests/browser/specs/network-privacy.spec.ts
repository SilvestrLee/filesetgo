import { expect, test } from '@playwright/test';
import { collectRequests, gotoApp, selectMode, setSimpleRequirement, uploadFile, waitForStatus } from '../helpers/app';

test.describe('Network boundary / privacy audit (directive §23/§46)', () => {
  test('normal JPEG/PNG/WebP processing sends no upload request and stays same-origin', async ({ page, baseURL }) => {
    const requests = collectRequests(page);

    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await setSimpleRequirement(page);
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    const origin = new URL(baseURL ?? 'http://127.0.0.1:8123').origin;
    const foreign = requests.urls().filter((url) => {
      if (url.startsWith('blob:') || url.startsWith('data:')) {
        return false;
      }
      return !url.startsWith(origin);
    });

    expect(foreign, `Unexpected non-application requests: ${JSON.stringify(foreign)}`).toEqual([]);
  });

  test('HEIC processing only fetches the known same-origin HEIC WASM/code asset, never a CDN', async ({ page, baseURL }) => {
    const requests = collectRequests(page);

    await gotoApp(page);
    await uploadFile(page, 'sample.heic');
    await waitForStatus(page, 'ready');
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    const origin = new URL(baseURL ?? 'http://127.0.0.1:8123').origin;
    const nonAppRequests = requests.urls().filter((url) => !url.startsWith('blob:') && !url.startsWith('data:') && !url.startsWith(origin));
    expect(nonAppRequests).toEqual([]);
  });

  test('the ZIP adapter is loaded as a local application asset, never a CDN request', async ({ page, baseURL }) => {
    const requests = collectRequests(page);

    await gotoApp(page);
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'success', 30_000);

    const origin = new URL(baseURL ?? 'http://127.0.0.1:8123').origin;
    const nonAppRequests = requests.urls().filter((url) => !url.startsWith('blob:') && !url.startsWith('data:') && !url.startsWith(origin));
    expect(nonAppRequests).toEqual([]);
  });

  test('no FileSetGo-created user-file content is persisted in browser storage', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await setSimpleRequirement(page);
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    const storageState = await page.evaluate(async () => {
      const ls = JSON.stringify(window.localStorage);
      const ss = JSON.stringify(window.sessionStorage);
      let dbNames: string[] = [];
      if ('databases' in indexedDB) {
        const dbs = await (indexedDB as unknown as { databases(): Promise<{ name?: string }[]> }).databases();
        dbNames = dbs.map((db) => db.name ?? '');
      }
      let cacheNames: string[] = [];
      if ('caches' in window) {
        cacheNames = await caches.keys();
      }
      return { ls, ss, dbNames, cacheNames };
    });

    expect(storageState.ls).toBe('{}');
    expect(storageState.ss).toBe('{}');
    expect(storageState.dbNames).toEqual([]);
    expect(storageState.cacheNames).toEqual([]);
  });
});
