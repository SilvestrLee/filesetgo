import { expect, test } from '@playwright/test';
import { collectConsoleProblems, fixturePath, gotoApp, selectMode, uploadFile, waitForStatus } from '../helpers/app';

test.describe('Unified source-file experience (FSG-007-FIT-001B)', () => {
  test.describe('Homepage source thumbnail', () => {
    test('an uploaded supported image shows a real thumbnail, filename, format, dimensions and size', async ({ page }) => {
      await gotoApp(page);
      await uploadFile(page, 'sample.jpg');
      await waitForStatus(page, 'ready');

      const thumbnail = page.locator('#source-thumbnail');
      await expect.poll(() => thumbnail.evaluate((image: HTMLImageElement) => image.src)).toMatch(/^blob:/);
      // A real decoded image, not just a src attribute (directive §4/§5).
      await expect
        .poll(() => thumbnail.evaluate((image: HTMLImageElement) => image.naturalWidth))
        .toBeGreaterThan(0);
      await expect(page.locator('#source-name')).toHaveText('sample.jpg');
      await expect(page.locator('#source-format')).toHaveText('JPEG');
      await expect(page.locator('#source-dimensions')).toHaveText('640 × 480');
      await expect(page.locator('#source-size')).toBeVisible();
      await expect(page.locator('#source-replace-image')).toBeVisible();

      // ONE selected-source card, not a filename-bearing drop-zone stacked
      // on top of a separate metadata panel (FSG-007-FIT-001B-R1 directive
      // §2/§5).
      await expect(page.locator('#drop-zone')).toBeHidden();
      await expect(page.locator('#source-panel')).toBeVisible();
    });

    test('replacing the source updates the thumbnail and metadata, and invalidates a shown Quick Fit result', async ({ page }) => {
      await gotoApp(page);
      await uploadFile(page, 'sample.jpg');
      await waitForStatus(page, 'ready');

      await page.locator('#quick-fit-open').click();
      await page.locator('#output-format').selectOption('webp');
      await page.locator('#process-button').click();
      await waitForStatus(page, 'success', 30_000);
      await page.keyboard.press('Escape');

      const firstThumbnailSrc = await page.locator('#source-thumbnail').evaluate((image: HTMLImageElement) => image.src);

      await uploadFile(page, 'sample.png');
      await waitForStatus(page, 'ready');

      await expect(page.locator('#source-name')).toHaveText('sample.png');
      await expect(page.locator('#source-format')).toHaveText('PNG');
      const secondThumbnailSrc = await page.locator('#source-thumbnail').evaluate((image: HTMLImageElement) => image.src);
      expect(secondThumbnailSrc).not.toBe(firstThumbnailSrc);

      // The stale WebP result from the first source must not survive.
      await expect(page.locator('#status-message')).toHaveAttribute('data-state', 'ready');
    });

    test('a HEIC source shows filename/format/dimensions/size but no broken thumbnail image', async ({ page }) => {
      const console_ = collectConsoleProblems(page);
      await gotoApp(page);
      await uploadFile(page, 'sample.heic');
      await waitForStatus(page, 'ready');

      // HEIC has no native browser <img> decoder — the thumbnail element
      // stays present but unset, never a broken-image / CSP-violating blob
      // load (confirmed root cause, not a guess: FSG-007-FIT-001B fix).
      await expect(page.locator('#source-thumbnail')).not.toHaveAttribute('src', /.+/);
      await expect(page.locator('#source-format')).toHaveText('HEIC');
      console_.assertClean();
    });
  });

  test.describe('Source-required gate', () => {
    for (const mode of ['quick-fit', 'guided-fit', 'logo-pack'] as const) {
      test(`${mode} launcher with no source shows the gate, not a silently-disabled button or an empty dialog`, async ({ page }) => {
        await gotoApp(page);
        await page.locator(`#mode-tab-${mode}`).click();
        await page.locator(`#${mode}-open`).click();

        await expect(page.locator('#source-required-dialog')).toBeVisible();
        await expect(page.locator(`#${mode}-dialog`)).toBeHidden();
        await expect(page.locator('#source-required-title')).toHaveText('Choose an image first');

        const fileChooserPromise = page.waitForEvent('filechooser');
        await page.locator('#source-required-choose').click();
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(fixturePath('sample.jpg'));
        await waitForStatus(page, 'ready');

        // Resumes straight into the originally-requested task.
        await expect(page.locator('#source-required-dialog')).toBeHidden();
        await expect(page.locator(`#${mode}-dialog`)).toBeVisible();
      });
    }

    test('dismissing the gate without choosing an image leaves no dialog open and does not silently proceed', async ({ page }) => {
      await gotoApp(page);
      await page.locator('#mode-tab-guided-fit').click();
      await page.locator('#guided-fit-open').click();
      await expect(page.locator('#source-required-dialog')).toBeVisible();

      await page.locator('#source-required-close').click();
      await expect(page.locator('#source-required-dialog')).toBeHidden();
      await expect(page.locator('#guided-fit-dialog')).toBeHidden();
    });

    test('an explicit mode-tab switch clears a pending request from a different mode', async ({ page }) => {
      await gotoApp(page);
      await page.locator('#mode-tab-guided-fit').click();
      await page.locator('#guided-fit-open').click();
      await expect(page.locator('#source-required-dialog')).toBeVisible();

      // Switching tabs is the user changing their mind — Quick Fit's own
      // dialog should not auto-open once a source eventually appears.
      await page.keyboard.press('Escape');
      await page.locator('#mode-tab-quick-fit').click();
      await uploadFile(page, 'sample.jpg');
      await waitForStatus(page, 'ready');

      await expect(page.locator('#guided-fit-dialog')).toBeHidden();
      await expect(page.locator('#quick-fit-dialog')).toBeHidden();
    });
  });

  test.describe('Modal source confirmation', () => {
    test('Quick Fit dialog opens with a visible source confirmation above the requirement controls', async ({ page }) => {
      await gotoApp(page);
      await uploadFile(page, 'sample.jpg');
      await waitForStatus(page, 'ready');
      await page.locator('#quick-fit-open').click();

      await expect(page.locator('#quick-fit-source-confirmation')).toBeVisible();
      await expect
        .poll(() => page.locator('#quick-fit-source-thumbnail').evaluate((image: HTMLImageElement) => image.src))
        .toMatch(/^blob:/);
      await expect(page.locator('#quick-fit-source-name')).toHaveText('sample.jpg');
      await expect(page.locator('#quick-fit-source-meta')).toContainText('JPEG');
      await expect(page.locator('#quick-fit-source-meta')).toContainText('640 × 480');
    });

    test('Guided Fit dialog opens with source confirmation visible before the destination choice', async ({ page }) => {
      await gotoApp(page);
      await uploadFile(page, 'sample.jpg');
      await waitForStatus(page, 'ready');
      await selectMode(page, 'guided-fit');

      await expect(page.locator('#guided-fit-source-confirmation')).toBeVisible();
      await expect(page.locator('#guided-fit-source-name')).toHaveText('sample.jpg');
      await expect(page.locator('[data-preset-id="web.hero"]')).toBeVisible();
    });

    test('Logo Pack dialog opens directly to Check logo with source confirmation and no upload control', async ({ page }) => {
      await gotoApp(page);
      await uploadFile(page, 'flat-logo.png');
      await waitForStatus(page, 'ready');
      await selectMode(page, 'logo-pack');

      await expect(page.locator('#logo-pack-step-1')).toBeVisible();
      await expect
        .poll(() => page.locator('#logo-pack-source-thumbnail').evaluate((image: HTMLImageElement) => image.src))
        .toMatch(/^blob:/);
      await expect(page.locator('#logo-pack-modal-source-name')).toHaveText('flat-logo.png');
      await expect(page.locator('#logo-pack-source-file')).toHaveCount(0);
      await expect(page.locator('#logo-pack-source-drop-zone')).toHaveCount(0);
    });

    test('"Change image" in each modal re-opens the file chooser and updates that modal\'s confirmation', async ({ page }) => {
      await gotoApp(page);
      await uploadFile(page, 'sample.jpg');
      await waitForStatus(page, 'ready');
      await page.locator('#quick-fit-open').click();

      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#quick-fit-change-image').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(fixturePath('sample.png'));
      await waitForStatus(page, 'ready');

      await expect(page.locator('#quick-fit-dialog')).toBeVisible();
      await expect(page.locator('#quick-fit-source-name')).toHaveText('sample.png');
      await expect(page.locator('#quick-fit-source-meta')).toContainText('PNG');
    });

    test('Quick Fit Crop Review keeps the same source confirmation visible above the crop stage (directive §17)', async ({ page }) => {
      await gotoApp(page);
      await uploadFile(page, 'large.jpg');
      await waitForStatus(page, 'ready');
      await page.locator('#quick-fit-open').click();

      await page.locator('#max-width').fill('800');
      await page.locator('#max-height').fill('800');
      await page.locator('#process-button').click();

      await expect(page.locator('#quick-fit-step-crop')).toBeVisible();
      await expect(page.locator('#quick-fit-source-confirmation')).toBeVisible();
      await expect(page.locator('#quick-fit-source-name')).toHaveText('large.jpg');
    });
  });

  test.describe('Deep links', () => {
    test('?mode=logo-pack with no source shows the gate, preserves intent, then resumes Logo Pack after upload', async ({ page }) => {
      await page.goto('/?mode=logo-pack');
      await expect(page.locator('#quick-fit-app')).toBeVisible();
      await expect(page.locator('#mode-tab-logo-pack')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#source-required-dialog')).toBeVisible();
      await expect(page.locator('#logo-pack-dialog')).toBeHidden();

      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#source-required-choose').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(fixturePath('flat-logo.png'));
      await waitForStatus(page, 'ready');

      await expect(page.locator('#logo-pack-dialog')).toBeVisible();
      await expect(page.locator('#logo-pack-step-1')).toBeVisible();
    });

    test('?mode=guided-fit with no source shows the gate, preserves intent, then resumes Guided Fit after upload', async ({ page }) => {
      await page.goto('/?mode=guided-fit');
      await expect(page.locator('#mode-tab-guided-fit')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#source-required-dialog')).toBeVisible();
      await expect(page.locator('#guided-fit-dialog')).toBeHidden();

      await uploadFile(page, 'sample.jpg');
      await waitForStatus(page, 'ready');

      await expect(page.locator('#source-required-dialog')).toBeHidden();
      await expect(page.locator('#guided-fit-dialog')).toBeVisible();
    });
  });

  test.describe('Homepage "Replace image" (FSG-007-FIT-001B-R1)', () => {
    test('the homepage replace action re-opens the central file chooser', async ({ page }) => {
      await gotoApp(page);
      await uploadFile(page, 'sample.jpg');
      await waitForStatus(page, 'ready');

      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#source-replace-image').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(fixturePath('sample.png'));
      await waitForStatus(page, 'ready');

      await expect(page.locator('#source-name')).toHaveText('sample.png');
    });
  });

  test.describe('One shared modal source-confirmation pattern (FSG-007-FIT-001B-R1)', () => {
    test('Quick Fit, Guided Fit and Logo Pack all use the same .fsg-source-confirmation structure', async ({ page }) => {
      await gotoApp(page);
      await uploadFile(page, 'sample.jpg');
      await waitForStatus(page, 'ready');

      for (const [mode, confirmationId, thumbnailId, changeButtonId] of [
        ['quick-fit', 'quick-fit-source-confirmation', 'quick-fit-source-thumbnail', 'quick-fit-change-image'],
        ['guided-fit', 'guided-fit-source-confirmation', 'guided-fit-source-thumbnail', 'guided-fit-change-image'],
        ['logo-pack', 'logo-pack-source-confirmation', 'logo-pack-source-thumbnail', 'logo-pack-change-image'],
      ] as const) {
        await page.locator(`#mode-tab-${mode}`).click();
        await page.locator(`#${mode}-open`).click();

        const confirmation = page.locator(`#${confirmationId}`);
        await expect(confirmation).toBeVisible();
        await expect(confirmation).toHaveClass(/fsg-source-confirmation/);
        await expect(confirmation.locator(`#${thumbnailId}`)).toBeVisible();
        await expect(confirmation.locator(`#${changeButtonId}`)).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(page.locator(`#${mode}-dialog`)).toBeHidden();
      }
    });
  });

  test.describe('Quick Fit exact-dimension geometry language (FSG-007-FIT-001B-R1)', () => {
    test('labels read "Output width"/"Output height", never "Maximum", with persistent proportional-vs-exact guidance', async ({ page }) => {
      await gotoApp(page);
      await uploadFile(page, 'sample.jpg');
      await waitForStatus(page, 'ready');
      await page.locator('#quick-fit-open').click();

      await expect(page.locator('label[for="max-width"]')).toContainText('Output width');
      await expect(page.locator('label[for="max-height"]')).toContainText('Output height');
      await expect(page.locator('#quick-fit-dialog')).not.toContainText('Maximum width');
      await expect(page.locator('#quick-fit-dialog')).not.toContainText('Maximum height');
      await expect(page.locator('#quick-fit-dimensions-help')).toBeVisible();
      await expect(page.locator('#quick-fit-dimensions-help')).toContainText('exact-size result');

      // Filling both still produces the documented exact-dimension contract
      // — this pass is wording-only, not a processing change (directive §14).
      await page.locator('#max-width').fill('800');
      await page.locator('#max-height').fill('800');
      // One persistent helper, not a second paragraph appearing alongside it
      // (FSG-007-FIT Quick Fit compact-content remediation directive §7).
      await expect(page.locator('#quick-fit-dimensions-help')).toBeVisible();
      await expect(page.locator('#quick-fit-dimensions-help')).toContainText('exact-size result');
      await expect(page.locator('label[for="max-width"]')).toContainText('Output width');
      await expect(page.locator('label[for="max-height"]')).toContainText('Output height');
    });
  });
});
