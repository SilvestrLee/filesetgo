import { describe, expect, it, vi } from 'vitest';

import { IMAGE_PROCESSING_ERROR_CODES } from '../../src/processing/contracts';

// Isolated in its own file (rather than living inside process-image.test.ts)
// because simulating a dynamic-import failure requires vi.doMock +
// vi.resetModules, which resets Vitest's module registry for the whole
// file and would otherwise leak into unrelated tests sharing that file.
describe('processImageInWorker HEIC dynamic-import failure', () => {
  it('reports HEIC_DECODER_UNAVAILABLE when the dynamic import of the adapter module itself fails', async () => {
    vi.stubGlobal('OffscreenCanvas', class {
      public constructor(
        public width: number,
        public height: number,
      ) {}
      public getContext() {
        return { imageSmoothingEnabled: false, imageSmoothingQuality: '', setTransform() {}, resetTransform() {}, drawImage() {} };
      }
    });
    vi.stubGlobal('createImageBitmap', async () => ({ width: 800, height: 600, close() {} }));
    vi.doMock('../../src/workers/heic-decode', () => {
      throw new Error('simulated chunk load failure');
    });

    const { processImageInWorker, toWorkerProcessingError } = await import(
      '../../src/workers/process-image'
    );

    const request = {
      file: new Blob([Uint8Array.of(0)]),
      preflight: {
        format: 'heic' as const,
        width: 800,
        height: 600,
        megapixels: 0.48,
        fileSize: 1024,
        safeToDecode: true,
      },
      output: { format: 'jpeg' as const },
    };
    let caught: unknown;

    try {
      await processImageInWorker(request, {
        isCancelled: () => false,
        onProgress: () => {},
      });
    } catch (error) {
      caught = error;
    }

    expect(toWorkerProcessingError(caught).code).toBe(
      IMAGE_PROCESSING_ERROR_CODES.HeicDecoderUnavailable,
    );

    vi.doUnmock('../../src/workers/heic-decode');
    vi.unstubAllGlobals();
  });
});
