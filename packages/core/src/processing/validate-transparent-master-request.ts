import { IMAGE_PROCESSING_ERROR_CODES, type FileSetGoProcessingError } from './contracts';
import { createProcessingError } from './errors';
import type { PrepareTransparentMasterOptions } from './transparent-master-contracts';

const VALID_STRENGTHS = new Set(['gentle', 'balanced', 'strong']);

export function validatePrepareTransparentMasterOptions(
  options: PrepareTransparentMasterOptions,
): FileSetGoProcessingError | undefined {
  if (!VALID_STRENGTHS.has(options.strength)) {
    return createProcessingError(
      IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
      'The requested background-removal strength is not supported.',
    );
  }

  return undefined;
}
