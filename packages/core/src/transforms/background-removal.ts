/**
 * Generic, product-agnostic connected-background removal (FSG-005C
 * directive §13/§14). No concept of "logo," "Website Logo Pack," or any
 * other product terminology belongs here.
 *
 * Approach (boundary-informed removal with a conservative enclosed-region
 * pass):
 *
 * 1. Estimate the background colour from the image's own border ring
 *    (median per channel — resistant to a handful of foreground pixels
 *    that happen to touch the border).
 * 2. Flood-fill (iterative BFS, not recursive — bounded stack) outward
 *    from every border pixel whose colour is within `strength`'s colour
 *    distance of that estimate, spreading only through 4-connected
 *    neighbours that are *also* within distance. This is what keeps a
 *    disconnected foreground region protected even when its colour is
 *    similar to the background (directive §13 point 4) — it is never
 *    reached by the flood unless a path of background-like pixels
 *    connects it to the border.
 * 3. A second connected-component pass examines only opaque regions that
 *    still resemble the inferred source background. Compact, material,
 *    near-exact regions are accepted as enclosed background; uncertain
 *    regions are retained and reported so callers cannot claim VERIFIED.
 * 4. Every accepted exterior or enclosed-background pixel becomes fully
 *    transparent.
 * 5. Pixels adjacent to an accepted background region get a *soft* alpha ramp based on
 *    how close their colour is to the background estimate, instead of a
 *    hard 0/255 cliff (directive §13 point 5), and their RGB is
 *    decontaminated — the standard "unblend from a known background"
 *    calculation for anti-aliased edges that were already blended against
 *    the old background before this ever ran (directive §14) — rather than
 *    left with a colour-fringed halo.
 *
 * This is a real, bounded, deterministic algorithm — not a global colour
 * threshold ("delete all white pixels") and not a four-corner-only guess.
 * It is not a segmentation/matting model and does not claim professional
 * cutout quality; see ADR-020 for the documented common-case/difficult-case
 * quality split this implies.
 *
 * **Existing-alpha awareness (Product Office correction, FSG-005C):** this
 * function is also called for sources that already carry *some* real
 * transparency but were assessed (`background-transparency.ts`) as not yet
 * having a confirmed, fully-prepared background — for example, a
 * transparent margin wrapping an opaque, unremoved rectangular background.
 * A pixel that is already non-opaque is treated as automatically
 * background-like for seeding/flood purposes (no colour check needed — it
 * is already transparent), and the background-colour estimate falls back
 * to the "shoreline" (opaque pixels immediately adjacent to that existing
 * transparent region) when the literal border carries no opaque pixels to
 * sample from. For the overwhelmingly common fully-opaque source, every
 * pixel is opaque, so both of these are no-ops and behaviour is unchanged.
 */

import type { RgbaRaster } from './alpha-inspection';

export type BackgroundRemovalStrength = 'gentle' | 'balanced' | 'strong';

/** Colour-distance threshold (0-441, the maximum possible Euclidean RGB distance) per strength. */
export const BACKGROUND_REMOVAL_THRESHOLDS: Record<BackgroundRemovalStrength, number> = {
  gentle: 18,
  balanced: 34,
  strong: 55,
};

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface BackgroundRemovalResult {
  data: Uint8ClampedArray;
  width: number;
  height: number;
  /** The estimated background colour the removal was performed against. */
  backgroundColor: RgbColor;
  /** Average colour distance of border pixels from the estimated background colour — high values indicate a non-flat (gradient/textured) background. */
  backgroundColorVariance: number;
  /** Fraction of border seed pixels that were NOT close enough to the estimated background to seed the flood — high values indicate the foreground touches the image boundary or the background isn't flat. */
  borderAmbiguousRatio: number;
  /** Fraction of all pixels that ended up fully or partially transparent. */
  removedRatio: number;
  /** Fraction of all pixels that remain fully opaque (rough proxy for surviving foreground). */
  remainingOpaqueRatio: number;
  /** Number of confidently background-like enclosed regions cleared by the second pass. */
  enclosedBackgroundRemovedComponents: number;
  /** Fraction of all pixels cleared from confidently background-like enclosed regions. */
  enclosedBackgroundRemovedRatio: number;
  /** Number of material enclosed regions preserved because topology/colour evidence was not conclusive. */
  ambiguousEnclosedBackgroundComponents: number;
  /** Fraction of all pixels retained but flagged as materially background-like and enclosed. */
  ambiguousEnclosedBackgroundRatio: number;
  /** Analysis classification: 0 unrelated, 1 removed, 2 protected ambiguity, 3 requires source-resolution confirmation. */
  enclosedRegionMask: Uint8Array;
}

