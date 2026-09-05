import { describe, expect, it } from 'vitest';

import {
  assessBackgroundTransparency,
  computeBoundaryConnectedTransparency,
  MAX_RESIDUAL_FOREGROUND_RATIO_FOR_CONFIRMATION,
  MIN_BOUNDARY_TRANSPARENT_RATIO,
} from '../../src/transforms/background-transparency';
import {
  createOpaqueRaster,
  createOpaqueRasterWithSingleTransparentPixel,
  createOpaqueRasterWithTinyTransparentCorner,
  createSemiTransparentRaster,
  createTransparentPaddingAroundOpaqueBackground,
  createTransparentRaster,
} from './fixtures/raster-fixtures';

describe('assessBackgroundTransparency', () => {
  it('reports "opaque" for a fully opaque source, deferring to inspectAlpha', () => {
    const raster = createOpaqueRaster(40, 40, [255, 255, 255]);
    const assessment = assessBackgroundTransparency(raster);

    expect(assessment.status).toBe('opaque');
  });

  it('the critical regression case: transparent padding around an opaque background is NOT confirmed (directive §4)', () => {
    // Transparent outer canvas → opaque white rectangle → coloured
    // artwork inside the rectangle. `inspectAlpha()` alone would report
    // real transparency here — that must not be enough to bypass removal.
    const raster = createTransparentPaddingAroundOpaqueBackground(
      400,
      400,
      [255, 255, 255],
      [200, 30, 60],
    );
    const assessment = assessBackgroundTransparency(raster);

    expect(assessment.status).toBe('alpha-present-background-not-confirmed');
    expect(assessment.reason).toBe('unremoved-background-region-detected');
    // Real evidence, not merely a status flag.
    expect(assessment.boundaryConnectedTransparentRatio).toBeGreaterThan(MIN_BOUNDARY_TRANSPARENT_RATIO);
    expect(assessment.residualForegroundRatio).toBeGreaterThan(MAX_RESIDUAL_FOREGROUND_RATIO_FOR_CONFIRMATION);
  });

  it('the regression case is caught across several rectangle/artwork proportions', () => {
    const proportions: Array<[number, number]> = [
      [0.9, 0.3],
      [0.7, 0.2],
      [0.5, 0.2],
      [0.6, 0.5],
    ];

    for (const [rectFraction, artworkFraction] of proportions) {
      const raster = createTransparentPaddingAroundOpaqueBackground(
        400,
        400,
        [255, 255, 255],
        [200, 30, 60],
        rectFraction,
        artworkFraction,
      );
      const assessment = assessBackgroundTransparency(raster);

      expect(assessment.status).toBe('alpha-present-background-not-confirmed');
    }
  });

  it('incidental alpha: a single stray transparent pixel is NOT confirmed (directive §5)', () => {
    const raster = createOpaqueRasterWithSingleTransparentPixel(40, 40);
    const assessment = assessBackgroundTransparency(raster);

    expect(assessment.status).toBe('alpha-present-background-not-confirmed');
    expect(assessment.reason).toBe('insufficient-boundary-transparency');
    // A truly isolated interior pixel never even reaches the border-connectivity flood.
    expect(assessment.boundaryConnectedTransparentRatio).toBe(0);
  });

  it('incidental alpha: a tiny transparent corner is NOT confirmed (directive §5)', () => {
    const raster = createOpaqueRasterWithTinyTransparentCorner(40, 40);
    const assessment = assessBackgroundTransparency(raster);

    expect(assessment.status).toBe('alpha-present-background-not-confirmed');
    expect(assessment.reason).toBe('insufficient-boundary-transparency');
    expect(assessment.boundaryConnectedTransparentRatio).toBeLessThan(MIN_BOUNDARY_TRANSPARENT_RATIO);
  });

  it('a genuine transparent-logo source (foreground + transparent exterior) is confirmed (directive §6)', () => {
    const raster = createTransparentRaster(40, 40);
    const assessment = assessBackgroundTransparency(raster);

    expect(assessment.status).toBe('background-transparency-confirmed');
    expect(assessment.reason).toBeUndefined();
    expect(assessment.residualForegroundRatio).toBeLessThanOrEqual(MAX_RESIDUAL_FOREGROUND_RATIO_FOR_CONFIRMATION);
  });

  it('a uniformly semi-transparent source is confirmed (nothing remains to evaluate for a residual background)', () => {
    const raster = createSemiTransparentRaster(40, 40);
    const assessment = assessBackgroundTransparency(raster);

    expect(assessment.status).toBe('background-transparency-confirmed');
  });
});

describe('computeBoundaryConnectedTransparency', () => {
  it('returns 0 for a fully opaque raster', () => {
    const raster = createOpaqueRaster(20, 20, [10, 10, 10]);
    expect(computeBoundaryConnectedTransparency(raster).ratio).toBe(0);
  });

  it('returns 1 for a fully transparent raster', () => {
    const raster = { data: new Uint8ClampedArray(20 * 20 * 4), width: 20, height: 20 };
    expect(computeBoundaryConnectedTransparency(raster).ratio).toBe(1);
  });

  it('does not count an interior transparent region disconnected from the border', () => {
    // A fully opaque raster with a hole in the middle that never touches the edge.
    const raster = createOpaqueRaster(40, 40, [10, 10, 10]);
    for (let y = 15; y < 25; y += 1) {
      for (let x = 15; x < 25; x += 1) {
        raster.data[(y * 40 + x) * 4 + 3] = 0;
      }
    }
    expect(computeBoundaryConnectedTransparency(raster).ratio).toBe(0);
  });
});
