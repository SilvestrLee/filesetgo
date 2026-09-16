import path from 'node:path';
import { unzipSync } from 'fflate';
import { expect, type ConsoleMessage, type Download, type Page, type Request } from '@playwright/test';

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

/**
 * Clicks a workspace mode tab and waits for it to become the active tab.
 * A tab heading only switches which launcher panel is shown (FSG-007-FIT-001
 * follow-up) — it is never itself a destination button — so for Guided Fit
 * and Logo Pack this also clicks that panel's own "Open"-style button to
 * reach the dialog, matching how a real user would.
 */
export async function selectMode(page: Page, mode: ProductMode): Promise<void> {
  const openTaskDialog = page.locator('.fsg-task-dialog[open]');

  if (await openTaskDialog.count() > 0) {
    await page.keyboard.press('Escape');
    await expect(openTaskDialog).toHaveCount(0);
  }

  await page.locator(`#mode-tab-${mode}`).click();
  await expect(page.locator(`#mode-tab-${mode}`)).toHaveAttribute('aria-selected', 'true');

  if (mode !== 'quick-fit') {
    await expect(page.locator(`#${mode}-panel`)).toBeVisible();
    await page.locator(`#${mode}-open`).click();
    await expect(page.locator(`#${mode}-dialog`)).toBeVisible();
  }
}

/**
 * Chooses Logo Pack's explicit background mode (FSG-005C directive §5) —
 * never inferred, always a real radio-input click through the actual UI.
 */
export async function selectLogoPackBackgroundMode(page: Page, mode: 'transparent' | 'original'): Promise<void> {
  if (await page.locator('#logo-pack-step-1').isVisible()) {
    await page.locator('#logo-pack-step-continue').click();
    await expect(page.locator('#logo-pack-step-2')).toBeVisible();
  }

  await page.locator(`#logo-pack-mode-${mode}`).check();
}

/** Records the user's explicit choice to keep the complete prepared logo as the favicon source. */
export async function approveFullLogoFaviconSource(page: Page): Promise<void> {
  await continueLogoPackToFaviconSource(page);
  await expect(page.locator('#logo-pack-favicon-source')).toBeVisible({ timeout: 20_000 });
  await page.locator('#logo-pack-favicon-option-full').check();
  await page.locator('#logo-pack-favicon-confirm').click();
  await expect(page.locator('#logo-pack-favicon-confirmed')).toContainText('Full logo');
  await expect(page.locator('#logo-pack-step-5')).toBeVisible();
}

/** Advances Guided Fit from destination choice to the isolated recommendation step. */
export async function continueGuidedFit(page: Page): Promise<void> {
  await expect(page.locator('#guided-step-continue')).toBeEnabled();
  await page.locator('#guided-step-continue').click();
  await expect(page.locator('#guided-fit-step-2')).toBeVisible();
}

/**
 * Confirms the current draft on Guided Fit's crop step (FSG-007-FIT-002) —
 * the shared locked-ratio crop engine's default centered suggestion is
 * accepted as-is, mirroring a user who agrees with FileSetGo's neutral
 * starting frame without dragging it.
 */
export async function confirmGuidedFitCrop(page: Page): Promise<void> {
  await expect(page.locator('#guided-fit-step-crop')).toBeVisible();
  await page.locator('#guided-fit-confirm-crop').click();
}

/** Approves Guided Fit's upscale warning when reaching the destination's exact frame requires enlarging the source (FSG-007-FIT-002). */
export async function approveGuidedFitUpscale(page: Page): Promise<void> {
  await expect(page.locator('#guided-fit-upscale-field')).toBeVisible();
  await page.locator('#guided-fit-upscale-approve').check();
}

/** Advances a prepared background decision into its isolated review step. */
export async function reviewLogoPackBackground(page: Page): Promise<void> {
  await expect(page.locator('#logo-pack-step-continue')).toBeEnabled({ timeout: 20_000 });
  await page.locator('#logo-pack-step-continue').click();
  await expect(page.locator('#logo-pack-step-3')).toBeVisible();
}

/** Advances a ready Logo Pack background decision through review to the isolated favicon-source step. */
export async function continueLogoPackToFaviconSource(page: Page): Promise<void> {
  if (await page.locator('#logo-pack-step-2').isVisible()) {
    await reviewLogoPackBackground(page);
  }

  if (await page.locator('#logo-pack-step-3').isVisible()) {
    await page.locator('#logo-pack-step-continue').click();
  }

  await expect(page.locator('#logo-pack-step-4')).toBeVisible();
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
  if (!(await page.locator('#quick-fit-dialog').isVisible())) {
    await page.locator('#quick-fit-open').click();
  }

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
export interface ObservedRequest {
  url: string;
  method: string;
  postData: string | null;
}

export function collectRequests(page: Page): { urls(): string[]; records(): ObservedRequest[] } {
  const requests: ObservedRequest[] = [];
  page.on('request', (request: Request) => requests.push({
    url: request.url(),
    method: request.method(),
    postData: request.postData(),
  }));

  return {
    urls: () => requests.map(({ url }) => url),
    records: () => [...requests],
  };
}

/**
 * Reads a real downloaded ZIP's exact entry names via `fflate` (already a
 * project dependency, reused here rather than adding a second archive
 * library) — test-side confirmation of package asset integrity (FSG-006
 * delta recertification directive §27/§28), not merely a downloaded-file
 * count or filename pattern.
 */
export async function zipEntryNames(download: Download): Promise<string[]> {
  return Object.keys(await zipEntries(download)).sort();
}

/** Reads every ZIP entry for browser-side pixel/derivation assertions. */
export async function zipEntries(download: Download): Promise<Record<string, Uint8Array>> {
  const stream = await download.createReadStream();

  if (stream === null) {
    throw new Error('Download did not produce a readable stream.');
  }

  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }

  const buffer = Buffer.concat(chunks);
  return unzipSync(new Uint8Array(buffer));
}