const OPAQUE_ALPHA = 255;

/**
 * Enclosed-background classification is deliberately stricter than the
 * outer flood. Exact/near-exact source-background cores are eligible, but
 * small or stroke-like shapes stay untouched and force a review state — a
 * deterministic utility cannot safely distinguish such shapes from an
 * intentional white highlight without semantic understanding.
 */
const MIN_MATERIAL_ENCLOSED_PIXELS = 4;
const MIN_CONFIDENT_ENCLOSED_PIXELS = 8;
const MIN_CONFIDENT_ENCLOSED_RATIO = 0.000008;
const MIN_CONFIDENT_COMPONENT_DIMENSION = 3;
const MIN_CONFIDENT_COMPONENT_ASPECT_RATIO = 0.5;
const MAX_CONFIDENT_BACKGROUND_DISTANCE_FRACTION = 0.25;
const MAX_CONFIDENT_BACKGROUND_CORE_DISTANCE = 1;
const MIN_CONFIDENT_COMPONENT_FILL_RATIO = 0.4;
const MAX_CONFIDENT_COMPONENT_COMPACTNESS = 4.5;

interface EnclosedBackgroundAnalysis {
  /** 0 = unrelated, 1 = remove, 2 = preserve, 3 = confirm against source-resolution colour. */
  componentMask: Uint8Array;
  removedComponentCount: number;
  removedPixelCount: number;
  ambiguousComponentCount: number;
  ambiguousPixelCount: number;
}

function restoreAmbiguousForegroundBranches(
  raster: RgbaRaster,
  flooded: Uint8Array,
  foregroundInteriorMask: Uint8Array,
  backgroundColor: RgbColor,
  threshold: number,
  queue: Int32Array,
): Uint8Array {
  const { width, height } = raster;
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const protectedMask = new Uint8Array(totalPixels);

  const isCandidate = (index: number): boolean => {
    if (flooded[index] !== 1 || foregroundInteriorMask[index] !== 1) {
      return false;
    }

    const offset = index * 4;

    return raster.data[offset + 3] === OPAQUE_ALPHA && colorDistance(
      { r: raster.data[offset], g: raster.data[offset + 1], b: raster.data[offset + 2] },
      backgroundColor,
    ) <= threshold;
  };

  for (let start = 0; start < totalPixels; start += 1) {
    if (visited[start] === 1 || !isCandidate(start)) {
      continue;
    }

    let queueStart = 0;
    let queueEnd = 1;
    queue[0] = start;
    visited[start] = 1;
    let left = start % width;
    let right = left;
    let top = Math.floor(start / width);
    let bottom = top;

    while (queueStart < queueEnd) {
      const index = queue[queueStart];
      queueStart += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);

      for (const [nextX, nextY] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ] as const) {
        if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
          continue;
        }

        const next = nextY * width + nextX;

        if (visited[next] === 0 && isCandidate(next)) {
          visited[next] = 1;
          queue[queueEnd] = next;
          queueEnd += 1;
        }
      }
    }

    const componentWidth = right - left + 1;
    const componentHeight = bottom - top + 1;
    const boundingArea = componentWidth * componentHeight;
    const aspectRatio = Math.min(componentWidth, componentHeight) / Math.max(componentWidth, componentHeight);
    const fillRatio = queueEnd / boundingArea;
    const looksLikeAuthoredStroke =
      queueEnd >= MIN_MATERIAL_ENCLOSED_PIXELS &&
      componentWidth >= MIN_CONFIDENT_COMPONENT_DIMENSION &&
      componentHeight >= MIN_CONFIDENT_COMPONENT_DIMENSION &&
      aspectRatio >= MIN_CONFIDENT_COMPONENT_ASPECT_RATIO &&
      fillRatio < MIN_CONFIDENT_COMPONENT_FILL_RATIO;

    if (!looksLikeAuthoredStroke) {
      continue;
    }

    for (let index = 0; index < queueEnd; index += 1) {
      const pixelIndex = queue[index];
      flooded[pixelIndex] = 0;
      protectedMask[pixelIndex] = 1;
    }
  }

  return protectedMask;
}

