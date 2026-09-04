import type { ImagePreflightResult } from '../preflight/contracts';
import type {
  FileSetGoProcessingError,
  ImageDimensions,
  ImageProcessingProgress,
  OutputImageFormat,
  ProcessedImageResult,
} from './contracts';

/**
 * HARD: the requested dimensions are authoritative; only quality is
 * searched. FLEXIBLE: the requested dimensions are a preferred maximum —
 * quality is searched first, and dimensions step down through bounded
 * tiers only if quality search alone cannot meet the target.
 */
export type DimensionPolicy = 'hard' | 'flexible';

export interface TargetDimensions {
  maxWidth?: number;
  maxHeight?: number;
}

export interface TargetSizeQualityRange {
  minQuality: number;
  maxQuality: number;
}

export const TARGET_SIZE_ERROR_CODES = {
  TargetUnreachableHardDimensions: 'TARGET_UNREACHABLE_HARD_DIMENSIONS',
  TargetUnreachableMinQuality: 'TARGET_UNREACHABLE_MIN_QUALITY',
  TargetUnreachableMinDimensions: 'TARGET_UNREACHABLE_MIN_DIMENSIONS',
} as const;

export type TargetSizeUnreachableCode =
  (typeof TARGET_SIZE_ERROR_CODES)[keyof typeof TARGET_SIZE_ERROR_CODES];

export interface ProcessImageToTargetOptions {
  targetBytes: number;
  output: { format: OutputImageFormat };
  dimensions?: TargetDimensions;
  /** Defaults to 'flexible'. */
  dimensionPolicy?: DimensionPolicy;
  /** Defaults to { minQuality: 0.6, maxQuality: 0.95 }. */
  qualityRange?: Partial<TargetSizeQualityRange>;
  onProgress?: (event: ImageProcessingProgress) => void;
}

/** `ProcessImageToTargetOptions` with all defaults resolved and validated. */
export interface SafeImageProcessingTargetRequest {
  file: Blob;
  preflight: ImagePreflightResult;
  targetBytes: number;
  output: { format: OutputImageFormat };
  dimensions?: TargetDimensions;
  dimensionPolicy: DimensionPolicy;
  qualityRange: TargetSizeQualityRange;
}

export interface TargetSizeResult extends ProcessedImageResult {
  targetBytes: number;
  targetMet: true;
  /** undefined for PNG, which has no meaningful quality search parameter. */
  quality?: number;
  dimensionsReduced: boolean;
  qualityProbeCount: number;
  dimensionTierCount: number;
}

export interface TargetSizeUnreachable {
  code: TargetSizeUnreachableCode;
  message: string;
  /** The closest candidate found, if any candidate was ever produced. */
  bestAttempt?: {
    width: number;
    height: number;
    quality?: number;
    byteSize: number;
  };
  qualityProbeCount: number;
  dimensionTierCount: number;
}

export interface ImageProcessingTargetComplete {
  status: 'complete';
  result: TargetSizeResult;
}

export interface ImageProcessingTargetUnreachable {
  status: 'unreachable';
  outcome: TargetSizeUnreachable;
}

export interface ImageProcessingTargetFailed {
  status: 'failed';
  error: FileSetGoProcessingError;
}

export interface ImageProcessingTargetCancelled {
  status: 'cancelled';
  error: FileSetGoProcessingError;
}

export type ImageProcessingTargetOutcome =
  | ImageProcessingTargetComplete
  | ImageProcessingTargetUnreachable
  | ImageProcessingTargetFailed
  | ImageProcessingTargetCancelled;

export interface ImageProcessingTargetJob {
  jobId: string;
  result: Promise<ImageProcessingTargetOutcome>;
  cancel(): void;
}

export interface DimensionTier extends ImageDimensions {
  /** 0 = the initial candidate (no reduction); increases by one per step-down. */
  tier: number;
}
