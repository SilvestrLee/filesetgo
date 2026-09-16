import { expect, test } from '@playwright/test';
import { collectConsoleProblems, gotoApp, selectMode, uploadFile, waitForStatus } from '../helpers/app';

test.describe('Application bootstrap (directive §10)', () => {
  test('homepage renders, capability check completes, no fatal exception', async ({ page }) => {
    const console_ = collectConsoleProblems(page);

    await gotoApp(page);

    await expect(page).toHaveTitle(/File\. Set\. Go\./);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('#drop-zone')).toBeVisible();
    await expect(page.locator('#status-message')).toHaveAttribute('data-state', 'idle');

    console_.assertClean();
  });

  test('mode tabs switch panels and keyboard-cycle with ArrowLeft/ArrowRight', async ({ page }) => {
    await gotoApp(page);
    // The Quick Fit launcher only becomes actionable once a source is selected.
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');

    await expect(page.locator('#quick-fit-panel')).toBeVisible();
    await expect(page.locator('#quick-fit-open')).toBeEnabled();
    await expect(page.locator('#guided-fit-panel')).toBeHidden();
    await expect(page.locator('#logo-pack-panel')).toBeHidden();

    await selectMode(page, 'guided-fit');
    await expect(page.locator('#guided-fit-panel')).toBeVisible();
    await expect(page.locator('#guided-fit-dialog')).toBeVisible();
    await expect(page.locator('#quick-fit-panel')).toBeHidden();

    await selectMode(page, 'logo-pack');
    await expect(page.locator('#logo-pack-panel')).toBeVisible();
    await expect(page.locator('#logo-pack-dialog')).toBeVisible();
    await expect(page.locator('#guided-fit-panel')).toBeHidden();

    await page.keyboard.press('Escape');
    await expect(page.locator('#logo-pack-dialog')).toBeHidden();

    // Keyboard cycling: focus the active tab, then ArrowLeft/ArrowRight should
    // move both roving tabindex and the visible panel (directive §40/§41). A
    // tab heading is never itself a destination button — it only switches
    // which launcher panel is shown, for every mode alike; only that panel's
    // own primary button opens its dialog.
    await page.locator('#mode-tab-logo-pack').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#mode-tab-quick-fit')).toBeFocused();
    await expect(page.locator('#mode-tab-quick-fit')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#quick-fit-panel')).toBeVisible();
    await expect(page.locator('#logo-pack-dialog')).toBeHidden();
    await page.locator('#quick-fit-open').click();
    await expect(page.locator('#requirements-form')).toBeVisible();
    await page.keyboard.press('Escape');
    // Everything outside a modal <dialog> is inert until it actually closes
    // — the exit animation keeps `[open]` true for a moment after Escape.
    await expect(page.locator('#quick-fit-dialog')).toBeHidden();

    await page.locator('#mode-tab-quick-fit').press('ArrowLeft');
    await expect(page.locator('#mode-tab-logo-pack')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#logo-pack-panel')).toBeVisible();
    await expect(page.locator('#logo-pack-dialog')).toBeHidden();
  });

  test('each mode tab is reachable and keyboard-selectable without a mouse', async ({ page }) => {
    await gotoApp(page);
    // A launcher button needs an active source to open its real dialog
    // rather than the source-required gate (FSG-007-FIT-001B directive §30).
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');

    // The tablist uses automatic activation (ArrowRight/ArrowLeft both move
    // focus and activate the tab immediately — resources/js/quick-fit/controller.ts).
    // Activating a tab only reveals its launcher panel; it never opens the
    // panel's dialog by itself — that panel's own primary button does.
    await page.locator('#mode-tab-quick-fit').focus();
    await page.keyboard.press('ArrowRight'); // -> guided-fit, activates immediately
    await expect(page.locator('#guided-fit-panel')).toBeVisible();
    await expect(page.locator('#guided-fit-dialog')).toBeHidden();

    await page.locator('#guided-fit-open').click();
    await expect(page.locator('#guided-fit-dialog')).toBeVisible();
  });
});
