import { getNormalizedDimensions } from '../normalize/orientation';
import { DEFAULT_SAFETY_LIMITS } from '../preflight/safety';
import {
  IMAGE_PROCESSING_ERROR_CODES,
  OUTPUT_IMAGE_MIME_TYPES,
  type ImageDimensions,
  type OutputImageFormat,
} from '../processing/contracts';
import {
  TARGET_SIZE_ERROR_CODES,
  type SafeImageProcessingTargetRequest,
  type TargetSizeResult,
  type TargetSizeUnreachable,
} from '../processing/target-size-contracts';
import { calculateDimensionTiers } from '../transforms/dimension-tiers';
import { calculateResizePlan } from '../transforms/resize';
import { boundedQualitySearch } from '../transforms/quality-search';
import {
  assertDecodedDimensionsMatch,
  assertNotCancelled,
  checkRuntimeSupport,
  createRenderCanvas,
  decodeSourceToBitmap,
  drawBitmapToCanvas,
  fail,
  validateOutput,
  type WorkerProcessingHooks,
} from './process-image';

export type TargetSizeWorkerOutcome =
  | { status: 'met'; result: TargetSizeResult }
  | { status: 'unreachable'; outcome: TargetSizeUnreachable };

interface BestCandidate {
  blob: Blob;
  byteSize: number;
  width: number;
  height: number;
  quality?: number;
}

async function encodeCandidate(
  canvas: OffscreenCanvas,
  format: OutputImageFormat,
  quality: number | undefined,
): Promise<{ blob: Blob; byteSize: number }> {
  let blob: Blob;

  try {
    blob = await canvas.convertToBlob({
      type: OUTPUT_IMAGE_MIME_TYPES[format],
      ...(format === 'png' || quality === undefined ? {} : { quality }),
    });
  } catch {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.EncodeFailed,
      'The image could not be encoded in the requested format.',
    );
  }

  return { blob, byteSize: blob.size };
}

/**
 * The FSG-002 bounded target-file-size engine. Reuses the FSG-001 decode/
 * render/validate primitives (workers/process-image.ts) rather than a
 * parallel pipeline — only the dimension-tier × quality-probe search loop
 * and its structured outcome are new.
 *
 * Total possible encodes is deterministically bounded (directive §26):
 *   - HARD:     1 dimension tier   × up to 5 quality probes (JPEG/WebP), or 1 encode (PNG)
 *   - FLEXIBLE: up to 7 dimension tiers (MAX_DIMENSION_TIERS + the initial
 *               candidate) × up to 5 quality probes each (JPEG/WebP), or
 *               up to 7 encodes (PNG)
 * i.e. at most 35 encodes for JPEG/WebP FLEXIBLE, 5 for JPEG/WebP HARD,
 * 7 for PNG FLEXIBLE, 1 for PNG HARD.
 */
