import { describe, expect, it } from 'vitest';

import {
  assessFaviconSourceSuitability,
  constrainFreeformCrop,
  createInitialFreeformCrop,
  faviconSourceCanProduceLargestIcon,
} from '../favicon-source';

describe('favicon source suitability', () => {
  it('accepts a compact square logo without unnecessary source-selection friction', () => {
    const result = assessFaviconSourceSuitability({ width: 512, height: 512 });

    expect(result.suitable).toBe(true);
    expect(result.projectedWidth).toBeGreaterThanOrEqual(28);
    expect(result.projectedHeight).toBeGreaterThanOrEqual(28);
  });

  it('flags a wide wordmark when its projected artwork height is too small at 32px', () => {
    const result = assessFaviconSourceSuitability({ width: 1600, height: 240 });

    expect(result.suitable).toBe(false);
    expect(result.projectedHeight).toBeLessThan(12);
  });

  it('evaluates actual projected geometry rather than assigning a semantic icon', () => {
    const result = assessFaviconSourceSuitability({ width: 600, height: 300 });

    expect(result.suitable).toBe(true);
    expect(result.aspectRatio).toBe(2);
  });
});

describe('freeform favicon source selection', () => {
  it('starts with a neutral centered region without forcing a square', () => {
    expect(createInitialFreeformCrop({ width: 1600, height: 400 })).toEqual({
      x: 480,
      y: 0,
      width: 640,
      height: 400,
    });
  });

  it('keeps independently resized rectangular selections inside the prepared logo', () => {
    expect(constrainFreeformCrop(
      { x: 1500, y: -20, width: 300, height: 180 },
      { width: 1600, height: 400 },
    )).toEqual({
      x: 1300,
      y: 0,
      width: 300,
      height: 180,
    });
  });

  it('enforces bounded minimum dimensions for usable keyboard and touch adjustment', () => {
    expect(constrainFreeformCrop(
      { x: 0, y: 0, width: 1, height: 1 },
      { width: 400, height: 200 },
    )).toEqual({ x: 0, y: 0, width: 20, height: 16 });
  });

  it('accepts only sources within the governed largest-icon upscale bound', () => {
    expect(faviconSourceCanProduceLargestIcon({ width: 128, height: 128 })).toBe(true);
    expect(faviconSourceCanProduceLargestIcon({ width: 64, height: 64 })).toBe(false);
  });
});
