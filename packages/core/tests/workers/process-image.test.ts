import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImagePreflightResult } from '../../src';
import { DEFAULT_SAFETY_LIMITS } from '../../src/preflight/safety';
import { IMAGE_PROCESSING_ERROR_CODES } from '../../src/processing/contracts';
import type { SafeImageProcessingRequest } from '../../src/processing/contracts';
import {
  processImageInWorker,
  toWorkerProcessingError,
  type WorkerProcessingHooks,
} from '../../src/workers/process-image';
import { createJpeg, createPng, createVp8ExtendedWebp } from '../preflight/fixtures';

// processImageInWorker only ever reaches the real HEIC adapter through a
// dynamic `import('./heic-decode')`, so it can be mocked here to test the
// worker pipeline's HEIC branch in isolation from the real WASM codec
// (which is exercised for real in heic-decode.test.ts). Mocking this
// module also lets tests prove JPEG/PNG/WebP jobs never touch it at all —
// the lazy-loading guarantee FSG-001C requires.
class MockHeicDecodeError extends Error {
  public constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HeicDecodeError';
  }
}

const heicDecodeMock = vi.hoisted(() => ({ decodeHeic: vi.fn() }));

vi.mock('../../src/workers/heic-decode', () => ({
  decodeHeic: heicDecodeMock.decodeHeic,
  HeicDecodeError: MockHeicDecodeError,
}));

// Node's test environment has no OffscreenCanvas/createImageBitmap. These
// fakes stand in for the browser APIs so processImageInWorker's own logic
// (decode -> normalize -> resize -> encode -> validate -> cleanup) can be
// exercised deterministically. The encoder fake returns real, parseable
// image bytes so the pipeline's own re-validation (a real preflightImage()
// call) proves out rather than being mocked away.

class FakeImageBitmap {
  public closed = false;

  public constructor(
    public readonly width: number,
    public readonly height: number,
  ) {}

  public close(): void {
    this.closed = true;
  }
}

class FakeCanvasContext {
  public imageSmoothingEnabled = false;
  public imageSmoothingQuality = '';

  public setTransform(): void {}
  public resetTransform(): void {}
  public drawImage(): void {}
}

type EncodeOptions = { type: string; quality?: number };
type EncodeHandler = (
  options: EncodeOptions,
  width: number,
  height: number,
) => Promise<Blob>;

let encodeHandler: EncodeHandler;
let encodeCalls: EncodeOptions[];
let bitmapHandler: () => Promise<FakeImageBitmap>;
let bitmapCallCount: number;

class FakeOffscreenCanvas {
  public width: number;
  public height: number;

  public constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public getContext(): FakeCanvasContext {
    return new FakeCanvasContext();
  }

  public async convertToBlob(options: EncodeOptions): Promise<Blob> {
    encodeCalls.push(options);
    return encodeHandler(options, this.width, this.height);
  }
}

function encodeValidBytes(
  options: EncodeOptions,
  width: number,
  height: number,
): Promise<Blob> {
  if (options.type === 'image/png') {
    return Promise.resolve(
      new Blob([Uint8Array.from(createPng(width, height))], { type: options.type }),
    );
  }

  if (options.type === 'image/webp') {
    return Promise.resolve(
      new Blob([Uint8Array.from(createVp8ExtendedWebp(width, height))], { type: options.type }),
    );
  }

  return Promise.resolve(
    new Blob([Uint8Array.from(createJpeg(width, height))], { type: options.type }),
  );
}

function cancelAfterCalls(count: number): () => boolean {
  let calls = 0;

  return () => {
    calls += 1;
    return calls > count;
  };
}

function testHooks(overrides: Partial<WorkerProcessingHooks> = {}): {
  hooks: WorkerProcessingHooks;
  stages: string[];
} {
  const stages: string[] = [];
  const hooks: WorkerProcessingHooks = {
    isCancelled: () => false,
    onProgress: (stage) => stages.push(stage),
    ...overrides,
  };

  return { hooks, stages };
}

function testPreflight(
  overrides: Partial<ImagePreflightResult> = {},
): ImagePreflightResult {
  return {
    format: 'jpeg',
    width: 800,
    height: 600,
    megapixels: 0.48,
    fileSize: 1024,
    safeToDecode: true,
    ...overrides,
  };
}

function testRequest(
  overrides: Partial<SafeImageProcessingRequest> = {},
): SafeImageProcessingRequest {
  return {
    file: new Blob([Uint8Array.of(0xff, 0xd8, 0xff, 0xd9)], {
      type: 'image/jpeg',
    }),
    preflight: testPreflight(),
    output: { format: 'webp', quality: 0.8 },
    ...overrides,
  };
}

