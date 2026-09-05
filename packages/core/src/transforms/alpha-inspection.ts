/**
 * Generic, product-agnostic pixel-alpha inspection (FSG-005C directive
 * §9). No concept of "logo," "background," "transparent," or any other
 * product terminology belongs here — this module only answers "does this
 * decoded raster actually contain alpha transparency," from real decoded
 * pixels, never from format/extension/MIME/encoder-capability assumptions.
 */

export type AlphaClassification = 'opaque' | 'transparency-present';

export interface AlphaInspectionResult {
  /** Total pixels inspected (width * height of the raster that was inspected). */
  sampledPixels: number;
  /** Pixels with alpha === 0. */
  fullyTransparentPixels: number;
  /** Pixels with 0 < alpha < 255. */
  semiTransparentPixels: number;
  minAlpha: number;
  maxAlpha: number;
  /** (fullyTransparentPixels + semiTransparentPixels) / sampledPixels. 0 when sampledPixels is 0. */
  transparentRatio: number;
  classification: AlphaClassification;
}

/** A decoded RGBA raster — the same minimal shape `ImageData` and a worker's own RGBA buffers both satisfy. */
export interface RgbaRaster {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

/**
 * Inspects every pixel's actual alpha channel value. Deliberately a full
 * scan, not a sample: Logo Pack's bounded working raster (FSG-005C
 * directive §19) keeps this cheap, and a partial sample could miss a small
 * transparent region entirely — see ADR-020.
 */
export function inspectAlpha(raster: RgbaRaster): AlphaInspectionResult {
  const { data, width, height } = raster;
  const sampledPixels = width * height;
  let fullyTransparentPixels = 0;
  let semiTransparentPixels = 0;
  let minAlpha = 255;
  let maxAlpha = 0;

  for (let index = 3; index < data.length; index += 4) {
    const alpha = data[index];

    if (alpha < minAlpha) {
      minAlpha = alpha;
    }

    if (alpha > maxAlpha) {
      maxAlpha = alpha;
    }

    if (alpha === 0) {
      fullyTransparentPixels += 1;
    } else if (alpha < 255) {
      semiTransparentPixels += 1;
    }
  }

  const transparentPixels = fullyTransparentPixels + semiTransparentPixels;

  return {
    sampledPixels,
    fullyTransparentPixels,
    semiTransparentPixels,
    minAlpha: sampledPixels === 0 ? 255 : minAlpha,
    maxAlpha: sampledPixels === 0 ? 0 : maxAlpha,
    transparentRatio: sampledPixels === 0 ? 0 : transparentPixels / sampledPixels,
    classification: transparentPixels > 0 ? 'transparency-present' : 'opaque',
  };
}
