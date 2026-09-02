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
