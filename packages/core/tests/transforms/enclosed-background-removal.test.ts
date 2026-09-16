import { describe, expect, it } from 'vitest';

import type { RgbaRaster } from '../../src/transforms/alpha-inspection';
import { removeConnectedBackground, type BackgroundRemovalStrength } from '../../src/transforms/background-removal';

type Rgb = [number, number, number];

function raster(width = 64, height = 64, background: Rgb = [255, 255, 255]): RgbaRaster {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    data[offset] = background[0];
    data[offset + 1] = background[1];
    data[offset + 2] = background[2];
    data[offset + 3] = 255;
  }

  return { data, width, height };
}

function setPixel(target: RgbaRaster, x: number, y: number, color: Rgb, alpha = 255): void {
  const offset = (y * target.width + x) * 4;
  target.data[offset] = color[0];
  target.data[offset + 1] = color[1];
  target.data[offset + 2] = color[2];
  target.data[offset + 3] = alpha;
}

function fillRect(target: RgbaRaster, left: number, top: number, right: number, bottom: number, color: Rgb, alpha = 255): void {
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      setPixel(target, x, y, color, alpha);
    }
  }
}

function frame(target: RgbaRaster, left: number, top: number, right: number, bottom: number, thickness: number, color: Rgb): void {
  fillRect(target, left, top, right, top + thickness, color);
  fillRect(target, left, bottom - thickness, right, bottom, color);
  fillRect(target, left, top + thickness, left + thickness, bottom - thickness, color);
  fillRect(target, right - thickness, top + thickness, right, bottom - thickness, color);
}

function drawThickLine(
  target: RgbaRaster,
  from: readonly [number, number],
  to: readonly [number, number],
  thickness: number,
  color: Rgb,
): void {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const radius = thickness / 2;

  for (let y = Math.floor(Math.min(y1, y2) - radius); y <= Math.ceil(Math.max(y1, y2) + radius); y += 1) {
    for (let x = Math.floor(Math.min(x1, x2) - radius); x <= Math.ceil(Math.max(x1, x2) + radius); x += 1) {
      const projection = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
      const projectedX = x1 + projection * dx;
      const projectedY = y1 + projection * dy;

      if (Math.hypot(x - projectedX, y - projectedY) <= radius) {
        setPixel(target, x, y, color);
      }
    }
  }
}

function alphaAt(target: Uint8ClampedArray, width: number, x: number, y: number): number {
  return target[(y * width + x) * 4 + 3];
}

function rgbAt(target: Uint8ClampedArray, width: number, x: number, y: number): Rgb {
  const offset = (y * width + x) * 4;
  return [target[offset], target[offset + 1], target[offset + 2]];
}

function counterFixture(letter: 'O' | 'P' | 'R' | 'A'): RgbaRaster {
  const target = raster();
  const ink: Rgb = [15, 23, 42];

  if (letter === 'O') {
    frame(target, 16, 12, 48, 52, 7, ink);
  } else if (letter === 'P' || letter === 'R') {
    fillRect(target, 16, 12, 23, 54, ink);
    frame(target, 19, 12, 48, 38, 7, ink);

    if (letter === 'R') {
      drawThickLine(target, [25, 34], [49, 54], 7, ink);
    }
  } else {
    fillRect(target, 12, 10, 52, 54, ink);

    for (let y = 23; y < 39; y += 1) {
      const halfWidth = Math.max(1, Math.floor((y - 20) / 2));
      fillRect(target, 32 - halfWidth, y, 33 + halfWidth, y + 1, [255, 255, 255]);
    }
  }

  return target;
}

