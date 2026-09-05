import { expect, test } from '@playwright/test';
import { collectConsoleProblems, gotoApp, selectMode, uploadFile, waitForStatus } from '../helpers/app';

const EXPECTED_ASSETS = [
  'logo-header.png',
  'logo-header@2x.png',
  'favicon.ico',
  'favicon-32x32.png',
  'apple-touch-icon.png',
  'icon-192x192.png',
  'icon-512x512.png',
];

test.describe('Website Logo Pack certification (directive §17)', () => {
  test('a complete successful Logo Pack flow produces exactly seven public assets', async ({ page }) => {
    const console_ = collectConsoleProblems(page);

    await gotoApp(page);
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');

    await selectMode(page, 'logo-pack');
    // Source is shared — no second preflight/inspecting state.
    await expect(page.locator('#logo-pack-review')).toBeVisible();
    // good-logo.png is a PNG; assessTransparencyGuidance() always attaches an
    // info-level transparency note for png/webp sources, so "This logo looks
    // ready to prepare." (issues.length === 0) is not reached by any real
    // jpeg/png/webp source — see SPRINT_REPORT.md "Defects Found" P3 note.
    await expect(page.locator('#logo-pack-issues')).toContainText(
      'If your source already contains transparency, PNG outputs can preserve it.',
    );

    const createButton = page.locator('#logo-pack-create-button');
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // A small logo can finish before an intermediate "processing" check
    // round-trip lands under heavy parallel CPU contention — assert the
    // real terminal state rather than racing an intermediate one (the
    // same pattern already applied elsewhere in this suite).
    await waitForStatus(page, 'success', 30_000);

    await expect(page.locator('#logo-pack-result')).toBeVisible();

    const assetItems = page.locator('#logo-pack-assets li');
    await expect(assetItems).toHaveCount(7);

    for (const filename of EXPECTED_ASSETS) {
      await expect(page.locator('#logo-pack-assets')).toContainText(filename);
    }

    // favicon.ico appears exactly once (not also as separate 16/32/48 PNGs).
    const faviconMatches = await page.locator('#logo-pack-assets li', { hasText: 'favicon.ico' }).count();
    expect(faviconMatches).toBe(1);

    // No README/manifest text appears anywhere in the result.
    const resultText = (await page.locator('#logo-pack-result').textContent()) ?? '';
    expect(resultText).not.toMatch(/readme/i);
    expect(resultText).not.toMatch(/manifest/i);
    expect(resultText).not.toMatch(/browserconfig/i);

    // Primary CTA is the ZIP; individual downloads are secondary (present,
    // listed after the primary CTA in DOM order).
    const primaryCta = page.locator('#logo-pack-download-zip');
    await expect(primaryCta).toBeVisible();
    await expect(primaryCta).toHaveText(/download logo pack/i);

    const [zipDownload] = await Promise.all([
      page.waitForEvent('download'),
      primaryCta.click(),
    ]);
    expect(zipDownload.suggestedFilename()).toMatch(/-filesetgo-logo-pack\.zip$/);

    console_.assertClean();
  });

  test('reset returns cleanly from a successful Logo Pack result', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'success', 30_000);

    await page.locator('#reset-button').click();
    await waitForStatus(page, 'idle');

    await expect(page.locator('#logo-pack-no-file-hint')).toBeVisible();
    await expect(page.locator('#logo-pack-result')).toBeHidden();
    await expect(page.locator('#source-panel')).toBeHidden();

    // A new file can be selected successfully afterward.
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');
  });

  test('a wide-aspect-ratio logo shows a geometry warning but does not block generation', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'wide-logo.png'); // 1200x150, 8:1 aspect ratio
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');

    await expect(page.locator('#logo-pack-issues')).toContainText(
      'This logo is very wide or tall. It may appear small inside square favicon and app-icon files.',
    );
    await expect(page.locator('#logo-pack-create-button')).toBeEnabled();
  });

  test('a source requiring more than 4x icon enlargement blocks generation until replaced', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'small-logo.png'); // 60x60 -> required factor > 4x
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');

    await expect(page.locator('#logo-pack-issues')).toContainText(
      'This logo is too small to create a useful 512 px website icon.',
    );
    await expect(page.locator('#logo-pack-create-button')).toBeDisabled();

    // Replacing with an adequate source restores the ability to generate.
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');
    // good-logo.png is a PNG; assessTransparencyGuidance() always attaches an
    // info-level transparency note for png/webp sources, so "This logo looks
    // ready to prepare." (issues.length === 0) is not reached by any real
    // jpeg/png/webp source — see SPRINT_REPORT.md "Defects Found" P3 note.
    await expect(page.locator('#logo-pack-issues')).toContainText(
      'If your source already contains transparency, PNG outputs can preserve it.',
    );
    await expect(page.locator('#logo-pack-create-button')).toBeEnabled();
  });

  test('a JPEG source gets truthful background guidance, never a transparency/removal claim', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');

    const issuesText = (await page.locator('#logo-pack-issues').textContent()) ?? '';
    expect(issuesText).toContain("JPEG doesn't support transparency. FileSetGo won't remove the existing background automatically.");
    expect(issuesText).not.toMatch(/transparent background created/i);
    expect(issuesText).not.toMatch(/background removed/i);
  });
});
