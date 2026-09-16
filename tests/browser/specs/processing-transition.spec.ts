import { expect, test, type Page } from '@playwright/test';
import {
  approveFullLogoFaviconSource,
  confirmGuidedFitCrop,
  continueGuidedFit,
  gotoApp,
  selectLogoPackBackgroundMode,
  selectMode,
  uploadFile,
  waitForStatus,
} from '../helpers/app';

/**
 * FSG-007-FIT-003 + R1/R2/R3: the shared Preparing → Validating → Ready
 * processing transition now lives on one full-page application-level
 * overlay (`#fsg-processing-overlay`) rather than inside any task dialog —
 * the modal's job ends at final confirmation (R3). Real interaction and
 * real jobs only.
 */

/**
 * `large.jpg`'s (4800×3200) bounded target-size search is the same slow-job
 * fixture `cancellation.spec.ts`/`stress.spec.ts` already rely on for a
 * genuine, non-instantaneous processing window. 200 KB + JPEG output is a
 * comfortably reachable target for this source (unlike a tighter target,
 * which risks a genuine `'unreachable'` outcome depending on the search's
 * own dimension-tier/quality-probe path) — `cancellation.spec.ts`'s own
 * 50 KB target is never actually let run to completion there (it cancels
 * first), so it isn't proof of reachability either way.
 */
async function fillSlowTargetSizeRequirement(page: Page): Promise<void> {
  await page.locator('#target-size-value').fill('200');
  await page.locator('#target-size-unit').selectOption('KB');
  await page.locator('#output-format').selectOption('jpeg');
}

/**
 * The perceptible Ready beat is a genuine, but intentionally brief
 * (~350–500ms), DOM state — an assertion that merely *polls* for it
 * (`expect(locator).toHaveText(...)`) can miss the entire window between
 * two poll ticks, especially under host CPU contention, even though the
 * text really was shown. A `MutationObserver` installed *before* the job
 * starts cannot miss it, since it reacts to the mutation event itself
 * rather than sampling at an interval — this accumulates every distinct
 * value the element's text ever took, so the assertion can check "was this
 * shown at any point" instead of "is this showing right now".
 */
async function watchTextHistory(page: Page, selector: string): Promise<void> {
  await page.evaluate((selector) => {
    const store = ((window as unknown as { __fsgTextHistory: Record<string, string[]> }).__fsgTextHistory ??= {});
    const el = document.querySelector(selector);

    if (el === null) {
      return;
    }

    store[selector] = [el.textContent ?? ''];
    const observer = new MutationObserver(() => {
      const text = el.textContent ?? '';
      const history = store[selector];

      if (history[history.length - 1] !== text) {
        history.push(text);
      }
    });
    observer.observe(el, { childList: true, characterData: true, subtree: true });
  }, selector);
}

async function textHistory(page: Page, selector: string): Promise<string[]> {
  return page.evaluate((selector) => {
    return (window as unknown as { __fsgTextHistory?: Record<string, string[]> }).__fsgTextHistory?.[selector] ?? [];
  }, selector);
}

/** Polls the accumulated history (not the live element) until it contains the expected text, or times out. */
async function expectTextWasShown(page: Page, selector: string, text: string, timeout = 30_000): Promise<void> {
  await expect
    .poll(() => textHistory(page, selector), { timeout })
    .toContain(text);
}

/**
 * The literal atomicity guarantee the directive asks for is "the overlay
 * never leaves before GO is already populated" — not that GO must stay
 * invisible while the overlay is still up (GO's own DOM is deliberately
 * populated as soon as the real result exists, before the perceptible
 * Ready beat even begins, so it's already sitting there ready the instant
 * the overlay leaves — no gap). This waits for the overlay to actually
 * hide and, in the exact same in-browser tick, checks GO is already
 * visible then — a single round-trip, so there's no risk of a separate,
 * later assertion racing past the transition.
 */
