import type { ImagePreflightResult } from '../preflight/contracts';
import type {
  FileSetGoProcessingError,
  ImageProcessingStage,
  OutputImageFormat,
  ProcessedImageResult,
  ResizeOptions,
} from './contracts';

/**
 * One requested output asset (FSG-005A directive §7/§8). Deliberately
 * destination-neutral: this module has no concept of "logo" or "favicon" —
 * it only knows format/dimensions/filename, reusing the exact same
 * `OutputImageFormat`/`ResizeOptions` contracts `processImage()` already
 * uses. FSG-005B supplies the actual preset knowledge.
 */
export interface ImageSetOutputSpec {
  /** Stable, caller-defined identifier (e.g. "asset-a"). Must be unique within one request. */
  id: string;
  /** The output's filename (also its ZIP entry name, if archived). Must be unique within one request. */
  filename: string;
  output: { format: OutputImageFormat; quality?: number };
  resize?: ResizeOptions;
}

export interface ImageSetArchiveOptions {
  /** Must end in `.zip`. */
  filename: string;
}

export interface ProcessImageSetOptions {
  outputs: ImageSetOutputSpec[];
  archive?: ImageSetArchiveOptions;
  onProgress?: (event: ImageSetProcessingProgress) => void;
}

export interface ImageSetProcessingProgress {
  jobId: string;
  stage: ImageProcessingStage;
  /** 1-based index of the asset currently being produced. Present only during per-asset stages. */
  assetIndex?: number;
  assetCount?: number;
}

export interface ImageSetAssetResult extends ProcessedImageResult {
  id: string;
  filename: string;
}

export interface ImageSetResult {
  assets: ImageSetAssetResult[];
  assetCount: number;
  /** Sum of every asset's `byteSize`, before archiving. */
  totalOutputBytes: number;
  archive?: { blob: Blob; filename: string; byteSize: number };
}

export interface ImageProcessingSetComplete {
  status: 'complete';
  result: ImageSetResult;
}

export interface ImageProcessingSetFailed {
  status: 'failed';
  error: FileSetGoProcessingError;
}

export interface ImageProcessingSetCancelled {
  status: 'cancelled';
  error: FileSetGoProcessingError;
}

export type ImageProcessingSetOutcome =
  | ImageProcessingSetComplete
  | ImageProcessingSetFailed
  | ImageProcessingSetCancelled;

export interface ImageProcessingSetJob {
  jobId: string;
  result: Promise<ImageProcessingSetOutcome>;
  cancel(): void;
}

/** `ProcessImageSetOptions` plus the file/preflight the runtime already resolved, exactly mirroring `SafeImageProcessingRequest`. */
export interface SafeImageProcessingSetRequest {
  file: Blob;
  preflight: ImagePreflightResult;
  outputs: ImageSetOutputSpec[];
  archive?: ImageSetArchiveOptions;
}
