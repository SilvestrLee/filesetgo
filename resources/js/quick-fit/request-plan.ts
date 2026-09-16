import type {
  CropRegion,
  DimensionPolicy,
  ExactDimensionsOptions,
  ImageFormat,
  ImageProcessingProgress,
  OutputImageFormat,
  ProcessImageOptions,
  ProcessImageToTargetOptions,
} from '@filesetgo/core';

export type OutputFormatChoice = 'original' | OutputImageFormat;

export interface QuickFitRequirements {
  sourceFormat: ImageFormat;
  outputChoice: OutputFormatChoice;
  targetBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  dimensionPolicy: DimensionPolicy;
  /**
   * Explicit signal that `maxWidth`/`maxHeight` mean an EXACT output frame
   * rather than a bounding box (FSG-007-FIT-001). This is deliberately a
   * separate flag from "both maxWidth and maxHeight happen to be set" —
   * Guided Fit's presets (`../presets/compiler.ts`) also always set both
   * dimensions (they're governed bounding boxes, e.g. Hero's 1920×1080),
   * and must keep their existing aspect-preserving behavior completely
   * unchanged. Only Quick Fit's own manual form ever sets this to `true`.
   */
  exactDimensions?: boolean;
  /**
   * A user-approved crop, in normalized source-pixel coordinates. Only ever
   * meaningful when `isExactMode(this)` is true and `isCropRequired` (see
   * `./crop.ts`) determined one is actually needed — never applied
   * automatically (FSG-007-FIT-001 directive §3/§10).
   */
  crop?: CropRegion;
  /** Explicit approval to upscale beyond the (cropped) source's own resolution, when exact dimensions require it. */
  allowUpscale?: boolean;
}

const ALPHA_CAPABLE_FORMATS: ReadonlySet<ImageFormat> = new Set(['png', 'webp']);

/**
 * HEIC cannot be produced as output (FSG-003 directive §15) — "Keep
 * original" on a HEIC source always resolves to WebP rather than HEIC.
 */
export function resolveOutputFormat(sourceFormat: ImageFormat, choice: OutputFormatChoice): OutputImageFormat {
  if (choice !== 'original') {
    return choice;
  }

  return sourceFormat === 'heic' ? 'webp' : sourceFormat;
}

/** JPEG has no alpha channel (FSG-003 directive §16). */
export function shouldWarnAboutTransparency(sourceFormat: ImageFormat, outputFormat: OutputImageFormat): boolean {
  return outputFormat === 'jpeg' && ALPHA_CAPABLE_FORMATS.has(sourceFormat);
}

export function hasDimensionLimit(req: Pick<QuickFitRequirements, 'maxWidth' | 'maxHeight'>): boolean {
  return req.maxWidth !== undefined || req.maxHeight !== undefined;
}

/**
 * True when `req.exactDimensions` is explicitly set AND both Width and
 * Height are present — per the FSG-007-FIT-001 product contract, that
 * combination means an EXACT output frame (never a bounding box), which may
 * require a user-approved crop. The explicit flag (rather than inferring
 * "exact" from both fields merely being set) is what keeps Guided Fit's
 * presets — which also always set both `maxWidth`/`maxHeight` as a governed
 * bounding box — routed through the original, unchanged aspect-preserving
 * path.
 */
export function isExactMode(
  req: Pick<QuickFitRequirements, 'maxWidth' | 'maxHeight' | 'exactDimensions'>,
): boolean {
  return req.exactDimensions === true && req.maxWidth !== undefined && req.maxHeight !== undefined;
}

/**
 * True when the requirements describe no meaningful transformation at all
 * (FSG-003 directive §19) — same format, no target size, no dimension
 * limit. Running a job in that case would just decode and re-encode the
 * image for no product reason.
 */
export function isNoOpRequest(req: QuickFitRequirements): boolean {
  const outputFormat = resolveOutputFormat(req.sourceFormat, req.outputChoice);
  const formatUnchanged = req.sourceFormat !== 'heic' && outputFormat === req.sourceFormat;

  return formatUnchanged && !hasDimensionLimit(req) && req.targetBytes === undefined;
}

export type ProcessingPlan =
  | { kind: 'none' }
  | { kind: 'standard'; options: ProcessImageOptions }
  | { kind: 'target'; options: ProcessImageToTargetOptions };

/**
 * Routes a Quick Fit requirement set to the correct existing core API
 * (FSG-003 directive §19): `processImageToTarget()` whenever a target file
 * size was requested, `processImage()` for resize/convert-only requests,
 * and `none` when there is nothing to do.
 */
export function planProcessing(
  req: QuickFitRequirements,
  onProgress?: (event: ImageProcessingProgress) => void,
): ProcessingPlan {
  if (isNoOpRequest(req)) {
    return { kind: 'none' };
  }

  const outputFormat = resolveOutputFormat(req.sourceFormat, req.outputChoice);

  if (isExactMode(req)) {
    // Exact dimensions are always a hard requirement (FSG-007-FIT-001
    // directive §17) — the byte target, when present, is met by searching
    // quality/tier, never by shrinking the requested frame. `dimensionPolicy`
    // is forced to 'hard' here regardless of the (disabled, in this mode)
    // checkbox's stale DOM value.
    const exact: ExactDimensionsOptions = {
      width: req.maxWidth!,
      height: req.maxHeight!,
      ...(req.crop === undefined ? {} : { crop: req.crop }),
      ...(req.allowUpscale === undefined ? {} : { allowUpscale: req.allowUpscale }),
    };

    if (req.targetBytes !== undefined) {
      return {
        kind: 'target',
        options: {
          targetBytes: req.targetBytes,
          output: { format: outputFormat },
          exact,
          dimensionPolicy: 'hard',
          onProgress,
        },
      };
    }

    return {
      kind: 'standard',
      options: { exact, output: { format: outputFormat }, onProgress },
    };
  }

  const dimensions = hasDimensionLimit(req) ? { maxWidth: req.maxWidth, maxHeight: req.maxHeight } : undefined;

  if (req.targetBytes !== undefined) {
    return {
      kind: 'target',
      options: {
        targetBytes: req.targetBytes,
        output: { format: outputFormat },
        dimensions,
        dimensionPolicy: req.dimensionPolicy,
        onProgress,
      },
    };
  }

  return {
    kind: 'standard',
    options: {
      resize: dimensions === undefined ? undefined : { ...dimensions, allowUpscale: false },
      output: { format: outputFormat },
      onProgress,
    },
  };
}
