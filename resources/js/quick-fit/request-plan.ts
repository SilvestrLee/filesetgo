import type {
  DimensionPolicy,
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