/**
 * Finds background-coloured pixels that sit inside one connected foreground
 * component on all four cardinal axes. This protects ambiguous authored
 * light marks that touch the outer background through a narrow opening (for
 * example a white check drawn to the edge of a blue symbol) from the initial
 * boundary flood. The enclosed-region classifier can then either remove a
 * compact counter or preserve the uncertain mark and require review.
 */
function findForegroundInteriorBackground(
  raster: RgbaRaster,
  backgroundColor: RgbColor,
  threshold: number,
  queue: Int32Array,
): Uint8Array {
  const { width, height } = raster;
  const totalPixels = width * height;
  const foregroundLabels = new Int32Array(totalPixels);
  let componentLabel = 0;

  const isForeground = (index: number): boolean => {
    const offset = index * 4;

    if (raster.data[offset + 3] !== OPAQUE_ALPHA) {
      return false;
    }

    return colorDistance(
      { r: raster.data[offset], g: raster.data[offset + 1], b: raster.data[offset + 2] },
      backgroundColor,
    ) > threshold;
  };

  for (let start = 0; start < totalPixels; start += 1) {
    if (foregroundLabels[start] !== 0 || !isForeground(start)) {
      continue;
    }

    componentLabel += 1;
    let queueStart = 0;
    let queueEnd = 1;
    queue[0] = start;
    foregroundLabels[start] = componentLabel;

    while (queueStart < queueEnd) {
      const index = queue[queueStart];
      queueStart += 1;
      const x = index % width;
      const y = Math.floor(index / width);

      for (const [nextX, nextY] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ] as const) {
        if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
          continue;
        }

        const next = nextY * width + nextX;

        if (foregroundLabels[next] !== 0 || !isForeground(next)) {
          continue;
        }

        foregroundLabels[next] = componentLabel;
        queue[queueEnd] = next;
        queueEnd += 1;
      }
    }
  }

  const horizontalEnvelope = new Int32Array(totalPixels);

  for (let y = 0; y < height; y += 1) {
    let nearestLeft = 0;

    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      horizontalEnvelope[index] = nearestLeft;

      if (foregroundLabels[index] !== 0) {
        nearestLeft = foregroundLabels[index];
      }
    }

    let nearestRight = 0;

    for (let x = width - 1; x >= 0; x -= 1) {
      const index = y * width + x;

      if (foregroundLabels[index] !== 0) {
        nearestRight = foregroundLabels[index];
        horizontalEnvelope[index] = 0;
      } else if (horizontalEnvelope[index] !== nearestRight) {
        horizontalEnvelope[index] = 0;
      }
    }
  }

  const nearestAbove = new Int32Array(totalPixels);

  for (let x = 0; x < width; x += 1) {
    let label = 0;

    for (let y = 0; y < height; y += 1) {
      const index = y * width + x;
      nearestAbove[index] = label;

      if (foregroundLabels[index] !== 0) {
        label = foregroundLabels[index];
      }
    }
  }

  const protectedMask = new Uint8Array(totalPixels);

  for (let x = 0; x < width; x += 1) {
    let nearestBelow = 0;

    for (let y = height - 1; y >= 0; y -= 1) {
      const index = y * width + x;
      const foregroundLabel = foregroundLabels[index];

      if (foregroundLabel !== 0) {
        nearestBelow = foregroundLabel;
        continue;
      }

      const enclosingLabel = horizontalEnvelope[index];

      if (enclosingLabel !== 0 && nearestAbove[index] === enclosingLabel && nearestBelow === enclosingLabel) {
        protectedMask[index] = 1;
      }
    }
  }

  return protectedMask;
}

