import { describe, expect, it } from 'vitest';

import type { RgbaRaster } from '../../src/transforms/alpha-inspection';
import {
  calculateAlphaTrimPlan,
  calculateSafeAlphaPadding,
  detectVisibleAlphaBounds,
  hasMeaningfulVisibleContent,
  MAX_SAFE_PADDING_PX,
  mergeAlphaBounds,
  MIN_MEANINGFUL_ALPHA,
  MIN_SAFE_PADDING_PX,
} from '../../src/transforms/alpha-bounds';

interface AlphaRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  alpha?: number;
}

function transparentRaster(width: number, height: number, rects: AlphaRect[] = []): RgbaRaster {
  const data = new Uint8ClampedArray(width * height * 4);

  for (const rect of rects) {
    for (let y = rect.top; y <= rect.bottom; y += 1) {
      for (let x = rect.left; x <= rect.right; x += 1) {
        const offset = (y * width + x) * 4;
        data[offset] = 25;
        data[offset + 1] = 80;
        data[offset + 2] = 180;
        data[offset + 3] = rect.alpha ?? 255;
      }
    }
  }

  return { data, width, height };
}

function setAlpha(raster: RgbaRaster, x: number, y: number, alpha: number): void {
  raster.data[(y * raster.width + x) * 4 + 3] = alpha;
}

