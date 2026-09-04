import { describe, expect, it } from 'vitest';

import type { FileSetGoRuntimeCapabilities } from '@filesetgo/core';

import { describeRuntimeSupport } from '../capabilities';

function capabilities(overrides: Partial<FileSetGoRuntimeCapabilities> = {}): FileSetGoRuntimeCapabilities {
  return {
    webWorker: true,
    offscreenCanvas: true,
    createImageBitmap: true,
    workerProcessing: true,
    jpegEncode: true,
    pngEncode: true,
    webpEncode: true,
    heicDecoderAvailable: true,
    ...overrides,
  };
}

describe('describeRuntimeSupport', () => {
  it('reports support when worker processing is available', () => {
    const result = describeRuntimeSupport(capabilities());

    expect(result.supported).toBe(true);
    expect(result.message).not.toMatch(/worker|canvas|bitmap/i);
  });

  it('reports lack of support without technical detail when worker processing is unavailable', () => {
    const result = describeRuntimeSupport(capabilities({ workerProcessing: false }));

    expect(result.supported).toBe(false);
    expect(result.message).not.toMatch(/worker|canvas|bitmap/i);
  });
});
