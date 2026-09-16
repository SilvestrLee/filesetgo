import type { ExifOrientation } from '../preflight/contracts';
import { preflightImage } from '../preflight/preflight-image';
import { DEFAULT_SAFETY_LIMITS } from '../preflight/safety';
import { getNormalizedDimensions, getOrientationTransform } from '../normalize/orientation';
import {
  IMAGE_PROCESSING_ERROR_CODES,
  OUTPUT_IMAGE_MIME_TYPES,
  type CropRegion,
  type FileSetGoProcessingError,
  type ImageDimensions,
  type ImageProcessingStage,
  type ProcessedImageResult,
  type SafeImageProcessingRequest,
} from '../processing/contracts';
import { createProcessingError } from '../processing/errors';
import { isCropRatioValid, isCropRequired, isCropWithinBounds } from '../transforms/crop';
import { calculateResizePlan } from '../transforms/resize';
import { createOrientationNeutralJpeg } from './jpeg-decode-source';

export type WorkerStage = Exclude<
  ImageProcessingStage,
  'preflighting' | 'accepted' | 'complete'
>;

export interface WorkerProcessingHooks {
  isCancelled(): boolean;
  onProgress(stage: WorkerStage): void;
}

export class WorkerProcessingFailure extends Error {
  public constructor(public readonly processingError: FileSetGoProcessingError) {
    super(processingError.message);
    this.name = 'WorkerProcessingFailure';
  }
}

export function fail(
  code: FileSetGoProcessingError['code'],
  message: string,
  details?: FileSetGoProcessingError['details'],
): never {
  throw new WorkerProcessingFailure(
    createProcessingError(code, message, details),
  );
}

export function assertNotCancelled(hooks: WorkerProcessingHooks): void {
  if (hooks.isCancelled()) {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled,
      'Image processing was cancelled.',
    );
  }
}

function emitStage(
  hooks: WorkerProcessingHooks,
  stage: WorkerStage,
): void {
  assertNotCancelled(hooks);
  hooks.onProgress(stage);
}

export function scaledTransform(
  orientation: ExifOrientation,
  sourceWidth: number,
  sourceHeight: number,
  outputWidth: number,
  outputHeight: number,
): readonly [number, number, number, number, number, number] {
  const normalized = getNormalizedDimensions(
    sourceWidth,
    sourceHeight,
    orientation,
  );
  const scaleX = outputWidth / normalized.width;
  const scaleY = outputHeight / normalized.height;
  const [a, b, c, d, e, f] = getOrientationTransform(
    sourceWidth,
    sourceHeight,
    orientation,
  );

  return [
    a * scaleX,
    b * scaleY,
    c * scaleX,
    d * scaleY,
    e * scaleX,
    f * scaleY,
  ];
}

/**
 * Decodes a HEIC/HEIF source to an ImageBitmap via the lazily-imported HEIC
 * adapter (see workers/heic-decode.ts and ADR-014). The dynamic `import()`
 * below is the only reference to that module anywhere in the standard
 * JPEG/PNG/WebP path, so it — and its ~1 MB WASM dependency — is never part
 * of the initial bundle those users load.
 */
async function decodeHeicToBitmap(
  file: Blob,
  checkCancelled: () => void,
): Promise<ImageBitmap> {
  checkCancelled();

  let heicModule: typeof import('./heic-decode');

  try {
    heicModule = await import('./heic-decode');
  } catch {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.HeicDecoderUnavailable,
      'The HEIC decoder module could not be loaded.',
    );
  }

  let raster: { data: Uint8ClampedArray; width: number; height: number };

  try {
    raster = await heicModule.decodeHeic(file, checkCancelled);
  } catch (error) {
    if (error instanceof WorkerProcessingFailure) {
      throw error;
    }

    if (error instanceof heicModule.HeicDecodeError) {
      fail(error.code, error.message);
    }

    fail(
      IMAGE_PROCESSING_ERROR_CODES.DecodeFailed,
      'The HEIC image could not be decoded.',
    );
  }

  try {
    return await createImageBitmap(
      new ImageData(
        Uint8ClampedArray.from(raster.data),
        raster.width,
        raster.height,
      ),
    );
  } catch {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.DecodeFailed,
      'The decoded HEIC raster could not be converted to a bitmap.',
    );
  }
}

