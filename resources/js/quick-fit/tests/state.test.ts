import { describe, expect, it } from 'vitest';

import type { ImagePreflightResult, ProcessedImageResult } from '@filesetgo/core';

import { canDownload, isProcessing, isRunnable, sourceOf, type QuickFitSource, type QuickFitState } from '../state';

function preflight(): ImagePreflightResult {
  return { format: 'jpeg', width: 100, height: 100, megapixels: 0.01, fileSize: 1000, safeToDecode: true };
}

function source(): QuickFitSource {
  return { file: new File([new Uint8Array([1])], 'x.jpg'), preflight: preflight() };
}

function result(): ProcessedImageResult {
  return {
    blob: new Blob(['x']),
    width: 100,
    height: 100,
    format: 'jpeg',
    mimeType: 'image/jpeg',
    byteSize: 500,
    sourceDimensions: { width: 100, height: 100 },
    normalizedDimensions: { width: 100, height: 100 },
    resized: false,
  };
}

describe('sourceOf', () => {
  it('returns undefined for states with no source', () => {
    expect(sourceOf({ status: 'idle' })).toBeUndefined();
    expect(sourceOf({ status: 'inspecting', file: source().file })).toBeUndefined();
    expect(sourceOf({ status: 'file-rejected', file: source().file, message: 'x' })).toBeUndefined();
  });

  it('returns the source for every state that carries one', () => {
    const src = source();
    expect(sourceOf({ status: 'ready', source: src })).toBe(src);
    expect(sourceOf({ status: 'processing', source: src, jobId: 'j1', stage: 'decoding' })).toBe(src);
    expect(sourceOf({ status: 'unreachable', source: src, outcome: { code: 'TARGET_UNREACHABLE_MIN_QUALITY', message: 'x', qualityProbeCount: 1, dimensionTierCount: 0 } })).toBe(src);
    expect(sourceOf({ status: 'failed', source: src, error: { code: 'DECODE_FAILED', message: 'x', recoverable: true } })).toBe(src);
    expect(sourceOf({ status: 'cancelled', source: src })).toBe(src);
  });

  it('returns the result source for a success state', () => {
    const src = source();
    const state: QuickFitState = {
      status: 'success',
      result: { source: src, data: result(), downloadUrl: 'blob:x', filename: 'x-filesetgo.jpg' },
    };

    expect(sourceOf(state)).toBe(src);
  });
});

describe('isRunnable', () => {
  it('is true for ready, success, unreachable, failed and cancelled states', () => {
    const src = source();
    expect(isRunnable({ status: 'ready', source: src })).toBe(true);
    expect(isRunnable({ status: 'cancelled', source: src })).toBe(true);
    expect(isRunnable({
      status: 'success',
      result: { source: src, data: result(), downloadUrl: 'blob:x', filename: 'f' },
    })).toBe(true);
  });

  it('is false for idle, inspecting, file-rejected and processing states', () => {
    const src = source();
    expect(isRunnable({ status: 'idle' })).toBe(false);
    expect(isRunnable({ status: 'inspecting', file: src.file })).toBe(false);
    expect(isRunnable({ status: 'file-rejected', file: src.file, message: 'x' })).toBe(false);
    expect(isRunnable({ status: 'processing', source: src, jobId: 'j1', stage: 'decoding' })).toBe(false);
  });
});

describe('isProcessing / canDownload', () => {
  it('identify their respective states only', () => {
    const src = source();
    expect(isProcessing({ status: 'processing', source: src, jobId: 'j1', stage: 'decoding' })).toBe(true);
    expect(isProcessing({ status: 'ready', source: src })).toBe(false);

    const successState: QuickFitState = {
      status: 'success',
      result: { source: src, data: result(), downloadUrl: 'blob:x', filename: 'f' },
    };
    expect(canDownload(successState)).toBe(true);
    expect(canDownload({ status: 'ready', source: src })).toBe(false);
  });
});
