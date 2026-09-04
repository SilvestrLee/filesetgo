export const IMAGE_PREFLIGHT_ERROR_CODES = {
  UnsupportedFormat: 'UNSUPPORTED_FORMAT',
  InvalidSignature: 'INVALID_SIGNATURE',
  CorruptImage: 'CORRUPT_IMAGE',
  FileTooLarge: 'FILE_TOO_LARGE',
  DimensionsTooLarge: 'DIMENSIONS_TOO_LARGE',
  AnimatedImageUnsupported: 'ANIMATED_IMAGE_UNSUPPORTED',
} as const;

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'heic';

export type ExifOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type ImagePreflightErrorCode =
  (typeof IMAGE_PREFLIGHT_ERROR_CODES)[keyof typeof IMAGE_PREFLIGHT_ERROR_CODES];

export interface ImageSafetyLimits {
  maxInputBytes: number;
  maxDecodedPixels: number;
}

export interface ImageSource {
  readonly size: number;
  slice(start?: number, end?: number): Blob;
}

export interface ImagePreflightResult {
  format: ImageFormat;
  width: number;
  height: number;
  megapixels: number;
  fileSize: number;
  orientation?: ExifOrientation;
  animated?: boolean;
  safeToDecode: boolean;
}

export interface ImagePreflightError {
  code: ImagePreflightErrorCode;
  message: string;
  details?: Readonly<Record<string, string | number | boolean>>;
}

export interface ImagePreflightReady {
  status: 'ready';
  result: ImagePreflightResult;
}

export interface ImagePreflightRejected {
  status: 'rejected';
  error: ImagePreflightError;
  result?: ImagePreflightResult;
}

export type ImagePreflightOutcome = ImagePreflightReady | ImagePreflightRejected;

export interface ImagePreflightOptions {
  limits?: Partial<ImageSafetyLimits>;
}

export interface ParsedImageMetadata {
  width: number;
  height: number;
  orientation?: ExifOrientation;
  animated?: boolean;
}