/** Throws RUNTIME_UNSUPPORTED unless the worker has the browser APIs every processing path needs. */
export function checkRuntimeSupport(): void {
  if (
    typeof OffscreenCanvas === 'undefined' ||
    typeof globalThis.createImageBitmap !== 'function'
  ) {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.RuntimeUnsupported,
      'This worker cannot decode and render images with the required browser APIs.',
    );
  }
}

/**
 * Decodes a source Blob to an ImageBitmap, dispatching to the lazily
 * loaded HEIC adapter or the native `createImageBitmap()` path exactly as
 * `processImageInWorker` does. Shared with the target-size engine
 * (workers/process-image-to-target.ts) so both paths decode identically.
 *
 * Deliberately does *not* perform the post-decode cancellation or
 * decoded-dimension check itself (see `assertDecodedDimensionsMatch`
 * below) — the caller must assign the returned bitmap to a variable it
 * owns *before* running those checks, so a `finally` cleanup block can
 * always reach and close a bitmap that was actually acquired, even when
 * one of those checks then throws.
 */
export async function decodeSourceToBitmap(
  format: SafeImageProcessingRequest['preflight']['format'],
  file: Blob,
  hooks: WorkerProcessingHooks,
): Promise<ImageBitmap> {
  if (format === 'heic') {
    return decodeHeicToBitmap(file, () => assertNotCancelled(hooks));
  }

  try {
    const decodeSource = format === 'jpeg'
      ? await createOrientationNeutralJpeg(file)
      : file;

    return await createImageBitmap(decodeSource, {
      imageOrientation: 'none',
    });
  } catch {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.DecodeFailed,
      'The compressed image payload could not be decoded.',
    );
  }
}

/** Call only after assigning the decoded bitmap to a variable the caller's `finally` block can clean up. */
export function assertDecodedDimensionsMatch(
  bitmap: ImageBitmap,
  sourceDimensions: ImageDimensions,
): void {
  if (
    bitmap.width !== sourceDimensions.width ||
    bitmap.height !== sourceDimensions.height
  ) {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.DecodeFailed,
      'The browser decoder did not preserve the stored source dimensions.',
      {
        expectedWidth: sourceDimensions.width,
        expectedHeight: sourceDimensions.height,
        decodedWidth: bitmap.width,
        decodedHeight: bitmap.height,
      },
    );
  }
}

/**
 * Split from drawing (rather than one combined function) so a caller can
 * assign the canvas to a variable it controls *before* drawing can throw —
 * that ordering is what guarantees cleanup (`finally { canvas.width = 0 }`)
 * always reaches a canvas that was actually constructed, including when
 * `getContext()` fails. It also lets the target-size engine draw once per
 * dimension tier and reuse the same canvas across multiple quality-probe
 * encodes at that tier (FSG-002 directive §27 — reuse canvas resources
 * where feasible), since quality only affects encoding, not the drawn
 * pixels.
 */
export function createRenderCanvas(dimensions: ImageDimensions): OffscreenCanvas {
  return new OffscreenCanvas(dimensions.width, dimensions.height);
}

/** The whole-bitmap draw: reorients + scales `bitmap` to fill `canvas` exactly, no cropping. */
function drawWholeBitmapToCanvas(
  canvas: OffscreenCanvas,
  bitmap: ImageBitmap,
  orientation: ExifOrientation,
  sourceDimensions: ImageDimensions,
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
  context.setTransform(
    ...scaledTransform(
      orientation,
      sourceDimensions.width,
      sourceDimensions.height,
      canvas.width,
      canvas.height,
    ),
  );
  context.drawImage(bitmap, 0, 0);
  context.resetTransform();
}