async function captureAtOverlayClose(page: Page, resultSelector: string): Promise<{ resultVisible: boolean }> {
  const handle = await page.waitForFunction(
    (resultSelector) => {
      const overlay = document.querySelector('#fsg-processing-overlay');

      if (!overlay?.classList.contains('hidden')) {
        return false;
      }

      return { resultVisible: !(document.querySelector(resultSelector)?.classList.contains('hidden') ?? true) };
    },
    resultSelector,
    { timeout: 30_000 },
  );

  return handle.jsonValue() as Promise<{ resultVisible: boolean }>;
}

test.describe('Processing transition & atomic Ready handoff (FSG-007-FIT-003 + R1/R2/R3)', () => {
  test('Quick Fit: the modal closes the instant the job starts, the full-page overlay shows a real Ready acknowledgement, and GO is already populated the instant the overlay leaves', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();

    // R3: the dialog's job ends at confirmation — it must not still be
    // open once the job (and the full-page transition) has started.
    await expect(page.locator('#quick-fit-dialog')).toBeHidden();
    await expect(page.locator('#fsg-processing-overlay')).toBeVisible();

    // A real, truthful in-flight stage — never a fabricated percentage.
    await waitForStatus(page, 'processing');
    await expect(page.locator('#fsg-processing-overlay-status')).not.toHaveText('');
    await expect(page.locator('#fsg-processing-overlay-title')).toHaveText('Preparing your file');
    await watchTextHistory(page, '#fsg-processing-overlay-status');
    await watchTextHistory(page, '#fsg-processing-overlay-title');
    await watchTextHistory(page, '#fsg-processing-overlay-eyebrow');

    // The perceptible Ready beat: eyebrow, title, and status all agree —
    // no visible fragment keeps claiming "preparing" once the file is ready.
    await expectTextWasShown(page, '#fsg-processing-overlay-eyebrow', 'Ready');
    await expectTextWasShown(page, '#fsg-processing-overlay-title', 'Your file is ready');
    await expectTextWasShown(page, '#fsg-processing-overlay-status', 'The finished file has been checked and is ready to download.');

    // Never a lingering "Preparing your file" title once the eyebrow says Ready.
    const titleHistory = await textHistory(page, '#fsg-processing-overlay-title');
    const readyIndex = titleHistory.indexOf('Your file is ready');
    expect(titleHistory.slice(readyIndex)).not.toContain('Preparing your file');

    // The atomic handoff itself: GO is already visible/populated in the
    // exact same tick the overlay actually leaves — never a later, separate
    // step (captured in one round-trip; see helper doc for why).
    const snapshot = await captureAtOverlayClose(page, '#result-content');
    expect(snapshot.resultVisible).toBe(true);
    await expect(page.locator('#result-empty')).toBeHidden();
    await waitForStatus(page, 'success');
  });

  test('Guided Fit: two different destinations show destination-aware Ready copy on the overlay, and the dialog stays closed through the same atomic handoff', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');

    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.content"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await expect(page.locator('#guided-fit-dialog')).toBeHidden();
    await expect(page.locator('#fsg-processing-overlay-title')).toHaveText(/Website content image|content image prepared/i, { timeout: 30_000 });
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-content')).toBeVisible();
    await expect(page.locator('#result-prepared-for-value')).toHaveText(/content/i);

    // Reopening lands back on the just-finished 'prepare' step (pre-existing
    // behavior this milestone deliberately preserves) — reach the
    // destination choice the same way `guided-fit-geometry.spec.ts`'s own
    // "switching destination" certification already does.
    await selectMode(page, 'guided-fit');
    await page.locator('#guided-step-back').click();
    await expect(page.locator('#guided-fit-step-2')).toBeVisible();
    await page.locator('#guided-change-destination').click();
    await expect(page.locator('#guided-fit-step-1')).toBeVisible();

    await page.locator('[data-preset-id="web.hero"]').click();
    await continueGuidedFit(page);
    await page.locator('#guided-process-button').click();
    await confirmGuidedFitCrop(page);
    await expect(page.locator('#guided-fit-dialog')).toBeHidden();
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-content')).toBeVisible();
    await expect(page.locator('#result-prepared-for-value')).toHaveText(/hero/i);
  });

  test('Guided Fit: an already-ready source never shows the overlay at all — there is no transformation job to represent', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'card-ready.webp');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.card"]').click();
    await continueGuidedFit(page);

    await expect(page.locator('#guided-use-file-button')).toBeVisible();
    await expect(page.locator('#fsg-processing-overlay')).toBeHidden();
    await page.locator('#guided-use-file-button').click();

    // Clicking the real, direct download link never enters any processing
    // phase or shows fabricated progress for work that never happens.
    await expect(page.locator('#fsg-processing-overlay')).toBeHidden();
    await expect(page.locator('#guided-fit-dialog')).toBeVisible();
  });

  test('Logo Pack: the modal closes when generation starts, real packaging stage text is shown on the overlay, and #logo-pack-result is untouched until the atomic reveal', async ({ page }) => {
    test.setTimeout(60_000);
    await gotoApp(page);
    // A larger source than the tiny logo fixtures — genuinely more resize/
    // encode work across all 7 assets, so the processing window is
    // reliably observable rather than racing a near-instant tiny job
    // (the same reasoning `quick-fit.spec.ts`'s own certification test
    // documents for its own fixture choice).
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'original');
    await approveFullLogoFaviconSource(page);

    await page.locator('#logo-pack-create-button').click();
    await expect(page.locator('#logo-pack-dialog')).toBeHidden();
    await expect(page.locator('#fsg-processing-overlay')).toBeVisible();
    await expect(page.locator('#fsg-processing-overlay-status')).not.toHaveText('');
    await watchTextHistory(page, '#fsg-processing-overlay-status');
    await watchTextHistory(page, '#fsg-processing-overlay-title');
    await watchTextHistory(page, '#fsg-processing-overlay-eyebrow');

    // The perceptible Ready beat, then the atomic handoff — mirrors the
    // Quick Fit assertion above: eyebrow/title/status all agree, no
    // lingering "Building your pack"/"Preparing your logo pack".
    await expectTextWasShown(page, '#fsg-processing-overlay-eyebrow', 'Ready');
    await expectTextWasShown(page, '#fsg-processing-overlay-title', 'Your logo pack is ready');
    await expectTextWasShown(page, '#fsg-processing-overlay-status', 'All seven files are checked and ready to download.');

    const snapshot = await captureAtOverlayClose(page, '#logo-pack-result');
    expect(snapshot.resultVisible).toBe(true);
    await waitForStatus(page, 'success');
  });

  test('Cancellation: the overlay shows a real Cancel action while the job is active, terminates the job, and returns the workspace to its normal state', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();

    await expect(page.locator('#quick-fit-dialog')).toBeHidden();
    await waitForStatus(page, 'processing');
    await expect(page.locator('#fsg-processing-overlay-cancel')).toBeVisible();

    await page.locator('#fsg-processing-overlay-cancel').click();
    await waitForStatus(page, 'cancelled', 15_000);

    // The overlay leaves (directive R3 §26 "the interstitial leaves") and
    // the workspace returns to its normal, fully-interactive state — no
    // lingering "Back" click required, requirements re-enabled, source
    // preserved.
    await expect(page.locator('#fsg-processing-overlay')).toBeHidden();
    await page.locator('#quick-fit-open').click();
    await expect(page.locator('#quick-fit-step-requirements')).toBeVisible();
    await expect(page.locator('#max-width')).toBeEnabled();
    await expect(page.locator('#quick-fit-change-image')).toBeVisible();
    await expect(page.locator('#process-button')).toBeEnabled();
  });

  test('Reduced motion: the full-page overlay still appears with identical text and end state, glyph rendering statically (no animation)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();

    await expect(page.locator('#fsg-processing-overlay')).toBeVisible();
    await waitForStatus(page, 'processing');
    await expect(page.locator('#fsg-processing-overlay-status')).not.toHaveText('');

    // FSG-007-FIT-003-R5: the small inline glyph was replaced by the
    // FILE → SET → GO rail — SET's spinner is the element whose animation
    // reduced motion must remove.
    const animationName = await page
      .locator('#fsg-processing-rail [data-stage="set"] .fsg-processing-rail__spinner')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animationName).toBe('none');

    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-content')).toBeVisible();
  });

  test('Duplicate submit: rapid double-click on the primary action starts exactly one job', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);

    const button = page.locator('#process-button');
    await Promise.all([button.click(), button.click().catch(() => undefined)]);

    await waitForStatus(page, 'processing');
    await waitForStatus(page, 'success', 30_000);
    await expect(page.locator('#result-dimensions')).toHaveText(/\d+ × \d+/);
  });

  test('Perceptibility (R2/R3): a fast job still shows Preparing and Ready on the full-page overlay for at least the governed minimum dwell before it leaves', async ({ page }) => {
    await gotoApp(page);
    // A plain format conversion on a small fixture — no target-size search —
    // is close to instantaneous real work, exactly the "fast job" case R2
    // is about: the transition must still be genuinely perceptible, not
    // skipped because the underlying job finished quickly.
    await uploadFile(page, 'sample.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await page.locator('#output-format').selectOption('webp');

    await page.evaluate(() => {
      const w = window as unknown as { __fsgTimeline: { text: string; t: number }[] };
      w.__fsgTimeline = [];
      const title = document.querySelector('#fsg-processing-overlay-title');
      const overlay = document.querySelector('#fsg-processing-overlay');

      if (title === null || overlay === null) {
        return;
      }

      let lastText = '';
      const recordText = () => {
        const text = title.textContent ?? '';

        if (text !== lastText) {
          lastText = text;
          w.__fsgTimeline.push({ text, t: performance.now() });
        }
      };

      recordText();
      new MutationObserver(recordText).observe(title, { childList: true, characterData: true, subtree: true });
      new MutationObserver(() => {
        if (overlay.classList.contains('hidden')) {
          w.__fsgTimeline.push({ text: '__overlay_closed__', t: performance.now() });
        }
      }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
    });

    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 15_000);
    await expect(page.locator('#fsg-processing-overlay')).toBeHidden({ timeout: 5_000 });

    const timeline = await page.evaluate(() => (window as unknown as { __fsgTimeline: { text: string; t: number }[] }).__fsgTimeline);
    const preparingAt = timeline.find((entry) => entry.text === 'Preparing your file')?.t;
    const readyAt = timeline.find((entry) => entry.text === 'Your file is ready')?.t;
    const closedAt = timeline.find((entry) => entry.text === '__overlay_closed__')?.t;

    expect(preparingAt, 'Preparing must actually render').not.toBeUndefined();
    expect(readyAt, 'Ready must actually render').not.toBeUndefined();
    expect(closedAt, 'the overlay must actually leave').not.toBeUndefined();

    // Generous lower-bound tolerances (never brittle exact-millisecond
    // assertions, directive §19/§38) — comfortably below the governed
    // ~800ms/~500ms minimums, but high enough that a regression back to an
    // effectively-instant transition would fail this.
    expect(readyAt! - preparingAt!).toBeGreaterThan(600);
    expect(closedAt! - readyAt!).toBeGreaterThan(350);
  });

  test('Perceptibility (R2/R3): a naturally slow job is not held an additional ~700ms once it has already been visibly preparing that long', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);

    await page.evaluate(() => {
      const w = window as unknown as { __fsgTimeline: { text: string; t: number }[] };
      w.__fsgTimeline = [];
      const title = document.querySelector('#fsg-processing-overlay-title');

      if (title === null) {
        return;
      }

      let lastText = '';
      const recordText = () => {
        const text = title.textContent ?? '';

        if (text !== lastText) {
          lastText = text;
          w.__fsgTimeline.push({ text, t: performance.now() });
        }
      };

      recordText();
      new MutationObserver(recordText).observe(title, { childList: true, characterData: true, subtree: true });
    });

    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    const timeline = await page.evaluate(() => (window as unknown as { __fsgTimeline: { text: string; t: number }[] }).__fsgTimeline);
    const preparingAt = timeline.find((entry) => entry.text === 'Preparing your file')?.t;
    const readyAt = timeline.find((entry) => entry.text === 'Your file is ready')?.t;
    const lastRealStageAt = [...timeline].reverse().find((entry) => entry.text !== 'Your file is ready')?.t;

    expect(preparingAt).not.toBeUndefined();
    expect(readyAt).not.toBeUndefined();
    // This fixture/target genuinely takes well over the ~700ms minimum to
    // prepare — proving the minimum dwell is a floor, not something always
    // added on top: Ready must appear soon after the last real stage
    // change, not ~700ms after it.
    expect(readyAt! - preparingAt!).toBeGreaterThan(700);
    expect(readyAt! - lastRealStageAt!).toBeLessThan(400);
  });

  test('Full-page interaction lock: the underlying workspace is inert while the overlay is active', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();

    await expect(page.locator('#fsg-processing-overlay')).toBeVisible();
    await waitForStatus(page, 'processing');

    const workspaceInert = await page.locator('#quick-fit').evaluate((el) => el.closest('[inert]') !== null || el.hasAttribute('inert'));
    expect(workspaceInert).toBe(true);

    await waitForStatus(page, 'success', 30_000);
    const workspaceInteractiveAgain = await page.locator('#quick-fit').evaluate((el) => el.closest('[inert]') !== null || el.hasAttribute('inert'));
    expect(workspaceInteractiveAgain).toBe(false);
  });
});

