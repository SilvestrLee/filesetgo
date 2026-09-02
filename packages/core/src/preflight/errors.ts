import {
  IMAGE_PREFLIGHT_ERROR_CODES,
  type ImagePreflightError,
  type ImagePreflightErrorCode,
} from './contracts';

type ParserErrorCode =
  | typeof IMAGE_PREFLIGHT_ERROR_CODES.InvalidSignature
  | typeof IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage;

export class ImageParserError extends Error {
  public constructor(
    public readonly code: ParserErrorCode,
    message: string,
    public readonly details?: ImagePreflightError['details'],
  ) {
    super(message);
    this.name = 'ImageParserError';
  }
}

export function createPreflightError(
  code: ImagePreflightErrorCode,
  message: string,
  details?: ImagePreflightError['details'],
): ImagePreflightError {
  return details === undefined ? { code, message } : { code, message, details };
}

export function corruptImage(
  message: string,
  details?: ImagePreflightError['details'],
): ImageParserError {
  return new ImageParserError(
    IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage,
    message,
    details,
  );
}

export function invalidSignature(message: string): ImageParserError {
  return new ImageParserError(
    IMAGE_PREFLIGHT_ERROR_CODES.InvalidSignature,
    message,
  );
}
