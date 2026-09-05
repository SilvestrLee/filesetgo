import { describe, expect, it } from 'vitest';

import { inspectAlpha } from '../../src/transforms/alpha-inspection';
import {
  createOpaqueRaster,
  createSemiTransparentRaster,
  createTransparentRaster,
} from './fixtures/raster-fixtures';

describe('inspectAlpha', () => {
  it('classifies a fully opaque raster as opaque', () => {
    const result = inspectAlpha(createOpaqueRaster(8, 8, [255, 255, 255]));

    expect(result.classification).toBe('opaque');
    expect(result.fullyTransparentPixels).toBe(0);
    expect(result.semiTransparentPixels).toBe(0);
    expect(result.minAlpha).toBe(255);
    expect(result.maxAlpha).toBe(255);
    expect(result.transparentRatio).toBe(0);
    expect(result.sampledPixels).toBe(64);
  });

  it('classifies a raster with real fully-transparent pixels as transparency-present', () => {
    const raster = createTransparentRaster(8, 8);
    const result = inspectAlpha(raster);

    expect(result.classification).toBe('transparency-present');
    expect(result.fullyTransparentPixels).toBeGreaterThan(0);
    expect(result.minAlpha).toBe(0);
    expect(result.maxAlpha).toBe(255);
    expect(result.transparentRatio).toBeGreaterThan(0);
    expect(result.transparentRatio).toBeLessThan(1);
  });

  it('classifies a raster with only semi-transparent pixels as transparency-present', () => {
    const result = inspectAlpha(createSemiTransparentRaster(4, 4));

    expect(result.classification).toBe('transparency-present');
    expect(result.semiTransparentPixels).toBe(16);
    expect(result.fullyTransparentPixels).toBe(0);
    expect(result.minAlpha).toBe(128);
    expect(result.maxAlpha).toBe(128);
    expect(result.transparentRatio).toBe(1);
  });

  it('does not assume transparency from an all-255-alpha raster regardless of RGB content', () => {
    // A capability to hold alpha (e.g. a PNG/WebP raster) is not the same as
    // actually containing transparency — directive §9's central requirement.
    const opaqueButColorful = createOpaqueRaster(4, 4, [10, 200, 30]);
    expect(inspectAlpha(opaqueButColorful).classification).toBe('opaque');
  });
});