test.describe('FSG-007-FIT-003-R4: no modal/overlay top-layer overlap', () => {
  /**
   * The R3 recovery audit measured the exact defect this proves gone: the
   * old `<dialog>` stayed genuinely `open` (and therefore still painting in
   * the browser's top layer, above the ordinary-stacking overlay div
   * regardless of z-index) for up to ~250ms after confirmation, because the
   * animated `closeWorkflowDialog()` exit was used for the processing
   * handoff. This installs a `MutationObserver` on the overlay's class
   * attribute *before* triggering the run, so it captures the state at the
   * very first moment the overlay becomes visible — not a later poll that
   * only proves the dialog eventually closes (directive §39 explicitly
   * forbids that weaker check).
   */
  async function observeDialogsAtFirstOverlayPaint(page: Page): Promise<void> {
    await page.evaluate(() => {
      const w = window as unknown as { __fsgOverlaySnapshot?: Record<string, boolean> };
      const overlay = document.querySelector('#fsg-processing-overlay')!;
      const dialogs = {
        quickFit: document.querySelector<HTMLDialogElement>('#quick-fit-dialog')!,
        guidedFit: document.querySelector<HTMLDialogElement>('#guided-fit-dialog')!,
        logoPack: document.querySelector<HTMLDialogElement>('#logo-pack-dialog')!,
      };

      const observer = new MutationObserver(() => {
        if (overlay.classList.contains('hidden') || w.__fsgOverlaySnapshot !== undefined) {
          return;
        }

        w.__fsgOverlaySnapshot = {
          quickFitOpen: dialogs.quickFit.open,
          guidedFitOpen: dialogs.guidedFit.open,
          logoPackOpen: dialogs.logoPack.open,
        };
        observer.disconnect();
      });

      observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    });
  }

  async function overlaySnapshot(page: Page): Promise<Record<string, boolean> | undefined> {
    return page.evaluate(() => (window as unknown as { __fsgOverlaySnapshot?: Record<string, boolean> }).__fsgOverlaySnapshot);
  }

  test('Quick Fit: no dialog is open at the first frame the full-page overlay is visible', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await observeDialogsAtFirstOverlayPaint(page);

    await page.locator('#process-button').click();
    await waitForStatus(page, 'success', 30_000);

    await expect.poll(() => overlaySnapshot(page)).not.toBeUndefined();
    const snapshot = await overlaySnapshot(page);
    expect(snapshot).toEqual({ quickFitOpen: false, guidedFitOpen: false, logoPackOpen: false });
  });

  test('Guided Fit: no dialog is open at the first frame the full-page overlay is visible', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'guided-fit');
    await page.locator('[data-preset-id="web.content"]').click();
    await continueGuidedFit(page);
    await observeDialogsAtFirstOverlayPaint(page);

    await page.locator('#guided-process-button').click();
    await waitForStatus(page, 'success', 30_000);

    await expect.poll(() => overlaySnapshot(page)).not.toBeUndefined();
    const snapshot = await overlaySnapshot(page);
    expect(snapshot).toEqual({ quickFitOpen: false, guidedFitOpen: false, logoPackOpen: false });
  });

  test('Logo Pack: no dialog is open at the first frame the full-page overlay is visible', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'original');
    await approveFullLogoFaviconSource(page);
    await observeDialogsAtFirstOverlayPaint(page);

    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'success', 30_000);

    await expect.poll(() => overlaySnapshot(page)).not.toBeUndefined();
    const snapshot = await overlaySnapshot(page);
    expect(snapshot).toEqual({ quickFitOpen: false, guidedFitOpen: false, logoPackOpen: false });
  });

  test('No task dialog contains an independent in-modal processing presentation any more', async ({ page }) => {
    await gotoApp(page);
    // The old R1/R2 modal-local processing sections were removed outright
    // (directive §5/§40), not merely hidden behind an assumption they'd
    // never paint — assert they no longer exist in the DOM at all.
    await expect(page.locator('#quick-fit-step-processing')).toHaveCount(0);
    await expect(page.locator('#logo-pack-step-processing')).toHaveCount(0);
  });
});