export async function processImageToTargetInWorker(
  request: SafeImageProcessingTargetRequest,
  hooks: WorkerProcessingHooks,
): Promise<TargetSizeWorkerOutcome> {
  checkRuntimeSupport();

  const sourceDimensions: ImageDimensions = {
    width: request.preflight.width,
    height: request.preflight.height,
  };
  const orientation = request.preflight.orientation ?? 1;
  const normalizedDimensions = getNormalizedDimensions(
    sourceDimensions.width,
    sourceDimensions.height,
    orientation,
  );
  const initialPlan = calculateResizePlan(
    normalizedDimensions.width,
    normalizedDimensions.height,
    {
      maxWidth: request.dimensions?.maxWidth,
      maxHeight: request.dimensions?.maxHeight,
      allowUpscale: false,
    },
  );

  if (initialPlan.width * initialPlan.height > DEFAULT_SAFETY_LIMITS.maxDecodedPixels) {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
      'The requested output dimensions exceed the decoded-pixel safety limit.',
      {
        width: initialPlan.width,
        height: initialPlan.height,
        maximumDecodedPixels: DEFAULT_SAFETY_LIMITS.maxDecodedPixels,
      },
    );
  }

  const tiers = request.dimensionPolicy === 'hard'
    ? [{ width: initialPlan.width, height: initialPlan.height, tier: 0 }]
    : calculateDimensionTiers(initialPlan.width, initialPlan.height);

  let bitmap: ImageBitmap | undefined;
  let canvas: OffscreenCanvas | undefined;
  let best: BestCandidate | undefined;
  let closestMiss: BestCandidate | undefined;
  let qualityProbeCount = 0;
  let dimensionTierCount = 0;

  try {
    assertNotCancelled(hooks);
    hooks.onProgress('decoding');
    bitmap = await decodeSourceToBitmap(request.preflight.format, request.file, hooks);
    assertNotCancelled(hooks);
    assertDecodedDimensionsMatch(bitmap, sourceDimensions);

    hooks.onProgress('normalizing');
    hooks.onProgress('optimizing');

    for (const tierDimensions of tiers) {
      assertNotCancelled(hooks);
      dimensionTierCount += 1;

      if (canvas !== undefined) {
        canvas.width = 0;
        canvas.height = 0;
      }

      canvas = createRenderCanvas(tierDimensions);
      drawBitmapToCanvas(canvas, bitmap, orientation, sourceDimensions);
      assertNotCancelled(hooks);

      if (request.output.format === 'png') {
        qualityProbeCount += 1;
        const encoded = await encodeCandidate(canvas, 'png', undefined);
        assertNotCancelled(hooks);
        const candidate: BestCandidate = {
          blob: encoded.blob,
          byteSize: encoded.byteSize,
          width: tierDimensions.width,
          height: tierDimensions.height,
        };

        if (closestMiss === undefined || candidate.byteSize < closestMiss.byteSize) {
          closestMiss = candidate;
        }

        if (encoded.byteSize <= request.targetBytes) {
          best = candidate;
          break;
        }

        continue;
      }

      const searchResult = await boundedQualitySearch(
        request.targetBytes,
        request.qualityRange,
        (quality) => encodeCandidate(canvas!, request.output.format, quality),
        () => assertNotCancelled(hooks),
      );
      qualityProbeCount += searchResult.probes.length;

      for (const probe of searchResult.probes) {
        if (closestMiss === undefined || probe.byteSize < closestMiss.byteSize) {
          closestMiss = {
            blob: probe.blob,
            byteSize: probe.byteSize,
            width: tierDimensions.width,
            height: tierDimensions.height,
            quality: probe.quality,
          };
        }
      }

      if (searchResult.best !== undefined) {
        best = {
          blob: searchResult.best.blob,
          byteSize: searchResult.best.byteSize,
          width: tierDimensions.width,
          height: tierDimensions.height,
          quality: searchResult.best.quality,
        };
        break;
      }
    }

    assertNotCancelled(hooks);

    if (best === undefined) {
      const code = request.dimensionPolicy === 'hard'
        ? TARGET_SIZE_ERROR_CODES.TargetUnreachableHardDimensions
        : TARGET_SIZE_ERROR_CODES.TargetUnreachableMinDimensions;

      return {
        status: 'unreachable',
        outcome: {
          code,
          message: request.dimensionPolicy === 'hard'
            ? 'The target byte size could not be met at the requested (hard) dimensions within the permitted quality range.'
            : 'The target byte size could not be met even after reducing dimensions to the minimum permitted floor.',
          ...(closestMiss === undefined
            ? {}
            : {
                bestAttempt: {
                  width: closestMiss.width,
                  height: closestMiss.height,
                  byteSize: closestMiss.byteSize,
                  ...(closestMiss.quality === undefined
                    ? {}
                    : { quality: closestMiss.quality }),
                },
              }),
          qualityProbeCount,
          dimensionTierCount,
        },
      };
    }

    hooks.onProgress('finalizing');

    const result: TargetSizeResult = {
      blob: best.blob,
      width: best.width,
      height: best.height,
      format: request.output.format,
      mimeType: OUTPUT_IMAGE_MIME_TYPES[request.output.format],
      byteSize: best.byteSize,
      sourceDimensions,
      normalizedDimensions,
      resized: best.width !== normalizedDimensions.width || best.height !== normalizedDimensions.height,
      targetBytes: request.targetBytes,
      targetMet: true,
      dimensionsReduced: best.width !== initialPlan.width || best.height !== initialPlan.height,
      qualityProbeCount,
      dimensionTierCount,
      ...(best.quality === undefined ? {} : { quality: best.quality }),
    };

    await validateOutput(result);
    assertNotCancelled(hooks);

    return { status: 'met', result };
  } finally {
    bitmap?.close();

    if (canvas !== undefined) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