/**
 * Draws a decoded bitmap onto `canvas` at its own dimensions, applying the
 * EXIF/HEIF orientation transform, and — when `crop` is given — cropping to
 * a user-approved region first (FSG-007-FIT-001).
 *
 * `crop` is expressed in NORMALIZED (oriented, as-displayed) source-pixel
 * coordinates, but the native `drawImage` source-rect operates in the raw
 * bitmap's own pre-orientation pixel space. Rather than inverse-transforming
 * the crop rect through the orientation matrix (correct but easy to get
 * subtly wrong for the four rotated orientations), this draws in two
 * passes: pass 1 renders the whole oriented bitmap, at 1:1 normalized
 * scale, onto an intermediate canvas — after which that canvas *is* the
 * upright image the crop UI showed the user, so the orientation problem is
 * solved by construction. Pass 2 is then a plain crop+scale `drawImage`
 * from that upright canvas, with no further transform math. The cost is one
 * extra canvas allocation, only on the (one-shot, user-initiated) crop path.
 */
export function drawBitmapToCanvas(
  canvas: OffscreenCanvas,
  bitmap: ImageBitmap,
  orientation: ExifOrientation,
  sourceDimensions: ImageDimensions,
  crop?: CropRegion,
  normalizedDimensions?: ImageDimensions,
): void {
  if (crop === undefined) {
    drawWholeBitmapToCanvas(canvas, bitmap, orientation, sourceDimensions);
    return;
  }

  if (normalizedDimensions === undefined) {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
      'A crop requires normalizedDimensions to resolve orientation-correct coordinates.',
    );
  }

  let upright: OffscreenCanvas | undefined;

  try {
    upright = new OffscreenCanvas(normalizedDimensions.width, normalizedDimensions.height);
    drawWholeBitmapToCanvas(upright, bitmap, orientation, sourceDimensions);

    const context = canvas.getContext('2d', { alpha: true });

    if (context === null) {
      fail(
        IMAGE_PROCESSING_ERROR_CODES.RuntimeUnsupported,
        'The worker could not create a 2D rendering context.',
      );
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(
      upright,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  } finally {
    if (upright !== undefined) {
      upright.width = 0;
      upright.height = 0;
    }
  }
}

export async function validateOutput(
  result: ProcessedImageResult,
): Promise<void> {
  if (
    result.blob.size === 0 ||
    result.byteSize !== result.blob.size
  ) {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.OutputValidationFailed,
      'The encoder returned an invalid or mislabeled output blob.',
    );
  }

  if (result.blob.type !== result.mimeType) {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.EncodeFailed,
      'The browser encoder did not produce the requested output format.',
      {
        requestedMimeType: result.mimeType,
        actualMimeType: result.blob.type || 'unknown',
      },
    );
  }

  const validation = await preflightImage(result.blob, {
    limits: {
      maxInputBytes: Math.max(
        DEFAULT_SAFETY_LIMITS.maxInputBytes,
        result.blob.size,
      ),
      maxDecodedPixels: DEFAULT_SAFETY_LIMITS.maxDecodedPixels,
    },
  });

  if (
    validation.status !== 'ready' ||
    validation.result.format !== result.format ||
    validation.result.width !== result.width ||
    validation.result.height !== result.height
  ) {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.OutputValidationFailed,
      'The encoded output did not pass format and dimension validation.',
    );
  }
}

