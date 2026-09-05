/**
 * Generic, product-agnostic assessment of whether a raster's existing alpha
 * genuinely represents a prepared, removable BACKGROUND — as opposed to
 * incidental alpha that happens to exist somewhere in an otherwise opaque
 * or effectively-opaque image (FSG-005C Product Office correction).
 *
 * `inspectAlpha()` (alpha-inspection.ts) answers a narrower, purely
 * pixel-level question: "does this raster contain any real alpha
 * information at all?" That question is not sufficient to decide whether
 * background-removal preparation may safely be skipped. A PNG with a thin
 * transparent margin around an otherwise-opaque white rectangular
 * background genuinely contains alpha — `inspectAlpha()` correctly reports
 * `'transparency-present'` — but the artwork's actual background (the
 * white rectangle) has not been removed at all. Bypassing preparation on
 * `inspectAlpha()` alone would recreate FileSetGo's original reported
 * defect (an opaque background masquerading as a transparent logo) under a
 * different technical condition.
 *
 * This module deliberately does not touch `inspectAlpha()` — it stays a
 * generic, narrow pixel primitive. This module adds a second, still
 * generic, connectivity-based assessment on top of it. No "logo"/"Logo
 * Pack" terminology belongs here.
 */

import { inspectAlpha, type RgbaRaster } from './alpha-inspection';

export type ExistingTransparencyStatus =
  | 'opaque'
  | 'alpha-present-background-not-confirmed'
  | 'background-transparency-confirmed';

export interface BackgroundTransparencyAssessment {
  status: ExistingTransparencyStatus;
  /** Fraction of all pixels that are non-opaque AND connected to the image border through other non-opaque pixels. */
  boundaryConnectedTransparentRatio: number;
  /**
   * Of the pixels NOT part of that boundary-connected transparent region,
   * the fraction whose colour does not match the region immediately
   * bordering the transparent area (the "shoreline") — evidence of a
   * distinct, still-opaque region trapped behind an already-transparent
   * margin. `0` when nothing remains to evaluate (e.g. the whole raster is
   * boundary-connected-transparent).
   */
  residualForegroundRatio: number;
  /** A short, internal, non-user-facing reason code — present only when `status !== 'background-transparency-confirmed'`. */
  reason?: string;
}

const OPAQUE_ALPHA = 255;

/**
 * Below this boundary-connected-transparent ratio, any alpha present is
 * treated as incidental (a stray pixel or a tiny corner) rather than a
 * genuine prepared background — derived from fixture evidence: a single
 * transparent pixel or a 3×3 transparent corner on a 40×40 raster produces
 * a ratio of 0 and ~0.006 respectively, while every genuine
 * transparent-background fixture tested produced 0.5 or higher. See
 * `background-transparency.test.ts`.
 */
export const MIN_BOUNDARY_TRANSPARENT_RATIO = 0.03;

/**
 * Above this residual ratio, a distinctly-coloured region large enough to
 * be real content (not colour-estimation noise) remains trapped behind the
 * already-transparent margin — evidence of an unremoved background
 * wrapping further artwork. Derived from fixture evidence: a transparent
 * canvas around an opaque white rectangle containing a small coloured
 * artwork block produced residual ratios from ~0.08 up to ~0.69 across
 * several rectangle/artwork proportions tested, while every genuine
 * single-colour transparent-foreground fixture tested produced exactly 0.
 * See `background-transparency.test.ts`.
 */
export const MAX_RESIDUAL_FOREGROUND_RATIO_FOR_CONFIRMATION = 0.03;

