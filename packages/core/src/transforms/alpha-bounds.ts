import type { RgbaRaster } from './alpha-inspection';

/**
 * Alpha used for outer-canvas fitting is deliberately independent from
 * background-removal thresholds. Every non-zero alpha value can represent
 * a meaningful anti-aliased edge and is therefore eligible for the bounds.
 */
export const MIN_MEANINGFUL_ALPHA = 1;

/** Only a disconnected, barely-visible sample is treated as residual contamination. Opaque one-pixel punctuation remains meaningful. */
export const MAX_ISOLATED_NOISE_ALPHA = 16;

/** One isolated pixel is treated as contamination; a meaningful result needs at least this much accumulated opacity. */
export const MIN_MEANINGFUL_ALPHA_MASS = 16;

/** Padding is 3% of the shorter visible edge, bounded so it neither disappears nor recreates an oversized canvas. */
export const SAFE_PADDING_RATIO = 0.03;
export const MIN_SAFE_PADDING_PX = 2;
export const MAX_SAFE_PADDING_PX = 24;

export interface AlphaBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  meaningfulPixelCount: number;
  alphaMass: number;
}

export interface AlphaTrimPlan {
  bounds: AlphaBounds;
  padding: number;
  outputWidth: number;
  outputHeight: number;
  trimmed: boolean;
}

export interface AlphaBoundsScanOptions {
  /** Inclusive local row at which reported pixels begin. Neighbour checks may still inspect rows outside this range. */
  scanTop?: number;
  /** Exclusive local row at which reported pixels end. */
  scanBottom?: number;
  /** Coordinate offset applied to returned bounds. */
  originX?: number;
  /** Coordinate offset applied to returned bounds. */
  originY?: number;
}

function alphaAt(raster: RgbaRaster, x: number, y: number): number {
  return raster.data[(y * raster.width + x) * 4 + 3];
}

/**
 * Returns true when a visible pixel is connected to at least one other
 * visible pixel in its 8-neighbourhood. The caller uses this only to
 * distinguish barely-visible isolated contamination; opaque punctuation,
 * thin strokes, diagonals, trademark marks, and disconnected multi-pixel
 * logo elements remain eligible for the bounds.
 */
function hasVisibleNeighbour(raster: RgbaRaster, x: number, y: number): boolean {
  for (let dy = -1; dy <= 1; dy += 1) {
    const ny = y + dy;

    if (ny < 0 || ny >= raster.height) {
      continue;
    }

    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }

      const nx = x + dx;

      if (nx < 0 || nx >= raster.width) {
        continue;
      }

      if (alphaAt(raster, nx, ny) >= MIN_MEANINGFUL_ALPHA) {
        return true;
      }
    }
  }

  return false;
}

/** Detects the outer bounds of meaningful alpha without modifying internal negative space. */
export function detectVisibleAlphaBounds(
  raster: RgbaRaster,
  options: AlphaBoundsScanOptions = {},
): AlphaBounds | undefined {
  const scanTop = Math.max(0, options.scanTop ?? 0);
  const scanBottom = Math.min(raster.height, options.scanBottom ?? raster.height);
  const originX = options.originX ?? 0;
  const originY = options.originY ?? 0;
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = -1;
  let bottom = -1;
  let meaningfulPixelCount = 0;
  let alphaMass = 0;

  for (let y = scanTop; y < scanBottom; y += 1) {
    for (let x = 0; x < raster.width; x += 1) {
      const alpha = alphaAt(raster, x, y);

      if (
        alpha < MIN_MEANINGFUL_ALPHA ||
        (!hasVisibleNeighbour(raster, x, y) && alpha <= MAX_ISOLATED_NOISE_ALPHA)
      ) {
        continue;
      }

      left = Math.min(left, x + originX);
      top = Math.min(top, y + originY);
      right = Math.max(right, x + originX);
      bottom = Math.max(bottom, y + originY);
      meaningfulPixelCount += 1;
      alphaMass += alpha / 255;
    }
  }

  if (!Number.isFinite(left) || !Number.isFinite(top)) {
    return undefined;
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
    meaningfulPixelCount,
    alphaMass,
  };
}

/** Combines non-overlapping scan results from a bounded strip traversal. */
export function mergeAlphaBounds(
  current: AlphaBounds | undefined,
  next: AlphaBounds | undefined,
): AlphaBounds | undefined {
  if (current === undefined) {
    return next;
  }

  if (next === undefined) {
    return current;
  }

  const left = Math.min(current.left, next.left);
  const top = Math.min(current.top, next.top);
  const right = Math.max(current.right, next.right);
  const bottom = Math.max(current.bottom, next.bottom);

  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
    meaningfulPixelCount: current.meaningfulPixelCount + next.meaningfulPixelCount,
    alphaMass: current.alphaMass + next.alphaMass,
  };
}

export function calculateSafeAlphaPadding(bounds: Pick<AlphaBounds, 'width' | 'height'>): number {
  const proportional = Math.round(Math.min(bounds.width, bounds.height) * SAFE_PADDING_RATIO);
  return Math.max(MIN_SAFE_PADDING_PX, Math.min(MAX_SAFE_PADDING_PX, proportional));
}

/** A near-empty result is never promoted to a ready transparent master. */
export function hasMeaningfulVisibleContent(bounds: AlphaBounds | undefined): bounds is AlphaBounds {
  return bounds !== undefined && bounds.alphaMass >= MIN_MEANINGFUL_ALPHA_MASS;
}

export function calculateAlphaTrimPlan(
  sourceWidth: number,
  sourceHeight: number,
  bounds: AlphaBounds,
): AlphaTrimPlan {
  const padding = calculateSafeAlphaPadding(bounds);
  const outputWidth = bounds.width + padding * 2;
  const outputHeight = bounds.height + padding * 2;

  return {
    bounds,
    padding,
    outputWidth,
    outputHeight,
    trimmed:
      bounds.left > 0 ||
      bounds.top > 0 ||
      bounds.right < sourceWidth - 1 ||
      bounds.bottom < sourceHeight - 1,
  };
}
