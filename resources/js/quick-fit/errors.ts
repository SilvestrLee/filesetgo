import type {
  DimensionPolicy,
  FileSetGoProcessingError,
  ImageProcessingErrorCode,
  OutputImageFormat,
  TargetSizeUnreachable,
} from '@filesetgo/core';

/**
 * Human-language translations of every structured processing/preflight
 * error code (FSG-003 directive §29). Deliberately a lookup table, not a
 * switch, so an unmapped future code falls through to the safe fallback
 * below rather than needing a new branch to compile.
 */
const ERROR_MESSAGES: Partial<Record<ImageProcessingErrorCode, string>> = {
  FILE_TOO_LARGE: 'This file is larger than the current 15 MB limit.',
  DIMENSIONS_TOO_LARGE: 'This image is too large for browser processing right now.',
  UNSUPPORTED_FORMAT: 'FileSetGo currently supports JPEG, PNG, WebP and HEIC images.',
  INVALID_SIGNATURE: "This doesn't look like a valid image file.",
  CORRUPT_IMAGE: "We couldn't read this image. It may be damaged.",
  ANIMATED_IMAGE_UNSUPPORTED: "Animated images aren't supported yet.",
  HEIC_DECODER_UNAVAILABLE: "HEIC processing couldn't be started in this browser.",
  HEIC_INITIALIZATION_FAILED: "HEIC processing couldn't be started in this browser.",
  DECODE_FAILED: "We couldn't read this image.",
  ENCODE_FAILED: "We couldn't create the ready file.",
  RUNTIME_UNSUPPORTED: "This browser doesn't support the processing features FileSetGo needs.",
  OUTPUT_VALIDATION_FAILED: "We couldn't verify the ready file. Please try again.",
  WORKER_FAILED: 'Something interrupted processing. Please try again.',
  INVALID_PROCESSING_REQUEST: "That combination of requirements isn't valid.",
  PROCESSING_CANCELLED: 'Processing was cancelled.',
};

const FALLBACK_ERROR_MESSAGE = 'Something went wrong while preparing your file. Please try again.';

export function describeProcessingError(error: FileSetGoProcessingError): string {
  return ERROR_MESSAGES[error.code] ?? FALLBACK_ERROR_MESSAGE;
}

export interface UnreachableExplanation {
  message: string;
  suggestion: string;
}

/**
 * Translates an FSG-002 target-unreachable outcome into plain language
 * plus a concrete next step (FSG-003 directive §27/§28). This is not a
 * system error — the job succeeded, it just couldn't meet the requested
 * limit within FileSetGo's bounded guardrails.
 */
export function describeUnreachable(
  outcome: TargetSizeUnreachable,
  dimensionPolicy: DimensionPolicy,
  outputFormat: OutputImageFormat,
): UnreachableExplanation {
  if (outcome.code === 'TARGET_UNREACHABLE_HARD_DIMENSIONS') {
    return {
      message: "We couldn't reach that file-size limit without reducing the image dimensions.",
      suggestion: 'Allow dimension adjustment and try again.',
    };
  }

  const suggestions = ['Choose a slightly larger target size.'];

  if (outputFormat === 'png') {
    suggestions.push('PNG is lossless, so JPEG or WebP can reach smaller sizes.');
  }

  if (dimensionPolicy === 'hard') {
    suggestions.push('Allow dimension adjustment and try again.');
  }

  return {
    message: "That file-size limit is too small to reach within FileSetGo's quality and dimension guardrails.",
    suggestion: suggestions.join(' '),
  };
}