function pixelAt(data: Uint8ClampedArray, width: number, x: number, y: number): RgbColor {
  const offset = (y * width + x) * 4;
  return { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
}

function alphaAt(data: Uint8ClampedArray | Uint8Array, width: number, x: number, y: number): number {
  return data[(y * width + x) * 4 + 3];
}

export function colorDistance(a: RgbColor, b: RgbColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export interface BackgroundEdgePixel extends RgbColor {
  alpha: number;
}

/**
 * Applies the governed background-removal soft-edge policy to one pixel.
 * This is shared by the bounded analysis pass and the source-resolution
 * application pass so the latter cannot silently drift to a different
 * halo/decontamination rule.
 */
export function resolveBackgroundEdgePixel(
  color: RgbColor,
  backgroundColor: RgbColor,
  threshold: number,
): BackgroundEdgePixel {
  const distance = colorDistance(color, backgroundColor);
  const softRange = threshold * 2;
  const rampPosition = Math.min(1, Math.max(0, (distance - threshold) / softRange));
  const alpha = clamp255(rampPosition * 255);
  const alphaFraction = alpha / 255;

  if (alphaFraction <= 0.05 || alpha >= 255) {
    return { ...color, alpha };
  }

  return {
    r: clamp255((color.r - (1 - alphaFraction) * backgroundColor.r) / alphaFraction),
    g: clamp255((color.g - (1 - alphaFraction) * backgroundColor.g) / alphaFraction),
    b: clamp255((color.b - (1 - alphaFraction) * backgroundColor.b) / alphaFraction),
    alpha,
  };
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

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Finds opaque background-like components that the boundary flood could
 * not reach. A compact, sufficiently large, near-exact component is strong
 * evidence of an enclosed counter/hole. Small, thin, irregular, or merely
 * similar components are preserved and surfaced as ambiguity instead of
 * being silently erased.
 *
 * Memory is bounded by the analysis raster: one byte per pixel for visited
 * and removal masks plus one reused Int32 queue. The production caller runs
 * this only on the <=1024px analysis image.
 */
function analyzeEnclosedBackground(
  raster: RgbaRaster,
  exteriorBackgroundMask: Uint8Array,
  backgroundColor: RgbColor,
  threshold: number,
  queue: Int32Array,
  preprotectedMask?: Uint8Array,
): EnclosedBackgroundAnalysis {
  const { width, height } = raster;
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const componentMask = new Uint8Array(totalPixels);
  const minimumConfidentPixels = Math.max(
    MIN_CONFIDENT_ENCLOSED_PIXELS,
    Math.ceil(totalPixels * MIN_CONFIDENT_ENCLOSED_RATIO),
  );
  let removedComponentCount = 0;
  let removedPixelCount = 0;
  let ambiguousComponentCount = 0;
  let ambiguousPixelCount = 0;

  const isOpaqueBackgroundCore = (index: number): boolean => {
    if (exteriorBackgroundMask[index] === 1 || alphaAt(raster.data, width, index % width, Math.floor(index / width)) !== OPAQUE_ALPHA) {
      return false;
    }

    const offset = index * 4;
    return colorDistance(
      { r: raster.data[offset], g: raster.data[offset + 1], b: raster.data[offset + 2] },
      backgroundColor,
    ) <= threshold;
  };

  for (let start = 0; start < totalPixels; start += 1) {
    if (visited[start] === 1 || !isOpaqueBackgroundCore(start)) {
      continue;
    }

    let queueStart = 0;
    let queueEnd = 1;
    queue[0] = start;
    visited[start] = 1;
    let left = start % width;
    let right = left;
    let top = Math.floor(start / width);
    let bottom = top;
    let distanceSum = 0;
    let minimumDistance = Number.POSITIVE_INFINITY;
    let perimeterEdges = 0;
    let containsPreprotectedPixel = false;

    while (queueStart < queueEnd) {
      const index = queue[queueStart];
      queueStart += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      const offset = index * 4;
      containsPreprotectedPixel ||= preprotectedMask?.[index] === 1;
      const distance = colorDistance(
        { r: raster.data[offset], g: raster.data[offset + 1], b: raster.data[offset + 2] },
        backgroundColor,
      );
      distanceSum += distance;
      minimumDistance = Math.min(minimumDistance, distance);
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);

      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ] as const) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
          perimeterEdges += 1;
          continue;
        }

        const neighborIndex = ny * width + nx;

        if (!isOpaqueBackgroundCore(neighborIndex)) {
          perimeterEdges += 1;
          continue;
        }

        if (visited[neighborIndex] === 1) {
          continue;
        }

        visited[neighborIndex] = 1;
        queue[queueEnd] = neighborIndex;
        queueEnd += 1;
      }
    }

    const componentPixels = queueEnd;

    if (componentPixels < MIN_MATERIAL_ENCLOSED_PIXELS) {
      continue;
    }

    const boundingArea = (right - left + 1) * (bottom - top + 1);
    const componentWidth = right - left + 1;
    const componentHeight = bottom - top + 1;
    const fillRatio = componentPixels / boundingArea;
    const aspectRatio = Math.min(componentWidth, componentHeight) / Math.max(componentWidth, componentHeight);
    const compactness = (perimeterEdges * perimeterEdges) / (4 * Math.PI * componentPixels);
    const averageDistance = distanceSum / componentPixels;
    const hasCounterGeometry =
      componentPixels >= minimumConfidentPixels &&
      componentWidth >= MIN_CONFIDENT_COMPONENT_DIMENSION &&
      componentHeight >= MIN_CONFIDENT_COMPONENT_DIMENSION &&
      aspectRatio >= MIN_CONFIDENT_COMPONENT_ASPECT_RATIO &&
      fillRatio >= MIN_CONFIDENT_COMPONENT_FILL_RATIO &&
      (!containsPreprotectedPixel || fillRatio >= 0.5) &&
      compactness <= MAX_CONFIDENT_COMPONENT_COMPACTNESS;
    const confidentlyBackground =
      hasCounterGeometry &&
      minimumDistance <= MAX_CONFIDENT_BACKGROUND_CORE_DISTANCE &&
      averageDistance <= threshold * MAX_CONFIDENT_BACKGROUND_DISTANCE_FRACTION;
    const requiresSourceResolutionConfirmation =
      hasCounterGeometry &&
      averageDistance <= threshold;

    if (confidentlyBackground) {
      removedComponentCount += 1;
      removedPixelCount += componentPixels;

      for (let index = 0; index < queueEnd; index += 1) {
        componentMask[queue[index]] = 1;
      }
    } else {
      ambiguousComponentCount += 1;
      ambiguousPixelCount += componentPixels;

      for (let index = 0; index < queueEnd; index += 1) {
        componentMask[queue[index]] = requiresSourceResolutionConfirmation ? 3 : 2;
      }
    }
  }

  return {
    componentMask,
    removedComponentCount,
    removedPixelCount,
    ambiguousComponentCount,
    ambiguousPixelCount,
  };
}

