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
    // The Quick Fit form only appears once a source is selected.
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');

    await expect(page.locator('#requirements-form')).toBeVisible();
    await expect(page.locator('#guided-fit-panel')).toBeHidden();
    await expect(page.locator('#logo-pack-panel')).toBeHidden();

    await selectMode(page, 'guided-fit');
    await expect(page.locator('#guided-fit-panel')).toBeVisible();
    await expect(page.locator('#requirements-form')).toBeHidden();

    await selectMode(page, 'logo-pack');
    await expect(page.locator('#logo-pack-panel')).toBeVisible();
    await expect(page.locator('#guided-fit-panel')).toBeHidden();

    // Keyboard cycling: focus the active tab, then ArrowLeft/ArrowRight should
    // move both roving tabindex and the visible panel (directive §40/§41).
    await page.locator('#mode-tab-logo-pack').focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#mode-tab-quick-fit')).toBeFocused();
    await expect(page.locator('#mode-tab-quick-fit')).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#requirements-form')).toBeVisible();

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#mode-tab-logo-pack')).toBeFocused();
    await expect(page.locator('#mode-tab-logo-pack')).toHaveAttribute('aria-selected', 'true');
  });

  test('each mode tab is reachable and keyboard-selectable without a mouse', async ({ page }) => {
    await gotoApp(page);

    // The tablist uses automatic activation (ArrowRight/ArrowLeft both move
    // focus and activate the tab immediately — resources/js/quick-fit/controller.ts).
    await page.locator('#mode-tab-quick-fit').focus();
    await page.keyboard.press('ArrowRight'); // -> guided-fit, activates immediately
    await expect(page.locator('#guided-fit-panel')).toBeVisible();
  });
});
