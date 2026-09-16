import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ASPECT_RATIO_TOLERANCE,
  isCropRatioValid,
  isCropRequired,
  isCropWithinBounds,
  largestCenteredCropForRatio,
} from '../../src/transforms/crop';

describe('isCropRequired', () => {
  it('is false when the source already matches the requested exact ratio', () => {
    expect(isCropRequired(1536, 1024, 1536, 1024)).toBe(false);
    expect(isCropRequired(1600, 900, 800, 450)).toBe(false);
  });

  it('is true when the source aspect ratio clearly differs from the requested ratio', () => {
    expect(isCropRequired(2560, 2103, 800, 800)).toBe(true);
  });

  it('absorbs integer-rounding noise at exactly the tolerance boundary', () => {
    // ratio 1.005 -> relative difference from 1 is exactly the tolerance;
    // "> tolerance" must be strict, so this is NOT required.
    expect(isCropRequired(1005, 1000, 1000, 1000, DEFAULT_ASPECT_RATIO_TOLERANCE)).toBe(false);
    // one pixel further crosses the boundary.
    expect(isCropRequired(1006, 1000, 1000, 1000, DEFAULT_ASPECT_RATIO_TOLERANCE)).toBe(true);
  });

  it('accepts a custom tolerance', () => {
    expect(isCropRequired(1100, 1000, 1000, 1000, 0.2)).toBe(false);
    expect(isCropRequired(1100, 1000, 1000, 1000, 0.05)).toBe(true);
  });
});

describe('isCropWithinBounds', () => {
  it('accepts a crop fully inside the source', () => {
    expect(isCropWithinBounds({ x: 0, y: 0, width: 100, height: 100 }, 200, 200)).toBe(true);
    expect(isCropWithinBounds({ x: 50, y: 50, width: 150, height: 150 }, 200, 200)).toBe(true);
  });

  it('rejects a crop extending past the source bounds', () => {
    expect(isCropWithinBounds({ x: 150, y: 0, width: 100, height: 100 }, 200, 200)).toBe(false);
    expect(isCropWithinBounds({ x: 0, y: 150, width: 100, height: 100 }, 200, 200)).toBe(false);
  });

  it('rejects negative or non-positive geometry', () => {
    expect(isCropWithinBounds({ x: -1, y: 0, width: 10, height: 10 }, 200, 200)).toBe(false);
    expect(isCropWithinBounds({ x: 0, y: 0, width: 0, height: 10 }, 200, 200)).toBe(false);
    expect(isCropWithinBounds({ x: 0, y: 0, width: 10, height: 0 }, 200, 200)).toBe(false);
  });
});

describe('isCropRatioValid', () => {
  it('accepts a crop whose ratio matches the target regardless of absolute size', () => {
    expect(isCropRatioValid({ width: 800, height: 800 }, 800, 800)).toBe(true);
    expect(isCropRatioValid({ width: 1024, height: 1024 }, 800, 800)).toBe(true);
  });

  it('rejects a crop whose ratio does not match the target', () => {
    expect(isCropRatioValid({ width: 1000, height: 500 }, 800, 800)).toBe(false);
  });
});

describe('largestCenteredCropForRatio', () => {
  it('is height-limited and centered horizontally when the source is relatively wider than the target', () => {
    expect(largestCenteredCropForRatio(1536, 1024, 800, 800)).toEqual({
      x: 256,
      y: 0,
      width: 1024,
      height: 1024,
    });
  });

  it('is width-limited and centered vertically when the source is relatively taller than the target', () => {
    expect(largestCenteredCropForRatio(1000, 2000, 1200, 630)).toEqual({
      x: 0,
      y: 737,
      width: 1000,
      height: 525,
    });
  });

  it('returns the full source, uncropped, when the ratio already matches', () => {
    expect(largestCenteredCropForRatio(800, 600, 4, 3)).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
  });

  it('never returns a crop whose own ratio would itself require further cropping', () => {
    const crop = largestCenteredCropForRatio(2560, 2103, 800, 800);

    expect(isCropRatioValid(crop, 800, 800)).toBe(true);
    expect(isCropWithinBounds(crop, 2560, 2103)).toBe(true);
  });
});