/** Same colour-distance scale `removeConnectedBackground()` uses (0-441, the maximum possible Euclidean RGB distance). */
const SHORELINE_COLOR_DISTANCE_THRESHOLD = 40;

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function pixelRgb(data: Uint8ClampedArray | Uint8Array, offset: number): RgbColor {
  return { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
}

function colorDistance(a: RgbColor, b: RgbColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

function medianColor(colors: RgbColor[]): RgbColor {
  return {
    r: medianOf(colors.map((c) => c.r)),
    g: medianOf(colors.map((c) => c.g)),
    b: medianOf(colors.map((c) => c.b)),
  };
}

function isNonOpaque(data: Uint8ClampedArray | Uint8Array, offset: number): boolean {
  return data[offset + 3] < OPAQUE_ALPHA;
}

/**
 * Iterative (non-recursive, bounded-stack) BFS flood-fill from the image
 * border through non-opaque pixels only (colour is irrelevant here — this
 * answers a purely alpha-based connectivity question). Exported standalone
 * because the post-encode verification re-check reuses only this narrower
 * "is there a real, border-connected transparent margin" question, without
 * the heavier residual-foreground analysis below.
 */
export function computeBoundaryConnectedTransparency(raster: RgbaRaster): { ratio: number; mask: Uint8Array } {
  const { data, width, height } = raster;
  const total = width * height;
  const mask = new Uint8Array(total);

  if (total === 0) {
    return { ratio: 0, mask };
  }

  const queue = new Int32Array(total);
  let queueEnd = 0;

  const trySeed = (x: number, y: number): void => {
    const index = y * width + x;

    if (mask[index] === 1) {
      return;
    }

    if (isNonOpaque(data, index * 4)) {
      mask[index] = 1;
      queue[queueEnd] = index;
      queueEnd += 1;
    }
  };

  for (let x = 0; x < width; x += 1) {
    trySeed(x, 0);
    trySeed(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    trySeed(0, y);
    trySeed(width - 1, y);
  }

  let queueStart = 0;

  while (queueStart < queueEnd) {
    const index = queue[queueStart];
    queueStart += 1;
    const x = index % width;
    const y = (index - x) / width;

    const neighbors: Array<[number, number]> = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }

      const nIndex = ny * width + nx;

      if (mask[nIndex] === 1) {
        continue;
      }

      if (isNonOpaque(data, nIndex * 4)) {
        mask[nIndex] = 1;
        queue[queueEnd] = nIndex;
        queueEnd += 1;
      }
    }
  }

  let count = 0;

  for (let i = 0; i < total; i += 1) {
    count += mask[i];
  }

  return { ratio: count / total, mask };
}

/**
 * Of the pixels NOT covered by `boundaryMask`, estimates the colour of the
 * "shoreline" (pixels immediately adjacent to the boundary-transparent
 * region) and flood-fills outward from it by colour similarity, confined
 * to the same non-boundary-transparent domain. Returns the fraction of
 * that domain the flood did NOT reach — a distinctly-coloured remainder
 * trapped behind the transparent margin.
 */
function computeResidualForegroundRatio(raster: RgbaRaster, boundaryMask: Uint8Array): number {
  const { data, width, height } = raster;
  const total = width * height;

  let remainingCount = 0;

  for (let i = 0; i < total; i += 1) {
    if (boundaryMask[i] === 0) {
      remainingCount += 1;
    }
  }

  if (remainingCount === 0) {
    return 0;
  }

  const shorelineColors: RgbColor[] = [];
  const shorelineIndexes: number[] = [];

  for (let i = 0; i < total; i += 1) {
    if (boundaryMask[i] !== 0) {
      continue;
    }

    const x = i % width;
    const y = (i - x) / width;
    const neighbors: Array<[number, number]> = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    let onShoreline = false;

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }

      if (boundaryMask[ny * width + nx] === 1) {
        onShoreline = true;
        break;
      }
    }

    if (onShoreline) {
      shorelineColors.push(pixelRgb(data, i * 4));
      shorelineIndexes.push(i);
    }
  }

  // The remaining domain never touches the boundary-transparent region at
  // all (a disconnected geometry) — there is no non-circular colour
  // evidence to work from; treat this conservatively as fully residual
  // rather than guessing.
  if (shorelineColors.length === 0) {
    return 1;
  }

  const shorelineColor = medianColor(shorelineColors);
  const floodMask = new Uint8Array(total);
  const queue = new Int32Array(remainingCount);
  let queueEnd = 0;

  for (const index of shorelineIndexes) {
    if (colorDistance(pixelRgb(data, index * 4), shorelineColor) <= SHORELINE_COLOR_DISTANCE_THRESHOLD) {
      floodMask[index] = 1;
      queue[queueEnd] = index;
      queueEnd += 1;
    }
  }

  let queueStart = 0;

  while (queueStart < queueEnd) {
    const index = queue[queueStart];
    queueStart += 1;
    const x = index % width;
    const y = (index - x) / width;
    const neighbors: Array<[number, number]> = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
        continue;
      }

      const nIndex = ny * width + nx;

      // Never cross back into the already-transparent region — this flood
      // only measures structure within the remaining opaque domain.
      if (boundaryMask[nIndex] === 1 || floodMask[nIndex] === 1) {
        continue;
      }

      if (colorDistance(pixelRgb(data, nIndex * 4), shorelineColor) <= SHORELINE_COLOR_DISTANCE_THRESHOLD) {
        floodMask[nIndex] = 1;
        queue[queueEnd] = nIndex;
        queueEnd += 1;
      }
    }
  }

  let floodCount = 0;

  for (let i = 0; i < total; i += 1) {
    if (boundaryMask[i] === 0 && floodMask[i] === 1) {
      floodCount += 1;
    }
  }

  return (remainingCount - floodCount) / remainingCount;
}

/**
 * Determines whether a raster's existing alpha already represents a
 * sufficiently meaningful, prepared transparent BACKGROUND to safely
 * bypass background-removal preparation — never merely whether alpha
 * exists somewhere (directive correction, FSG-005C).
 */
export function assessBackgroundTransparency(raster: RgbaRaster): BackgroundTransparencyAssessment {
  const inspection = inspectAlpha(raster);

  if (inspection.classification === 'opaque') {
    return { status: 'opaque', boundaryConnectedTransparentRatio: 0, residualForegroundRatio: 0 };
  }

  const { ratio: boundaryConnectedTransparentRatio, mask } = computeBoundaryConnectedTransparency(raster);

  if (boundaryConnectedTransparentRatio < MIN_BOUNDARY_TRANSPARENT_RATIO) {
    return {
      status: 'alpha-present-background-not-confirmed',
      boundaryConnectedTransparentRatio,
      residualForegroundRatio: 1,
      reason: 'insufficient-boundary-transparency',
    };
  }

  const residualForegroundRatio = computeResidualForegroundRatio(raster, mask);

  if (residualForegroundRatio > MAX_RESIDUAL_FOREGROUND_RATIO_FOR_CONFIRMATION) {
    return {
      status: 'alpha-present-background-not-confirmed',
      boundaryConnectedTransparentRatio,
      residualForegroundRatio,
      reason: 'unremoved-background-region-detected',
    };
  }

  return {
    status: 'background-transparency-confirmed',
    boundaryConnectedTransparentRatio,
    residualForegroundRatio,
  };
}
