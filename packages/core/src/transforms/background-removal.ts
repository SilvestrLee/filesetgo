/**
 * Generic, product-agnostic connected-background removal (FSG-005C
 * directive §13/§14). No concept of "logo," "Website Logo Pack," or any
 * other product terminology belongs here.
 *
 * Approach (boundary-informed, connected-background removal):
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
 * 3. Every flood-reached pixel becomes fully transparent.
 * 4. Pixels adjacent to the flood region get a *soft* alpha ramp based on
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
}

const OPAQUE_ALPHA = 255;

function pixelAt(data: Uint8ClampedArray, width: number, x: number, y: number): RgbColor {
  const offset = (y * width + x) * 4;
  return { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
}

function alphaAt(data: Uint8ClampedArray, width: number, x: number, y: number): number {
  return data[(y * width + x) * 4 + 3];
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

function clamp255(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
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
  const flooded = new Uint8Array(totalPixels); // 1 = part of the removed background region
  const queue = new Int32Array(totalPixels);
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

  // 3/4. Apply full transparency to the flooded region; apply a soft,
  // decontaminated edge to pixels near it. "Near" is a small pixel radius
  // (not just direct 4-connected neighbours) so a genuinely multi-pixel
  // anti-aliased transition gets more than a single soft sample — a real
  // product-quality requirement (directive §14), not only a 1px cosmetic
  // detail.
  let removedPixels = 0;
  let remainingOpaquePixels = 0;
  const softRange = threshold * 2; // width of the soft ramp, in the same colour-distance units as `threshold`
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

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;

      if (flooded[index] === 1) {
        out[offset + 3] = 0;
        removedPixels += 1;
        continue;
      }

      if (!isNearFloodedRegion(x, y)) {
        remainingOpaquePixels += 1;
        continue;
      }

      const color = pixelAt(src, width, x, y);
      const distance = colorDistance(color, backgroundColor);
      const rampPosition = Math.min(1, Math.max(0, (distance - threshold) / softRange));
      const alpha = clamp255(rampPosition * 255);

      if (alpha >= 255) {
        remainingOpaquePixels += 1;
        continue;
      }

      removedPixels += 1;
      const alphaFraction = alpha / 255;

      if (alphaFraction > 0.05) {
        // Decontaminate: the observed colour is assumed to already be a
        // blend of the true foreground colour and the background colour
        // (`observed = alpha*fg + (1-alpha)*bg`) — recover `fg` rather
        // than leaving the background's colour bleeding into a
        // semi-transparent edge pixel (the classic anti-aliasing halo).
        out[offset] = clamp255((color.r - (1 - alphaFraction) * backgroundColor.r) / alphaFraction);
        out[offset + 1] = clamp255((color.g - (1 - alphaFraction) * backgroundColor.g) / alphaFraction);
        out[offset + 2] = clamp255((color.b - (1 - alphaFraction) * backgroundColor.b) / alphaFraction);
      }

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
  };
}