describe('transparent outer-canvas bounds', () => {
  it('trims a small centered horizontal logo on a 1080x1080 canvas without rescaling its foreground', () => {
    const raster = transparentRaster(1080, 1080, [{ left: 160, top: 390, right: 919, bottom: 689 }]);
    const bounds = detectVisibleAlphaBounds(raster);

    expect(bounds).toMatchObject({ left: 160, top: 390, right: 919, bottom: 689, width: 760, height: 300 });
    const plan = calculateAlphaTrimPlan(1080, 1080, bounds!);
    expect(plan).toMatchObject({ padding: 9, outputWidth: 778, outputHeight: 318, trimmed: true });
    expect(plan.bounds.width).toBe(760);
    expect(plan.bounds.height).toBe(300);
  });

  it('uses governed padding for a large logo while still removing excess canvas', () => {
    const bounds = detectVisibleAlphaBounds(transparentRaster(1080, 1080, [{ left: 80, top: 120, right: 999, bottom: 959 }]))!;
    expect(calculateAlphaTrimPlan(1080, 1080, bounds)).toMatchObject({ padding: 24, outputWidth: 968, outputHeight: 888, trimmed: true });
  });

  it('trims an already-transparent oversized canvas', () => {
    const bounds = detectVisibleAlphaBounds(transparentRaster(2000, 2000, [{ left: 400, top: 800, right: 1599, bottom: 1199 }]))!;
    expect(calculateAlphaTrimPlan(2000, 2000, bounds)).toMatchObject({ padding: 12, outputWidth: 1224, outputHeight: 424, trimmed: true });
  });

  it('preserves the aspect geometry of a horizontal wordmark', () => {
    const bounds = detectVisibleAlphaBounds(transparentRaster(900, 300, [{ left: 100, top: 100, right: 799, bottom: 199 }]))!;
    expect(bounds).toMatchObject({ width: 700, height: 100 });
    expect(calculateAlphaTrimPlan(900, 300, bounds)).toMatchObject({ outputWidth: 706, outputHeight: 106 });
  });

  it('preserves the aspect geometry of a stacked logo', () => {
    const bounds = detectVisibleAlphaBounds(transparentRaster(600, 900, [{ left: 150, top: 100, right: 449, bottom: 799 }]))!;
    expect(bounds).toMatchObject({ width: 300, height: 700 });
    expect(calculateAlphaTrimPlan(600, 900, bounds)).toMatchObject({ outputWidth: 318, outputHeight: 718 });
  });

  it('preserves a square logo without forcing a non-square trim', () => {
    const bounds = detectVisibleAlphaBounds(transparentRaster(800, 800, [{ left: 200, top: 200, right: 599, bottom: 599 }]))!;
    expect(calculateAlphaTrimPlan(800, 800, bounds)).toMatchObject({ outputWidth: 424, outputHeight: 424 });
  });

  it('keeps disconnected multi-pixel logo elements in the outer bounds', () => {
    const raster = transparentRaster(500, 200, [
      { left: 50, top: 80, right: 349, bottom: 119 },
      { left: 420, top: 40, right: 423, bottom: 43 },
    ]);
    expect(detectVisibleAlphaBounds(raster)).toMatchObject({ left: 50, top: 40, right: 423, bottom: 119 });
  });

  it('keeps a one-pixel anti-aliased text stroke when its pixels form a real stroke', () => {
    const raster = transparentRaster(100, 60);
    for (let y = 10; y <= 49; y += 1) {
      setAlpha(raster, 30, y, y === 10 || y === 49 ? MIN_MEANINGFUL_ALPHA : 128);
    }
    expect(detectVisibleAlphaBounds(raster)).toMatchObject({ left: 30, top: 10, right: 30, bottom: 49, width: 1, height: 40 });
  });

  it('retains a soft partial-alpha perimeter down to alpha 1', () => {
    const raster = transparentRaster(80, 80, [{ left: 20, top: 20, right: 59, bottom: 59 }]);
    for (let x = 19; x <= 60; x += 1) {
      setAlpha(raster, x, 19, 1);
      setAlpha(raster, x, 60, 1);
    }
    for (let y = 19; y <= 60; y += 1) {
      setAlpha(raster, 19, y, 1);
      setAlpha(raster, 60, y, 1);
    }
    expect(detectVisibleAlphaBounds(raster)).toMatchObject({ left: 19, top: 19, right: 60, bottom: 60 });
  });

  it('ignores one isolated residual pixel without deleting a nearby real disconnected mark', () => {
    const raster = transparentRaster(600, 300, [
      { left: 100, top: 100, right: 499, bottom: 199 },
      { left: 540, top: 60, right: 542, bottom: 62 },
    ]);
    setAlpha(raster, 5, 5, 8);
    expect(detectVisibleAlphaBounds(raster)).toMatchObject({ left: 100, top: 60, right: 542, bottom: 199 });
  });

  it('preserves an isolated opaque pixel that may be intentional punctuation', () => {
    const raster = transparentRaster(80, 40, [{ left: 10, top: 15, right: 60, bottom: 30 }]);
    setAlpha(raster, 64, 10, 255);
    expect(detectVisibleAlphaBounds(raster)).toMatchObject({ left: 10, top: 10, right: 64, bottom: 30 });
  });

  it('keeps a low-resolution but meaningful logo and applies the minimum padding', () => {
    const bounds = detectVisibleAlphaBounds(transparentRaster(20, 20, [{ left: 6, top: 8, right: 13, bottom: 11 }]))!;
    expect(hasMeaningfulVisibleContent(bounds)).toBe(true);
    expect(calculateSafeAlphaPadding(bounds)).toBe(MIN_SAFE_PADDING_PX);
  });

  it('keeps high-resolution source-detail dimensions and caps only the padding', () => {
    const bounds = detectVisibleAlphaBounds(transparentRaster(2400, 1600, [{ left: 200, top: 400, right: 2199, bottom: 1199 }]))!;
    const plan = calculateAlphaTrimPlan(2400, 1600, bounds);
    expect(plan.bounds).toMatchObject({ width: 2000, height: 800 });
    expect(plan.padding).toBe(MAX_SAFE_PADDING_PX);
    expect(plan.outputWidth).toBe(2048);
    expect(plan.outputHeight).toBe(848);
  });

  it('rejects a destructive result that leaves only isolated pixels', () => {
    const raster = transparentRaster(200, 200);
    setAlpha(raster, 20, 20, 255);
    setAlpha(raster, 180, 180, 255);
    const bounds = detectVisibleAlphaBounds(raster)!;
    expect(bounds.alphaMass).toBe(2);
    expect(hasMeaningfulVisibleContent(bounds)).toBe(false);
  });

  it('rejects a near-empty connected remnant rather than producing a tiny ready file', () => {
    const bounds = detectVisibleAlphaBounds(transparentRaster(200, 200, [{ left: 99, top: 99, right: 100, bottom: 100 }]))!;
    expect(bounds.alphaMass).toBe(4);
    expect(hasMeaningfulVisibleContent(bounds)).toBe(false);
  });

  it('combines bounded strip scans without losing neighbours across strip boundaries', () => {
    const raster = transparentRaster(20, 20, [{ left: 4, top: 8, right: 15, bottom: 12 }]);
    const firstRaster = { data: raster.data.slice(0, 11 * 20 * 4), width: 20, height: 11 };
    const secondRaster = { data: raster.data.slice(9 * 20 * 4), width: 20, height: 11 };
    const first = detectVisibleAlphaBounds(firstRaster, { scanBottom: 10 });
    const second = detectVisibleAlphaBounds(secondRaster, { scanTop: 1, originY: 9 });

    expect(mergeAlphaBounds(first, second)).toMatchObject({ left: 4, top: 8, right: 15, bottom: 12, width: 12, height: 5 });
  });
});
