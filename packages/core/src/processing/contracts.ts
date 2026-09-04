import type {
  ImagePreflightErrorCode,
  ImagePreflightResult,
} from '../preflight/contracts';

export const IMAGE_PROCESSING_ERROR_CODES = {
  DecodeFailed: 'DECODE_FAILED',
  EncodeFailed: 'ENCODE_FAILED',
  RuntimeUnsupported: 'RUNTIME_UNSUPPORTED',
  ProcessingCancelled: 'PROCESSING_CANCELLED',
  WorkerFailed: 'WORKER_FAILED',
  InvalidRequest: 'INVALID_PROCESSING_REQUEST',
  OutputValidationFailed: 'OUTPUT_VALIDATION_FAILED',
  /** The HEIC decoder module could not be lazily loaded (dynamic import failed). */
  HeicDecoderUnavailable: 'HEIC_DECODER_UNAVAILABLE',
  /** The HEIC decoder module loaded but its WASM runtime failed to initialize. */
  HeicInitializationFailed: 'HEIC_INITIALIZATION_FAILED',
} as const;

export const OUTPUT_IMAGE_MIME_TYPES = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
} as const;

export type OutputImageFormat = keyof typeof OUTPUT_IMAGE_MIME_TYPES;

export type ImageProcessingErrorCode =
  | ImagePreflightErrorCode
  | (typeof IMAGE_PROCESSING_ERROR_CODES)[keyof typeof IMAGE_PROCESSING_ERROR_CODES];

export type ImageProcessingStage =
  | 'preflighting'
  | 'accepted'
  | 'decoding'
  | 'normalizing'
  | 'resizing'
  | 'encoding'
  | 'finalizing'
  | 'complete';

export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  allowUpscale?: boolean;
}

export interface OutputOptions {
  format: OutputImageFormat;
  quality?: number;
}

export interface ProcessImageOptions {
  resize?: ResizeOptions;
  output: OutputOptions;
  onProgress?: (event: ImageProcessingProgress) => void;
}

export interface ProcessImageRequest {
  file: Blob;
  resize?: ResizeOptions;
  output: OutputOptions;
}

export interface ImageProcessingProgress {
  jobId: string;
  stage: ImageProcessingStage;
}

export interface FileSetGoProcessingError {
  code: ImageProcessingErrorCode;
  message: string;
  recoverable: boolean;
  details?: Readonly<Record<string, string | number | boolean>>;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessedImageResult {
  blob: Blob;
  width: number;
  height: number;
  format: OutputImageFormat;
  mimeType: string;
  byteSize: number;
  sourceDimensions: ImageDimensions;
  normalizedDimensions: ImageDimensions;
  resized: boolean;
}

export interface ImageProcessingComplete {
  status: 'complete';
  result: ProcessedImageResult;
}

export interface ImageProcessingFailed {
  status: 'failed';
  error: FileSetGoProcessingError;
}

export interface ImageProcessingCancelled {
  status: 'cancelled';
  error: FileSetGoProcessingError & {
    code: typeof IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled;
  };
}

export type ImageProcessingOutcome =
  | ImageProcessingComplete
  | ImageProcessingFailed
  | ImageProcessingCancelled;

export interface ImageProcessingJob {
  jobId: string;
  result: Promise<ImageProcessingOutcome>;
  cancel(): void;
}

export interface SafeImageProcessingRequest {
  file: Blob;
  preflight: ImagePreflightResult;
  resize?: ResizeOptions;
  output: OutputOptions;
}
