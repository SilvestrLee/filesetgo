export const FILESETGO_CORE_VERSION = '0.1.0';

export {
  IMAGE_PREFLIGHT_ERROR_CODES,
  type ExifOrientation,
  type ImageFormat,
  type ImagePreflightError,
  type ImagePreflightErrorCode,
  type ImagePreflightOptions,
  type ImagePreflightOutcome,
  type ImagePreflightReady,
  type ImagePreflightRejected,
  type ImagePreflightResult,
  type ImageSafetyLimits,
  type ImageSource,
} from './preflight/contracts';
export { preflightImage } from './preflight/preflight-image';
export {
  calculateMegapixels,
  DEFAULT_SAFETY_LIMITS,
} from './preflight/safety';
export {
  IMAGE_PROCESSING_ERROR_CODES,
  OUTPUT_IMAGE_MIME_TYPES,
  type FileSetGoProcessingError,
  type ImageDimensions,
  type ImageProcessingCancelled,
  type ImageProcessingComplete,
  type ImageProcessingErrorCode,
  type ImageProcessingFailed,
  type ImageProcessingJob,
  type ImageProcessingOutcome,
  type ImageProcessingProgress,
  type ImageProcessingStage,
  type OutputImageFormat,
  type OutputOptions,
  type ProcessedImageResult,
  type ProcessImageOptions,
  type ProcessImageRequest,
  type ResizeOptions,
} from './processing/contracts';
export {
  getRuntimeCapabilities,
  type FileSetGoRuntimeCapabilities,
} from './runtime/capabilities';
export {
  cancelImageJob,
  processImage,
  processImageSet,
  processImageToTarget,
} from './runtime/worker-client';
export { MAX_ACTIVE_HEAVY_JOBS } from './runtime/constants';
export {
  type ContainImageSetOutputSpec,
  type IcoAssetResult,
  type IcoImageSetOutputSpec,
  type ImageProcessingSetCancelled,
  type ImageProcessingSetComplete,
  type ImageProcessingSetFailed,
  type ImageProcessingSetJob,
  type ImageProcessingSetOutcome,
  type ImageSetArchiveOptions,
  type ImageSetAssetResult,
  type ImageSetOutputSpec,
  type ImageSetProcessingProgress,
  type ImageSetResult,
  type ProcessImageSetOptions,
  type RasterAssetResult,
  type RasterImageSetOutputSpec,
} from './processing/image-set-contracts';
export {
  MAX_PACKAGE_ASSETS,
  MAX_PACKAGE_TOTAL_OUTPUT_BYTES,
} from './processing/image-set-limits';
export {
  calculateContainPlan,
  type ContainRenderPlan,
} from './transforms/contain';
export {
  TARGET_SIZE_ERROR_CODES,
  type DimensionPolicy,
  type DimensionTier,
  type ImageProcessingTargetCancelled,
  type ImageProcessingTargetComplete,
  type ImageProcessingTargetFailed,
  type ImageProcessingTargetJob,
  type ImageProcessingTargetOutcome,
  type ImageProcessingTargetUnreachable,
  type ProcessImageToTargetOptions,
  type SafeImageProcessingTargetRequest,
  type TargetDimensions,
  type TargetSizeQualityRange,
  type TargetSizeResult,
  type TargetSizeUnreachable,
  type TargetSizeUnreachableCode,
} from './processing/target-size-contracts';
export {
  ABSOLUTE_QUALITY_BOUNDS,
  DEFAULT_QUALITY_RANGE,
  DIMENSION_TIER_SCALE,
  MAX_DIMENSION_TIERS,
  MAX_QUALITY_PROBES_PER_TIER,
  MAX_TARGET_BYTES,
  MIN_DIMENSION_PX,
  MIN_TARGET_BYTES,
} from './processing/target-size-limits';
