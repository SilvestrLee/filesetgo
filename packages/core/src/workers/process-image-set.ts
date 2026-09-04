import { createIco, validateIcoContainer } from '../icons/ico';
import { getNormalizedDimensions } from '../normalize/orientation';
import { DEFAULT_SAFETY_LIMITS } from '../preflight/safety';
import {
  IMAGE_PROCESSING_ERROR_CODES,
  OUTPUT_IMAGE_MIME_TYPES,
  type ImageDimensions,
} from '../processing/contracts';
import type {
  IcoAssetResult,
  ImageSetAssetResult,
  ImageSetResult,
  RasterAssetResult,
  SafeImageProcessingSetRequest,
} from '../processing/image-set-contracts';
import { MAX_PACKAGE_TOTAL_OUTPUT_BYTES } from '../processing/image-set-limits';
import { calculateContainPlan } from '../transforms/contain';
import { calculateResizePlan } from '../transforms/resize';
import {
  assertDecodedDimensionsMatch,
  assertNotCancelled,
  checkRuntimeSupport,
  createRenderCanvas,
  decodeSourceToBitmap,
  drawBitmapToCanvas,
  fail,
  scaledTransform,
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
 * Draws a decoded bitmap CONTAINED within a fixed canvas (FSG-005B
 * directive §17) — unlike `drawBitmapToCanvas` (FSG-001), the canvas size
 * here is independent of the drawn content's size. Reuses `scaledTransform`
 * unchanged (it already maps oriented source space onto a `width`×`height`
 * rectangle at the origin) and simply offsets that rectangle to center it.
 */
function drawBitmapContained(
  canvas: OffscreenCanvas,
  bitmap: ImageBitmap,
  orientation: Parameters<typeof scaledTransform>[0],
  sourceDimensions: ImageDimensions,
  plan: { drawWidth: number; drawHeight: number; offsetX: number; offsetY: number },
): void {
  const context = canvas.getContext('2d', { alpha: true });

  if (context === null) {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.RuntimeUnsupported,
      'The worker could not create a 2D rendering context.',
    );
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, canvas.width, canvas.height);

  const [a, b, c, d, e, f] = scaledTransform(
    orientation,
    sourceDimensions.width,
    sourceDimensions.height,
    plan.drawWidth,
    plan.drawHeight,
  );

  context.setTransform(a, b, c, d, e + plan.offsetX, f + plan.offsetY);
  context.drawImage(bitmap, 0, 0);
  context.resetTransform();
}

