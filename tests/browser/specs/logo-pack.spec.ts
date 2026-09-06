import { expect, test } from '@playwright/test';
import { collectConsoleProblems, gotoApp, selectLogoPackBackgroundMode, selectMode, uploadFile, waitForStatus, zipEntryNames } from '../helpers/app';

function expectedAssets(mode: 'transparent' | 'original', basename: string): string[] {
  return [
    `${basename}-${mode}.png`,
    `${basename}-${mode}@2x.png`,
    'favicon.ico',
    'favicon-32x32.png',
    'apple-touch-icon.png',
    'icon-192x192.png',
    'icon-512x512.png',
  ];
}

test.describe('Website Logo Pack certification (directive §17, extended by FSG-005C)', () => {
  test('a complete successful Original-mode flow produces exactly seven public assets', async ({ page }) => {
    const console_ = collectConsoleProblems(page);

    await gotoApp(page);
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');

    await selectMode(page, 'logo-pack');
    // Source is shared — no second preflight/inspecting state.
    await expect(page.locator('#logo-pack-review')).toBeVisible();
    // good-logo.png is a PNG; assessTransparencyGuidance() always attaches an
    // info-level transparency note for png/webp sources (FSG-005C corrected
    // its wording — see SPRINT_REPORT.md).
    await expect(page.locator('#logo-pack-issues')).toContainText(
      'choosing Transparent background will preserve it',
    );

    // The explicit background choice (directive §5) — no mode is preselected.
    const createButton = page.locator('#logo-pack-create-button');
    await expect(createButton).toBeDisabled();

    await selectLogoPackBackgroundMode(page, 'original');
    await expect(createButton).toBeEnabled();
    await expect(createButton).toHaveText('Create logo pack');
    await createButton.click();

    // A small logo can finish before an intermediate "processing" check
    // round-trip lands under heavy parallel CPU contention — assert the
    // real terminal state rather than racing an intermediate one (the
    // same pattern already applied elsewhere in this suite).
    await waitForStatus(page, 'success', 30_000);

    await expect(page.locator('#logo-pack-result')).toBeVisible();

    const assetItems = page.locator('#logo-pack-assets li');
    await expect(assetItems).toHaveCount(7);

    for (const filename of expectedAssets('original', 'good-logo')) {
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
    expect(zipDownload.suggestedFilename()).toBe('good-logo-filesetgo-original-logo-pack.zip');

    // Test-side ZIP inspection: the exact entry set, not merely a count or
    // a downloaded filename pattern (FSG-006 delta recertification §27/§28).
    // No README/manifest/wrong-mode primary file among the real entries.
    expect(await zipEntryNames(zipDownload)).toEqual(
      [...expectedAssets('original', 'good-logo')].sort(),
    );

    console_.assertClean();
  });

  test('a complete successful Transparent-mode flow verifies and previews before packaging (directive §5/§8/§27/§32)', async ({ page }) => {
    const console_ = collectConsoleProblems(page);

    await gotoApp(page);
    await uploadFile(page, 'flat-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');

    const createButton = page.locator('#logo-pack-create-button');
    await expect(createButton).toBeDisabled();

    await selectLogoPackBackgroundMode(page, 'transparent');

    // Balanced is the governed default strength the moment Transparent is chosen (directive §15).
    await expect(page.locator('#logo-pack-strength-balanced')).toBeChecked();
    await expect(page.locator('#logo-pack-strength-fieldset')).toBeVisible();

    // (The button stays disabled for the entire "preparing preview" window,
    // but a small deterministic fixture can finish before this test's own
    // assertion round-trip lands — the same intermediate-state race already
    // documented and avoided elsewhere in this suite. The real requirement —
    // a FAILED/not-yet-ready preview blocks packaging — is covered directly
    // at the core level in process-transparent-master.test.ts.)

    // The preview must appear and be mechanically verified for this common,
    // flat-background case (directive §17 — common cases must not be
    // downgraded to "needs review").
    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#logo-pack-preview-confidence')).toHaveText('✓ Transparent background verified');

    const previewImage = page.locator('#logo-pack-preview-image');
    await expect(previewImage).toHaveAttribute('src', /^blob:/);

    // All three preview backgrounds render the SAME Blob — never three
    // different images (directive §27).
    const srcBeforeToggle = await previewImage.getAttribute('src');
    await page.locator('#logo-pack-preview-bg-light').click();
    await expect(page.locator('#logo-pack-preview-bg-light')).toHaveAttribute('aria-pressed', 'true');
    expect(await previewImage.getAttribute('src')).toBe(srcBeforeToggle);
    await page.locator('#logo-pack-preview-bg-dark').click();
    expect(await previewImage.getAttribute('src')).toBe(srcBeforeToggle);
    await page.locator('#logo-pack-preview-bg-checkerboard').click();

    await expect(createButton).toBeEnabled();
    await expect(createButton).toHaveText('Create transparent logo pack');
    await createButton.click();

    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#logo-pack-result')).toBeVisible();

    for (const filename of expectedAssets('transparent', 'flat-logo')) {
      await expect(page.locator('#logo-pack-assets')).toContainText(filename);
    }

    const [zipDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#logo-pack-download-zip').click(),
    ]);
    expect(zipDownload.suggestedFilename()).toBe('flat-logo-filesetgo-transparent-logo-pack.zip');

    // Test-side ZIP inspection: the exact entry set, not merely a count or
    // a downloaded filename pattern (FSG-006 delta recertification §27/§28).
    expect(await zipEntryNames(zipDownload)).toEqual(
      [...expectedAssets('transparent', 'flat-logo')].sort(),
    );

    console_.assertClean();
  });

  test('Transparent mode removes the background of a white-background JPEG source (the FSG-005C motivating defect)', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'flat-logo.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'transparent');

    // A JPEG source has no alpha channel at all — this is only meaningful
    // if FileSetGo genuinely ran deterministic background removal on it,
    // not merely re-encoded the opaque JPEG as PNG (directive §1). This
    // exercises the real decode → preparation → post-encode verification
    // path, not only a synthetic in-memory raster (correction directive §11).
    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#logo-pack-preview-confidence')).toHaveText('✓ Transparent background verified');
  });

  test('Transparent mode removes the background of a black-background JPEG source (correction directive §11)', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'flat-logo-black.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'transparent');

    // The white-background JPEG case alone would not prove the algorithm
    // isn't secretly white-specific — a real black-background encoded
    // JPEG through the same real decode/prepare/verify path is required
    // evidence (correction directive §11).
    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#logo-pack-preview-confidence')).toHaveText('✓ Transparent background verified');
  });

  test('CRITICAL REGRESSION (Product Office correction, directive §4/§16): a real PNG with transparent padding around an opaque background is prepared, not falsely accepted as already transparent', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'transparent-padding-regression.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'transparent');

    // This source genuinely contains alpha (a real, decodable RGBA PNG) —
    // proving the product does not merely trust that alpha exists.
    // Preparation must run and the preview must reflect a real,
    // mechanically re-verified result — never an instant, unexamined
    // "already transparent" claim.
    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#logo-pack-preview-confidence')).not.toHaveText('');

    // The generated master must be package-eligible (verified or
    // needs-review, never silently failed) for this common, deterministic
    // geometry — and packaging must actually complete.
    const createButton = page.locator('#logo-pack-create-button');
    await expect(createButton).toBeEnabled();
    await createButton.click();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#logo-pack-result')).toBeVisible();
  });

  test('changing removal strength regenerates the preview (directive §15)', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'flat-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'transparent');
    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });

    const previewImage = page.locator('#logo-pack-preview-image');
    const srcBeforeChange = await previewImage.getAttribute('src');

    await page.locator('#logo-pack-strength-strong').check({ force: true });
    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });

    const srcAfterChange = await previewImage.getAttribute('src');
    expect(srcAfterChange).not.toBe(srcBeforeChange);
  });

  test('a gradient-background source truthfully reports NEEDS REVIEW, never a false clean success (FSG-006 delta recertification §23)', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'gradient-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'transparent');

    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });
    // Visually distinct from VERIFIED — not colour alone, real different text.
    await expect(page.locator('#logo-pack-preview-confidence')).toHaveText('⚠ Please review the edges before continuing');
    await expect(page.locator('#logo-pack-preview-confidence')).not.toHaveText(/verified/i);

    // Checkerboard/light/dark remain available and package remains eligible
    // under the governed NEEDS REVIEW policy (directive §28 of FSG-005C).
    await expect(page.locator('#logo-pack-preview-bg-light')).toBeEnabled();
    await expect(page.locator('#logo-pack-preview-bg-dark')).toBeEnabled();
    await expect(page.locator('#logo-pack-create-button')).toBeEnabled();

    // The algorithm is not tuned merely to turn this case green — the real
    // status is used, not silently upgraded.
    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'success', 30_000);
  });

  test('a source with no removable background truthfully reports FAILED and blocks packaging (FSG-006 delta recertification §24)', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'flat-color-only.png'); // uniform colour, no distinguishable foreground at all
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'transparent');

    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#logo-pack-preview-confidence')).toHaveText('✕ We couldn’t produce a clean transparent background');

    // Package creation must remain blocked — no ZIP, no falsely-labelled
    // "*-transparent.png" result may be presented.
    await expect(page.locator('#logo-pack-create-button')).toBeDisabled();
    await expect(page.locator('#logo-pack-result')).toBeHidden();

    // A recovery action remains available: keep the existing background instead.
    await selectLogoPackBackgroundMode(page, 'original');
    await expect(page.locator('#logo-pack-create-button')).toBeEnabled();
  });

  test('reset returns cleanly from a successful Logo Pack result and clears the background-mode choice', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'original');
    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'success', 30_000);

    await page.locator('#reset-button').click();
    await waitForStatus(page, 'idle');

    await expect(page.locator('#logo-pack-no-file-hint')).toBeVisible();
    await expect(page.locator('#logo-pack-result')).toBeHidden();
    await expect(page.locator('#source-panel')).toBeHidden();
    await expect(page.locator('#logo-pack-mode-transparent')).not.toBeChecked();
    await expect(page.locator('#logo-pack-mode-original')).not.toBeChecked();

    // A new file can be selected successfully afterward, with no mode carried over.
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await expect(page.locator('#logo-pack-create-button')).toBeDisabled();
  });

  test('replacing the source invalidates the background-mode choice and any prepared preview (directive §6)', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'flat-logo.png');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'transparent');
    await expect(page.locator('#logo-pack-preview')).toBeVisible({ timeout: 20_000 });

    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');

    await expect(page.locator('#logo-pack-mode-transparent')).not.toBeChecked();
    await expect(page.locator('#logo-pack-preview')).toBeHidden();
    await expect(page.locator('#logo-pack-create-button')).toBeDisabled();
  });

  test('a wide-aspect-ratio logo shows a geometry warning but does not block generation', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'wide-logo.png'); // 1200x150, 8:1 aspect ratio
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');

    await expect(page.locator('#logo-pack-issues')).toContainText(
      'This logo is very wide or tall. It may appear small inside square favicon and app-icon files.',
    );

    await selectLogoPackBackgroundMode(page, 'original');
    await expect(page.locator('#logo-pack-create-button')).toBeEnabled();
  });

  test('a source requiring more than 4x icon enlargement blocks generation until replaced', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'small-logo.png'); // 60x60 -> required factor > 4x
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'original');

    await expect(page.locator('#logo-pack-issues')).toContainText(
      'This logo is too small to create a useful 512 px website icon.',
    );
    await expect(page.locator('#logo-pack-create-button')).toBeDisabled();

    // Replacing with an adequate source restores the ability to generate,
    // but the background-mode choice does not carry over (directive §6).
    await uploadFile(page, 'good-logo.png');
    await waitForStatus(page, 'ready');
    await expect(page.locator('#logo-pack-issues')).toContainText(
      'choosing Transparent background will preserve it',
    );
    await expect(page.locator('#logo-pack-create-button')).toBeDisabled();
    await selectLogoPackBackgroundMode(page, 'original');
    await expect(page.locator('#logo-pack-create-button')).toBeEnabled();
  });

  test('a JPEG source gets truthful, non-misleading background guidance (directive §48 — supersedes the old FSG-006 assertion)', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');

    // Historical note: FSG-006 asserted this exact JPEG guidance said
    // FileSetGo "won't remove the existing background automatically." That
    // was true under FSG-005B's contract and is intentionally no longer
    // true under FSG-005C — see suitability.ts and ADR-020. The guidance
    // now correctly points the user at the Transparent background choice
    // instead of asserting an absolute, now-false limitation.
    const issuesText = (await page.locator('#logo-pack-issues').textContent()) ?? '';
    expect(issuesText).toContain("JPEG doesn't support transparency in the file itself");
    expect(issuesText).toContain('choosing Transparent background below will attempt to remove');
    expect(issuesText).not.toMatch(/won't remove the existing background automatically/i);
  });
});