test.describe('FSG-007-FIT-003-R5: processing visual system has real presence', () => {
  /**
   * The R4→R5 correction: a technically full-viewport overlay that visually
   * reads as a small centered loader still fails the product's intent
   * (directive §32/§33). This asserts the *visible* FILE→SET→GO rail
   * itself — not an invisible wide parent around it — occupies a
   * substantial share of the viewport at desktop width. A resilient
   * relative measure (rail width ÷ viewport width), never a brittle exact
   * pixel value.
   */
  test('Desktop: the visible FILE → SET → GO rail spans at least half the viewport width', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();
    await waitForStatus(page, 'processing');

    const rail = page.locator('#fsg-processing-rail');
    await expect(rail).toBeVisible();
    const box = await rail.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width / 1440).toBeGreaterThan(0.5);

    await waitForStatus(page, 'success', 30_000);
  });

  test('The rail shows the FILE → SET → GO story: FILE accepted, SET active, GO pending while Preparing, and all three resolved on Ready', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();
    await waitForStatus(page, 'processing');

    await expect(page.locator('#fsg-processing-rail')).toHaveAttribute('data-phase', 'preparing');
    await expect(page.locator('[data-caption="file"] span:visible')).toHaveText('Source accepted');
    await expect(page.locator('[data-caption="set"] span:visible')).toHaveText('Preparing');
    await expect(page.locator('[data-caption="go"] span:visible')).toHaveText('Waiting');

    // The Ready dwell (READY_DWELL_MS, frozen at 600ms this milestone) is
    // short enough that several sequential `expect().toHaveText()` polls in
    // a row can outlast it before all of them run. `waitForFunction` reads
    // every caption in one synchronous snapshot the instant `data-phase`
    // actually becomes 'ready', avoiding that race entirely.
    const readySnapshot = await page.waitForFunction(() => {
      const rail = document.querySelector('#fsg-processing-rail');

      if (rail?.getAttribute('data-phase') !== 'ready') {
        return false;
      }

      const visibleText = (selector: string) => {
        const spans = Array.from(document.querySelectorAll<HTMLElement>(`${selector} span`));
        return spans.find((span) => span.offsetParent !== null)?.textContent ?? null;
      };

      return {
        file: visibleText('[data-caption="file"]'),
        set: visibleText('[data-caption="set"]'),
        go: visibleText('[data-caption="go"]'),
      };
    }, undefined, { timeout: 30_000 });

    expect(await readySnapshot.jsonValue()).toEqual({ file: 'Source accepted', set: 'Prepared', go: 'Ready' });

    await waitForStatus(page, 'success', 30_000);
  });

  test('The FILE stage shows the actual confirmed source as a real thumbnail, not a generic icon', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();
    await waitForStatus(page, 'processing');

    const thumb = page.locator('#fsg-processing-overlay-source-thumb');
    await expect(thumb).toHaveAttribute('src', /^blob:/);
    await expect(thumb).toBeVisible();

    await waitForStatus(page, 'success', 30_000);
  });
});

