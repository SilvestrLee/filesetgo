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
} from './runtime/worker-client';
export { MAX_ACTIVE_HEAVY_JOBS } from './runtime/constants';