export async function processImageInWorker(
  request: SafeImageProcessingRequest,
  hooks: WorkerProcessingHooks,
): Promise<ProcessedImageResult> {
  checkRuntimeSupport();

  const sourceDimensions = {
    width: request.preflight.width,
    height: request.preflight.height,
  };
  const orientation = request.preflight.orientation ?? 1;
  const normalizedDimensions = getNormalizedDimensions(
    sourceDimensions.width,
    sourceDimensions.height,
    orientation,
  );

  let outputDimensions: ImageDimensions;
  let resized: boolean;
  let appliedCrop: CropRegion | undefined;

  if (request.exact !== undefined) {
    const exact = request.exact;
    const cropRequired = isCropRequired(
      normalizedDimensions.width,
      normalizedDimensions.height,
      exact.width,
      exact.height,
    );

    if (cropRequired && exact.crop === undefined) {
      fail(
        IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
        'The requested exact dimensions do not match the source aspect ratio; a confirmed crop region is required.',
        { width: exact.width, height: exact.height },
      );
    }

    if (exact.crop !== undefined) {
      if (!isCropWithinBounds(exact.crop, normalizedDimensions.width, normalizedDimensions.height)) {
        fail(
          IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
          'The crop region is not within the source image bounds.',
        );
      }

      if (!isCropRatioValid(exact.crop, exact.width, exact.height)) {
        fail(
          IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
          "The crop region's aspect ratio does not match the requested exact dimensions.",
        );
      }
    }

    const effectiveSource = exact.crop ?? normalizedDimensions;
    const upscaleFactor = Math.max(
      exact.width / effectiveSource.width,
      exact.height / effectiveSource.height,
    );

    if (upscaleFactor > 1 && exact.allowUpscale !== true) {
      fail(
        IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
        'Reaching the requested exact dimensions requires upscaling beyond the available source detail; allowUpscale must be explicitly approved.',
        { width: exact.width, height: exact.height },
      );
    }

    if (exact.width * exact.height > DEFAULT_SAFETY_LIMITS.maxDecodedPixels) {
      fail(
        IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
        'The requested exact dimensions exceed the decoded-pixel safety limit.',
        {
          width: exact.width,
          height: exact.height,
          maximumDecodedPixels: DEFAULT_SAFETY_LIMITS.maxDecodedPixels,
        },
      );
    }

    outputDimensions = { width: exact.width, height: exact.height };
    appliedCrop = exact.crop;
    resized = appliedCrop !== undefined ||
      outputDimensions.width !== normalizedDimensions.width ||
      outputDimensions.height !== normalizedDimensions.height;
  } else {
    const resizePlan = calculateResizePlan(
      normalizedDimensions.width,
      normalizedDimensions.height,
      request.resize,
    );

    if (
      resizePlan.width * resizePlan.height >
      DEFAULT_SAFETY_LIMITS.maxDecodedPixels
    ) {
      fail(
        IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
        'The requested output dimensions exceed the decoded-pixel safety limit.',
        {
          width: resizePlan.width,
          height: resizePlan.height,
          maximumDecodedPixels: DEFAULT_SAFETY_LIMITS.maxDecodedPixels,
        },
      );
    }

    outputDimensions = { width: resizePlan.width, height: resizePlan.height };
    resized = resizePlan.resized;
  }

  let bitmap: ImageBitmap | undefined;
  let canvas: OffscreenCanvas | undefined;

  try {
    emitStage(hooks, 'decoding');
    bitmap = await decodeSourceToBitmap(request.preflight.format, request.file, hooks);
    assertNotCancelled(hooks);
    assertDecodedDimensionsMatch(bitmap, sourceDimensions);

    emitStage(hooks, 'normalizing');
    canvas = createRenderCanvas(outputDimensions);
    emitStage(hooks, 'resizing');
    drawBitmapToCanvas(canvas, bitmap, orientation, sourceDimensions, appliedCrop, normalizedDimensions);

    assertNotCancelled(hooks);
    emitStage(hooks, 'encoding');

    let blob: Blob;

    try {
      blob = await canvas.convertToBlob({
        type: OUTPUT_IMAGE_MIME_TYPES[request.output.format],
        ...(request.output.format === 'png' ||
        request.output.quality === undefined
          ? {}
          : { quality: request.output.quality }),
      });
    } catch {
      fail(
        IMAGE_PROCESSING_ERROR_CODES.EncodeFailed,
        'The image could not be encoded in the requested format.',
      );
    }

    assertNotCancelled(hooks);
    emitStage(hooks, 'finalizing');

    const result: ProcessedImageResult = {
      blob,
      width: outputDimensions.width,
      height: outputDimensions.height,
      format: request.output.format,
      mimeType: OUTPUT_IMAGE_MIME_TYPES[request.output.format],
      byteSize: blob.size,
      sourceDimensions,
      normalizedDimensions,
      resized,
      ...(appliedCrop === undefined ? {} : { appliedCrop }),
    };

    await validateOutput(result);
    assertNotCancelled(hooks);

    return result;
  } finally {
    bitmap?.close();

    if (canvas !== undefined) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

export function toWorkerProcessingError(
  error: unknown,
): FileSetGoProcessingError {
  if (error instanceof WorkerProcessingFailure) {
    return error.processingError;
  }

  return createProcessingError(
    IMAGE_PROCESSING_ERROR_CODES.WorkerFailed,
    'The image worker failed unexpectedly.',
  );
}
