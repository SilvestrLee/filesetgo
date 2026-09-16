import type { CropRegion } from '../processing/contracts';

/**
 * Relative aspect-ratio difference tolerated before an exact-dimensions
 * request is considered to require a user-approved crop (FSG-007-FIT-001
 * directive §6/§9). Chosen to absorb ordinary integer-rounding noise (e.g.
 * a source that decodes as 799x801 when the "true" ratio is 1:1) while
 * still catching any aspect-ratio mismatch a person would actually notice.
 * No prior art exists elsewhere in the codebase for this value — it is a
 * deliberate, named, one-line-to-revisit constant rather than a magic
 * number scattered across call sites.
 */
export const DEFAULT_ASPECT_RATIO_TOLERANCE = 0.005;

/**
 * True when the source's aspect ratio differs from the requested exact
 * output ratio by more than `tolerance` — i.e. reaching `targetWidth` x
 * `targetHeight` from `sourceWidth` x `sourceHeight` cannot be done by a
 * uniform, non-distorting scale alone, so a user-approved crop is required
 * first (FSG-007-FIT-001 directive §3/§9/§10 — FileSetGo never crops or
 * stretches on its own).
 *
 * This is the single source of truth shared by both the worker-side
 * enforcement (`process-image.ts`/`process-image-to-target.ts`, which must
 * reject an `exact` request that needs a crop but has none) and the Quick
 * Fit UI (which decides whether to show the crop-review step) — the two
 * must never be able to disagree.
 */
export function isCropRequired(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  tolerance: number = DEFAULT_ASPECT_RATIO_TOLERANCE,
): boolean {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  return Math.abs(sourceRatio - targetRatio) / targetRatio > tolerance;
}

/**
 * True when `crop`'s own aspect ratio matches `targetWidth`/`targetHeight`
 * within `tolerance` — used to reject a caller-supplied crop whose ratio
 * doesn't actually match what was requested (a bug or a tampered request;
 * the UI is expected to only ever produce ratio-locked crops).
 */
export function isCropRatioValid(
  crop: Pick<CropRegion, 'width' | 'height'>,
  targetWidth: number,
  targetHeight: number,
  tolerance: number = DEFAULT_ASPECT_RATIO_TOLERANCE,
): boolean {
  return !isCropRequired(crop.width, crop.height, targetWidth, targetHeight, tolerance);
}

/**
 * True when `crop` fits entirely within a `sourceWidth` x `sourceHeight`
 * source: a positive-size rectangle that never extends past the source
 * bounds.
 */
export function isCropWithinBounds(
  crop: CropRegion,
  sourceWidth: number,
  sourceHeight: number,
): boolean {
  return (
    Number.isFinite(crop.x) &&
    Number.isFinite(crop.y) &&
    Number.isFinite(crop.width) &&
    Number.isFinite(crop.height) &&
    crop.width > 0 &&
    crop.height > 0 &&
    crop.x >= 0 &&
    crop.y >= 0 &&
    crop.x + crop.width <= sourceWidth &&
    crop.y + crop.height <= sourceHeight
  );
}

/**
 * The largest crop region, centered by default, whose aspect ratio is
 * exactly `targetWidth`/`targetHeight`, that fits inside a
 * `sourceWidth` x `sourceHeight` source. This is both the UI's default
 * starting frame (never auto-approved — the user must still confirm it,
 * per directive §14) and the reference geometry used to validate a
 * caller-supplied crop's ratio.
 */
export function largestCenteredCropForRatio(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): CropRegion {
  const targetRatio = targetWidth / targetHeight;
  const sourceRatio = sourceWidth / sourceHeight;

  let width: number;
  let height: number;

  if (sourceRatio > targetRatio) {
    // Source is relatively wider than the target ratio: height is the
    // limiting axis, width follows from the target ratio.
    height = sourceHeight;
    width = Math.round(height * targetRatio);
  } else {
    width = sourceWidth;
    height = Math.round(width / targetRatio);
  }

  // Rounding can push a dimension a pixel past the source; clamp back in.
  width = Math.min(width, sourceWidth);
  height = Math.min(height, sourceHeight);

  return {
    x: Math.floor((sourceWidth - width) / 2),
    y: Math.floor((sourceHeight - height) / 2),
    width,
    height,
  };
}
