import type { ImagePreflightResult } from '../preflight/contracts';
import type {
  FileSetGoProcessingError,
  ImageProcessingStage,
  OutputImageFormat,
  ProcessedImageResult,
  ResizeOptions,
} from './contracts';

/**
 * A plain resize-fit output: preserves aspect ratio inside an optional
 * bounding box, exactly like `processImage()`'s own `resize` option
 * (FSG-005A directive §7/§8). The canvas is sized to the resulting
 * content — this is what `logo-header.png`/`logo-header@2x.png` use.
 */
export interface RasterImageSetOutputSpec {
  kind: 'raster';
  /** Stable, caller-defined identifier (e.g. "asset-a"). Must be unique within one request. */
  id: string;
  /** The output's filename (also its ZIP entry name, if archived). Must be unique within one request. */
  filename: string;
  output: { format: OutputImageFormat; quality?: number };
  resize?: ResizeOptions;
}

/**
 * A fixed-canvas CONTAIN output (FSG-005B directive §17): the canvas is
 * always exactly `canvas.width` × `canvas.height`, regardless of source
 * aspect ratio — the source is centered within it, scaled to occupy at
 * most `contentScale` of either axis, never cropped or stretched. This is
 * what every square icon asset uses.
 */
export interface ContainImageSetOutputSpec {
  kind: 'contain';
  id: string;
  filename: string;
  output: { format: OutputImageFormat; quality?: number };
  canvas: { width: number; height: number };
  /** 0–1. How much of the canvas the contained source may occupy on its longer axis. */
  contentScale: number;
  allowUpscale: boolean;
}

/**
 * An ICO container built from one or more independently CONTAIN-rendered
 * PNG entries (FSG-005B directive §28–§30). Every entry shares the same
 * decoded source; each gets its own square canvas/content-scale/upscale
 * render before being embedded.
 */
export interface IcoImageSetOutputSpec {
  kind: 'ico';
  id: string;
  /** Must end in `.ico`. */
  filename: string;
  entries: Array<{ size: number; contentScale: number; allowUpscale: boolean }>;
}

export type ImageSetOutputSpec =
  | RasterImageSetOutputSpec
  | ContainImageSetOutputSpec
  | IcoImageSetOutputSpec;

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

/** A plain raster file result — produced by both `'raster'` and `'contain'` output specs. */
export interface RasterAssetResult extends ProcessedImageResult {
  kind: 'raster';
  id: string;
  filename: string;
}

/** An ICO container result. Has no single width/height — `sizes` lists every embedded square entry size. */
export interface IcoAssetResult {
  kind: 'ico';
  id: string;
  filename: string;
  blob: Blob;
  mimeType: string;
  byteSize: number;
  sizes: number[];
}

export type ImageSetAssetResult = RasterAssetResult | IcoAssetResult;

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
