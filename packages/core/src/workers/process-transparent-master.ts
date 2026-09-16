import { getNormalizedDimensions } from '../normalize/orientation';
import {
  IMAGE_PROCESSING_ERROR_CODES,
  type ImageDimensions,
} from '../processing/contracts';
import type {
  SafeTransparentMasterRequest,
  TransparentMasterResult,
  TransparentMasterStatus,
} from '../processing/transparent-master-contracts';
import { inspectAlpha, type RgbaRaster } from '../transforms/alpha-inspection';
import {
  calculateAlphaTrimPlan,
  detectVisibleAlphaBounds,
  hasMeaningfulVisibleContent,
  mergeAlphaBounds,
  type AlphaBounds,
} from '../transforms/alpha-bounds';
import {
  assessBackgroundTransparency,
  computeBoundaryConnectedTransparency,
  MIN_BOUNDARY_TRANSPARENT_RATIO,
} from '../transforms/background-transparency';
import { removeConnectedBackground, type BackgroundRemovalResult } from '../transforms/background-removal';
import { applyAnalysisMaskAtSourceResolution } from '../transforms/source-resolution-alpha';
import {
  assertDecodedDimensionsMatch,
  assertNotCancelled,
  checkRuntimeSupport,
  decodeSourceToBitmap,
  fail,
  scaledTransform,
  validateOutput,
  type WorkerProcessingHooks,
} from './process-image';

/**
 * The bounded working raster's maximum dimension (FSG-005C directive §19).
 * Logo Pack's largest real output requirements are the 800px high-density
 * header and the 512px largest icon — 1024px gives comfortable headroom
 * above both while keeping worst-case memory small: a 1024x1024 RGBA
 * buffer is 4 MiB, and this pipeline never holds more than a small,
 * bounded number of such buffers at once (the working canvas's ImageData,
 * the background-removal output buffer, and — only transiently, for
 * post-encode verification — a second decode of the small encoded PNG,
 * which is normally *smaller* than the working raster after compression).
 * This is not the same as the global 24 MP decoded-pixel safety ceiling
 * (ADR-004) — it is a separate, much smaller bound specific to this
 * stage's actual output requirements.
 */
export const TRANSPARENT_MASTER_MAX_DIMENSION = 1024;

/** Keeps getImageData()/putImageData() intermediates bounded while applying and scanning a source-resolution canvas. */
const MAX_STRIP_RGBA_BYTES = 8 * 1024 * 1024;

/** Below this remaining-opaque-pixel ratio after removal, treat the result as destructive (directive §26). */
const MIN_REMAINING_FOREGROUND_RATIO = 0.02;
/** Below this removed-pixel ratio when removal was actually attempted, treat as "no meaningful background change occurred" (directive §26). */
const MIN_MEANINGFUL_REMOVAL_RATIO = 0.01;
/** Above this average border colour-distance, the background is not flat enough for confident removal (directive §16 — gradients/textures). */
const MAX_BACKGROUND_VARIANCE_FOR_CONFIDENCE = 40;
/** Above this fraction of border seed pixels rejected as background-like, either the background isn't flat or the foreground touches the image boundary (directive §16). */
const MAX_BORDER_AMBIGUOUS_RATIO = 0.25;

