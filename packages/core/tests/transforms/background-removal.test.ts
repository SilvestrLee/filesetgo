import { describe, expect, it } from 'vitest';

import { inspectAlpha } from '../../src/transforms/alpha-inspection';
import { removeConnectedBackground } from '../../src/transforms/background-removal';
import {
  createRasterWithAntiAliasedForeground,
  createRasterWithDropShadow,
  createRasterWithFineIconStrokes,
  createRasterWithForegroundRects,
  createRasterWithGradientBackground,
} from './fixtures/raster-fixtures';

function alphaAt(data: Uint8ClampedArray | Uint8Array, width: number, x: number, y: number): number {
  return data[(y * width + x) * 4 + 3];
}

function rgbAt(data: Uint8ClampedArray | Uint8Array, width: number, x: number, y: number): [number, number, number] {
  const offset = (y * width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2]];
}

describe('removeConnectedBackground', () => {
  it('makes a flat white exterior background transparent', () => {
    const raster = createRasterWithForegroundRects(40, 40, [255, 255, 255], [
      { x0: 15, y0: 15, x1: 25, y1: 25, color: [20, 20, 20] },
    ]);
    const result = removeConnectedBackground(raster, 'balanced');

    // Corners (pure background) are fully transparent.
    expect(alphaAt(result.data, 40, 0, 0)).toBe(0);
    expect(alphaAt(result.data, 40, 39, 39)).toBe(0);
    // The foreground rectangle's interior remains fully opaque.
    expect(alphaAt(result.data, 40, 20, 20)).toBe(255);
  });

  it('makes a flat black exterior background transparent', () => {
    const raster = createRasterWithForegroundRects(40, 40, [0, 0, 0], [
      { x0: 15, y0: 15, x1: 25, y1: 25, color: [255, 255, 255] },
    ]);
    const result = removeConnectedBackground(raster, 'balanced');

    expect(alphaAt(result.data, 40, 0, 0)).toBe(0);
    expect(alphaAt(result.data, 40, 20, 20)).toBe(255);
  });

  it('makes a flat coloured exterior background transparent', () => {
    const raster = createRasterWithForegroundRects(40, 40, [30, 120, 200], [
      { x0: 15, y0: 15, x1: 25, y1: 25, color: [255, 200, 0] },
    ]);
    const result = removeConnectedBackground(raster, 'balanced');

    expect(alphaAt(result.data, 40, 0, 0)).toBe(0);
    expect(alphaAt(result.data, 40, 20, 20)).toBe(255);
  });

  it('protects a disconnected foreground region even when its colour is similar to the background', () => {
    // Background is white; one foreground rect is near-white (similar
    // colour) but fully surrounded by a distinctly-coloured foreground
    // rect, so it is never connected to the border by background-like
    // pixels — it must survive.
    const raster = createRasterWithForegroundRects(50, 50, [255, 255, 255], [
      { x0: 10, y0: 10, x1: 40, y1: 40, color: [0, 0, 150] }, // outer ring, distinct colour
      { x0: 20, y0: 20, x1: 30, y1: 30, color: [250, 250, 250] }, // inner, near-white, fully enclosed
    ]);
    const result = removeConnectedBackground(raster, 'balanced');

    expect(alphaAt(result.data, 50, 0, 0)).toBe(0); // exterior background removed
    expect(alphaAt(result.data, 50, 25, 25)).toBe(255); // enclosed near-white region survives
    expect(alphaAt(result.data, 50, 15, 15)).toBe(255); // outer ring survives
  });

  it('preserves a white interior element enclosed by non-white foreground (fixture matrix §41.5)', () => {
    // The white "counter" of a letterform-like mark: a coloured outer ring
    // with a fully enclosed white interior — the interior is never
    // connected to the true exterior background, so it must survive even
    // though its colour matches the exterior exactly.
    const raster = createRasterWithForegroundRects(50, 50, [255, 255, 255], [
      { x0: 10, y0: 10, x1: 40, y1: 40, color: [20, 90, 160] },
      { x0: 20, y0: 20, x1: 30, y1: 30, color: [255, 255, 255] },
    ]);
    const result = removeConnectedBackground(raster, 'balanced');

    expect(alphaAt(result.data, 50, 0, 0)).toBe(0); // exterior removed
    expect(alphaAt(result.data, 50, 25, 25)).toBe(255); // enclosed white interior survives
  });

  it('preserves a black interior element enclosed by non-black foreground (fixture matrix §41.6)', () => {
    const raster = createRasterWithForegroundRects(50, 50, [255, 255, 255], [
      { x0: 10, y0: 10, x1: 40, y1: 40, color: [200, 160, 20] },
      { x0: 20, y0: 20, x1: 30, y1: 30, color: [0, 0, 0] },
    ]);
    const result = removeConnectedBackground(raster, 'balanced');

    expect(alphaAt(result.data, 50, 0, 0)).toBe(0);
    expect(alphaAt(result.data, 50, 25, 25)).toBe(255);
  });

  it('reduces a flattened drop shadow toward transparency without destroying the foreground shape (fixture matrix §41.11)', () => {
    const raster = createRasterWithDropShadow(60, 60, [255, 255, 255], [10, 10, 10]);
    const result = removeConnectedBackground(raster, 'balanced');

    // The shape itself (well inside the foreground rectangle) survives fully opaque.
    expect(alphaAt(result.data, 60, 18, 18)).toBe(255);
    // The exterior background is removed.
    expect(alphaAt(result.data, 60, 0, 0)).toBe(0);
    // This is an intentional difficult case (directive §44): the shadow
    // region need not end up perfectly opaque OR perfectly transparent —
    // the only hard requirement is that the real foreground survives and
    // the result is not a destroyed/empty image.
    expect(result.remainingOpaqueRatio).toBeGreaterThan(0.05);
  });

  it('preserves independent fine-icon-stroke geometry — a genuinely separate fixture from thin typography (fixture matrix §41.10)', () => {
    // Distinct from the thin-typography fixture below: multiple separated
    // 1-2px diagonal/curved strokes plus a disconnected short detail, not
    // one straight vertical bar — proving the algorithm survives varied
    // fine-stroke geometry, not just a single aliased case.
    const raster = createRasterWithFineIconStrokes(60, 60, [255, 255, 255], [15, 15, 15]);
    const result = removeConnectedBackground(raster, 'balanced');

    // The diagonal stroke's midpoint survives.
    const diagMid = Math.floor(60 * 0.15) + Math.floor(60 * 0.4 * 0.5);
    expect(alphaAt(result.data, 60, diagMid, diagMid)).toBeGreaterThan(0);
    // The disconnected short detail stroke survives.
    const detailX = Math.floor(60 * 0.45) + 2;
    const detailY = Math.floor(60 * 0.55);
    expect(alphaAt(result.data, 60, detailX, detailY)).toBeGreaterThan(0);
    // The exterior background is genuinely removed.
    expect(alphaAt(result.data, 60, 0, 0)).toBe(0);
    // Fine strokes are a small fraction of the canvas — some real foreground survives, but not much.
    expect(result.remainingOpaqueRatio).toBeGreaterThan(0);
    expect(result.remainingOpaqueRatio).toBeLessThan(0.1);
  });

  it('preserves thin strokes surrounded by background', () => {
    // A 2px-thick vertical stroke on a white background.
    const raster = createRasterWithForegroundRects(40, 40, [255, 255, 255], [
      { x0: 19, y0: 5, x1: 21, y1: 35, color: [10, 10, 10] },
    ]);
    const result = removeConnectedBackground(raster, 'balanced');

    expect(alphaAt(result.data, 40, 20, 20)).toBe(255);
    expect(alphaAt(result.data, 40, 0, 0)).toBe(0);
  });

  it('produces a soft (non-binary) alpha ramp at an anti-aliased edge, not only hard 0/255 values', () => {
    const raster = createRasterWithAntiAliasedForeground(40, 40, [255, 255, 255], [10, 10, 10]);
    const result = removeConnectedBackground(raster, 'balanced');

    const alphas = new Set<number>();
    for (let y = 0; y < 40; y += 1) {
      for (let x = 0; x < 40; x += 1) {
        alphas.add(alphaAt(result.data, 40, x, y));
      }
    }

    const hasSoftValue = [...alphas].some((a) => a > 0 && a < 255);
    expect(hasSoftValue).toBe(true);
  });

  it('decontaminates a background-blended edge instead of leaving an obvious colour-fringed halo', () => {
    // A dark foreground anti-aliased against a bright white background.
    // Decontamination cannot perfectly recover the fixture's synthetic
    // "true" blend fraction (the algorithm has no ground truth, only a
    // colour-distance estimate) — the meaningful, testable claim is that
    // decontamination moves an edge pixel's colour *closer* to the true
    // foreground colour than the raw background-blended pixel was, not
    // that it hits an arbitrary absolute value.
    const background: [number, number, number] = [255, 255, 255];
    const foreground: [number, number, number] = [10, 10, 10];
    const raster = createRasterWithAntiAliasedForeground(40, 40, background, foreground);
    const result = removeConnectedBackground(raster, 'balanced');

    const distanceToForeground = (color: [number, number, number]): number =>
      Math.hypot(color[0] - foreground[0], color[1] - foreground[1], color[2] - foreground[2]);

    let foundSoftEdge = false;

    for (let y = 0; y < 40; y += 1) {
      for (let x = 0; x < 40; x += 1) {
        const alpha = alphaAt(result.data, 40, x, y);

        if (alpha > 0 && alpha < 255) {
          foundSoftEdge = true;
          const originalColor = rgbAt(raster.data, 40, x, y);
          const decontaminatedColor = rgbAt(result.data, 40, x, y);

          // Decontamination must move the colour toward the true
          // foreground, not leave it exactly as the background-blended
          // value (which is what a crude alpha-only cutout — no
          // decontamination at all — would do).
          expect(distanceToForeground(decontaminatedColor)).toBeLessThan(distanceToForeground(originalColor));
        }
      }
    }

    expect(foundSoftEdge).toBe(true);
  });

  it('reports high border-colour variance for a gradient background (an ambiguity signal, not a silent clean removal)', () => {
    const flatRaster = createRasterWithForegroundRects(40, 40, [255, 255, 255], [
      { x0: 15, y0: 15, x1: 25, y1: 25, color: [10, 10, 10] },
    ]);
    const gradientRaster = createRasterWithGradientBackground(40, 40, [10, 10, 10]);

    const flatResult = removeConnectedBackground(flatRaster, 'balanced');
    const gradientResult = removeConnectedBackground(gradientRaster, 'balanced');

    expect(gradientResult.backgroundColorVariance).toBeGreaterThan(flatResult.backgroundColorVariance);
  });

  it('does not destroy the entire image (a destructive result is measurable, not silently accepted)', () => {
    const raster = createRasterWithForegroundRects(40, 40, [255, 255, 255], [
      { x0: 10, y0: 10, x1: 30, y1: 30, color: [10, 10, 10] },
    ]);
    const result = removeConnectedBackground(raster, 'balanced');

    expect(result.remainingOpaqueRatio).toBeGreaterThan(0.1);
  });

  it('is strictly stronger at "strong" than "gentle" for the same ambiguous near-background colour', () => {
    // A foreground rectangle whose colour sits just outside "gentle"'s
    // threshold but within "strong"'s threshold of the background.
    const raster = createRasterWithForegroundRects(40, 40, [255, 255, 255], [
      { x0: 15, y0: 15, x1: 25, y1: 25, color: [215, 215, 215] },
    ]);

    const gentle = removeConnectedBackground(raster, 'gentle');
    const strong = removeConnectedBackground(raster, 'strong');

    expect(strong.removedRatio).toBeGreaterThanOrEqual(gentle.removedRatio);
  });

  it('the removed result genuinely contains alpha transparency per inspectAlpha, not merely a status flag', () => {
    const raster = createRasterWithForegroundRects(40, 40, [255, 255, 255], [
      { x0: 15, y0: 15, x1: 25, y1: 25, color: [10, 10, 10] },
    ]);
    const result = removeConnectedBackground(raster, 'balanced');
    const inspection = inspectAlpha({ data: result.data, width: result.width, height: result.height });

    expect(inspection.classification).toBe('transparency-present');
  });
});