async function expectProcessingFailure(
  promise: Promise<unknown>,
  code: string,
) {
  let caught: unknown;

  try {
    await promise;
  } catch (error) {
    caught = error;
  }

  expect(caught).toBeDefined();
  const processingError = toWorkerProcessingError(caught);
  expect(processingError.code).toBe(code);

  return processingError;
}

class FakeImageData {
  public constructor(
    public readonly data: Uint8ClampedArray,
    public readonly width: number,
    public readonly height: number,
  ) {}
}

let createdBitmaps: FakeImageBitmap[];

beforeEach(() => {
  encodeHandler = encodeValidBytes;
  encodeCalls = [];
  bitmapCallCount = 0;
  bitmapHandler = async () => new FakeImageBitmap(800, 600);
  createdBitmaps = [];
  heicDecodeMock.decodeHeic.mockReset();

  vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
  vi.stubGlobal('ImageData', FakeImageData);
  vi.stubGlobal('createImageBitmap', async (source: unknown, ..._rest: unknown[]) => {
    bitmapCallCount += 1;

    // The HEIC path calls createImageBitmap(imageData) — respect its
    // width/height so dimension-mismatch tests are meaningful. The
    // JPEG/PNG/WebP path calls createImageBitmap(blob, options), which
    // carries no dimension info, so it falls back to bitmapHandler().
    const bitmap = source instanceof FakeImageData
      ? new FakeImageBitmap(source.width, source.height)
      : await bitmapHandler();

    createdBitmaps.push(bitmap);
    return bitmap;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('processImageInWorker successful pipeline', () => {
  it('decodes, normalizes, resizes, encodes, and validates a JPEG source to WebP', async () => {
    const { hooks, stages } = testHooks();
    const bitmaps: FakeImageBitmap[] = [];
    bitmapHandler = async () => {
      const bitmap = new FakeImageBitmap(800, 600);
      bitmaps.push(bitmap);
      return bitmap;
    };

    const result = await processImageInWorker(
      testRequest({
        preflight: testPreflight({ format: 'jpeg', width: 800, height: 600 }),
        resize: { maxWidth: 400, maxHeight: 400, allowUpscale: false },
        output: { format: 'webp', quality: 0.8 },
      }),
      hooks,
    );

    expect(result).toMatchObject({
      width: 400,
      height: 300,
      format: 'webp',
      mimeType: 'image/webp',
      sourceDimensions: { width: 800, height: 600 },
      normalizedDimensions: { width: 800, height: 600 },
      resized: true,
    });
    expect(result.blob.size).toBeGreaterThan(0);
    expect(result.byteSize).toBe(result.blob.size);
    expect(stages).toEqual([
      'decoding',
      'normalizing',
      'resizing',
      'encoding',
      'finalizing',
    ]);
    expect(bitmaps).toHaveLength(1);
    expect(bitmaps[0]?.closed).toBe(true);
    expect(encodeCalls).toEqual([{ type: 'image/webp', quality: 0.8 }]);
  });

  it.each(['jpeg', 'png', 'webp'] as const)(
    'encodes to %s output without upscaling a smaller source',
    async (format) => {
      bitmapHandler = async () => new FakeImageBitmap(200, 150);

      const result = await processImageInWorker(
        testRequest({
          preflight: testPreflight({ width: 200, height: 150 }),
          resize: { maxWidth: 1200, maxHeight: 1200, allowUpscale: false },
          output: { format, ...(format === 'png' ? {} : { quality: 0.9 }) },
        }),
        testHooks().hooks,
      );

      expect(result.width).toBe(200);
      expect(result.height).toBe(150);
      expect(result.resized).toBe(false);
      expect(result.format).toBe(format);
      expect(result.mimeType).toBe(`image/${format}`);
    },
  );

  it('does not pass a quality option for PNG output', async () => {
    await processImageInWorker(
      testRequest({ output: { format: 'png' } }),
      testHooks().hooks,
    );

    expect(encodeCalls).toEqual([{ type: 'image/png' }]);
  });
});

describe('processImageInWorker decode failures', () => {
  it('returns a controlled DECODE_FAILED when createImageBitmap rejects on a corrupt payload', async () => {
    bitmapHandler = () => {
      throw new Error('The browser could not decode this payload.');
    };

    await expectProcessingFailure(
      processImageInWorker(testRequest(), testHooks().hooks),
      IMAGE_PROCESSING_ERROR_CODES.DecodeFailed,
    );
  });

  it('returns DECODE_FAILED when the decoded bitmap does not match the preflight-reported dimensions', async () => {
    bitmapHandler = async () => new FakeImageBitmap(801, 600);

    await expectProcessingFailure(
      processImageInWorker(
        testRequest({ preflight: testPreflight({ width: 800, height: 600 }) }),
        testHooks().hooks,
      ),
      IMAGE_PROCESSING_ERROR_CODES.DecodeFailed,
    );
  });

  it('reports RUNTIME_UNSUPPORTED when OffscreenCanvas is unavailable', async () => {
    vi.stubGlobal('OffscreenCanvas', undefined);

    await expectProcessingFailure(
      processImageInWorker(testRequest(), testHooks().hooks),
      IMAGE_PROCESSING_ERROR_CODES.RuntimeUnsupported,
    );
    expect(bitmapCallCount).toBe(0);
  });
});

describe('processImageInWorker encode failures', () => {
  it('returns ENCODE_FAILED when the browser encoder throws', async () => {
    encodeHandler = () => {
      throw new Error('The browser could not encode this format.');
    };

    await expectProcessingFailure(
      processImageInWorker(testRequest(), testHooks().hooks),
      IMAGE_PROCESSING_ERROR_CODES.EncodeFailed,
    );
  });

  it('returns ENCODE_FAILED when the encoder mislabels the output blob type', async () => {
    encodeHandler = (options, width, height) =>
      Promise.resolve(
        new Blob([Uint8Array.from(createPng(width, height))], { type: 'image/png' }),
      );

    await expectProcessingFailure(
      processImageInWorker(
        testRequest({ output: { format: 'webp' } }),
        testHooks().hooks,
      ),
      IMAGE_PROCESSING_ERROR_CODES.EncodeFailed,
    );
  });

  it('returns OUTPUT_VALIDATION_FAILED for an empty encoded blob', async () => {
    encodeHandler = (options) =>
      Promise.resolve(new Blob([], { type: options.type }));

    await expectProcessingFailure(
      processImageInWorker(testRequest(), testHooks().hooks),
      IMAGE_PROCESSING_ERROR_CODES.OutputValidationFailed,
    );
  });

  it('returns OUTPUT_VALIDATION_FAILED when the encoded pixels do not match the requested dimensions', async () => {
    encodeHandler = () =>
      Promise.resolve(
        new Blob([Uint8Array.from(createVp8ExtendedWebp(999, 999))], { type: 'image/webp' }),
      );

    await expectProcessingFailure(
      processImageInWorker(
        testRequest({ output: { format: 'webp' } }),
        testHooks().hooks,
      ),
      IMAGE_PROCESSING_ERROR_CODES.OutputValidationFailed,
    );
  });
});

describe('processImageInWorker safety and cancellation', () => {
  it('rejects a request whose computed output dimensions exceed the decoded-pixel safety limit', async () => {
    const outcome = expectProcessingFailure(
      processImageInWorker(
        testRequest({
          preflight: testPreflight({ width: 6000, height: 4000 }),
          resize: { maxWidth: 10_000, maxHeight: 10_000, allowUpscale: true },
        }),
        testHooks().hooks,
      ),
      IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
    );

    const error = await outcome;
    expect(error.details?.maximumDecodedPixels).toBe(
      DEFAULT_SAFETY_LIMITS.maxDecodedPixels,
    );
    expect(bitmapCallCount).toBe(0);
  });

  it('stops before decoding when the job is already cancelled', async () => {
    const { hooks } = testHooks({ isCancelled: () => true });

    await expectProcessingFailure(
      processImageInWorker(testRequest(), hooks),
      IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled,
    );
    expect(bitmapCallCount).toBe(0);
  });

  it('cancels after decode and still releases the decoded bitmap', async () => {
    const bitmaps: FakeImageBitmap[] = [];
    bitmapHandler = async () => {
      const bitmap = new FakeImageBitmap(800, 600);
      bitmaps.push(bitmap);
      return bitmap;
    };
    const { hooks } = testHooks({ isCancelled: cancelAfterCalls(1) });

    await expectProcessingFailure(
      processImageInWorker(testRequest(), hooks),
      IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled,
    );

    expect(bitmapCallCount).toBe(1);
    expect(bitmaps[0]?.closed).toBe(true);
    expect(encodeCalls).toHaveLength(0);
  });
});

describe('processImageInWorker HEIC pipeline', () => {
  function heicRequest(overrides: Partial<SafeImageProcessingRequest> = {}) {
    return testRequest({
      preflight: testPreflight({ format: 'heic', width: 800, height: 600 }),
      ...overrides,
    });
  }

  it('decodes HEIC through the adapter and converges onto the standard pipeline (HEIC -> JPEG)', async () => {
    heicDecodeMock.decodeHeic.mockResolvedValue({
      data: new Uint8ClampedArray(800 * 600 * 4),
      width: 800,
      height: 600,
    });

    const { hooks, stages } = testHooks();
    const result = await processImageInWorker(
      heicRequest({
        resize: { maxWidth: 400, maxHeight: 400, allowUpscale: false },
        output: { format: 'jpeg', quality: 0.8 },
      }),
      hooks,
    );

    expect(result).toMatchObject({ width: 400, height: 300, format: 'jpeg' });
    expect(stages).toEqual(['decoding', 'normalizing', 'resizing', 'encoding', 'finalizing']);
    expect(heicDecodeMock.decodeHeic).toHaveBeenCalledTimes(1);
  });

  it.each(['png', 'webp'] as const)('decodes HEIC to %s output', async (format) => {
    heicDecodeMock.decodeHeic.mockResolvedValue({
      data: new Uint8ClampedArray(800 * 600 * 4),
      width: 800,
      height: 600,
    });

    const result = await processImageInWorker(
      heicRequest({ output: { format } }),
      testHooks().hooks,
    );

    expect(result.format).toBe(format);
  });

  it('never invokes the HEIC adapter for a JPEG job (lazy-loading isolation)', async () => {
    await processImageInWorker(testRequest(), testHooks().hooks);

    expect(heicDecodeMock.decodeHeic).not.toHaveBeenCalled();
  });

  it('never invokes the HEIC adapter for PNG or WebP jobs either', async () => {
    await processImageInWorker(
      testRequest({ preflight: testPreflight({ format: 'png' }), output: { format: 'png' } }),
      testHooks().hooks,
    );
    await processImageInWorker(
      testRequest({ preflight: testPreflight({ format: 'webp' }), output: { format: 'webp' } }),
      testHooks().hooks,
    );

    expect(heicDecodeMock.decodeHeic).not.toHaveBeenCalled();
  });

  it('maps a HeicDecodeError from the adapter to the matching processing error code', async () => {
    heicDecodeMock.decodeHeic.mockRejectedValue(
      new MockHeicDecodeError('HEIC_DECODER_UNAVAILABLE', 'The HEIC decoder module could not be loaded.'),
    );

    await expectProcessingFailure(
      processImageInWorker(heicRequest(), testHooks().hooks),
      IMAGE_PROCESSING_ERROR_CODES.HeicDecoderUnavailable,
    );
  });

  it('maps a generic adapter throw to DECODE_FAILED without leaking the raw error', async () => {
    heicDecodeMock.decodeHeic.mockRejectedValue(new Error('unexpected native failure'));

    const error = await expectProcessingFailure(
      processImageInWorker(heicRequest(), testHooks().hooks),
      IMAGE_PROCESSING_ERROR_CODES.DecodeFailed,
    );

    expect(error.message).not.toContain('unexpected native failure');
  });

  it('respects cancellation checks threaded through the HEIC adapter call', async () => {
    heicDecodeMock.decodeHeic.mockImplementation(
      async (_file: Blob, checkCancelled: () => void) => {
        checkCancelled();

        return { data: new Uint8ClampedArray(800 * 600 * 4), width: 800, height: 600 };
      },
    );
    const { hooks } = testHooks({ isCancelled: () => true });

    await expectProcessingFailure(
      processImageInWorker(heicRequest(), hooks),
      IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled,
    );
  });

  it('rejects when the decoded HEIC raster does not match the expected dimensions', async () => {
    heicDecodeMock.decodeHeic.mockResolvedValue({
      data: new Uint8ClampedArray(801 * 600 * 4),
      width: 801,
      height: 600,
    });

    await expectProcessingFailure(
      processImageInWorker(heicRequest(), testHooks().hooks),
      IMAGE_PROCESSING_ERROR_CODES.DecodeFailed,
    );
  });

  it('closes the wrapped bitmap on cleanup for a HEIC job like any other format', async () => {
    heicDecodeMock.decodeHeic.mockResolvedValue({
      data: new Uint8ClampedArray(800 * 600 * 4),
      width: 800,
      height: 600,
    });

    await processImageInWorker(heicRequest(), testHooks().hooks);

    expect(createdBitmaps).toHaveLength(1);
    expect(createdBitmaps[0]?.closed).toBe(true);
  });
});
