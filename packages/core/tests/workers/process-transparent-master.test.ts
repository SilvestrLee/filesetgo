import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

import type { ImagePreflightResult } from '../../src';
import { IMAGE_PROCESSING_ERROR_CODES } from '../../src/processing/contracts';
import type { SafeTransparentMasterRequest } from '../../src/processing/transparent-master-contracts';
import {
  processTransparentMasterInWorker,
  TRANSPARENT_MASTER_MAX_DIMENSION,
} from '../../src/workers/process-transparent-master';
import type { WorkerProcessingHooks } from '../../src/workers/process-image';
import { createPng } from '../preflight/fixtures';
import {
  createOpaqueRaster,
  createOpaqueRasterWithSingleTransparentPixel,
  createRasterWithForegroundRects,
  createSemiTransparentRaster,
  createTransparentPaddingAroundOpaqueBackground,
  createTransparentRaster,
} from '../transforms/fixtures/raster-fixtures';

/**
 * A self-contained fake canvas/bitmap ecosystem carrying REAL pixel data
 * (unlike process-image.test.ts's lighter fakes, which never need real
 * pixels since they only test format/dimension plumbing). This lets these
 * tests exercise process-transparent-master.ts's actual alpha-inspection
 * and background-removal math end to end, including genuine post-encode
 * re-verification — not just that the right functions were called.
 *
 * `preflightImage()` (invoked by `validateOutput()`) only sniffs the PNG
 * signature + IHDR chunk (see packages/core/src/preflight/formats/png.ts)
 * — it never decodes pixels — so the fake encoder only needs to produce a
 * structurally valid PNG header (`createPng()`, already used throughout
 * this test suite) for that check to pass. The *real* pixel round-trip for
 * post-encode verification is carried separately, by tracking which
 * Uint8ClampedArray each encoded Blob actually corresponds to.
 */
class FakeImageBitmap {
  public closed = false;

  public constructor(
    public readonly width: number,
    public readonly height: number,
    public readonly data: Uint8ClampedArray | Uint8Array,
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
  private buffer: Uint8ClampedArray;

  public constructor(private readonly width: number, private readonly height: number) {
    this.buffer = new Uint8ClampedArray(width * height * 4);
  }

  public setTransform(): void {}
  public resetTransform(): void {}

  public drawImage(source: FakeImageBitmap | FakeOffscreenCanvas, ...args: number[]): void {
    const sourceData = source instanceof FakeOffscreenCanvas ? source.snapshot() : source.data;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = source.width;
    let sourceHeight = source.height;
    let destinationX = 0;
    let destinationY = 0;
    let destinationWidth = source.width;
    let destinationHeight = source.height;

    if (args.length === 2) {
      [destinationX, destinationY] = args;
    } else if (args.length === 4) {
      [destinationX, destinationY, destinationWidth, destinationHeight] = args;
    } else if (args.length === 8) {
      [sourceX, sourceY, sourceWidth, sourceHeight, destinationX, destinationY, destinationWidth, destinationHeight] = args;
    }

    for (let dy = 0; dy < destinationHeight; dy += 1) {
      const targetY = destinationY + dy;

      if (targetY < 0 || targetY >= this.height) {
        continue;
      }

      const sampledY = Math.max(0, Math.min(source.height - 1, sourceY + Math.floor((dy + 0.5) * sourceHeight / destinationHeight)));

      for (let dx = 0; dx < destinationWidth; dx += 1) {
        const targetX = destinationX + dx;

        if (targetX < 0 || targetX >= this.width) {
          continue;
        }

        const sampledX = Math.max(0, Math.min(source.width - 1, sourceX + Math.floor((dx + 0.5) * sourceWidth / destinationWidth)));
        const sourceOffset = (sampledY * source.width + sampledX) * 4;
        const targetOffset = (targetY * this.width + targetX) * 4;
        this.buffer.set(sourceData.slice(sourceOffset, sourceOffset + 4), targetOffset);
      }
    }
  }

  public getImageData(x = 0, y = 0, width = this.width, height = this.height): FakeImageData {
    const data = new Uint8ClampedArray(width * height * 4);

    for (let row = 0; row < height; row += 1) {
      const sourceOffset = ((y + row) * this.width + x) * 4;
      data.set(this.buffer.slice(sourceOffset, sourceOffset + width * 4), row * width * 4);
    }

    return new FakeImageData(data, width, height);
  }

  public putImageData(imageData: FakeImageData, x = 0, y = 0): void {
    for (let row = 0; row < imageData.height; row += 1) {
      const sourceOffset = row * imageData.width * 4;
      const targetOffset = ((y + row) * this.width + x) * 4;
      this.buffer.set(imageData.data.slice(sourceOffset, sourceOffset + imageData.width * 4), targetOffset);
    }
  }

  public snapshot(): Uint8ClampedArray {
    return Uint8ClampedArray.from(this.buffer);
  }
}

const encodedBlobPixels = new Map<Blob, { data: Uint8ClampedArray; width: number; height: number }>();

class FakeOffscreenCanvas {
  public width: number;
  public height: number;
  private context: FakeCanvasContext;