/**
 * Removes a connected background from a decoded RGBA raster, returning a
 * new RGBA buffer with the background (and, for border-adjacent pixels, a
 * decontaminated soft edge) made transparent. The input raster is not
 * mutated.
 */
export function removeConnectedBackground(
  raster: RgbaRaster,
  strength: BackgroundRemovalStrength,
): BackgroundRemovalResult {
  const { width, height } = raster;
  const src = raster.data instanceof Uint8ClampedArray ? raster.data : Uint8ClampedArray.from(raster.data);
  const out = Uint8ClampedArray.from(src);
  const threshold = BACKGROUND_REMOVAL_THRESHOLDS[strength];
  const totalPixels = width * height;

  // 1. Estimate the background colour. Prefer the literal border ring's
  // already-opaque pixels — identical to sampling the whole border when
  // the source is fully opaque (the overwhelmingly common case). When a
  // source already carries real transparency reaching the border (only
  // reached after `assessBackgroundTransparency()` found that transparency
  // insufficient to confirm a prepared background — see the module
  // docblock), fall back to the "shoreline": opaque pixels immediately
  // adjacent to that existing transparent region, since the literal
  // border itself carries no useful colour evidence at that point.
  const borderColors: RgbColor[] = [];

  for (let x = 0; x < width; x += 1) {
    if (alphaAt(src, width, x, 0) === OPAQUE_ALPHA) {
      borderColors.push(pixelAt(src, width, x, 0));
    }

    if (alphaAt(src, width, x, height - 1) === OPAQUE_ALPHA) {
      borderColors.push(pixelAt(src, width, x, height - 1));
    }
  }

  for (let y = 0; y < height; y += 1) {
    if (alphaAt(src, width, 0, y) === OPAQUE_ALPHA) {
      borderColors.push(pixelAt(src, width, 0, y));
    }

    if (alphaAt(src, width, width - 1, y) === OPAQUE_ALPHA) {
      borderColors.push(pixelAt(src, width, width - 1, y));
    }
  }

  if (borderColors.length === 0) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (alphaAt(src, width, x, y) !== OPAQUE_ALPHA) {
          continue;
        }

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

          if (alphaAt(src, width, nx, ny) !== OPAQUE_ALPHA) {
            borderColors.push(pixelAt(src, width, x, y));
            break;
          }
        }
      }
    }
  }

  if (borderColors.length === 0) {
    // Degenerate fallback (e.g. a fully non-opaque raster with no opaque
    // shoreline at all) — sample the literal border regardless of alpha,
    // matching the original unconditional behaviour, since no better
    // colour evidence exists.
    for (let x = 0; x < width; x += 1) {
      borderColors.push(pixelAt(src, width, x, 0));
      borderColors.push(pixelAt(src, width, x, height - 1));
    }

    for (let y = 0; y < height; y += 1) {
      borderColors.push(pixelAt(src, width, 0, y));
      borderColors.push(pixelAt(src, width, width - 1, y));
    }
  }

  const backgroundColor = medianColor(borderColors);
  const backgroundColorVariance =
    borderColors.reduce((sum, color) => sum + colorDistance(color, backgroundColor), 0) / borderColors.length;

  // 2. Iterative BFS flood fill, seeded from background-like border pixels
  // only. A pixel already non-opaque is automatically background-like —
  // it is already transparent, no colour check is needed or appropriate —
  // which lets the flood correctly continue through (and past) existing
  // transparency into an adjoining unremoved opaque background.
  const queue = new Int32Array(totalPixels);
  const foregroundInteriorBackground = findForegroundInteriorBackground(
    { data: src, width, height },
    backgroundColor,
    threshold,
    queue,
  );
  const flooded = new Uint8Array(totalPixels); // 1 = part of the removed background region
  let queueEnd = 0;
  let ambiguousBorderSeeds = 0;
  let totalBorderSeeds = 0;

  const isBackgroundLike = (x: number, y: number): boolean => {
    if (alphaAt(src, width, x, y) !== OPAQUE_ALPHA) {
      return true;
    }

    return colorDistance(pixelAt(src, width, x, y), backgroundColor) <= threshold;
  };

  const trySeed = (x: number, y: number): void => {
    totalBorderSeeds += 1;
    const index = y * width + x;

    if (flooded[index] === 1) {
      return;
    }

    if (!isBackgroundLike(x, y)) {
      ambiguousBorderSeeds += 1;
      return;
    }

    flooded[index] = 1;
    queue[queueEnd] = index;
    queueEnd += 1;
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

      if (flooded[nIndex] === 1) {
        continue;
      }

      if (isBackgroundLike(nx, ny)) {
        flooded[nIndex] = 1;
        queue[queueEnd] = nIndex;
        queueEnd += 1;
      }
    }
  }

  const preprotectedBackground = restoreAmbiguousForegroundBranches(
    { data: src, width, height },
    flooded,
    foregroundInteriorBackground,
    backgroundColor,
    threshold,
    queue,
  );

  // 3. Targeted second pass: the boundary flood intentionally cannot reach
  // counters and other inner holes. Identify only compact, material,
  // near-exact background-colour components and add those to the same
  // removal mask. Uncertain light foreground remains intact and is reported
  // separately so the worker cannot return a false VERIFIED state.
  const enclosed = analyzeEnclosedBackground(
    { data: src, width, height },
    flooded,
    backgroundColor,
    threshold,
    queue,
    preprotectedBackground,
  );

  for (let index = 0; index < totalPixels; index += 1) {
    if (enclosed.componentMask[index] === 1) {
      flooded[index] = 1;
    }
  }

  // 4/5. Apply full transparency to the exterior + accepted enclosed
  // regions; apply a soft,
  // decontaminated edge to pixels near it. "Near" is a small pixel radius
  // (not just direct 4-connected neighbours) so a genuinely multi-pixel
  // anti-aliased transition gets more than a single soft sample — a real
  // product-quality requirement (directive §14), not only a 1px cosmetic
  // detail.
  let removedPixels = 0;
  let remainingOpaquePixels = 0;
  const edgeRadius = 3;

  const isNearFloodedRegion = (x: number, y: number): boolean => {
    for (let dy = -edgeRadius; dy <= edgeRadius; dy += 1) {
      const ny = y + dy;

      if (ny < 0 || ny >= height) {
        continue;
      }

      for (let dx = -edgeRadius; dx <= edgeRadius; dx += 1) {
        const nx = x + dx;

        if (nx < 0 || nx >= width) {
          continue;
        }

        if (flooded[ny * width + nx] === 1) {
          return true;
        }
      }
    }

    return false;
  };

  const isNearAmbiguousRegion = (x: number, y: number): boolean => {
    for (let dy = -edgeRadius; dy <= edgeRadius; dy += 1) {
      const ny = y + dy;

      if (ny < 0 || ny >= height) {
        continue;
      }

      for (let dx = -edgeRadius; dx <= edgeRadius; dx += 1) {
        const nx = x + dx;

        if (nx < 0 || nx >= width) {
          continue;
        }

        if (enclosed.componentMask[ny * width + nx] === 2) {
          return true;
        }
      }
    }

    return false;
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;

      if (flooded[index] === 1) {
        out[offset + 3] = 0;
        removedPixels += 1;
        continue;
      }

      // A material component that resembles the inferred background but
      // lacks counter-like confidence may be intentional light artwork.
      // Preserve both its opaque core and its anti-aliased perimeter. The
      // worker will surface Needs Review rather than trading foreground
      // loss for an unjustified clean-looking result.
      if (isNearAmbiguousRegion(x, y)) {
        if (out[offset + 3] === OPAQUE_ALPHA) {
          remainingOpaquePixels += 1;
        }

        continue;
      }

      if (!isNearFloodedRegion(x, y)) {
        remainingOpaquePixels += 1;
        continue;
      }

      const color = pixelAt(src, width, x, y);
      const edge = resolveBackgroundEdgePixel(color, backgroundColor, threshold);
      const alpha = edge.alpha;

      if (alpha >= 255) {
        remainingOpaquePixels += 1;
        continue;
      }

      removedPixels += 1;
      out[offset] = edge.r;
      out[offset + 1] = edge.g;
      out[offset + 2] = edge.b;
      out[offset + 3] = alpha;
    }
  }

  return {
    data: out,
    width,
    height,
    backgroundColor,
    backgroundColorVariance,
    borderAmbiguousRatio: totalBorderSeeds === 0 ? 0 : ambiguousBorderSeeds / totalBorderSeeds,
    removedRatio: totalPixels === 0 ? 0 : removedPixels / totalPixels,
    remainingOpaqueRatio: totalPixels === 0 ? 0 : remainingOpaquePixels / totalPixels,
    enclosedBackgroundRemovedComponents: enclosed.removedComponentCount,
    enclosedBackgroundRemovedRatio: totalPixels === 0 ? 0 : enclosed.removedPixelCount / totalPixels,
    ambiguousEnclosedBackgroundComponents: enclosed.ambiguousComponentCount,
    ambiguousEnclosedBackgroundRatio: totalPixels === 0 ? 0 : enclosed.ambiguousPixelCount / totalPixels,
    enclosedRegionMask: enclosed.componentMask,
  };
}
