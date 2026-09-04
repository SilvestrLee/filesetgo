import type { ImagePreflightError } from '../preflight/contracts';
import {
  IMAGE_PROCESSING_ERROR_CODES,
  type FileSetGoProcessingError,
  type ImageProcessingErrorCode,
} from './contracts';

const RECOVERABLE_CODES = new Set<ImageProcessingErrorCode>([
  'UNSUPPORTED_FORMAT',
  'INVALID_SIGNATURE',
  'CORRUPT_IMAGE',
  'FILE_TOO_LARGE',
  'DIMENSIONS_TOO_LARGE',
  'ANIMATED_IMAGE_UNSUPPORTED',
  IMAGE_PROCESSING_ERROR_CODES.HeicDecoderUnavailable,
  IMAGE_PROCESSING_ERROR_CODES.HeicInitializationFailed,
  IMAGE_PROCESSING_ERROR_CODES.DecodeFailed,
  IMAGE_PROCESSING_ERROR_CODES.EncodeFailed,
  IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled,
  IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
  IMAGE_PROCESSING_ERROR_CODES.OutputValidationFailed,
  IMAGE_PROCESSING_ERROR_CODES.WorkerFailed,
  IMAGE_PROCESSING_ERROR_CODES.TooManyPackageAssets,
  IMAGE_PROCESSING_ERROR_CODES.PackageOutputTooLarge,
  IMAGE_PROCESSING_ERROR_CODES.DuplicateAssetId,
  IMAGE_PROCESSING_ERROR_CODES.DuplicateFilename,
  IMAGE_PROCESSING_ERROR_CODES.InvalidArchiveFilename,
  IMAGE_PROCESSING_ERROR_CODES.UnsafeArchiveEntry,
  IMAGE_PROCESSING_ERROR_CODES.ArchiveCreationFailed,
]);

export function createProcessingError(
  code: ImageProcessingErrorCode,
  message: string,
  details?: FileSetGoProcessingError['details'],
): FileSetGoProcessingError {
  const error: FileSetGoProcessingError = {
    code,
    message,
    recoverable: RECOVERABLE_CODES.has(code),
  };

  return details === undefined ? error : { ...error, details };
}

export function fromPreflightError(
  error: ImagePreflightError,
): FileSetGoProcessingError {
  return createProcessingError(error.code, error.message, error.details);
}

export function processingCancelled(): FileSetGoProcessingError & {
  code: typeof IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled;
} {
  return {
    code: IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled,
    message: 'Image processing was cancelled.',
    recoverable: true,
  };
}
