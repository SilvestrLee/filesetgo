import { describe, expect, it } from 'vitest';

import type { ImagePreflightResult, ProcessedImageResult, TargetSizeResult } from '@filesetgo/core';

import { buildSuccessSummary, formatLabel, isTargetResult } from '../summary';

function source(overrides: Partial<ImagePreflightResult> = {}): ImagePreflightResult {
  return {
    format: 'jpeg',
    width: 2000,
    height: 1000,
    megapixels: 2,
    fileSize: 1_000_000,
    safeToDecode: true,
    ...overrides,
  };
}

function standardResult(overrides: Partial<ProcessedImageResult> = {}): ProcessedImageResult {
  return {
    blob: new Blob(['x']),
    width: 2000,
    height: 1000,
    format: 'jpeg',
    mimeType: 'image/jpeg',
    byteSize: 900_000,
    sourceDimensions: { width: 2000, height: 1000 },
    normalizedDimensions: { width: 2000, height: 1000 },
    resized: false,
    ...overrides,
  };
}

function targetResult(overrides: Partial<TargetSizeResult> = {}): TargetSizeResult {
  return {
    ...standardResult(),
    targetBytes: 200_000,
    targetMet: true,
    quality: 0.8,
    dimensionsReduced: false,
    qualityProbeCount: 2,
    dimensionTierCount: 0,
    byteSize: 190_000,
    ...overrides,
  };
}

describe('formatLabel', () => {
  it('produces friendly capitalized labels', () => {
    expect(formatLabel('jpeg')).toBe('JPEG');
    expect(formatLabel('png')).toBe('PNG');
    expect(formatLabel('webp')).toBe('WebP');
  });
});

describe('isTargetResult', () => {
  it('distinguishes a TargetSizeResult from a plain ProcessedImageResult', () => {
    expect(isTargetResult(standardResult())).toBe(false);
    expect(isTargetResult(targetResult())).toBe(true);
  });
});

describe('buildSuccessSummary', () => {
  it('reports the size reduction was met without dimension changes for a target job', () => {
    const summary = buildSuccessSummary(source(), targetResult({ dimensionsReduced: false }));

    expect(summary.detail).toMatch(/without reducing the dimensions/);
    expect(summary.reductionLabel).toBe('81% smaller');
  });

  it('reports dimensions were reduced for a target job that needed it', () => {
    const summary = buildSuccessSummary(source(), targetResult({ dimensionsReduced: true, width: 1600, height: 800 }));

    expect(summary.detail).toMatch(/reduced the dimensions/);
  });

  it('describes a resize for a standard job with changed dimensions', () => {
    const summary = buildSuccessSummary(source(), standardResult({ width: 1000, height: 500 }));

    expect(summary.detail).toMatch(/resized it to 1000 × 500/);
  });

  it('describes a format conversion for a standard job with an unchanged size', () => {
    const summary = buildSuccessSummary(source(), standardResult({ format: 'webp', mimeType: 'image/webp' }));

    expect(summary.detail).toMatch(/converted it to WebP/);
  });

  it('describes both a resize and a conversion when both happened', () => {
    const summary = buildSuccessSummary(source(), standardResult({ width: 1000, height: 500, format: 'webp' }));

    expect(summary.detail).toMatch(/resized it to 1000 × 500 and converted it to WebP/);
  });

  it('omits the reduction label when the output did not get smaller', () => {
    const summary = buildSuccessSummary(source({ fileSize: 500_000 }), standardResult({ byteSize: 600_000 }));

    expect(summary.reductionLabel).toBeUndefined();
  });

  it('falls back to a generic message when nothing meaningfully changed', () => {
    const summary = buildSuccessSummary(source(), standardResult());

    expect(summary.detail).toBe('Your file is ready to download.');
  });
});
