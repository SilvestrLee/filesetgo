import { describe, expect, it } from 'vitest';

import type { RgbaRaster } from '../../src/transforms/alpha-inspection';
import { applyAnalysisMaskAtSourceResolution } from '../../src/transforms/source-resolution-alpha';

function raster(width: number, height: number, pixel: [number, number, number, number]): RgbaRaster {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let offset = 0; offset < data.length; offset += 4) {
    data.set(pixel, offset);
  }

  return { data, width, height };
}

function setPixel(target: RgbaRaster, x: number, y: number, pixel: [number, number, number, number]): void {
  target.data.set(pixel, (y * target.width + x) * 4);
}

function alphaAt(target: Uint8ClampedArray, width: number, x: number, y: number): number {
  return target[(y * width + x) * 4 + 3];
}

describe('source-resolution alpha application', () => {
  it('uses the bounded mask for classification while retaining source-resolution RGB detail', () => {
    const source = raster(8, 4, [255, 255, 255, 255]);
    const mask = raster(4, 2, [255, 255, 255, 0]);

    for (let y = 0; y < 4; y += 1) {
      for (let x = 2; x < 6; x += 1) {
        setPixel(source, x, y, [10 + x, 20 + y, 80 + x + y, 255]);
      }
    }

    for (let y = 0; y < 2; y += 1) {
      for (let x = 1; x < 3; x += 1) {
        setPixel(mask, x, y, [20, 20, 80, 255]);
      }
    }

    const output = applyAnalysisMaskAtSourceResolution(source, mask, {
      targetWidth: 8,
      targetHeight: 4,
      targetOffsetY: 0,
      strength: 'balanced',
      backgroundColor: { r: 255, g: 255, b: 255 },
    });

    expect(output[(2 * 8 + 3) * 4]).toBe(13);
    expect(output[(2 * 8 + 3) * 4 + 1]).toBe(22);
    expect(output[(2 * 8 + 3) * 4 + 2]).toBe(85);
    expect(output[(2 * 8 + 3) * 4 + 3]).toBe(255);
    expect(output[3]).toBe(0);
  });

  it('never increases existing source alpha', () => {
    const source = raster(4, 2, [20, 20, 80, 96]);
    const mask = raster(2, 1, [20, 20, 80, 255]);
    const output = applyAnalysisMaskAtSourceResolution(source, mask, {
      targetWidth: 4,
      targetHeight: 2,
      targetOffsetY: 0,
      strength: 'balanced',
      backgroundColor: { r: 255, g: 255, b: 255 },
    });

    for (let offset = 3; offset < output.length; offset += 4) {
      expect(output[offset]).toBe(96);
    }
  });

  it('maps independent strips with the same global coordinates as one full pass', () => {
    const source = raster(6, 6, [255, 255, 255, 255]);
    const mask = raster(3, 3, [255, 255, 255, 0]);
    setPixel(mask, 1, 1, [0, 0, 0, 255]);

    for (let y = 2; y < 4; y += 1) {
      for (let x = 2; x < 4; x += 1) {
        setPixel(source, x, y, [0, 0, 0, 255]);
      }
    }

    const full = applyAnalysisMaskAtSourceResolution(source, mask, {
      targetWidth: 6,
      targetHeight: 6,
      targetOffsetY: 0,
      strength: 'balanced',
      backgroundColor: { r: 255, g: 255, b: 255 },
    });
    const rows: Uint8ClampedArray[] = [];

    for (let offsetY = 0; offsetY < 6; offsetY += 2) {
      rows.push(applyAnalysisMaskAtSourceResolution({
        data: source.data.slice(offsetY * 6 * 4, (offsetY + 2) * 6 * 4),
        width: 6,
        height: 2,
      }, mask, {
        targetWidth: 6,
        targetHeight: 6,
        targetOffsetY: offsetY,
        strength: 'balanced',
        backgroundColor: { r: 255, g: 255, b: 255 },
      }));
    }

    expect(Uint8ClampedArray.from(rows.flatMap((row) => [...row]))).toEqual(full);
  });

  it('projects an enclosed analysis hole without replacing source-resolution foreground detail', () => {
    const source = raster(12, 12, [255, 255, 255, 255]);
    const mask = raster(6, 6, [255, 255, 255, 0]);

    for (let y = 2; y < 10; y += 1) {
      for (let x = 2; x < 10; x += 1) {
        const isStroke = x < 4 || x >= 8 || y < 4 || y >= 8;

        if (isStroke) {
          setPixel(source, x, y, [9 + x, 18 + y, 40 + x + y, 255]);
        }
      }
    }

    for (let y = 1; y < 5; y += 1) {
      for (let x = 1; x < 5; x += 1) {
        const isStroke = x === 1 || x === 4 || y === 1 || y === 4;
        setPixel(mask, x, y, isStroke ? [15, 23, 42, 255] : [255, 255, 255, 0]);
      }
    }

    const output = applyAnalysisMaskAtSourceResolution(source, mask, {
      targetWidth: 12,
      targetHeight: 12,
      targetOffsetY: 0,
      strength: 'balanced',
      backgroundColor: { r: 255, g: 255, b: 255 },
    });

    expect(alphaAt(output, 12, 6, 6)).toBe(0);
    expect(alphaAt(output, 12, 3, 6)).toBe(255);
    expect(output[(6 * 12 + 3) * 4]).toBe(12);
    expect(output[(6 * 12 + 3) * 4 + 1]).toBe(24);
    expect(output[(6 * 12 + 3) * 4 + 2]).toBe(49);
  });

  it('clears a source-background antialias rim just beyond an accepted enclosed analysis component', () => {
    const source = raster(12, 12, [255, 255, 255, 255]);
    const mask = raster(6, 6, [15, 23, 42, 255]) as RgbaRaster & { enclosedRegionMask: Uint8Array };
    mask.enclosedRegionMask = new Uint8Array(36);
    setPixel(mask, 2, 2, [255, 255, 255, 0]);
    mask.enclosedRegionMask[2 * 6 + 2] = 1;

    const output = applyAnalysisMaskAtSourceResolution(source, mask, {
      targetWidth: 12,
      targetHeight: 12,
      targetOffsetY: 0,
      strength: 'balanced',
      backgroundColor: { r: 255, g: 255, b: 255 },
    });

    // (7, 5) samples analysis columns 3/4 directly, but is still within one
    // analysis pixel of the accepted counter at (2, 2).
    expect(alphaAt(output, 12, 7, 5)).toBe(0);
  });

  it('does not expand accepted enclosed cleanup through a protected ambiguous region', () => {
    const source = raster(12, 12, [255, 255, 255, 255]);
    const mask = raster(6, 6, [15, 23, 42, 255]) as RgbaRaster & { enclosedRegionMask: Uint8Array };
    mask.enclosedRegionMask = new Uint8Array(36);
    setPixel(mask, 2, 2, [255, 255, 255, 0]);
    mask.enclosedRegionMask[2 * 6 + 2] = 1;
    mask.enclosedRegionMask[2 * 6 + 3] = 2;

    const output = applyAnalysisMaskAtSourceResolution(source, mask, {
      targetWidth: 12,
      targetHeight: 12,
      targetOffsetY: 0,
      strength: 'balanced',
      backgroundColor: { r: 255, g: 255, b: 255 },
    });

    expect(alphaAt(output, 12, 5, 5)).toBe(255);
  });

  it('confirms a downsampled compact counter against the exact source background colour', () => {
    const source = raster(12, 12, [255, 255, 255, 255]);
    const mask = raster(6, 6, [15, 23, 42, 255]) as RgbaRaster & { enclosedRegionMask: Uint8Array };
    mask.enclosedRegionMask = new Uint8Array(36);
    mask.enclosedRegionMask[2 * 6 + 2] = 3;

    const output = applyAnalysisMaskAtSourceResolution(source, mask, {
      targetWidth: 12,
      targetHeight: 12,
      targetOffsetY: 0,
      strength: 'strong',
      backgroundColor: { r: 255, g: 255, b: 255 },
    });

    expect(alphaAt(output, 12, 5, 5)).toBe(0);
  });

  it('does not erase similar-but-not-exact light artwork during source confirmation', () => {
    const source = raster(12, 12, [250, 250, 250, 255]);
    const mask = raster(6, 6, [15, 23, 42, 255]) as RgbaRaster & { enclosedRegionMask: Uint8Array };
    mask.enclosedRegionMask = new Uint8Array(36);
    mask.enclosedRegionMask[2 * 6 + 2] = 3;

    const output = applyAnalysisMaskAtSourceResolution(source, mask, {
      targetWidth: 12,
      targetHeight: 12,
      targetOffsetY: 0,
      strength: 'strong',
      backgroundColor: { r: 255, g: 255, b: 255 },
    });

    expect(alphaAt(output, 12, 5, 5)).toBe(255);
  });

  it('decontaminates a source-confirmed counter edge around an exact background core', () => {
    const source = raster(12, 12, [15, 23, 42, 255]);
    const mask = raster(6, 6, [15, 23, 42, 255]) as RgbaRaster & { enclosedRegionMask: Uint8Array };
    mask.enclosedRegionMask = new Uint8Array(36);
    mask.enclosedRegionMask[2 * 6 + 2] = 3;
    setPixel(source, 5, 5, [255, 255, 255, 255]);
    setPixel(source, 6, 5, [185, 190, 198, 255]);

    const output = applyAnalysisMaskAtSourceResolution(source, mask, {
      targetWidth: 12,
      targetHeight: 12,
      targetOffsetY: 0,
      strength: 'balanced',
      backgroundColor: { r: 255, g: 255, b: 255 },
    });

    expect(alphaAt(output, 12, 5, 5)).toBe(0);
    expect(alphaAt(output, 12, 6, 5)).toBeLessThan(255);
    expect(output[(5 * 12 + 6) * 4]).toBeLessThan(185);
  });
});