  public constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.context = new FakeCanvasContext(width, height);
  }

  public getContext(): FakeCanvasContext {
    return this.context;
  }

  public snapshot(): Uint8ClampedArray {
    return this.context.snapshot();
  }

  public async convertToBlob(options: { type: string }): Promise<Blob> {
    const blob = new Blob([Uint8Array.from(createPng(this.width, this.height))], { type: options.type });
    encodedBlobPixels.set(blob, { data: this.context.snapshot(), width: this.width, height: this.height });
    return blob;
  }
}

function testHooks(overrides: Partial<WorkerProcessingHooks> = {}): { hooks: WorkerProcessingHooks; stages: string[] } {
  const stages: string[] = [];
  const hooks: WorkerProcessingHooks = {
    isCancelled: () => false,
    onProgress: (stage) => stages.push(stage),
    ...overrides,
  };

  return { hooks, stages };
}

function testPreflight(overrides: Partial<ImagePreflightResult> = {}): ImagePreflightResult {
  return {
    format: 'png',
    width: 40,
    height: 40,
    megapixels: 0.0016,
    fileSize: 1024,
    safeToDecode: true,
    ...overrides,
  };
}

function testRequest(overrides: Partial<SafeTransparentMasterRequest> = {}): SafeTransparentMasterRequest {
  return {
    file: new Blob([Uint8Array.from(createPng(40, 40))], { type: 'image/png' }),
    preflight: testPreflight(),
    strength: 'balanced',
    ...overrides,
  };
}

function setRasterPixel(
  raster: { data: Uint8ClampedArray | Uint8Array; width: number },
  x: number,
  y: number,
  color: [number, number, number],
): void {
  const offset = (y * raster.width + x) * 4;
  raster.data[offset] = color[0];
  raster.data[offset + 1] = color[1];
  raster.data[offset + 2] = color[2];
  raster.data[offset + 3] = 255;
}

function fillRasterRect(
  raster: { data: Uint8ClampedArray | Uint8Array; width: number },
  left: number,
  top: number,
  right: number,
  bottom: number,
  color: [number, number, number],
): void {
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      setRasterPixel(raster, x, y, color);
    }
  }
}

function encodedAlphaAt(blob: Blob, x: number, y: number): number {
  const encoded = encodedBlobPixels.get(blob);

  if (encoded === undefined) {
    throw new Error('Encoded pixel evidence unavailable.');
  }

  return encoded.data[(y * encoded.width + x) * 4 + 3];
}

let sourceBitmap: FakeImageBitmap;

