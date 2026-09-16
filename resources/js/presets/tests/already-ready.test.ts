import { describe, expect, it } from 'vitest';

import type { ImagePreflightResult } from '@filesetgo/core';

import { evaluateAlreadyReady } from '../already-ready';
import { getPresetById } from '../registry';

function preflight(overrides: Partial<ImagePreflightResult> = {}): ImagePreflightResult {
  return {
    format: 'webp',
    width: 800,
    height: 600,
    megapixels: 0.48,
    fileSize: 150 * 1024,
    safeToDecode: true,
    ...overrides,
  };
}

/**
 * web.card is now an EXACT destination frame (800×600, FSG-007-FIT-002),
 * not a bounding box — "already ready" requires exact equality on both
 * axes, not merely "no larger than."
 */
describe('evaluateAlreadyReady (against web.card: WebP, exactly 800x600, <=150KB)', () => {
  const preset = getPresetById('web.card');

  it('is true for a WebP file already at the exact target size and dimensions', () => {
    expect(evaluateAlreadyReady(preflight({ width: 800, height: 600, fileSize: 100 * 1024 }), preset)).toBe(true);
  });

  it('is false when dimensions exceed the preset frame', () => {
    expect(evaluateAlreadyReady(preflight({ width: 900, height: 600 }), preset)).toBe(false);
  });

  it('is false when dimensions are SMALLER than the preset frame (an exact frame is not a bound)', () => {
    expect(evaluateAlreadyReady(preflight({ width: 640, height: 480 }), preset)).toBe(false);
  });

  it('is false when only one axis matches (larger width, matching height)', () => {
    expect(evaluateAlreadyReady(preflight({ width: 1000, height: 600 }), preset)).toBe(false);
  });

  it('is false when the file size exceeds the preset target', () => {
    expect(evaluateAlreadyReady(preflight({ fileSize: 200 * 1024 }), preset)).toBe(false);
  });

  it('is false for a JPEG source even if size/dimensions qualify, because the format differs', () => {
    expect(evaluateAlreadyReady(preflight({ format: 'jpeg' }), preset)).toBe(false);
  });

  it('is false for a PNG source, because the format differs', () => {
    expect(evaluateAlreadyReady(preflight({ format: 'png' }), preset)).toBe(false);
  });

  it('is false for a HEIC source, because the format differs', () => {
    expect(evaluateAlreadyReady(preflight({ format: 'heic' }), preset)).toBe(false);
  });

  it('is true exactly at the target byte boundary', () => {
    expect(evaluateAlreadyReady(preflight({ fileSize: 150 * 1024 }), preset)).toBe(true);
  });

  it('is false one byte over the target boundary', () => {
    expect(evaluateAlreadyReady(preflight({ fileSize: 150 * 1024 + 1 }), preset)).toBe(false);
  });

  it('is false one pixel over on width', () => {
    expect(evaluateAlreadyReady(preflight({ width: 801 }), preset)).toBe(false);
  });

  it('is false one pixel under on width', () => {
    expect(evaluateAlreadyReady(preflight({ width: 799 }), preset)).toBe(false);
  });
});
