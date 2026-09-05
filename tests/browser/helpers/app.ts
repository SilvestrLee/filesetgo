import path from 'node:path';
import { expect, type ConsoleMessage, type Page } from '@playwright/test';

export const FIXTURES_DIR = path.join(import.meta.dirname, '..', 'fixtures', 'files');

export type ProductMode = 'quick-fit' | 'guided-fit' | 'logo-pack';

export function fixturePath(name: string): string {
  return path.join(FIXTURES_DIR, name);
}

/** Navigates to the real app and waits for the workspace to be interactive. */
export async function gotoApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#quick-fit-app')).toBeVisible();
  // The capability-gated unsupported-runtime banner (directive §21) must not
  // be showing in a normal Chromium/Firefox run — if it is, the workspace
  // itself is unusable and every subsequent assertion would be meaningless.
  await expect(page.locator('#runtime-unsupported')).toBeHidden();
}

/** Clicks a workspace mode tab and waits for it to become the active tab. */
export async function selectMode(page: Page, mode: ProductMode): Promise<void> {
  await page.locator(`#mode-tab-${mode}`).click();
  await expect(page.locator(`#mode-tab-${mode}`)).toHaveAttribute('aria-selected', 'true');
}

/**
 * Selects a file through the real `<input type="file">` FileSetGo's own
 * drop-zone/change-event wiring listens on (`resources/js/quick-fit/controller.ts`)
 * — this exercises the actual product code path, not a synthetic shortcut.
 */
export async function uploadFile(
  page: Page,
  fixtureNameOrFile: string | { name: string; mimeType: string; buffer: Buffer },
): Promise<void> {
  const file = typeof fixtureNameOrFile === 'string' ? fixturePath(fixtureNameOrFile) : fixtureNameOrFile;
  await page.locator('#source-file').setInputFiles(file as never);
}

/** Waits for `#status-message`'s `data-state` attribute (the real QuickFitState/LogoPackController status). */
export async function waitForStatus(page: Page, state: string, timeout = 20_000): Promise<void> {
  await expect(page.locator('#status-message')).toHaveAttribute('data-state', state, { timeout });
}

export function statusMessage(page: Page) {
  return page.locator('#status-message');
}

/**
 * Quick Fit's "Get file ready" is a real no-op guard: submitting with the
 * default "Keep original" format and no target size/dimensions shows
 * `#no-op-hint` instead of processing. Tests that don't care about a
 * specific requirement (but still need a real job to run) should call this
 * first — it sets a guaranteed-valid, always-different-from-original
 * requirement (convert to WebP).
 */
export async function setSimpleRequirement(page: Page): Promise<void> {
  await page.locator('#output-format').selectOption('webp');
}

/**
 * Collects console errors and uncaught page exceptions for the lifetime of a
 * test (directive §22). Call `assertClean()` at the end of a certified
 * successful workflow.
 */
export function collectConsoleProblems(page: Page): { assertClean(): void; entries(): string[] } {
  const problems: string[] = [];

  const onConsole = (message: ConsoleMessage) => {
    if (message.type() === 'error') {
      problems.push(`console.error: ${message.text()}`);
    }
  };
  const onPageError = (error: Error) => {
    problems.push(`pageerror: ${error.message}`);
  };

  page.on('console', onConsole);
  page.on('pageerror', onPageError);

  return {
    entries: () => [...problems],
    assertClean: () => {
      expect(problems, `Unexpected console errors/exceptions:\n${problems.join('\n')}`).toEqual([]);
    },
  };
}

/**
 * Records every outgoing network request for the lifetime of a test
 * (directive §23) so tests can assert no user-content upload occurred and
 * distinguish application-asset loads (HEIC WASM, same-origin chunks) from
 * any hypothetical upload endpoint.
 */
export function collectRequests(page: Page): { urls(): string[] } {
  const urls: string[] = [];
  page.on('request', (request) => urls.push(request.url()));
  return { urls: () => [...urls] };
}
