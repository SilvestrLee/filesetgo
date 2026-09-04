import { unzipSync } from 'fflate';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImagePreflightResult } from '../../src';
import { MAX_PACKAGE_TOTAL_OUTPUT_BYTES } from '../../src/processing/image-set-limits';
import type { SafeImageProcessingSetRequest } from '../../src/processing/image-set-contracts';
import type { ImageSetProcessingHooks } from '../../src/workers/process-image-set';
import { processImageSetInWorker } from '../../src/workers/process-image-set';
import { createJpeg, createPng, createVp8ExtendedWebp } from '../preflight/fixtures';

// See process-image.test.ts for the rationale: processImageSetInWorker only
// ever reaches the real HEIC adapter through a dynamic import, so it can be
// mocked here to prove HEIC sources decode exactly once regardless of how
// many outputs are requested, without depending on the real WASM codec.
const heicDecodeMock = vi.hoisted(() => ({ decodeHeic: vi.fn() }));

vi.mock('../../src/workers/heic-decode', () => ({
  decodeHeic: heicDecodeMock.decodeHeic,
  HeicDecodeError: class MockHeicDecodeError extends Error {},
}));

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

class FakeImageData {
  public constructor(
    public readonly data: Uint8ClampedArray,
    public readonly width: number,
    public readonly height: number,
  ) {}
}

class FakeCanvasContext {
  public imageSmoothingEnabled = false;
  public imageSmoothingQuality = '';
  public setTransform(): void {}
  public resetTransform(): void {}
  public drawImage(): void {}
}

type EncodeOptions = { type: string; quality?: number };
let encodeCalls: EncodeOptions[];
let canvasSizes: Array<{ width: number; height: number }>;
let bitmapCreateCount: number;

class FakeOffscreenCanvas {
  public width: number;
  public height: number;

  public constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    canvasSizes.push({ width, height });
  }

  public getContext(): FakeCanvasContext {
    return new FakeCanvasContext();
  }

  public async convertToBlob(options: EncodeOptions): Promise<Blob> {
    encodeCalls.push(options);
    return encodeHandler(options, this.width, this.height);
  }
}

type EncodeHandler = (options: EncodeOptions, width: number, height: number) => Promise<Blob>;
let encodeHandler: EncodeHandler;
let bitmapHandler: () => Promise<FakeImageBitmap>;

/** Builds a real, parseable image at exactly `byteSize` bytes (see process-image-to-target.test.ts for the same pattern). */
function encodeAtSize(format: 'jpeg' | 'png' | 'webp', width: number, height: number, byteSize: number): Blob {
  let natural: Uint8Array;
  let mimeType: string;

  if (format === 'jpeg') {
    natural = Uint8Array.from(createJpeg(width, height));
    mimeType = 'image/jpeg';
  } else if (format === 'png') {
    natural = Uint8Array.from(createPng(width, height));
    mimeType = 'image/png';
  } else {
    natural = Uint8Array.from(createVp8ExtendedWebp(width, height));
    mimeType = 'image/webp';
  }

  const finalSize = Math.max(byteSize, natural.byteLength);
  const bytes = new Uint8Array(finalSize);
  bytes.set(natural);

  if (format === 'webp') {
    const view = new DataView(bytes.buffer);
    view.setUint32(4, finalSize - 8, true);
  }

  return new Blob([bytes], { type: mimeType });
}

function formatFromMime(type: string): 'jpeg' | 'png' | 'webp' {
  if (type === 'image/jpeg') return 'jpeg';
  if (type === 'image/png') return 'png';
  return 'webp';
}

function testHooks(overrides: Partial<ImageSetProcessingHooks> = {}): {
  hooks: ImageSetProcessingHooks;
  stages: Array<{ stage: string; assetIndex?: number; assetCount?: number }>;
} {
  const stages: Array<{ stage: string; assetIndex?: number; assetCount?: number }> = [];
  const hooks: ImageSetProcessingHooks = {
    isCancelled: () => false,
    onProgress: (stage, asset) => stages.push({ stage, assetIndex: asset?.index, assetCount: asset?.count }),
    ...overrides,
  };
  return { hooks, stages };
}

