import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImagePreflightResult } from '../../src';
import {
  MAX_DIMENSION_TIERS,
  MAX_QUALITY_PROBES_PER_TIER,
  MIN_DIMENSION_PX,
} from '../../src/processing/target-size-limits';
import type {
  SafeImageProcessingTargetRequest,
  TargetSizeQualityRange,
} from '../../src/processing/target-size-contracts';
import type { WorkerProcessingHooks } from '../../src/workers/process-image';
import { processImageToTargetInWorker } from '../../src/workers/process-image-to-target';
import { createJpeg, createPng, createVp8ExtendedWebp } from '../preflight/fixtures';

// --- Fake browser APIs (Node has neither OffscreenCanvas nor createImageBitmap/ImageData). ---

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
let canvasesCreated: FakeOffscreenCanvas[];

class FakeOffscreenCanvas {
  public width: number;
  public height: number;

  public constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    canvasesCreated.push(this);
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

/**
 * Builds a real, parseable image at exactly `byteSize` bytes by padding a
 * minimal real fixture with trailing bytes after its terminator (which
 * preflightImage's bounded header parsing never inspects). WebP requires
 * its RIFF container-length field to match the true size, so it is
 * patched after padding rather than just appended to.
 */
function encodeAtSize(
  format: 'jpeg' | 'png' | 'webp',
  width: number,
  height: number,
  byteSize: number,
): Blob {
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

/** A simple, strictly-increasing-in-quality byte-size model for test scenarios. */
function modelByteSize(width: number, height: number, quality: number | undefined): number {
  const base = 200 + width * height * 0.02;
  const qualityContribution = quality === undefined ? 0 : quality * 100_000;
  return Math.round(base + qualityContribution);
}

function modelEncodeHandler(format: 'jpeg' | 'png' | 'webp'): EncodeHandler {
  return async (options, width, height) => {
    const quality = options.quality;
    const byteSize = modelByteSize(width, height, quality);
    return encodeAtSize(format, width, height, byteSize);
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

const DEFAULT_QUALITY_RANGE: TargetSizeQualityRange = { minQuality: 0.6, maxQuality: 0.95 };

function testRequest(
  overrides: Partial<SafeImageProcessingTargetRequest> = {},
): SafeImageProcessingTargetRequest {
  return {
    file: new Blob([Uint8Array.of(0xff, 0xd8, 0xff, 0xd9)], { type: 'image/jpeg' }),
    preflight: testPreflight(),
    targetBytes: 100_000,
    output: { format: 'jpeg' },
    dimensionPolicy: 'flexible',
    qualityRange: DEFAULT_QUALITY_RANGE,
    ...overrides,
  };
}

beforeEach(() => {
  encodeCalls = [];
  canvasesCreated = [];
  encodeHandler = modelEncodeHandler('jpeg');
  bitmapHandler = async () => new FakeImageBitmap(800, 600);

  vi.stubGlobal('OffscreenCanvas', FakeOffscreenCanvas);
  vi.stubGlobal('ImageData', FakeImageData);
  vi.stubGlobal('createImageBitmap', () => bitmapHandler());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('processImageToTargetInWorker JPEG', () => {
  it('meets the target with the initial candidate already under target (1 probe)', async () => {
    const { hooks } = testHooks();
    const outcome = await processImageToTargetInWorker(
      testRequest({ targetBytes: 1_000_000 }),
      hooks,
    );

    expect(outcome.status).toBe('met');
    if (outcome.status === 'met') {
      expect(outcome.result.targetMet).toBe(true);
      expect(outcome.result.byteSize).toBeLessThanOrEqual(1_000_000);
      expect(outcome.result.qualityProbeCount).toBe(1);
      expect(outcome.result.dimensionTierCount).toBe(1);
      expect(outcome.result.dimensionsReduced).toBe(false);
      expect(outcome.result.quality).toBe(0.95);
    }
  });

  it('meets the target purely through quality reduction, choosing the highest valid tested quality', async () => {
    // base ~ 200 + 800*600*0.02 = 9800; quality*100000. minQuality(0.6) -> ~69800,
    // maxQuality(0.95) -> ~104800. Target 80000 sits between them: needs a search,
    // and is reachable without any dimension reduction.
    const outcome = await processImageToTargetInWorker(
      testRequest({ targetBytes: 80_000 }),
      testHooks().hooks,
    );

    expect(outcome.status).toBe('met');
    if (outcome.status === 'met') {
      expect(outcome.result.byteSize).toBeLessThanOrEqual(80_000);
      expect(outcome.result.dimensionsReduced).toBe(false);
      expect(outcome.result.dimensionTierCount).toBe(1);
      expect(outcome.result.quality).toBeLessThan(0.95);
    }
  });

  it('never performs more than MAX_QUALITY_PROBES_PER_TIER encodes at a single tier', async () => {
    await processImageToTargetInWorker(
      testRequest({ targetBytes: 60_000, dimensionPolicy: 'hard' }),
      testHooks().hooks,
    );

    expect(encodeCalls.length).toBeLessThanOrEqual(MAX_QUALITY_PROBES_PER_TIER);
  });

  it('reports TARGET_UNREACHABLE_HARD_DIMENSIONS when hard dimensions cannot meet target even at minQuality', async () => {
    const outcome = await processImageToTargetInWorker(
      testRequest({ targetBytes: 5000, dimensionPolicy: 'hard' }),
      testHooks().hooks,
    );

    expect(outcome.status).toBe('unreachable');
    if (outcome.status === 'unreachable') {
      expect(outcome.outcome.code).toBe('TARGET_UNREACHABLE_HARD_DIMENSIONS');
      expect(outcome.outcome.dimensionTierCount).toBe(1);
      expect(outcome.outcome.bestAttempt).toBeDefined();
    }
    // Hard policy: exactly one tier attempted, at most 5 probes for it.
    expect(encodeCalls.length).toBeLessThanOrEqual(MAX_QUALITY_PROBES_PER_TIER);
  });

  it('steps down dimensions (flexible) after quality search fails at the initial tier', async () => {
    // At 800x600, base ~9800; even minQuality (0.6) -> 9800+60000=69800.
    // A target between the smaller-tier minimum and the initial-tier minimum
    // forces a dimension step-down.
    const outcome = await processImageToTargetInWorker(
      testRequest({ targetBytes: 65_000 }),
      testHooks().hooks,
    );

    expect(outcome.status).toBe('met');
    if (outcome.status === 'met') {
      expect(outcome.result.dimensionsReduced).toBe(true);
      expect(outcome.result.dimensionTierCount).toBeGreaterThan(1);
      expect(outcome.result.width).toBeLessThan(800);
      expect(outcome.result.height).toBeLessThan(600);
      // Aspect ratio preserved (800x600 = 4:3).
      expect(outcome.result.width / outcome.result.height).toBeCloseTo(800 / 600, 1);
    }
  });

  it('reports TARGET_UNREACHABLE_MIN_DIMENSIONS when even the smallest tier cannot meet target (flexible)', async () => {
    const outcome = await processImageToTargetInWorker(
      testRequest({ targetBytes: 500 }),
      testHooks().hooks,
    );

    expect(outcome.status).toBe('unreachable');
    if (outcome.status === 'unreachable') {
      expect(outcome.outcome.code).toBe('TARGET_UNREACHABLE_MIN_DIMENSIONS');
      expect(outcome.outcome.dimensionTierCount).toBeGreaterThan(1);
    }
  });

  it('bounds total encode attempts deterministically (dimensionTiers x probesPerTier)', async () => {
    await processImageToTargetInWorker(
      testRequest({ targetBytes: 500 }),
      testHooks().hooks,
    );

    expect(encodeCalls.length).toBeLessThanOrEqual((MAX_DIMENSION_TIERS + 1) * MAX_QUALITY_PROBES_PER_TIER);
  });
});

describe('processImageToTargetInWorker WebP', () => {
  beforeEach(() => {
    encodeHandler = modelEncodeHandler('webp');
  });

  it('meets the target through quality reduction', async () => {
    const outcome = await processImageToTargetInWorker(
      testRequest({
        preflight: testPreflight({ format: 'webp' }),
        output: { format: 'webp' },
        targetBytes: 80_000,
      }),
      testHooks().hooks,
    );

    expect(outcome.status).toBe('met');
    if (outcome.status === 'met') {
      expect(outcome.result.format).toBe('webp');
      expect(outcome.result.byteSize).toBeLessThanOrEqual(80_000);
    }
  });

  it('reports unreachable under hard dimensions', async () => {
    const outcome = await processImageToTargetInWorker(
      testRequest({
        preflight: testPreflight({ format: 'webp' }),
        output: { format: 'webp' },
        targetBytes: 5000,
        dimensionPolicy: 'hard',
      }),
      testHooks().hooks,
    );

    expect(outcome.status).toBe('unreachable');
  });
});

describe('processImageToTargetInWorker PNG (lossless, no fake quality search)', () => {
  beforeEach(() => {
    encodeHandler = modelEncodeHandler('png');
  });

  it('meets the target with the initial candidate under target using exactly 1 encode', async () => {
    const outcome = await processImageToTargetInWorker(
      testRequest({
        preflight: testPreflight({ format: 'png' }),
        output: { format: 'png' },
        targetBytes: 1_000_000,
      }),
      testHooks().hooks,
    );

    expect(outcome.status).toBe('met');
    if (outcome.status === 'met') {
      expect(outcome.result.format).toBe('png');
      expect(outcome.result.quality).toBeUndefined();
      expect(outcome.result.qualityProbeCount).toBe(1);
      expect(outcome.result.dimensionTierCount).toBe(1);
    }
    expect(encodeCalls).toHaveLength(1);
    expect(encodeCalls[0].quality).toBeUndefined();
  });

  it('reports unreachable under hard dimensions after exactly 1 encode (no quality search)', async () => {
    const outcome = await processImageToTargetInWorker(
      testRequest({
        preflight: testPreflight({ format: 'png' }),
        output: { format: 'png' },
        targetBytes: 500,
        dimensionPolicy: 'hard',
      }),
      testHooks().hooks,
    );

    expect(outcome.status).toBe('unreachable');
    expect(encodeCalls).toHaveLength(1);
  });

  it('reduces dimensions (flexible) with exactly 1 encode per tier attempted', async () => {
    const outcome = await processImageToTargetInWorker(
      testRequest({
        preflight: testPreflight({ format: 'png' }),
        output: { format: 'png' },
        targetBytes: 5000,
      }),
      testHooks().hooks,
    );

    if (outcome.status === 'met') {
      expect(encodeCalls).toHaveLength(outcome.result.dimensionTierCount);
    } else {
      expect(encodeCalls.length).toBe(outcome.outcome.dimensionTierCount);
    }

    for (const call of encodeCalls) {
      expect(call.quality).toBeUndefined();
    }
  });
});

describe('processImageToTargetInWorker HEIC input', () => {
  const heicDecodeMock = vi.hoisted(() => ({ decodeHeic: vi.fn() }));

  vi.mock('../../src/workers/heic-decode', () => ({
    decodeHeic: heicDecodeMock.decodeHeic,
    HeicDecodeError: class extends Error {
      public constructor(
        public readonly code: string,
        message: string,
      ) {
        super(message);
      }
    },
  }));

  beforeEach(() => {
    heicDecodeMock.decodeHeic.mockReset();
    heicDecodeMock.decodeHeic.mockResolvedValue({
      data: new Uint8ClampedArray(800 * 600 * 4),
      width: 800,
      height: 600,
    });
  });

  it.each(['jpeg', 'png', 'webp'] as const)('processes HEIC input to %s target-size output', async (format) => {
    encodeHandler = modelEncodeHandler(format);

    const outcome = await processImageToTargetInWorker(
      testRequest({
        preflight: testPreflight({ format: 'heic' }),
        output: { format },
        targetBytes: 1_000_000,
      }),
      testHooks().hooks,
    );

    expect(outcome.status).toBe('met');
    expect(heicDecodeMock.decodeHeic).toHaveBeenCalledTimes(1);
    if (outcome.status === 'met') {
      expect(outcome.result.format).toBe(format);
    }
  });
});

describe('processImageToTargetInWorker cancellation', () => {
  it('stops before the first probe when already cancelled', async () => {
    const { hooks } = testHooks({ isCancelled: () => true });

    await expect(processImageToTargetInWorker(testRequest(), hooks)).rejects.toMatchObject({
      processingError: { code: 'PROCESSING_CANCELLED' },
    });
    expect(encodeCalls).toHaveLength(0);
  });

  it('stops mid quality-probe-sequence and still releases the decoded bitmap', async () => {
    const bitmaps: FakeImageBitmap[] = [];
    bitmapHandler = async () => {
      const bitmap = new FakeImageBitmap(800, 600);
      bitmaps.push(bitmap);
      return bitmap;
    };
    let calls = 0;
    const { hooks } = testHooks({
      isCancelled: () => {
        calls += 1;
        return calls > 4;
      },
    });

    await expect(
      processImageToTargetInWorker(testRequest({ targetBytes: 60_000 }), hooks),
    ).rejects.toMatchObject({ processingError: { code: 'PROCESSING_CANCELLED' } });

    expect(bitmaps[0]?.closed).toBe(true);
  });

  it('stops before a dimension-tier transition', async () => {
    let calls = 0;
    const { hooks } = testHooks({
      isCancelled: () => {
        calls += 1;
        // Allow the first tier's full quality search to fail, then cancel
        // right as the loop would move to tier 1.
        return calls > 10;
      },
    });

    await expect(
      processImageToTargetInWorker(testRequest({ targetBytes: 65_000 }), hooks),
    ).rejects.toMatchObject({ processingError: { code: 'PROCESSING_CANCELLED' } });
  });
});

describe('processImageToTargetInWorker output validation', () => {
  it('never returns a result whose byteSize exceeds targetBytes', async () => {
    const outcome = await processImageToTargetInWorker(
      testRequest({ targetBytes: 80_000 }),
      testHooks().hooks,
    );

    expect(outcome.status).toBe('met');
    if (outcome.status === 'met') {
      expect(outcome.result.byteSize).toBeLessThanOrEqual(80_000);
    }
  });

  it('runs real output validation (rejects a mislabeled encoder result)', async () => {
    encodeHandler = async (options, width, height) => {
      // Encode PNG bytes but claim the JPEG mime type — output validation
      // must catch this the same way it does for the standard pipeline.
      const pngBytes = Uint8Array.from(createPng(width, height));
      return new Blob([pngBytes], { type: options.type });
    };

    await expect(
      processImageToTargetInWorker(testRequest({ targetBytes: 1_000_000 }), testHooks().hooks),
    ).rejects.toMatchObject({ processingError: { code: 'OUTPUT_VALIDATION_FAILED' } });
  });
});
