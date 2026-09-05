import type { ImagePreflightResult } from '../preflight/contracts';
import type { AlphaInspectionResult } from '../transforms/alpha-inspection';
import type { BackgroundRemovalStrength } from '../transforms/background-removal';
import type { FileSetGoProcessingError, ImageProcessingProgress } from './contracts';

/**
 * FSG-005C directive §16: a genuine result whose mechanical verification
 * passed but the algorithm found an ambiguity signal is `needs-review`, not
 * a silent `verified`. `failed` means no technically acceptable transparent
 * master could be produced at all.
 */
export type TransparentMasterStatus = 'verified' | 'needs-review' | 'failed';

export interface PrepareTransparentMasterOptions {
  strength: BackgroundRemovalStrength;
  onProgress?: (event: ImageProcessingProgress) => void;
}

/** `PrepareTransparentMasterOptions` plus the preflight the worker needs — never constructed by product code directly. */
export interface SafeTransparentMasterRequest {
  file: Blob;
  preflight: ImagePreflightResult;
  strength: BackgroundRemovalStrength;
}

/**
 * The transparent master itself (directive §23) — always PNG, always
 * carries the actual post-encode alpha inspection (directive §24) that
 * proves (or disproves) real transparency, never only a status flag.
 */
export interface TransparentMasterResult {
  blob: Blob;
  width: number;
  height: number;
  format: 'png';
  mimeType: 'image/png';
  byteSize: number;
  /** The ACTUAL encoded output's alpha inspection (directive §24) — not the pre-encode canvas. */
  alphaInspection: AlphaInspectionResult;
  /** True when background removal actually ran (false when the source already had usable transparency and was preserved as-is). */
  removalApplied: boolean;
  /** Present only when `removalApplied` is true. */
  strength?: BackgroundRemovalStrength;
  status: TransparentMasterStatus;
  /** A short, internal, non-user-facing reason code for `needs-review`/`failed` — the product layer maps this to real copy (directive §52). */
  reason?: string;
}

export interface TransparentMasterComplete {
  status: 'complete';
  result: TransparentMasterResult;
}

export interface TransparentMasterFailed {
  status: 'failed';
  error: FileSetGoProcessingError;
}

export interface TransparentMasterCancelled {
  status: 'cancelled';
  error: FileSetGoProcessingError;
}

export type TransparentMasterOutcome =
  | TransparentMasterComplete
  | TransparentMasterFailed
  | TransparentMasterCancelled;

export interface TransparentMasterJob {
  jobId: string;
  result: Promise<TransparentMasterOutcome>;
  cancel(): void;
}