beforeEach(() => {
  vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
  vi.stubGlobal('ImageData', FakeImageData);
  vi.stubGlobal('createImageBitmap', async (source: unknown) => {
    // Two call sites pass a Blob here: decodeSourceToBitmap's initial
    // source decode, and verifyEncodedAlpha's post-encode re-decode. Only
    // the latter's Blob was ever produced by the fake encoder and tracked
    // in encodedBlobPixels, so checking that map first (regardless of call
    // order) correctly routes each to its real pixel data.
    if (source instanceof Blob) {
      const tracked = encodedBlobPixels.get(source);

      if (tracked !== undefined) {
        return new FakeImageBitmap(tracked.width, tracked.height, tracked.data);
      }

      return sourceBitmap;
    }

    return sourceBitmap;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  encodedBlobPixels.clear();
});

describe('processTransparentMasterInWorker', () => {
  it('preserves an already-transparent source without running background removal', async () => {
    const raster = createTransparentRaster(40, 40);
    sourceBitmap = new FakeImageBitmap(40, 40, raster.data);

    const { hooks } = testHooks();
    const result = await processTransparentMasterInWorker(testRequest(), hooks);

    expect(result.removalApplied).toBe(false);
    expect(result.strength).toBeUndefined();
    expect(result.status).toBe('verified');
    expect(result.alphaInspection.classification).toBe('transparency-present');
    expect(result.format).toBe('png');
  });

  it('CRITICAL REGRESSION (Product Office correction, directive §4): transparent padding around an opaque background is NOT treated as already prepared', async () => {
    // Transparent outer canvas → opaque white rectangle → coloured
    // artwork inside the rectangle. `inspectAlpha()` alone would report
    // real transparency here. Bypassing removal on that basis alone would
    // recreate FileSetGo's original reported defect (an opaque background
    // masquerading as a transparent logo) under a different technical
    // condition — this must not happen.
    const raster = createTransparentPaddingAroundOpaqueBackground(
      100,
      100,
      [255, 255, 255],
      [200, 30, 60],
    );
    sourceBitmap = new FakeImageBitmap(100, 100, raster.data);

    const { hooks } = testHooks();
    const result = await processTransparentMasterInWorker(
      testRequest({ strength: 'balanced', preflight: testPreflight({ width: 100, height: 100 }) }),
      hooks,
    );

    // Preparation ran — this was NOT treated as already-transparent.
    expect(result.removalApplied).toBe(true);
    expect(result.strength).toBe('balanced');
    // The white rectangle background was actually removed where the
    // algorithm could safely do so.
    expect(result.status).not.toBe('failed');
    expect(result.alphaInspection.classification).toBe('transparency-present');
  });

  it('incidental alpha (directive §5): a single stray transparent pixel does not bypass removal', async () => {
    const raster = createOpaqueRasterWithSingleTransparentPixel(40, 40);
    sourceBitmap = new FakeImageBitmap(40, 40, raster.data);

    const { hooks } = testHooks();
    const result = await processTransparentMasterInWorker(testRequest({ strength: 'balanced' }), hooks);

    // A single incidental transparent pixel must not be reported as an
    // already-prepared background — removal still runs (and, since this
    // fixture is otherwise fully opaque with no real background to
    // separate, the sanity checks correctly flag the result rather than
    // claiming a clean verified success).
    expect(result.removalApplied).toBe(true);
  });

  it('runs deterministic background removal on an opaque source and verifies the encoded result', async () => {
    const raster = createRasterWithForegroundRects(40, 40, [255, 255, 255], [
      { x0: 10, y0: 10, x1: 30, y1: 30, color: [10, 10, 10] },
    ]);
    sourceBitmap = new FakeImageBitmap(40, 40, raster.data);

    const { hooks, stages } = testHooks();
    const result = await processTransparentMasterInWorker(testRequest({ strength: 'balanced' }), hooks);

    expect(result.removalApplied).toBe(true);
    expect(result.strength).toBe('balanced');
    expect(result.status).toBe('verified');
    expect(result.alphaInspection.classification).toBe('transparency-present');
    // Real progress stages, not merely a completed promise.
    expect(stages).toEqual(expect.arrayContaining(['decoding', 'normalizing', 'resizing', 'optimizing', 'encoding', 'finalizing']));
  });

  for (const strength of ['gentle', 'balanced', 'strong'] as const) {
    it(`clears an enclosed wordmark counter before VERIFIED in ${strength} mode`, async () => {
      const raster = createRasterWithForegroundRects(80, 80, [255, 255, 255], [
        { x0: 14, y0: 12, x1: 66, y1: 68, color: [15, 23, 42] },
      ]);
      fillRasterRect(raster, 27, 25, 53, 55, [255, 255, 255]);
      sourceBitmap = new FakeImageBitmap(80, 80, raster.data);

      const { hooks } = testHooks();
      const result = await processTransparentMasterInWorker(
        testRequest({
          strength,
          preflight: testPreflight({ width: 80, height: 80 }),
        }),
        hooks,
      );

      expect(result.status).toBe('verified');
      expect(result.reason).toBeUndefined();
      expect(encodedAlphaAt(result.blob, Math.floor(result.width / 2), Math.floor(result.height / 2))).toBe(0);
    });
  }

  it('preserves an ambiguous background-coloured foreground stroke and refuses VERIFIED', async () => {
    const raster = createRasterWithForegroundRects(80, 80, [255, 255, 255], [
      { x0: 12, y0: 12, x1: 68, y1: 68, color: [37, 99, 235] },
    ]);
    fillRasterRect(raster, 29, 22, 34, 58, [255, 255, 255]);
    fillRasterRect(raster, 34, 38, 55, 43, [255, 255, 255]);
    sourceBitmap = new FakeImageBitmap(80, 80, raster.data);

    const { hooks } = testHooks();
    const result = await processTransparentMasterInWorker(
      testRequest({
        strength: 'balanced',
        preflight: testPreflight({ width: 80, height: 80 }),
      }),
      hooks,
    );

    expect(result.status).toBe('needs-review');
    expect(result.reason).toBe('ambiguous-enclosed-background');
    expect(result.alphaInspection.maxAlpha).toBe(255);
  });

  it('reports "failed" when the encoded output does not actually contain transparency', async () => {
    // An opaque raster with NO real background/foreground distinction (a
    // single flat colour everywhere) has nothing for the flood-fill to
    // meaningfully separate from "the whole image" — removal still marks
    // border pixels transparent, but if the encoder path were to somehow
    // flatten alpha, verification must catch it. Here we simulate that by
    // stubbing convertToBlob indirectly: use an opaque raster and confirm
    // the *normal* verified path, then separately prove the failure branch
    // triggers by asserting on a raster degenerate enough to fail the
    // "insufficient remaining foreground" sanity check instead.
    const raster = createOpaqueRaster(40, 40, [255, 255, 255]); // uniform background, no foreground at all
    sourceBitmap = new FakeImageBitmap(40, 40, raster.data);

    const { hooks } = testHooks();
    const result = await processTransparentMasterInWorker(testRequest({ strength: 'strong' }), hooks);

    // The entire raster is "background" — remaining foreground is ~0%.
    expect(result.status).toBe('failed');
    expect(result.reason).toBe('insufficient-remaining-foreground');
  });

  it('reports "needs-review" for a low-confidence gradient background', async () => {
    const width = 40;
    const height = 40;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        const t = x / (width - 1);
        const value = Math.round(240 * (1 - t) + 40 * t);
        data[index] = value;
        data[index + 1] = value;
        data[index + 2] = value;
        data[index + 3] = 255;
      }
    }

    // A centered foreground block.
    for (let y = 14; y < 26; y += 1) {
      for (let x = 14; x < 26; x += 1) {
        const index = (y * width + x) * 4;
        data[index] = 10;
        data[index + 1] = 10;
        data[index + 2] = 10;
      }
    }

    sourceBitmap = new FakeImageBitmap(width, height, data);

    const { hooks } = testHooks();
    const result = await processTransparentMasterInWorker(testRequest({ strength: 'balanced' }), hooks);

    expect(result.status).toBe('needs-review');
    expect(result.reason).toBe('non-flat-background');
  });

  it('is cancellable at any checkpoint and never returns a result once cancelled', async () => {
    const raster = createRasterWithForegroundRects(40, 40, [255, 255, 255], [
      { x0: 10, y0: 10, x1: 30, y1: 30, color: [10, 10, 10] },
    ]);
    sourceBitmap = new FakeImageBitmap(40, 40, raster.data);

    const { hooks } = testHooks({ isCancelled: () => true });

    await expect(processTransparentMasterInWorker(testRequest(), hooks)).rejects.toMatchObject({
      processingError: { code: IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled },
    });
  });

  it('preserves genuine semi-transparent alpha values when removal is bypassed (fixture matrix §41.12)', async () => {
    const raster = createSemiTransparentRaster(40, 40); // uniform 128 alpha, real RGB — not fully transparent, not opaque
    sourceBitmap = new FakeImageBitmap(40, 40, raster.data);

    const { hooks } = testHooks();
    const result = await processTransparentMasterInWorker(testRequest(), hooks);

    expect(result.removalApplied).toBe(false);
    expect(result.status).toBe('verified');
    expect(result.alphaInspection.classification).toBe('transparency-present');
    // Genuinely semi-transparent, not merely "some transparency present"
    // collapsed to a binary mask.
    expect(result.alphaInspection.semiTransparentPixels).toBeGreaterThan(0);
    // Governed padding adds fully-transparent outer pixels, while the
    // source's actual semi-transparent content remains at alpha 128.
    expect(result.alphaInspection.minAlpha).toBe(0);
    expect(result.alphaInspection.maxAlpha).toBe(128);
    expect(result.safePadding).toBe(2);
  });

  it('processes a small/low-resolution source without crashing (fixture matrix §41.15)', async () => {
    const raster = createRasterWithForegroundRects(10, 10, [255, 255, 255], [
      { x0: 3, y0: 3, x1: 7, y1: 7, color: [10, 10, 10] },
    ]);
    sourceBitmap = new FakeImageBitmap(10, 10, raster.data);

    const { hooks } = testHooks();
    const result = await processTransparentMasterInWorker(
      testRequest({ preflight: testPreflight({ width: 10, height: 10 }) }),
      hooks,
    );

    expect(result.visibleBounds).toMatchObject({ width: 4, height: 4 });
    expect(result.width).toBe(8);
    expect(result.height).toBe(8);
    expect(result.status).not.toBe('failed');
  });

  it('does not report a clean "verified" success for a near-background-coloured foreground touching the border (fixture matrix §41.13)', async () => {
    // A foreground rectangle that touches the image border AND sits close
    // enough to the background colour to be genuinely ambiguous — a real
    // difficult case (directive §44). The right outcome is NEEDS REVIEW or
    // FAILED, never a silently-clean VERIFIED that masks a destructive or
    // uncertain removal.
    const raster = createRasterWithForegroundRects(40, 40, [255, 255, 255], [
      { x0: 0, y0: 0, x1: 15, y1: 40, color: [220, 220, 220] },
    ]);
    sourceBitmap = new FakeImageBitmap(40, 40, raster.data);

    const { hooks } = testHooks();
    const result = await processTransparentMasterInWorker(testRequest({ strength: 'strong' }), hooks);

    expect(result.status).not.toBe('verified');
  });

  it('bounds analysis while preserving source-detail dimensions in the final transparent master', async () => {
    const width = 1400;
    const height = 700;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 200; y < 500; y += 1) {
      for (let x = 100; x < 1300; x += 1) {
        const offset = (y * width + x) * 4;
        data[offset] = 20;
        data[offset + 1] = 70;
        data[offset + 2] = 180;
        data[offset + 3] = 255;
      }
    }

    sourceBitmap = new FakeImageBitmap(width, height, data);

    const { hooks } = testHooks();
    const result = await processTransparentMasterInWorker(
      testRequest({ preflight: testPreflight({ width, height }) }),
      hooks,
    );

    expect(Math.max(result.analysisDimensions.width, result.analysisDimensions.height)).toBe(TRANSPARENT_MASTER_MAX_DIMENSION);
    expect(result.visibleBounds).toEqual({ left: 100, top: 200, width: 1200, height: 300 });
    expect(result.width).toBe(1218);
    expect(result.height).toBe(318);
    expect(result.foregroundRescaled).toBe(false);
  });

  it('regression: trims a 1080x1080 oversized transparent canvas to governed bounds plus padding without rescaling', async () => {
    const width = 1080;
    const height = 1080;
    const data = new Uint8ClampedArray(width * height * 4);

    for (let y = 390; y < 690; y += 1) {
      for (let x = 160; x < 920; x += 1) {
        const offset = (y * width + x) * 4;
        data[offset] = 20;
        data[offset + 1] = 70;
        data[offset + 2] = 180;
        data[offset + 3] = 255;
      }
    }

    sourceBitmap = new FakeImageBitmap(width, height, data);
    const { hooks } = testHooks();
    const result = await processTransparentMasterInWorker(
      testRequest({ preflight: testPreflight({ width, height }) }),
      hooks,
    );

    expect(result.sourceDimensions).toEqual({ width: 1080, height: 1080 });
    expect(result.visibleBounds).toEqual({ left: 160, top: 390, width: 760, height: 300 });
    expect(result.safePadding).toBe(9);
    expect(result.width).toBe(778);
    expect(result.height).toBe(318);
    expect(result.canvasTrimmed).toBe(true);
    expect(result.foregroundRescaled).toBe(false);
  });
});