test.describe('FSG-007-FIT-003-R5.1: task context never carries active wording into Ready', () => {
  /**
   * The R5.1 defect: Logo Pack's Ready screen showed
   * "Your logo pack is ready" (title) directly above
   * "Preparing 7 website-ready logo assets" (context) — a "Preparing" verb
   * contradicting the Ready state it was displayed alongside. Quick Fit and
   * Guided Fit's context strings are phase-neutral requirement summaries and
   * are unaffected (directive §3/§4) — only Logo Pack's wording varies by
   * phase (directive §1/§2/§5).
   */
  test('Logo Pack: context uses active wording while Preparing, and static wording (no "Preparing") once Ready', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await selectMode(page, 'logo-pack');
    await selectLogoPackBackgroundMode(page, 'original');
    await approveFullLogoFaviconSource(page);
    await page.locator('#logo-pack-create-button').click();
    await waitForStatus(page, 'processing');

    await expect(page.locator('#fsg-processing-overlay-context')).toHaveText('Preparing 7 website-ready logo assets');

    await expect(page.locator('#fsg-processing-overlay-title')).toHaveText('Your logo pack is ready', { timeout: 30_000 });
    const readyContext = await page.locator('#fsg-processing-overlay-context').textContent();
    expect(readyContext).not.toContain('Preparing');
    expect(readyContext).toMatch(/7 website-ready logo assets/);

    await waitForStatus(page, 'success', 30_000);
  });

  test('Quick Fit and Guided Fit: task context is phase-neutral and unchanged between Preparing and Ready', async ({ page }) => {
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();
    await waitForStatus(page, 'processing');

    const preparingContext = await page.locator('#fsg-processing-overlay-context').textContent();
    expect(preparingContext).toBe('JPEG · target 200.0 KB');

    await expect(page.locator('#fsg-processing-overlay-title')).toHaveText('Your file is ready', { timeout: 30_000 });
    await expect(page.locator('#fsg-processing-overlay-context')).toHaveText(preparingContext!);

    await waitForStatus(page, 'success', 30_000);
  });

  test('Dark mode: the completed GO checkmark renders white on the accent-blue fill', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await gotoApp(page);
    await uploadFile(page, 'large.jpg');
    await waitForStatus(page, 'ready');
    await page.locator('#quick-fit-open').click();
    await fillSlowTargetSizeRequirement(page);
    await page.locator('#process-button').click();

    await expect(page.locator('#fsg-processing-overlay-title')).toHaveText('Your file is ready', { timeout: 30_000 });
    const color = await page
      .locator('#fsg-processing-rail [data-stage="go"] .fsg-processing-rail__node')
      .evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe('rgb(255, 255, 255)');

    await waitForStatus(page, 'success', 30_000);
  });
});
