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
  /** FSG-005A: more outputs were requested than MAX_PACKAGE_ASSETS permits. */
  TooManyPackageAssets: 'TOO_MANY_PACKAGE_ASSETS',
  /** FSG-005A: completed asset bytes would exceed MAX_PACKAGE_TOTAL_OUTPUT_BYTES. */
  PackageOutputTooLarge: 'PACKAGE_OUTPUT_TOO_LARGE',
  /** FSG-005A: two or more requested outputs share the same `id`. */
  DuplicateAssetId: 'DUPLICATE_ASSET_ID',
  /** FSG-005A: two or more requested outputs share the same `filename`. */
  DuplicateFilename: 'DUPLICATE_FILENAME',
  /** FSG-005A: the requested archive filename does not end in `.zip`. */
  InvalidArchiveFilename: 'INVALID_ARCHIVE_FILENAME',
  /** FSG-005A: a requested output/archive entry filename fails archive path-safety validation. */
  UnsafeArchiveEntry: 'UNSAFE_ARCHIVE_ENTRY',
  /** FSG-005A: the ZIP archive adapter failed to produce archive bytes. */
  ArchiveCreationFailed: 'ARCHIVE_CREATION_FAILED',
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
  /** Target-size search only (FSG-002): covers the whole bounded dimension-tier/quality-probe search as one coarse, non-noisy stage. */
  | 'optimizing'
  | 'resizing'
  | 'encoding'
  /** Multi-output jobs only (FSG-005A): archive creation, after all requested outputs have been produced and validated. */
  | 'packaging'
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
