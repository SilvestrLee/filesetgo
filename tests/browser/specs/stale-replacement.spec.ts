import { expect, test } from '@playwright/test';
import { fixturePath, gotoApp, selectMode, waitForStatus } from '../helpers/app';

test.describe('Rapid file replacement / stale-result certification (directive §28)', () => {
  test('Quick Fit: File B becomes authoritative even if File A is still inspecting', async ({ page }) => {
    await gotoApp(page);

    // Fire both selections back-to-back. `setInputFiles` resolves once the
    // DOM change event is dispatched, not once the app's async preflight
    // promise for that file has settled — so the second call can genuinely
    // land while File A's inspection is still in flight.
    const input = page.locator('#source-file');
    await input.setInputFiles(fixturePath('sample.jpg')); // File A
    await input.setInputFiles(fixturePath('sample.png')); // File B, immediately after

    await waitForStatus(page, 'ready');

    // File B (PNG) is authoritative; File A's late preflight must not
    // silently overwrite it.
    await expect(page.locator('#source-format')).toHaveText(/png/i);

    // Give any stale in-flight preflight a moment to resolve, then confirm
    // the displayed source is still File B.
    await page.waitForTimeout(500);
    await expect(page.locator('#source-format')).toHaveText(/png/i);
  });

  test('Logo Pack: rapid source replacement keeps the suitability review consistent with the latest source', async ({ page }) => {
    await gotoApp(page);
    await selectMode(page, 'logo-pack');

    const input = page.locator('#source-file');
    await input.setInputFiles(fixturePath('small-logo.png')); // would block
    await input.setInputFiles(fixturePath('good-logo.png')); // immediately replaced with an adequate source

    await waitForStatus(page, 'ready');
    await expect(page.locator('#logo-pack-create-button')).toBeEnabled();
    // good-logo.png is a PNG; assessTransparencyGuidance() always attaches an
    // info-level transparency note for png/webp sources, so "This logo looks
    // ready to prepare." (issues.length === 0) is not reached by any real
    // jpeg/png/webp source — see SPRINT_REPORT.md "Defects Found" P3 note.
    await expect(page.locator('#logo-pack-issues')).toContainText(
      'If your source already contains transparency, PNG outputs can preserve it.',
    );
  });
});
