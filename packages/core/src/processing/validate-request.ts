import { DEFAULT_SAFETY_LIMITS } from '../preflight/safety';
import {
  IMAGE_PROCESSING_ERROR_CODES,
  OUTPUT_IMAGE_MIME_TYPES,
  type FileSetGoProcessingError,
  type ProcessImageOptions,
} from './contracts';
import { createProcessingError } from './errors';

export function validateProcessImageOptions(
  options: ProcessImageOptions,
): FileSetGoProcessingError | undefined {
  if (!(options.output.format in OUTPUT_IMAGE_MIME_TYPES)) {
    return createProcessingError(
      IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
      'The requested output format is not supported.',
    );
  }

  if (options.output.format === 'png' && options.output.quality !== undefined) {
    return createProcessingError(
      IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
      'PNG output does not accept a quality value.',
    );
  }

  if (
    options.output.quality !== undefined &&
    (!Number.isFinite(options.output.quality) ||
      options.output.quality < 0 ||
      options.output.quality > 1)
  ) {
    return createProcessingError(
      IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
      'Output quality must be between 0 and 1.',
    );
  }

  if (options.resize !== undefined && options.exact !== undefined) {
    return createProcessingError(
      IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
      'A request may specify `resize` or `exact`, never both.',
    );
  }

  if (options.resize !== undefined) {
    const { maxWidth, maxHeight } = options.resize;

    if (maxWidth === undefined && maxHeight === undefined) {
      return createProcessingError(
        IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
        'Resize options must provide maxWidth, maxHeight, or both.',
      );
    }

    for (const [name, value] of [
      ['maxWidth', maxWidth],
      ['maxHeight', maxHeight],
    ] as const) {
      if (
        value !== undefined &&
        (!Number.isSafeInteger(value) || value <= 0)
      ) {
        return createProcessingError(
          IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
          `${name} must be a positive safe integer.`,
        );
      }
    }

    if (
      maxWidth !== undefined &&
      maxHeight !== undefined &&
      maxWidth * maxHeight >
        DEFAULT_SAFETY_LIMITS.maxDecodedPixels
    ) {
      return createProcessingError(
        IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
        'The requested resize bounds exceed the decoded-pixel safety limit.',
      );
    }
  }

  if (options.exact !== undefined) {
    const { width, height, crop } = options.exact;

    for (const [name, value] of [
      ['width', width],
      ['height', height],
    ] as const) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        return createProcessingError(
          IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
          `exact.${name} must be a positive safe integer.`,
        );
      }
    }

    if (width * height > DEFAULT_SAFETY_LIMITS.maxDecodedPixels) {
      return createProcessingError(
        IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
        'The requested exact dimensions exceed the decoded-pixel safety limit.',
      );
    }

    if (crop !== undefined) {
      for (const [name, value] of [
        ['crop.x', crop.x],
        ['crop.y', crop.y],
      ] as const) {
        if (!Number.isFinite(value) || value < 0) {
          return createProcessingError(
            IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
            `${name} must be a non-negative finite number.`,
          );
        }
      }

      for (const [name, value] of [
        ['crop.width', crop.width],
        ['crop.height', crop.height],
      ] as const) {
        if (!Number.isFinite(value) || value <= 0) {
          return createProcessingError(
            IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
            `${name} must be a positive finite number.`,
          );
        }
      }
    }
  }

  return undefined;
}
