import { describe, expect, it } from 'vitest';

import type { ImagePreflightResult } from '@filesetgo/core';

import { evaluateAlreadyReady } from '../already-ready';
import { getPresetById } from '../registry';

function preflight(overrides: Partial<ImagePreflightResult> = {}): ImagePreflightResult {
  return {
    format: 'webp',
    width: 800,
    height: 800,
    megapixels: 0.64,
    fileSize: 150 * 1024,
    safeToDecode: true,
    ...overrides,
  };
}

describe('evaluateAlreadyReady (against web.card: WebP, <=800x800, <=150KB)', () => {
  const preset = getPresetById('web.card');

  it('is true for a WebP file already within the target size and dimensions', () => {
    expect(evaluateAlreadyReady(preflight({ width: 600, height: 400, fileSize: 100 * 1024 }), preset)).toBe(true);
  });

  it('is false when dimensions exceed the preset bounds', () => {
    expect(evaluateAlreadyReady(preflight({ width: 900, height: 800 }), preset)).toBe(false);
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

  it('is true exactly at the max dimension boundary', () => {
    expect(evaluateAlreadyReady(preflight({ width: 800, height: 800 }), preset)).toBe(true);
  });

  it('is false one byte over the target boundary', () => {
    expect(evaluateAlreadyReady(preflight({ fileSize: 150 * 1024 + 1 }), preset)).toBe(false);
  });

  it('is false one pixel over the dimension boundary', () => {
    expect(evaluateAlreadyReady(preflight({ width: 801 }), preset)).toBe(false);
  });
});
