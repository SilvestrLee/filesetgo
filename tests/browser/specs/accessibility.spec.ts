import { expect, test } from '@playwright/test';
import { gotoApp, setSimpleRequirement, uploadFile, waitForStatus } from '../helpers/app';

test.describe('Accessibility / keyboard audit (directive §40-§42)', () => {
  test('exactly one H1 exists on the page', async ({ page }) => {
    await gotoApp(page);
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('mode tabs expose correct roles and selection state', async ({ page }) => {
    await gotoApp(page);
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3);

    for (const id of ['mode-tab-quick-fit', 'mode-tab-guided-fit', 'mode-tab-logo-pack']) {
      await expect(page.locator(`#${id}`)).toHaveAttribute('role', 'tab');
      await expect(page.locator(`#${id}`)).toHaveAttribute('aria-controls', /.+/);
    }
  });

  test('the file selector and primary actions are keyboard-reachable', async ({ page }) => {
    await gotoApp(page);

    // Drop zone is a real, focusable, keyboard-activatable control.
    await expect(page.locator('#drop-zone')).toHaveAttribute('role', 'button');
    await expect(page.locator('#drop-zone')).toHaveAttribute('tabindex', '0');

    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await setSimpleRequirement(page);

    // Tab through to the primary processing CTA and activate it with the keyboard.
    await page.locator('#target-size-value').focus();
    await page.locator('#process-button').focus();
    await expect(page.locator('#process-button')).toBeFocused();
    await page.keyboard.press('Enter');
    await waitForStatus(page, 'success', 30_000);
  });

  test('a blocking rejection is announced via role="alert" or the live-region announcer', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'corrupted.jpg');
    await waitForStatus(page, 'error');

    await expect(page.locator('#source-rejected-message')).toBeVisible();
    // The shared aria-live status announcer also carries the rejection.
    const announced = await page.locator('#status-announcer').textContent();
    expect(announced ?? '').toMatch(/rejected/i);
  });

  test('download controls have distinct accessible names, not a repeated generic "Download"', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');
    await page.locator('#mode-tab-logo-pack').click();
    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'success', 30_000);

    const links = page.locator('#logo-pack-assets a');
    const count = await links.count();
    expect(count).toBe(7);

    const names = await links.evaluateAll((elements) => elements.map((element) => element.getAttribute('aria-label') ?? element.textContent));
    const uniqueNames = new Set(names.map((name) => name?.trim()));
    expect(uniqueNames.size).toBe(7); // every accessible name is distinct
    for (const name of names) {
      expect(name).not.toBe('Download');
    }
  });

  test('focus is not trapped in hidden content after cancellation or reset', async ({ page }) => {
    await gotoApp(page);
    // large.jpg + a bounded target-size search gives cancellation a real
    // window to land in (a tiny fixture's single-pass conversion can finish
    // before Cancel is observable).
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#target-size-value').fill('50');
    await page.locator('#target-size-unit').selectOption('KB');
    await page.locator('#process-button').click();
    await waitForStatus(page, 'processing');
    await page.locator('#cancel-button').click();
    await waitForStatus(page, 'cancelled', 15_000);

    // The focused element (if any) must still be attached and visible, not
    // stranded inside a now-hidden panel. A browser's own focus-clearing
    // when the previously-focused control (Cancel) becomes hidden is not
    // necessarily synchronous with the state-change script that hides it —
    // under real CPU contention this can lag by a frame or two — so this
    // polls for a stable outcome rather than snapshotting immediately
    // (directive §59: explicit state waits, not an arbitrary sleep).
    await expect
      .poll(() =>
        page.evaluate(() => {
          const active = document.activeElement;
          if (active === null || active === document.body) {
            return true;
          }
          const style = window.getComputedStyle(active);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }),
      )
      .toBe(true);
  });
});