describe('enclosed background removal', () => {
  for (const letter of ['O', 'P', 'R', 'A'] as const) {
    it(`clears a confident ${letter} counter on the inferred white background`, () => {
      const source = counterFixture(letter);
      const result = removeConnectedBackground(source, 'balanced');

      expect(result.enclosedBackgroundRemovedComponents).toBeGreaterThan(0);
      expect(alphaAt(result.data, source.width, 32, letter === 'A' ? 32 : 24)).toBe(0);
      expect(alphaAt(result.data, source.width, 18, 16)).toBe(255);
    });
  }

  for (const fixture of [
    { name: 'D', holes: [[32, 32]] },
    { name: 'B', holes: [[32, 21], [32, 43]] },
    { name: 'e', holes: [[32, 31]] },
    { name: '0', holes: [[32, 32]] },
    { name: '6', holes: [[32, 40]] },
    { name: '8', holes: [[32, 21], [32, 43]] },
    { name: '9', holes: [[32, 22]] },
  ] as const) {
    it(`clears the representative ${fixture.name} counter topology without character recognition`, () => {
      const source = raster();
      fillRect(source, 12, 8, 52, 56, [15, 23, 42]);

      for (const [x, y] of fixture.holes) {
        fillRect(source, x - 8, y - 6, x + 8, y + 6, [255, 255, 255]);
      }

      const result = removeConnectedBackground(source, 'balanced');

      expect(result.enclosedBackgroundRemovedComponents).toBe(fixture.holes.length);

      for (const [x, y] of fixture.holes) {
        expect(alphaAt(result.data, source.width, x, y)).toBe(0);
      }

      expect(alphaAt(result.data, source.width, 14, 12)).toBe(255);
    });
  }

  it('clears multiple counters in one wordmark', () => {
    const source = raster(120, 56);
    frame(source, 8, 8, 34, 48, 6, [15, 23, 42]);
    frame(source, 45, 8, 71, 48, 6, [15, 23, 42]);
    frame(source, 82, 8, 108, 48, 6, [15, 23, 42]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(result.enclosedBackgroundRemovedComponents).toBe(3);
    expect(alphaAt(result.data, 120, 21, 28)).toBe(0);
    expect(alphaAt(result.data, 120, 58, 28)).toBe(0);
    expect(alphaAt(result.data, 120, 95, 28)).toBe(0);
  });

  it('clears a donut/ring interior without touching its foreground', () => {
    const source = raster(72, 72);
    frame(source, 10, 10, 62, 62, 10, [37, 99, 235]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 72, 36, 36)).toBe(0);
    expect(alphaAt(result.data, 72, 15, 36)).toBe(255);
  });

  it('clears a nested enclosed background while preserving an inner foreground detail', () => {
    const source = raster(72, 72);
    frame(source, 8, 8, 64, 64, 8, [37, 99, 235]);
    fillRect(source, 31, 31, 41, 41, [249, 115, 22]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 72, 25, 25)).toBe(0);
    expect(alphaAt(result.data, 72, 35, 35)).toBe(255);
  });

  it('preserves three foreground colours around a cleared counter', () => {
    const source = raster(84, 64);
    frame(source, 8, 10, 44, 54, 7, [37, 99, 235]);
    fillRect(source, 48, 14, 58, 24, [249, 115, 22]);
    fillRect(source, 62, 34, 76, 48, [16, 185, 129]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 84, 26, 32)).toBe(0);
    expect(rgbAt(result.data, 84, 12, 30)).toEqual([37, 99, 235]);
    expect(rgbAt(result.data, 84, 52, 18)).toEqual([249, 115, 22]);
    expect(rgbAt(result.data, 84, 68, 40)).toEqual([16, 185, 129]);
  });

  it('preserves gradient foreground around a cleared interior', () => {
    const source = raster(80, 64);

    for (let x = 10; x < 70; x += 1) {
      const t = (x - 10) / 59;
      const color: Rgb = [Math.round(37 + 199 * t), Math.round(99 - 38 * t), Math.round(235 - 38 * t)];
      fillRect(source, x, 10, x + 1, 18, color);
      fillRect(source, x, 46, x + 1, 54, color);
    }
    fillRect(source, 10, 18, 18, 46, [37, 99, 235]);
    fillRect(source, 62, 18, 70, 46, [236, 61, 197]);

    const result = removeConnectedBackground(source, 'balanced');
    expect(alphaAt(result.data, 80, 40, 32)).toBe(0);
    expect(alphaAt(result.data, 80, 40, 13)).toBe(255);
    expect(rgbAt(result.data, 80, 12, 32)).toEqual([37, 99, 235]);
    expect(rgbAt(result.data, 80, 66, 32)).toEqual([236, 61, 197]);
  });

  it('preserves a white logo on a dark inferred background while clearing its dark counter', () => {
    const source = raster(64, 64, [10, 15, 25]);
    frame(source, 14, 10, 50, 54, 8, [255, 255, 255]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 64, 32, 32)).toBe(0);
    expect(alphaAt(result.data, 64, 18, 30)).toBe(255);
    expect(rgbAt(result.data, 64, 18, 30)).toEqual([255, 255, 255]);
  });

  it('preserves an intentional thin white foreground element on white and reports ambiguity', () => {
    const source = raster(72, 72);
    fillRect(source, 10, 10, 62, 62, [37, 99, 235]);
    fillRect(source, 24, 20, 28, 50, [255, 255, 255]);
    fillRect(source, 28, 34, 48, 38, [255, 255, 255]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 72, 26, 30)).toBe(255);
    expect(result.ambiguousEnclosedBackgroundComponents).toBe(1);
    expect(result.ambiguousEnclosedBackgroundRatio).toBeGreaterThan(0);
  });

  it('preserves an intentional small white highlight as ambiguous', () => {
    const source = raster(72, 72);
    fillRect(source, 10, 10, 62, 62, [37, 99, 235]);
    fillRect(source, 20, 18, 23, 26, [255, 255, 255]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 72, 21, 21)).toBe(255);
    expect(result.ambiguousEnclosedBackgroundComponents).toBe(1);
  });

  it('preserves a check-shaped white foreground mark that matches the source background', () => {
    const source = raster(84, 72);
    fillRect(source, 8, 8, 76, 64, [37, 99, 235]);
    drawThickLine(source, [22, 34], [34, 46], 7, [255, 255, 255]);
    drawThickLine(source, [34, 46], [58, 20], 7, [255, 255, 255]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 84, 34, 42)).toBe(255);
    expect(result.ambiguousEnclosedBackgroundComponents).toBe(1);
    expect(result.enclosedBackgroundRemovedComponents).toBe(0);
  });

  it('protects ambiguous light artwork and its edge when it sits near the outer removal region', () => {
    const source = raster(72, 72);
    fillRect(source, 8, 8, 62, 64, [37, 99, 235]);
    drawThickLine(source, [22, 34], [34, 46], 5, [255, 255, 255]);
    drawThickLine(source, [34, 46], [57, 20], 5, [255, 255, 255]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 72, 55, 22)).toBe(255);
    expect(result.ambiguousEnclosedBackgroundComponents).toBe(1);
    expect(result.ambiguousEnclosedBackgroundRatio).toBeGreaterThan(0);
  });

  it('ignores an isolated background-coloured noise speck below the materiality threshold', () => {
    const source = raster(72, 72);
    fillRect(source, 10, 10, 62, 62, [37, 99, 235]);
    setPixel(source, 30, 30, [255, 255, 255]);
    setPixel(source, 31, 30, [255, 255, 255]);
    setPixel(source, 30, 31, [255, 255, 255]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 72, 30, 30)).toBe(255);
    expect(result.ambiguousEnclosedBackgroundComponents).toBe(0);
    expect(result.enclosedBackgroundRemovedComponents).toBe(0);
  });

  it('creates a smooth decontaminated alpha ramp on an anti-aliased inner edge', () => {
    const source = raster(72, 72);
    fillRect(source, 8, 8, 64, 64, [15, 23, 42]);
    fillRect(source, 22, 22, 50, 50, [218, 221, 225]);
    fillRect(source, 25, 25, 47, 47, [255, 255, 255]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 72, 36, 36)).toBe(0);
    const edgeAlpha = alphaAt(result.data, 72, 23, 36);
    expect(edgeAlpha).toBeGreaterThan(0);
    expect(edgeAlpha).toBeLessThan(255);
    expect(rgbAt(result.data, 72, 23, 36)[0]).toBeLessThan(218);
  });

  it('clears a small ordinary counter while preserving thin typography strokes', () => {
    const source = raster(64, 64);
    frame(source, 18, 15, 46, 49, 5, [15, 23, 42]);
    fillRect(source, 50, 15, 52, 49, [15, 23, 42]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 64, 32, 32)).toBe(0);
    expect(alphaAt(result.data, 64, 50, 30)).toBe(255);
  });

  it('clears a compact 3x5 counter at fine-text scale', () => {
    const source = raster(64, 64);
    fillRect(source, 20, 18, 44, 46, [15, 23, 42]);
    fillRect(source, 30, 28, 33, 33, [255, 255, 255]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 64, 31, 30)).toBe(0);
    expect(result.enclosedBackgroundRemovedComponents).toBe(1);
  });

  it('preserves a disconnected coloured punctuation mark', () => {
    const source = raster(72, 72);
    frame(source, 12, 12, 50, 56, 7, [15, 23, 42]);
    fillRect(source, 58, 18, 63, 23, [37, 99, 235]);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 72, 31, 34)).toBe(0);
    expect(alphaAt(result.data, 72, 60, 20)).toBe(255);
  });

  it('preserves a low-alpha foreground edge outside the accepted background core', () => {
    const source = raster(72, 72);
    frame(source, 12, 12, 60, 60, 8, [15, 23, 42]);
    setPixel(source, 36, 13, [15, 23, 42], 64);
    const result = removeConnectedBackground(source, 'balanced');

    expect(alphaAt(result.data, 72, 36, 13)).toBe(64);
    expect(alphaAt(result.data, 72, 36, 36)).toBe(0);
  });

  it('preserves a near-background enclosed foreground block and reports ambiguity', () => {
    const source = raster(72, 72);
    fillRect(source, 10, 10, 62, 62, [15, 23, 42]);
    fillRect(source, 24, 24, 48, 48, [250, 250, 250]);
    const result = removeConnectedBackground(source, 'strong');

    expect(alphaAt(result.data, 72, 36, 36)).toBe(255);
    expect(result.ambiguousEnclosedBackgroundComponents).toBe(1);
  });

  for (const strength of ['gentle', 'balanced', 'strong'] as BackgroundRemovalStrength[]) {
    it(`clears an exact high-contrast counter in ${strength} mode`, () => {
      const source = counterFixture('O');
      const result = removeConnectedBackground(source, strength);

      expect(alphaAt(result.data, source.width, 32, 32)).toBe(0);
      expect(result.enclosedBackgroundRemovedComponents).toBe(1);
    });
  }
});
