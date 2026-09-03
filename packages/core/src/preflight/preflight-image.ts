import { readSourceSlice } from './bounded-reader';
import {
  IMAGE_PREFLIGHT_ERROR_CODES,
  type ImageFormat,
  type ImagePreflightOptions,
  type ImagePreflightOutcome,
  type ImagePreflightResult,
  type ImageSource,
  type ParsedImageMetadata,
} from './contracts';
import { detectImageFormat } from './detect-format';
import { createPreflightError, ImageParserError } from './errors';
import { parseHeicMetadata } from './formats/heic';
import { parseJpegMetadata } from './formats/jpeg';
import { parsePngMetadata } from './formats/png';
import { parseWebpMetadata } from './formats/webp';
import {
  calculateMegapixels,
  resolveSafetyLimits,
  validateDimensions,
  validateFileSize,
} from './safety';

const DETECTION_BYTES = 12;

async function parseMetadata(
  format: ImageFormat,
  source: ImageSource,
): Promise<ParsedImageMetadata> {
  if (format === 'jpeg') {
    return parseJpegMetadata(source);
  }

  if (format === 'png') {
    return parsePngMetadata(source);
  }

  if (format === 'heic') {
    return parseHeicMetadata(source);
  }

  return parseWebpMetadata(source);
}

export async function preflightImage(
  source: ImageSource,
  options: ImagePreflightOptions = {},
): Promise<ImagePreflightOutcome> {
  const limits = resolveSafetyLimits(options.limits);
  const fileSizeError = validateFileSize(source.size, limits);

  if (fileSizeError !== undefined) {
    return { status: 'rejected', error: fileSizeError };
  }

  try {
    const detectionBytes = await readSourceSlice(
      source,
      0,
      Math.min(source.size, DETECTION_BYTES),
    );
    const format = detectImageFormat(detectionBytes);

    if (format === undefined) {
      return {
        status: 'rejected',
        error: createPreflightError(
          IMAGE_PREFLIGHT_ERROR_CODES.UnsupportedFormat,
          'The source format is not supported.',
        ),
      };
    }

    const metadata = await parseMetadata(format, source);
    const result: ImagePreflightResult = {
      format,
      width: metadata.width,
      height: metadata.height,
      megapixels: calculateMegapixels(metadata.width, metadata.height),
      fileSize: source.size,
      safeToDecode: true,
      ...(metadata.orientation === undefined
        ? {}
        : { orientation: metadata.orientation }),
      ...(metadata.animated === undefined
        ? {}
        : { animated: metadata.animated }),
    };
    const dimensionsError = validateDimensions(
      metadata.width,
      metadata.height,
      limits,
    );

    if (dimensionsError !== undefined) {
      return {
        status: 'rejected',
        error: dimensionsError,
        result: { ...result, safeToDecode: false },
      };
    }

    if (metadata.animated === true) {
      return {
        status: 'rejected',
        error: createPreflightError(
          IMAGE_PREFLIGHT_ERROR_CODES.AnimatedImageUnsupported,
          'Animated WebP images are not supported.',
        ),
        result: { ...result, safeToDecode: false },
      };
    }

    if (format === 'heic') {
      return {
        status: 'rejected',
        error: createPreflightError(
          IMAGE_PREFLIGHT_ERROR_CODES.HeicDecoderUnavailable,
          'HEIC/HEIF was identified and its dimensions were read, but no approved browser-side decoder is integrated yet.',
        ),
        result: { ...result, safeToDecode: false },
      };
    }

    return { status: 'ready', result };
  } catch (error) {
    if (error instanceof ImageParserError) {
      return {
        status: 'rejected',
        error: createPreflightError(error.code, error.message, error.details),
      };
    }

    throw error;
  }
}
