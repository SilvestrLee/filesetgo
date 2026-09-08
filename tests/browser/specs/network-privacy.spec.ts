import { expect, test, type Page } from '@playwright/test';
import {
  collectConsoleProblems,
  collectRequests,
  gotoApp,
  selectLogoPackBackgroundMode,
  selectMode,
  uploadFile,
  waitForStatus,
  type ObservedRequest,
} from '../helpers/app';

const CARD_PRESET_CARD = '[data-preset-id="web.card"]';

function assertPrivateProcessingRequests(requests: ObservedRequest[], baseURL: string | undefined): void {
  const origin = new URL(baseURL ?? 'http://127.0.0.1:8123').origin;
  const networkRequests = requests.filter(({ url }) => !url.startsWith('blob:') && !url.startsWith('data:'));

  expect(
    networkRequests.filter(({ url }) => new URL(url).origin !== origin),
    'Processing must not contact an external origin.',
  ).toEqual([]);
  expect(
    networkRequests.filter(({ method, postData }) => method !== 'GET' || postData !== null),
    'Processing must not create an upload/body-bearing request.',
  ).toEqual([]);
}

async function runTargetSize(page: Page): Promise<void> {
  await page.locator('#target-size-value').fill('80');
  await page.locator('#target-size-unit').selectOption('KB');
  await page.locator('#output-format').selectOption('jpeg');
  await page.locator('#process-button').click();
  await waitForStatus(page, 'success', 30_000);
}

test.describe('Network boundary / privacy audit (FSG-006R)', () => {
  test('Quick Fit JPEG, PNG, and WebP processing creates no upload request', async ({ page, baseURL }) => {
    const requests = collectRequests(page);
    const console_ = collectConsoleProblems(page);
    await gotoApp(page);

    for (const fixture of ['sample.jpg', 'sample.png', 'sample.webp']) {
      await uploadFile(page, fixture);
      await waitForStatus(page, 'ready');
      await page.locator('#output-format').selectOption(fixture.endsWith('.webp') ? 'png' : 'webp');
      await page.locator('#process-button').click();
      await waitForStatus(page, 'success', 30_000);
      await page.locator('#reset-button').click();
      await waitForStatus(page, 'idle');
    }

    assertPrivateProcessingRequests(requests.records(), baseURL);
    console_.assertClean();
  });

  test('target-size processing creates no upload request', async ({ page, baseURL }) => {
    const requests = collectRequests(page);
    const console_ = collectConsoleProblems(page);
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await runTargetSize(page);

    assertPrivateProcessingRequests(requests.records(), baseURL);
    console_.assertClean();
  });

  test('Guided Fit processing creates no upload request', async ({ page, baseURL }) => {
    const requests = collectRequests(page);
    const console_ = collectConsoleProblems(page);
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator(CARD_PRESET_CARD).click();
    await page.locator('#guided-process-button').click();
    await waitForStatus(page, 'success', 30_000);

    assertPrivateProcessingRequests(requests.records(), baseURL);
    console_.assertClean();
  });

  test('Logo Pack Original processing and ZIP download create no upload request', async ({ page, baseURL }) => {
    const requests = collectRequests(page);
    const console_ = collectConsoleProblems(page);
    await gotoApp(page);
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'original');
    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'success', 30_000);
    await Promise.all([
      page.waitForEvent('download'),
      page.locator('#logo-pack-download-zip').click(),
    ]);

    assertPrivateProcessingRequests(requests.records(), baseURL);
    console_.assertClean();
  });

  test('Logo Pack Transparent preview and ZIP download create no upload request', async ({ page, baseURL }) => {
    const requests = collectRequests(page);
    const console_ = collectConsoleProblems(page);
    await gotoApp(page);
    await uploadFile(page, 'flat-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'transparent');
    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });
    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'success', 30_000);
    await Promise.all([
      page.waitForEvent('download'),
      page.locator('#logo-pack-download-zip').click(),
    ]);

    assertPrivateProcessingRequests(requests.records(), baseURL);
    console_.assertClean();
  });

  test('HEIC only fetches same-origin static decoder/WASM assets and creates no upload request', async ({ page, baseURL }) => {
    const requests = collectRequests(page);
    const console_ = collectConsoleProblems(page);
    await gotoApp(page);
    await uploadFile(page, 'sample.heic');
    await waitForStatus(page, 'ready');
    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    assertPrivateProcessingRequests(requests.records(), baseURL);
    expect(requests.urls().some((url) => /heic_dec-.*\.wasm$/.test(url))).toBe(true);
    console_.assertClean();
  });

  test('no FileSetGo-created user-file content is persisted in browser storage', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await runTargetSize(page);

    const storageState = await page.evaluate(async () => {
      const local = JSON.stringify(window.localStorage);
      const session = JSON.stringify(window.sessionStorage);
      const databases = 'databases' in indexedDB
        ? await (indexedDB as unknown as { databases(): Promise<{ name?: string }[]> }).databases()
        : [];
      const caches_ = 'caches' in window ? await caches.keys() : [];

      return {
        local,
        session,
        databaseNames: databases.map((database) => database.name ?? ''),
        cacheNames: caches_,
      };
    });

    expect(storageState).toEqual({
      local: '{}',
      session: '{}',
      databaseNames: [],
      cacheNames: [],
    });
  });
});
