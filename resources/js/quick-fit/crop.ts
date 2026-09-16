import { isCropRequired, largestCenteredCropForRatio, type CropRegion } from '@filesetgo/core';

/**
 * Quick Fit's exact-dimensions crop is locked to the requested output
 * ratio (unlike Logo Pack's freeform favicon-source crop) — the user
 * chooses WHERE the frame sits, never its shape. `isCropRequired` is
 * re-exported rather than re-implemented so the UI and the worker-side
 * enforcement (`packages/core/src/workers/process-image.ts`) can never
 * disagree about when a crop is mandatory (FSG-007-FIT-001).
 */
export { isCropRequired };

export type CropHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

function minimumDimensions(source: { width: number; height: number }): { width: number; height: number } {
  return {
    width: Math.min(source.width, Math.max(16, Math.floor(source.width * 0.05))),
    height: Math.min(source.height, Math.max(16, Math.floor(source.height * 0.05))),
  };
}

/**
 * The largest centered crop, at the requested output ratio, that fits the
 * source — the neutral starting frame shown before the user has touched
 * anything. Per directive §14, this is only ever a *suggestion*: nothing
 * calling this function may treat its result as user-approved.
 */
export function initialLockedCrop(
  source: { width: number; height: number },
  targetWidth: number,
  targetHeight: number,
): CropRegion {
  return largestCenteredCropForRatio(source.width, source.height, targetWidth, targetHeight);
}

/**
 * The single chokepoint every crop mutation passes through: clamps to a
 * sane minimum size, keeps the crop inside the source bounds, and — the
 * one real difference from Logo Pack's `constrainFreeformCrop` — always
 * re-derives height from width and the locked target ratio, so the two
 * dimensions can never drift out of ratio.
 */
export function constrainLockedCrop(
  crop: CropRegion,
  source: { width: number; height: number },
  targetWidth: number,
  targetHeight: number,
): CropRegion {
  const targetRatio = targetWidth / targetHeight;
  const minimum = minimumDimensions(source);
  const minWidthForRatio = Math.max(minimum.width, minimum.height * targetRatio);

  let width = Math.min(source.width, Math.max(minWidthForRatio, Math.round(crop.width)));
  let height = Math.round(width / targetRatio);

  if (height > source.height) {
    height = source.height;
    width = Math.round(height * targetRatio);
  }

  return {
    x: Math.min(source.width - width, Math.max(0, Math.round(crop.x))),
    y: Math.min(source.height - height, Math.max(0, Math.round(crop.y))),
    width,
    height,
  };
}

/**
 * True when reaching `targetWidth`x`targetHeight` from `source` needs
 * enlargement beyond the source's own resolution on either axis. `source`
 * should be the confirmed crop's dimensions when one exists, or the full
 * source dimensions otherwise — the same "effective source" the worker
 * itself checks (`packages/core/src/workers/process-image.ts`).
 */
export function isUpscaleRequired(
  source: { width: number; height: number },
  targetWidth: number,
  targetHeight: number,
): boolean {
  return targetWidth > source.width || targetHeight > source.height;
}

export type GeometryApprovalResult =
  | { ok: true }
  | { ok: false; reason: 'crop-required' | 'upscale-required' };

/**
 * The single chokepoint deciding whether a locked-ratio exact-frame request
 * is actually approved to run — shared by Quick Fit's manual form
 * (`validate-form.ts`) and Guided Fit's preset runner
 * (`../presets/guided-fit-controller.ts`, FSG-007-FIT-002) so the two UI
 * surfaces can never silently disagree about when a crop/upscale approval
 * is mandatory, extending the same single-source-of-truth principle
 * `isCropRequired` already established between the UI and the worker.
 *
 * Upscale is evaluated against the EFFECTIVE source — the confirmed crop's
 * own dimensions when one exists, otherwise the full source — since
 * cropping can turn a previously-fine upscale situation into a required
 * one.
 */
export function checkGeometryApproval(
  sourceDimensions: { width: number; height: number },
  targetWidth: number,
  targetHeight: number,
  confirmedCrop: CropRegion | undefined,
  upscaleApproved: boolean,
): GeometryApprovalResult {
  const cropRequired = isCropRequired(sourceDimensions.width, sourceDimensions.height, targetWidth, targetHeight);

  if (cropRequired && confirmedCrop === undefined) {
    return { ok: false, reason: 'crop-required' };
  }

  const effectiveSource = confirmedCrop ?? sourceDimensions;

  if (isUpscaleRequired(effectiveSource, targetWidth, targetHeight) && !upscaleApproved) {
    return { ok: false, reason: 'upscale-required' };
  }

  return { ok: true };
}

/**
 * Locked-ratio analogue of the favicon crop's `resizedCropFromHandle`
 * (`resources/js/quick-fit/controller.ts`). A single edge can't move on its
 * own without breaking the locked ratio, so edge handles resize uniformly
 * from the fixed OPPOSITE edge (the other axis follows via the ratio) and
 * corner handles resize uniformly from the opposite corner — the drag
 * magnitude is whichever of deltaX/deltaY the user actually moved further,
 * expressed as an equivalent width change.
 */
export function resizedLockedCropFromHandle(
  crop: CropRegion,
  handle: CropHandle,
  deltaX: number,
  deltaY: number,
  source: { width: number; height: number },
  targetWidth: number,
  targetHeight: number,
): CropRegion {
  const targetRatio = targetWidth / targetHeight;
  const includesWest = handle.includes('w');
  const includesEast = handle.includes('e');
  const includesNorth = handle.includes('n');
  const includesSouth = handle.includes('s');
  const isCorner = handle.length === 2;

  let widthDelta: number;

  if (isCorner) {
    const fromX = includesWest ? -deltaX : deltaX;
    const fromY = includesNorth ? -deltaY : deltaY;
    widthDelta = Math.abs(deltaX) >= Math.abs(deltaY) ? fromX : fromY * targetRatio;
  } else if (includesWest || includesEast) {
    widthDelta = includesWest ? -deltaX : deltaX;
  } else {
    const fromY = includesNorth ? -deltaY : deltaY;
    widthDelta = fromY * targetRatio;
  }

  const width = crop.width + widthDelta;
  const height = width / targetRatio;

  const anchorX = includesWest ? crop.x + crop.width : crop.x;
  const anchorY = includesNorth ? crop.y + crop.height : crop.y;

  const x = includesWest
    ? anchorX - width
    : includesEast
      ? anchorX
      : crop.x + (crop.width - width) / 2;
  const y = includesNorth
    ? anchorY - height
    : includesSouth
      ? anchorY
      : crop.y + (crop.height - height) / 2;

  return constrainLockedCrop({ x, y, width, height }, source, targetWidth, targetHeight);
}