function calculateBoundedDimensions(width: number, height: number, maxDimension: number): ImageDimensions {
  const largestSide = Math.max(width, height);

  if (largestSide <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / largestSide;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function createWorkingCanvas(dimensions: ImageDimensions): OffscreenCanvas {
  return new OffscreenCanvas(dimensions.width, dimensions.height);
}

function getContext(canvas: OffscreenCanvas): OffscreenCanvasRenderingContext2D {
  const context = canvas.getContext('2d', { alpha: true });

  if (context === null) {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.RuntimeUnsupported,
      'The worker could not create a 2D rendering context.',
    );
  }

  return context;
}

async function encodePng(canvas: OffscreenCanvas): Promise<Blob> {
  try {
    return await canvas.convertToBlob({ type: 'image/png' });
  } catch {
    fail(
      IMAGE_PROCESSING_ERROR_CODES.EncodeFailed,
      'The transparent master could not be encoded.',
    );
  }
}

/**
 * Re-decodes the actual encoded Blob and returns its real pixel raster —
 * never trusts the pre-encode canvas (directive §24). Returning the raster
 * itself (rather than only an `inspectAlpha()` summary) lets the caller
 * also re-run the boundary-connectivity check below against the real
 * encoded output, not just the pre-encode working canvas.
 */
async function decodeEncodedRaster(blob: Blob): Promise<ImageData> {
  let bitmap: ImageBitmap | undefined;
  let canvas: OffscreenCanvas | undefined;

  try {
    bitmap = await createImageBitmap(blob);
    canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = getContext(canvas);
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return fail(
      IMAGE_PROCESSING_ERROR_CODES.OutputValidationFailed,
      'The generated transparent master could not be re-verified.',
    );
  } finally {
    bitmap?.close();

    if (canvas !== undefined) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

function calculateStripHeight(width: number): number {
  return Math.max(1, Math.min(256, Math.floor(MAX_STRIP_RGBA_BYTES / (width * 4))));
}

function applyRemovalAtSourceResolution(
  canvas: OffscreenCanvas,
  analysisRemoval: BackgroundRemovalResult,
  strength: SafeTransparentMasterRequest['strength'],
  hooks: WorkerProcessingHooks,
): void {
  const context = getContext(canvas);
  const stripHeight = calculateStripHeight(canvas.width);

  for (let top = 0; top < canvas.height; top += stripHeight) {
    assertNotCancelled(hooks);
    const height = Math.min(stripHeight, canvas.height - top);
    const sourceStrip = context.getImageData(0, top, canvas.width, height);
    const prepared = applyAnalysisMaskAtSourceResolution(sourceStrip, analysisRemoval, {
      targetWidth: canvas.width,
      targetHeight: canvas.height,
      targetOffsetY: top,
      strength,
      backgroundColor: analysisRemoval.backgroundColor,
    });
    context.putImageData(new ImageData(Uint8ClampedArray.from(prepared), canvas.width, height), 0, top);
  }
}

function detectCanvasAlphaBounds(
  canvas: OffscreenCanvas,
  hooks: WorkerProcessingHooks,
): AlphaBounds | undefined {
  const context = getContext(canvas);
  const stripHeight = calculateStripHeight(canvas.width);
  let detected: AlphaBounds | undefined;

  for (let top = 0; top < canvas.height; top += stripHeight) {
    assertNotCancelled(hooks);
    const coreHeight = Math.min(stripHeight, canvas.height - top);
    const readTop = Math.max(0, top - 1);
    const readBottom = Math.min(canvas.height, top + coreHeight + 1);
    const raster = context.getImageData(0, readTop, canvas.width, readBottom - readTop);
    const scanTop = top - readTop;
    const stripBounds = detectVisibleAlphaBounds(raster, {
      scanTop,
      scanBottom: scanTop + coreHeight,
      originY: readTop,
    });
    detected = mergeAlphaBounds(detected, stripBounds);
  }

  return detected;
}

export async function processTransparentMasterInWorker(
  request: SafeTransparentMasterRequest,
  hooks: WorkerProcessingHooks,
): Promise<TransparentMasterResult> {
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
  const workingDimensions = calculateBoundedDimensions(
    normalizedDimensions.width,
    normalizedDimensions.height,
    TRANSPARENT_MASTER_MAX_DIMENSION,
  );

  let bitmap: ImageBitmap | undefined;
  let sourceCanvas: OffscreenCanvas | undefined;
  let analysisCanvas: OffscreenCanvas | undefined;
  let outputCanvas: OffscreenCanvas | undefined;

  try {
    assertNotCancelled(hooks);
    hooks.onProgress('decoding');
    bitmap = await decodeSourceToBitmap(request.preflight.format, request.file, hooks);
    assertNotCancelled(hooks);
    assertDecodedDimensionsMatch(bitmap, sourceDimensions);

    hooks.onProgress('normalizing');
    sourceCanvas = createWorkingCanvas(normalizedDimensions);
    const sourceContext = getContext(sourceCanvas);
    sourceContext.imageSmoothingEnabled = true;
    sourceContext.imageSmoothingQuality = 'high';
    sourceContext.setTransform(
      ...scaledTransform(
        orientation,
        sourceDimensions.width,
        sourceDimensions.height,
        normalizedDimensions.width,
        normalizedDimensions.height,
      ),
    );
    sourceContext.drawImage(bitmap, 0, 0);
    sourceContext.resetTransform();

    analysisCanvas = createWorkingCanvas(workingDimensions);
    const analysisContext = getContext(analysisCanvas);
    analysisContext.imageSmoothingEnabled = true;
    analysisContext.imageSmoothingQuality = 'high';
    analysisContext.drawImage(
      sourceCanvas,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
      0,
      0,
      analysisCanvas.width,
      analysisCanvas.height,
    );

    assertNotCancelled(hooks);
    hooks.onProgress('resizing');
    const sourceRaster: RgbaRaster = analysisContext.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
    const sourceInspection = inspectAlpha(sourceRaster);

    let removalApplied = false;
    let backgroundVariance: number | undefined;
    let borderAmbiguousRatio: number | undefined;
    let removedRatio: number | undefined;
    let remainingOpaqueRatio: number | undefined;
    let ambiguousEnclosedBackgroundRatio: number | undefined;

    // Whether existing alpha already represents a *confirmed*, prepared
    // transparent background — never assumed merely because some alpha
    // exists (Product Office correction, FSG-005C). A raster with a
    // transparent margin wrapping an unremoved opaque background, or a
    // single incidental transparent pixel, both genuinely contain alpha
    // (`inspectAlpha()` correctly reports `'transparency-present'`) but
    // must not bypass removal on that basis alone. See
    // `transforms/background-transparency.ts` and
    // `docs/governance/DECISIONS.md` ADR-020.
    const requiresRemoval =
      sourceInspection.classification === 'opaque' ||
      assessBackgroundTransparency(sourceRaster).status !== 'background-transparency-confirmed';

    if (requiresRemoval) {
      // Attempt deterministic connected-background removal (directive
      // §11/§13). `removeConnectedBackground()` is itself existing-alpha
      // aware — a source that already carries some real transparency (but
      // was not confirmed above) is handled correctly, not assumed opaque.
      assertNotCancelled(hooks);
      hooks.onProgress('optimizing');
      const removal = removeConnectedBackground(sourceRaster, request.strength);
      analysisContext.putImageData(
        new ImageData(Uint8ClampedArray.from(removal.data), removal.width, removal.height),
        0,
        0,
      );
      applyRemovalAtSourceResolution(sourceCanvas, removal, request.strength, hooks);
      removalApplied = true;
      backgroundVariance = removal.backgroundColorVariance;
      borderAmbiguousRatio = removal.borderAmbiguousRatio;
      removedRatio = removal.removedRatio;
      remainingOpaqueRatio = removal.remainingOpaqueRatio;
      ambiguousEnclosedBackgroundRatio = removal.ambiguousEnclosedBackgroundRatio;
    }
    // Else: background transparency was genuinely confirmed — preserved
    // exactly as decoded, no removal pass runs (directive §10).

    let status: TransparentMasterStatus = 'verified';
    let reason: string | undefined;

    if (removalApplied) {
      if (remainingOpaqueRatio !== undefined && remainingOpaqueRatio < MIN_REMAINING_FOREGROUND_RATIO) {
        status = 'failed';
        reason = 'insufficient-remaining-foreground';
      } else if (removedRatio !== undefined && removedRatio < MIN_MEANINGFUL_REMOVAL_RATIO) {
        status = 'needs-review';
        reason = 'no-meaningful-background-change';
      } else if (backgroundVariance !== undefined && backgroundVariance > MAX_BACKGROUND_VARIANCE_FOR_CONFIDENCE) {
        status = 'needs-review';
        reason = 'non-flat-background';
      } else if (borderAmbiguousRatio !== undefined && borderAmbiguousRatio > MAX_BORDER_AMBIGUOUS_RATIO) {
        status = 'needs-review';
        reason = 'ambiguous-border';
      } else if (ambiguousEnclosedBackgroundRatio !== undefined && ambiguousEnclosedBackgroundRatio > 0) {
        status = 'needs-review';
        reason = 'ambiguous-enclosed-background';
      }
    }

    const visibleBounds = detectCanvasAlphaBounds(sourceCanvas, hooks);
    const hasMeaningfulContent = hasMeaningfulVisibleContent(visibleBounds);
    const trimPlan = hasMeaningfulContent
      ? calculateAlphaTrimPlan(sourceCanvas.width, sourceCanvas.height, visibleBounds)
      : undefined;

    if (!hasMeaningfulContent && status !== 'failed') {
      status = 'failed';
      reason = 'insufficient-visible-content';
    }

    if (trimPlan !== undefined) {
      outputCanvas = createWorkingCanvas({ width: trimPlan.outputWidth, height: trimPlan.outputHeight });
      const outputContext = getContext(outputCanvas);
      outputContext.drawImage(
        sourceCanvas,
        trimPlan.bounds.left,
        trimPlan.bounds.top,
        trimPlan.bounds.width,
        trimPlan.bounds.height,
        trimPlan.padding,
        trimPlan.padding,
        trimPlan.bounds.width,
        trimPlan.bounds.height,
      );
    }

    const encodedCanvas = outputCanvas ?? sourceCanvas;
    assertNotCancelled(hooks);
    hooks.onProgress('encoding');
    const blob = await encodePng(encodedCanvas);

    assertNotCancelled(hooks);
    hooks.onProgress('finalizing');
    const encodedRaster = await decodeEncodedRaster(blob);
    const alphaInspection = inspectAlpha(encodedRaster);

    if (alphaInspection.classification === 'opaque') {
      // The encoder/pipeline did not actually produce transparency —
      // never masquerade this as success (directive §24/§26).
      status = 'failed';
      reason = 'encoded-output-opaque';
    }

    if (status === 'verified') {
      // A final, weaker re-check directly against the actual encoded
      // output: is there a real, non-incidental connected transparent
      // margin, not merely "some alpha somewhere" (directive §9 — do not
      // show verification success merely because one transparent pixel
      // survived encoding). Deliberately reuses only the lighter
      // boundary-connectivity gate, not the full residual-based
      // assessment above — the fuller check would misclassify a
      // successfully-processed, genuinely multi-coloured logo (e.g. a
      // mark with a light-coloured interior detail) as unconfirmed; this
      // narrower check cannot.
      const { ratio: encodedBoundaryRatio } = computeBoundaryConnectedTransparency(encodedRaster);

      if (encodedBoundaryRatio < MIN_BOUNDARY_TRANSPARENT_RATIO) {
        status = 'needs-review';
        reason = 'post-encode-boundary-transparency-insufficient';
      }
    }

    const result: TransparentMasterResult = {
      blob,
      width: encodedCanvas.width,
      height: encodedCanvas.height,
      format: 'png',
      mimeType: 'image/png',
      byteSize: blob.size,
      sourceDimensions,
      normalizedDimensions,
      analysisDimensions: workingDimensions,
      ...(visibleBounds === undefined ? {} : {
        visibleBounds: {
          left: visibleBounds.left,
          top: visibleBounds.top,
          width: visibleBounds.width,
          height: visibleBounds.height,
        },
      }),
      safePadding: trimPlan?.padding ?? 0,
      canvasTrimmed: trimPlan?.trimmed ?? false,
      foregroundRescaled: false,
      alphaInspection,
      removalApplied,
      ...(removalApplied ? { strength: request.strength } : {}),
      status,
      ...(reason === undefined ? {} : { reason }),
    };

    if (status !== 'failed') {
      await validateOutput({
        blob: result.blob,
        width: result.width,
        height: result.height,
        format: 'png',
        mimeType: 'image/png',
        byteSize: result.byteSize,
        sourceDimensions,
        normalizedDimensions,
        resized: result.width !== normalizedDimensions.width || result.height !== normalizedDimensions.height,
      });
    }

    assertNotCancelled(hooks);

    return result;
  } finally {
    bitmap?.close();

    if (sourceCanvas !== undefined) {
      sourceCanvas.width = 0;
      sourceCanvas.height = 0;
    }

    if (analysisCanvas !== undefined) {
      analysisCanvas.width = 0;
      analysisCanvas.height = 0;
    }

    if (outputCanvas !== undefined) {
      outputCanvas.width = 0;
      outputCanvas.height = 0;
    }
  }
}
