import { getNormalizedDimensions } from '../normalize/orientation';
import { DEFAULT_SAFETY_LIMITS } from '../preflight/safety';
import {
  IMAGE_PROCESSING_ERROR_CODES,
  OUTPUT_IMAGE_MIME_TYPES,
  type ImageDimensions,
} from '../processing/contracts';
import type {
  ImageSetAssetResult,
  ImageSetResult,
  SafeImageProcessingSetRequest,
} from '../processing/image-set-contracts';
import { MAX_PACKAGE_TOTAL_OUTPUT_BYTES } from '../processing/image-set-limits';
import { calculateResizePlan } from '../transforms/resize';
import {
  assertDecodedDimensionsMatch,
  assertNotCancelled,
  checkRuntimeSupport,
  createRenderCanvas,
  decodeSourceToBitmap,
  drawBitmapToCanvas,
  fail,
  validateOutput,
  type WorkerStage,
} from './process-image';

/**
 * Same shape as `WorkerProcessingHooks`, plus an optional asset index/count
 * on progress reports (FSG-005A directive §32). Structurally assignable
 * wherever a plain `WorkerProcessingHooks` is expected (`decodeSourceToBitmap`,
 * `assertNotCancelled`, ...), since a function accepting an extra optional
 * parameter still satisfies a narrower target type.
 */
export interface ImageSetProcessingHooks {
  isCancelled(): boolean;
  onProgress(stage: WorkerStage, asset?: { index: number; count: number }): void;
}

async function encodeAsset(
  canvas: OffscreenCanvas,
  format: keyof typeof OUTPUT_IMAGE_MIME_TYPES,
  quality: number | undefined,
): Promise<Blob> {
  try {
    return await canvas.convertToBlob({
      type: OUTPUT_IMAGE_MIME_TYPES[format],
      ...(format === 'png' || quality === undefined ? {} : { quality }),
    });
  } catch {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.EncodeFailed,
      'One of the requested outputs could not be encoded.',
    );
  }
}

/**
 * FSG-005A: produces multiple validated output assets, and optionally a ZIP
 * archive of them, from a single source file. Decodes exactly once and
 * reuses the shared FSG-001 primitives (`decodeSourceToBitmap`,
 * `createRenderCanvas`, `drawBitmapToCanvas`, `validateOutput`) for every
 * requested output — this is orchestration over the existing pipeline, not
 * a second one. Outputs are generated strictly sequentially, releasing
 * each output's canvas before starting the next, so peak memory stays
 * bounded regardless of how many outputs are requested (directive §12).
 */
export async function processImageSetInWorker(
  request: SafeImageProcessingSetRequest,
  hooks: ImageSetProcessingHooks,
): Promise<ImageSetResult> {
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

  let bitmap: ImageBitmap | undefined;
  let canvas: OffscreenCanvas | undefined;
  const assets: ImageSetAssetResult[] = [];
  let totalOutputBytes = 0;
  const assetCount = request.outputs.length;

  try {
    assertNotCancelled(hooks);
    hooks.onProgress('decoding');
    bitmap = await decodeSourceToBitmap(request.preflight.format, request.file, hooks);
    assertNotCancelled(hooks);
    assertDecodedDimensionsMatch(bitmap, sourceDimensions);

    hooks.onProgress('normalizing');

    for (const [index, spec] of request.outputs.entries()) {
      assertNotCancelled(hooks);

      const resizePlan = calculateResizePlan(
        normalizedDimensions.width,
        normalizedDimensions.height,
        spec.resize,
      );

      if (resizePlan.width * resizePlan.height > DEFAULT_SAFETY_LIMITS.maxDecodedPixels) {
        fail(
          IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
          `Output "${spec.id}" exceeds the decoded-pixel safety limit.`,
          { width: resizePlan.width, height: resizePlan.height },
        );
      }

      if (canvas !== undefined) {
        canvas.width = 0;
        canvas.height = 0;
      }

      const assetProgress = { index: index + 1, count: assetCount };
      hooks.onProgress('resizing', assetProgress);
      canvas = createRenderCanvas(resizePlan);
      drawBitmapToCanvas(canvas, bitmap, orientation, sourceDimensions);
      assertNotCancelled(hooks);

      hooks.onProgress('encoding', assetProgress);
      const blob = await encodeAsset(canvas, spec.output.format, spec.output.quality);
      assertNotCancelled(hooks);

      const asset: ImageSetAssetResult = {
        id: spec.id,
        filename: spec.filename,
        blob,
        width: resizePlan.width,
        height: resizePlan.height,
        format: spec.output.format,
        mimeType: OUTPUT_IMAGE_MIME_TYPES[spec.output.format],
        byteSize: blob.size,
        sourceDimensions,
        normalizedDimensions,
        resized: resizePlan.resized,
      };

      await validateOutput(asset);
      assertNotCancelled(hooks);

      totalOutputBytes += asset.byteSize;

      if (totalOutputBytes > MAX_PACKAGE_TOTAL_OUTPUT_BYTES) {
        fail(
          IMAGE_PROCESSING_ERROR_CODES.PackageOutputTooLarge,
          `The requested outputs exceed the ${MAX_PACKAGE_TOTAL_OUTPUT_BYTES}-byte package limit.`,
          { totalOutputBytes, maximumOutputBytes: MAX_PACKAGE_TOTAL_OUTPUT_BYTES },
        );
      }

      assets.push(asset);
    }

    let archive: ImageSetResult['archive'];

    if (request.archive !== undefined) {
      assertNotCancelled(hooks);
      hooks.onProgress('packaging');

      let zipModule: typeof import('../archive/zip-adapter');

      try {
        zipModule = await import('../archive/zip-adapter');
      } catch {
        fail(
          IMAGE_PROCESSING_ERROR_CODES.ArchiveCreationFailed,
          'The archive module could not be loaded.',
        );
      }

      const entries = await Promise.all(
        assets.map(async (asset) => ({
          filename: asset.filename,
          data: new Uint8Array(await asset.blob.arrayBuffer()),
        })),
      );

      assertNotCancelled(hooks);

      let archiveBytes: Uint8Array;

      try {
        archiveBytes = zipModule.createZipArchive(entries);
      } catch (error) {
        if (error instanceof zipModule.ArchiveCreationError) {
          fail(IMAGE_PROCESSING_ERROR_CODES.ArchiveCreationFailed, error.message);
        }

        fail(
          IMAGE_PROCESSING_ERROR_CODES.ArchiveCreationFailed,
          'The archive could not be created.',
        );
      }

      assertNotCancelled(hooks);

      const archiveBlob = new Blob([Uint8Array.from(archiveBytes)], { type: 'application/zip' });

      archive = {
        blob: archiveBlob,
        filename: request.archive.filename,
        byteSize: archiveBlob.size,
      };
    }

    hooks.onProgress('finalizing');
    assertNotCancelled(hooks);

    return {
      assets,
      assetCount: assets.length,
      totalOutputBytes,
      ...(archive === undefined ? {} : { archive }),
    };
  } finally {
    bitmap?.close();

    if (canvas !== undefined) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