/**
 * FSG-005A/FSG-005B: produces multiple validated output assets — plain
 * resize-fit rasters, fixed-canvas CONTAIN rasters, and/or ICO containers —
 * and optionally a ZIP archive of them, from a single source file. Decodes
 * exactly once and reuses the shared FSG-001 primitives for every output;
 * outputs are generated strictly sequentially, releasing each output's
 * canvas before starting the next, so peak memory stays bounded regardless
 * of how many outputs (or how many ICO entries within one output) are
 * requested (directive §12/§35).
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

  const releasePreviousCanvas = (next: OffscreenCanvas): OffscreenCanvas => {
    if (canvas !== undefined) {
      canvas.width = 0;
      canvas.height = 0;
    }

    canvas = next;
    return next;
  };

  try {
    assertNotCancelled(hooks);
    hooks.onProgress('decoding');
    bitmap = await decodeSourceToBitmap(request.preflight.format, request.file, hooks);
    assertNotCancelled(hooks);
    assertDecodedDimensionsMatch(bitmap, sourceDimensions);

    hooks.onProgress('normalizing');

    for (const [index, spec] of request.outputs.entries()) {
      assertNotCancelled(hooks);
      const assetProgress = { index: index + 1, count: assetCount };

      let asset: ImageSetAssetResult;

      if (spec.kind === 'raster') {
        const resizePlan = calculateResizePlan(normalizedDimensions.width, normalizedDimensions.height, {
          ...spec.resize,
          allowUpscale: false,
        });

        if (resizePlan.width * resizePlan.height > DEFAULT_SAFETY_LIMITS.maxDecodedPixels) {
          fail(
            IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
            `Output "${spec.id}" exceeds the decoded-pixel safety limit.`,
            { width: resizePlan.width, height: resizePlan.height },
          );
        }

        hooks.onProgress('resizing', assetProgress);
        const nextCanvas = releasePreviousCanvas(createRenderCanvas(resizePlan));
        drawBitmapToCanvas(nextCanvas, bitmap, orientation, sourceDimensions);
        assertNotCancelled(hooks);

        hooks.onProgress('encoding', assetProgress);
        const blob = await encodeAsset(nextCanvas, spec.output.format, spec.output.quality);
        assertNotCancelled(hooks);

        const raster: RasterAssetResult = {
          kind: 'raster',
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

        await validateOutput(raster);
        asset = raster;
      } else if (spec.kind === 'contain') {
        const plan = calculateContainPlan(
          normalizedDimensions.width,
          normalizedDimensions.height,
          spec.canvas.width,
          spec.canvas.height,
          spec.contentScale,
          spec.allowUpscale,
        );

        hooks.onProgress('resizing', assetProgress);
        const nextCanvas = releasePreviousCanvas(createRenderCanvas(spec.canvas));
        drawBitmapContained(nextCanvas, bitmap, orientation, sourceDimensions, plan);
        assertNotCancelled(hooks);

        hooks.onProgress('encoding', assetProgress);
        const blob = await encodeAsset(nextCanvas, spec.output.format, spec.output.quality);
        assertNotCancelled(hooks);

        const raster: RasterAssetResult = {
          kind: 'raster',
          id: spec.id,
          filename: spec.filename,
          blob,
          width: spec.canvas.width,
          height: spec.canvas.height,
          format: spec.output.format,
          mimeType: OUTPUT_IMAGE_MIME_TYPES[spec.output.format],
          byteSize: blob.size,
          sourceDimensions,
          normalizedDimensions,
          resized: true,
        };

        await validateOutput(raster);
        asset = raster;
      } else {
        hooks.onProgress('resizing', assetProgress);
        const icoEntries: Array<{ width: number; height: number; png: Uint8Array }> = [];

        for (const entrySpec of spec.entries) {
          assertNotCancelled(hooks);
          const plan = calculateContainPlan(
            normalizedDimensions.width,
            normalizedDimensions.height,
            entrySpec.size,
            entrySpec.size,
            entrySpec.contentScale,
            entrySpec.allowUpscale,
          );

          const nextCanvas = releasePreviousCanvas(createRenderCanvas({ width: entrySpec.size, height: entrySpec.size }));
          drawBitmapContained(nextCanvas, bitmap, orientation, sourceDimensions, plan);
          assertNotCancelled(hooks);

          const pngBlob = await encodeAsset(nextCanvas, 'png', undefined);
          const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());
          icoEntries.push({ width: entrySpec.size, height: entrySpec.size, png: pngBytes });
        }

        assertNotCancelled(hooks);
        hooks.onProgress('encoding', assetProgress);

        const icoBytes = createIco(icoEntries);
        const validation = validateIcoContainer(icoBytes);

        if (!validation.valid) {
          fail(
            IMAGE_PROCESSING_ERROR_CODES.IcoValidationFailed,
            `Output "${spec.id}": the generated ICO container failed validation.`,
          );
        }

        const requestedSizes = spec.entries.map((entry) => entry.size);
        const actualSizes = validation.entries.map((entry) => entry.width);
        const sizesMatch = requestedSizes.length === actualSizes.length
          && requestedSizes.every((size, i) => size === actualSizes[i]);

        if (!sizesMatch) {
          fail(
            IMAGE_PROCESSING_ERROR_CODES.IcoValidationFailed,
            `Output "${spec.id}": the generated ICO container's entries did not match the requested sizes.`,
          );
        }

        const blob = new Blob([Uint8Array.from(icoBytes)], { type: 'image/x-icon' });
        const icoAsset: IcoAssetResult = {
          kind: 'ico',
          id: spec.id,
          filename: spec.filename,
          blob,
          mimeType: 'image/x-icon',
          byteSize: blob.size,
          sizes: actualSizes,
        };

        asset = icoAsset;
      }

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
        assets.map(async (a) => ({
          filename: a.filename,
          data: new Uint8Array(await a.blob.arrayBuffer()),
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