function testPreflight(overrides: Partial<ImagePreflightResult> = {}): ImagePreflightResult {
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

function testRequest(overrides: Partial<SafeImageProcessingSetRequest> = {}): SafeImageProcessingSetRequest {
  return {
    file: new Blob([Uint8Array.of(0xff, 0xd8, 0xff, 0xd9)], { type: 'image/jpeg' }),
    preflight: testPreflight(),
    outputs: [
      { id: 'a', filename: 'a.webp', output: { format: 'webp' } },
      { id: 'b', filename: 'b.webp', output: { format: 'webp' } },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  encodeCalls = [];
  canvasSizes = [];
  bitmapCreateCount = 0;
  encodeHandler = async (options, width, height) => encodeAtSize(formatFromMime(options.type), width, height, 500);
  bitmapHandler = async () => {
    bitmapCreateCount += 1;
    return new FakeImageBitmap(800, 600);
  };

  vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
  vi.stubGlobal('ImageData', FakeImageData);
  vi.stubGlobal('createImageBitmap', () => bitmapHandler());
  heicDecodeMock.decodeHeic.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('processImageSetInWorker — multi-output generation', () => {
  it('produces two outputs from one source, in requested order', async () => {
    const result = await processImageSetInWorker(testRequest(), testHooks().hooks);

    expect(result.assets.map((asset) => asset.id)).toEqual(['a', 'b']);
    expect(result.assetCount).toBe(2);
    expect(result.totalOutputBytes).toBe(result.assets[0].byteSize + result.assets[1].byteSize);
  });

  it('produces mixed JPEG/PNG/WebP outputs from one source', async () => {
    const result = await processImageSetInWorker(
      testRequest({
        outputs: [
          { id: 'j', filename: 'j.jpg', output: { format: 'jpeg' } },
          { id: 'p', filename: 'p.png', output: { format: 'png' } },
          { id: 'w', filename: 'w.webp', output: { format: 'webp' } },
        ],
      }),
      testHooks().hooks,
    );

    expect(result.assets.map((asset) => asset.format)).toEqual(['jpeg', 'png', 'webp']);
  });

  it('preserves requested order even when sizes differ per output', async () => {
    encodeHandler = async (options, width, height) => {
      const size = options.type === 'image/jpeg' ? 900 : 400;
      return encodeAtSize(formatFromMime(options.type), width, height, size);
    };

    const result = await processImageSetInWorker(
      testRequest({
        outputs: [
          { id: 'small', filename: 'small.webp', output: { format: 'webp' } },
          { id: 'large', filename: 'large.jpg', output: { format: 'jpeg' } },
        ],
      }),
      testHooks().hooks,
    );

    expect(result.assets.map((asset) => asset.id)).toEqual(['small', 'large']);
  });

  it('decodes the source exactly once regardless of output count', async () => {
    await processImageSetInWorker(
      testRequest({
        outputs: [
          { id: 'a', filename: 'a.webp', output: { format: 'webp' } },
          { id: 'b', filename: 'b.png', output: { format: 'png' } },
          { id: 'c', filename: 'c.jpg', output: { format: 'jpeg' } },
        ],
      }),
      testHooks().hooks,
    );

    expect(bitmapCreateCount).toBe(1);
  });

  it('decodes a HEIC source exactly once for multiple outputs, and never requests HEIC output', async () => {
    heicDecodeMock.decodeHeic.mockResolvedValue({
      data: new Uint8ClampedArray(800 * 600 * 4),
      width: 800,
      height: 600,
    });

    const result = await processImageSetInWorker(
      testRequest({
        preflight: testPreflight({ format: 'heic' }),
        outputs: [
          { id: 'a', filename: 'a.webp', output: { format: 'webp' } },
          { id: 'b', filename: 'b.jpg', output: { format: 'jpeg' } },
        ],
      }),
      testHooks().hooks,
    );

    expect(heicDecodeMock.decodeHeic).toHaveBeenCalledTimes(1);
    expect(result.assets.map((asset) => asset.format)).toEqual(['webp', 'jpeg']);
  });

  it('reuses the normalized source dimensions across every output', async () => {
    const result = await processImageSetInWorker(testRequest(), testHooks().hooks);

    for (const asset of result.assets) {
      expect(asset.sourceDimensions).toEqual({ width: 800, height: 600 });
      expect(asset.normalizedDimensions).toEqual({ width: 800, height: 600 });
    }
  });

  it('applies per-output resize independently', async () => {
    const result = await processImageSetInWorker(
      testRequest({
        outputs: [
          { id: 'full', filename: 'full.webp', output: { format: 'webp' } },
          { id: 'small', filename: 'small.webp', output: { format: 'webp' }, resize: { maxWidth: 200, maxHeight: 200 } },
        ],
      }),
      testHooks().hooks,
    );

    expect(result.assets[0].width).toBe(800);
    expect(result.assets[1].width).toBeLessThanOrEqual(200);
  });

  it('reports asset index/count through progress hooks', async () => {
    const { hooks, stages } = testHooks();
    await processImageSetInWorker(testRequest(), hooks);

    const encodingStages = stages.filter((s) => s.stage === 'encoding');
    expect(encodingStages).toEqual([
      { stage: 'encoding', assetIndex: 1, assetCount: 2 },
      { stage: 'encoding', assetIndex: 2, assetCount: 2 },
    ]);
  });

  it('fails the entire operation when one required output fails validation, without returning partial assets', async () => {
    encodeHandler = async (options, width, height) => {
      if (options.type === 'image/png') {
        // Mislabeled: claims PNG but contains JPEG bytes, so real preflight-based validation fails it.
        return new Blob([Uint8Array.from(createJpeg(width, height))], { type: 'image/png' });
      }

      return encodeAtSize(formatFromMime(options.type), width, height, 500);
    };

    await expect(
      processImageSetInWorker(
        testRequest({
          outputs: [
            { id: 'ok', filename: 'ok.webp', output: { format: 'webp' } },
            { id: 'bad', filename: 'bad.png', output: { format: 'png' } },
          ],
        }),
        testHooks().hooks,
      ),
    ).rejects.toThrow();
  });
});

describe('processImageSetInWorker — package byte limit', () => {
  it('accepts outputs whose combined size sits exactly at the package limit', async () => {
    const half = MAX_PACKAGE_TOTAL_OUTPUT_BYTES / 2;
    encodeHandler = async (options, width, height) => encodeAtSize(formatFromMime(options.type), width, height, half);

    const result = await processImageSetInWorker(testRequest(), testHooks().hooks);

    expect(result.totalOutputBytes).toBe(MAX_PACKAGE_TOTAL_OUTPUT_BYTES);
  });

  it('rejects once the running total exceeds the package limit', async () => {
    let call = 0;
    encodeHandler = async (options, width, height) => {
      call += 1;
      const size = call === 1 ? MAX_PACKAGE_TOTAL_OUTPUT_BYTES - 1024 : 2048;
      return encodeAtSize(formatFromMime(options.type), width, height, size);
    };

    await expect(processImageSetInWorker(testRequest(), testHooks().hooks)).rejects.toMatchObject({
      processingError: { code: 'PACKAGE_OUTPUT_TOO_LARGE' },
    });
  });
}, 20_000);

describe('processImageSetInWorker — cancellation', () => {
  it('stops between assets when cancelled after the first completes', async () => {
    let completedAssets = 0;
    const { hooks } = testHooks({
      isCancelled: () => completedAssets >= 1,
    });
    encodeHandler = async (options, width, height) => {
      const blob = encodeAtSize(formatFromMime(options.type), width, height, 500);
      completedAssets += 1;
      return blob;
    };

    await expect(processImageSetInWorker(testRequest(), hooks)).rejects.toMatchObject({
      processingError: { code: 'PROCESSING_CANCELLED' },
    });
  });

  it('stops mid-asset when cancelled during creation', async () => {
    let drawCount = 0;
    const { hooks } = testHooks({
      isCancelled: () => drawCount >= 1,
    });
    encodeHandler = async (options, width, height) => {
      drawCount += 1;
      return encodeAtSize(formatFromMime(options.type), width, height, 500);
    };

    await expect(processImageSetInWorker(testRequest(), hooks)).rejects.toMatchObject({
      processingError: { code: 'PROCESSING_CANCELLED' },
    });
  });

  it('closes the decoded bitmap and releases the canvas even when cancelled', async () => {
    let bitmap: FakeImageBitmap | undefined;
    let decoded = false;
    bitmapHandler = async () => {
      bitmap = new FakeImageBitmap(800, 600);
      decoded = true;
      return bitmap;
    };
    const { hooks } = testHooks({ isCancelled: () => decoded });

    await expect(processImageSetInWorker(testRequest(), hooks)).rejects.toBeDefined();

    expect(bitmap?.closed).toBe(true);
  });
});

describe('processImageSetInWorker — archive creation', () => {
  it('produces a ZIP archive containing exactly the requested assets', async () => {
    const result = await processImageSetInWorker(
      testRequest({ archive: { filename: 'package.zip' } }),
      testHooks().hooks,
    );

    expect(result.archive).toBeDefined();
    expect(result.archive?.filename).toBe('package.zip');
    expect(result.archive?.blob.type).toBe('application/zip');

    const zipBytes = new Uint8Array(await result.archive!.blob.arrayBuffer());
    const unzipped = unzipSync(zipBytes);

    expect(Object.keys(unzipped)).toEqual(['a.webp', 'b.webp']);
  });

  it('does not create an archive when none is requested', async () => {
    const result = await processImageSetInWorker(testRequest(), testHooks().hooks);
    expect(result.archive).toBeUndefined();
  });

  it('reports a packaging progress stage before archive creation', async () => {
    const { hooks, stages } = testHooks();
    await processImageSetInWorker(testRequest({ archive: { filename: 'package.zip' } }), hooks);

    expect(stages.some((s) => s.stage === 'packaging')).toBe(true);
  });
});
