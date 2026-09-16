import { DEFAULT_SAFETY_LIMITS } from '../preflight/safety';
import {
  IMAGE_PROCESSING_ERROR_CODES,
  OUTPUT_IMAGE_MIME_TYPES,
  type ExactDimensionsOptions,
  type FileSetGoProcessingError,
} from './contracts';
import { createProcessingError } from './errors';
import {
  ABSOLUTE_QUALITY_BOUNDS,
  DEFAULT_QUALITY_RANGE,
  MAX_TARGET_BYTES,
  MIN_TARGET_BYTES,
} from './target-size-limits';
import type {
  ProcessImageToTargetOptions,
  TargetSizeQualityRange,
} from './target-size-contracts';

export interface ResolvedTargetOptions {
  targetBytes: number;
  output: { format: ProcessImageToTargetOptions['output']['format'] };
  dimensions?: ProcessImageToTargetOptions['dimensions'];
  exact?: ExactDimensionsOptions;
  dimensionPolicy: 'hard' | 'flexible';
  qualityRange: TargetSizeQualityRange;
  onProgress: ProcessImageToTargetOptions['onProgress'];
}

export type ValidateTargetOptionsResult =
  | { error: undefined; resolved: ResolvedTargetOptions }
  | { error: FileSetGoProcessingError; resolved: undefined };

function invalid(message: string): ValidateTargetOptionsResult {
  return {
    error: createProcessingError(IMAGE_PROCESSING_ERROR_CODES.InvalidRequest, message),
    resolved: undefined,
  };
}

/**
 * Validates and resolves defaults for a target-size request (FSG-002
 * directive §20/§21). Returns either a structured error or a fully
 * resolved request with every default applied — callers downstream never
 * need to re-derive defaults or re-validate.
 */
export function validateProcessImageToTargetOptions(
  options: ProcessImageToTargetOptions,
): ValidateTargetOptionsResult {
  if (!(options.output.format in OUTPUT_IMAGE_MIME_TYPES)) {
    return invalid('The requested output format is not supported.');
  }

  if (
    !Number.isFinite(options.targetBytes) ||
    Number.isNaN(options.targetBytes) ||
    options.targetBytes <= 0
  ) {
    return invalid('targetBytes must be a positive, finite number.');
  }

  if (options.targetBytes < MIN_TARGET_BYTES) {
    return invalid(
      `targetBytes must be at least ${MIN_TARGET_BYTES} bytes; no real encoded image is meaningfully smaller.`,
    );
  }

  if (options.targetBytes > MAX_TARGET_BYTES) {
    return invalid(
      `targetBytes must not exceed ${MAX_TARGET_BYTES} bytes (the source-file safety cap).`,
    );
  }

  if (options.dimensions !== undefined && options.exact !== undefined) {
    return invalid('A request may specify `dimensions` or `exact`, never both.');
  }

  if (options.exact !== undefined && options.dimensionPolicy === 'flexible') {
    return invalid(
      "`exact` dimensions are always a hard requirement — 'flexible' dimensionPolicy may not be combined with `exact`.",
    );
  }

  const dimensionPolicy = options.exact !== undefined ? 'hard' : (options.dimensionPolicy ?? 'flexible');

  if (dimensionPolicy !== 'hard' && dimensionPolicy !== 'flexible') {
    return invalid("dimensionPolicy must be 'hard' or 'flexible'.");
  }

  const qualityRange: TargetSizeQualityRange = {
    minQuality: options.qualityRange?.minQuality ?? DEFAULT_QUALITY_RANGE.minQuality,
    maxQuality: options.qualityRange?.maxQuality ?? DEFAULT_QUALITY_RANGE.maxQuality,
  };

  for (const [name, value] of [
    ['minQuality', qualityRange.minQuality],
    ['maxQuality', qualityRange.maxQuality],
  ] as const) {
    if (
      !Number.isFinite(value) ||
      value < ABSOLUTE_QUALITY_BOUNDS.minQuality ||
      value > ABSOLUTE_QUALITY_BOUNDS.maxQuality
    ) {
      return invalid(`${name} must be between 0 and 1.`);
    }
  }

  if (qualityRange.minQuality > qualityRange.maxQuality) {
    return invalid('minQuality must not exceed maxQuality.');
  }

  if (options.dimensions !== undefined) {
    const { maxWidth, maxHeight } = options.dimensions;

    for (const [name, value] of [
      ['maxWidth', maxWidth],
      ['maxHeight', maxHeight],
    ] as const) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
        return invalid(`${name} must be a positive safe integer.`);
      }
    }

    if (
      maxWidth !== undefined &&
      maxHeight !== undefined &&
      maxWidth * maxHeight > DEFAULT_SAFETY_LIMITS.maxDecodedPixels
    ) {
      return invalid('The requested dimensions exceed the decoded-pixel safety limit.');
    }
  }

  if (options.exact !== undefined) {
    const { width, height, crop } = options.exact;

    for (const [name, value] of [
      ['width', width],
      ['height', height],
    ] as const) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        return invalid(`exact.${name} must be a positive safe integer.`);
      }
    }

    if (width * height > DEFAULT_SAFETY_LIMITS.maxDecodedPixels) {
      return invalid('The requested exact dimensions exceed the decoded-pixel safety limit.');
    }

    if (crop !== undefined) {
      for (const [name, value] of [
        ['crop.x', crop.x],
        ['crop.y', crop.y],
      ] as const) {
        if (!Number.isFinite(value) || value < 0) {
          return invalid(`${name} must be a non-negative finite number.`);
        }
      }

      for (const [name, value] of [
        ['crop.width', crop.width],
        ['crop.height', crop.height],
      ] as const) {
        if (!Number.isFinite(value) || value <= 0) {
          return invalid(`${name} must be a positive finite number.`);
        }
      }
    }
  }

  return {
    error: undefined,
    resolved: {
      targetBytes: options.targetBytes,
      output: { format: options.output.format },
      dimensions: options.dimensions,
      exact: options.exact,
      dimensionPolicy,
      qualityRange,
      onProgress: options.onProgress,
    },
  };
}
