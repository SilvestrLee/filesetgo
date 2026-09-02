import {
  IMAGE_PREFLIGHT_ERROR_CODES,
  type ImagePreflightError,
  type ImageSafetyLimits,
} from './contracts';
import { createPreflightError } from './errors';

export const DEFAULT_SAFETY_LIMITS: Readonly<ImageSafetyLimits> = Object.freeze({
  maxInputBytes: 15 * 1024 * 1024,
  maxDecodedPixels: 24_000_000,
});

export function calculateMegapixels(width: number, height: number): number {
  return (width * height) / 1_000_000;
}

export function resolveSafetyLimits(
  overrides: Partial<ImageSafetyLimits> | undefined,
): Readonly<ImageSafetyLimits> {
  const limits = {
    ...DEFAULT_SAFETY_LIMITS,
    ...overrides,
  };

  if (!Number.isSafeInteger(limits.maxInputBytes) || limits.maxInputBytes <= 0) {
    throw new TypeError('maxInputBytes must be a positive safe integer.');
  }

  if (
    !Number.isSafeInteger(limits.maxDecodedPixels) ||
    limits.maxDecodedPixels <= 0
  ) {
    throw new TypeError('maxDecodedPixels must be a positive safe integer.');
  }

  return limits;
}

export function validateFileSize(
  fileSize: number,
  limits: Readonly<ImageSafetyLimits>,
): ImagePreflightError | undefined {
  if (!Number.isSafeInteger(fileSize) || fileSize < 0) {
    return createPreflightError(
      IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage,
      'The source reports an invalid file size.',
      { fileSize },
    );
  }

  if (fileSize > limits.maxInputBytes) {
    return createPreflightError(
      IMAGE_PREFLIGHT_ERROR_CODES.FileTooLarge,
      'The source exceeds the maximum input file size.',
      {
        actualBytes: fileSize,
        maximumBytes: limits.maxInputBytes,
      },
    );
  }

  return undefined;
}

export function validateDimensions(
  width: number,
  height: number,
  limits: Readonly<ImageSafetyLimits>,
): ImagePreflightError | undefined {
  const decodedPixels = width * height;

  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return createPreflightError(
      IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage,
      'The source reports invalid image dimensions.',
      { width, height },
    );
  }

  if (
    !Number.isSafeInteger(decodedPixels) ||
    decodedPixels > limits.maxDecodedPixels
  ) {
    return createPreflightError(
      IMAGE_PREFLIGHT_ERROR_CODES.DimensionsTooLarge,
      'The decoded image dimensions exceed the pixel safety limit.',
      {
        width,
        height,
        decodedPixels,
        maximumDecodedPixels: limits.maxDecodedPixels,
      },
    );
  }

  return undefined;
}
