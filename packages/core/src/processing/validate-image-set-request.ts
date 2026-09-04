import { isSafeArchiveEntryName, isSafeArchiveFilename } from '../archive/filename-safety';
import { DEFAULT_SAFETY_LIMITS } from '../preflight/safety';
import {
  IMAGE_PROCESSING_ERROR_CODES,
  OUTPUT_IMAGE_MIME_TYPES,
  type FileSetGoProcessingError,
} from './contracts';
import { createProcessingError } from './errors';
import type { ProcessImageSetOptions } from './image-set-contracts';
import { MAX_PACKAGE_ASSETS } from './image-set-limits';

export interface ValidateImageSetOptionsResult {
  error: FileSetGoProcessingError | undefined;
}

function invalid(code: keyof typeof IMAGE_PROCESSING_ERROR_CODES, message: string): ValidateImageSetOptionsResult {
  return { error: createProcessingError(IMAGE_PROCESSING_ERROR_CODES[code], message) };
}

/**
 * Validates a `processImageSet()` request before any decode/processing
 * begins (FSG-005A directive §13/§17/§18/§19) — duplicate ids/filenames,
 * unsafe archive entry names, and the asset-count limit are all rejected
 * cheaply up front, before any expensive work starts.
 */
export function validateProcessImageSetOptions(
  options: ProcessImageSetOptions,
): ValidateImageSetOptionsResult {
  if (options.outputs.length === 0) {
    return invalid('InvalidRequest', 'An image set must request at least one output.');
  }

  if (options.outputs.length > MAX_PACKAGE_ASSETS) {
    return invalid(
      'TooManyPackageAssets',
      `An image set may request at most ${MAX_PACKAGE_ASSETS} outputs.`,
    );
  }

  const seenIds = new Set<string>();
  const seenFilenames = new Set<string>();

  for (const spec of options.outputs) {
    if (spec.id.trim().length === 0) {
      return invalid('InvalidRequest', 'Every output must have a non-empty id.');
    }

    if (spec.filename.trim().length === 0) {
      return invalid('InvalidRequest', 'Every output must have a non-empty filename.');
    }

    if (!(spec.output.format in OUTPUT_IMAGE_MIME_TYPES)) {
      return invalid('InvalidRequest', `Output "${spec.id}" has an unsupported format.`);
    }

    if (spec.output.format === 'png' && spec.output.quality !== undefined) {
      return invalid('InvalidRequest', `Output "${spec.id}": PNG output does not accept a quality value.`);
    }

    if (
      spec.output.quality !== undefined &&
      (!Number.isFinite(spec.output.quality) || spec.output.quality < 0 || spec.output.quality > 1)
    ) {
      return invalid('InvalidRequest', `Output "${spec.id}": quality must be between 0 and 1.`);
    }

    if (spec.resize !== undefined) {
      const { maxWidth, maxHeight } = spec.resize;

      if (maxWidth === undefined && maxHeight === undefined) {
        return invalid('InvalidRequest', `Output "${spec.id}": resize must provide maxWidth, maxHeight, or both.`);
      }

      for (const [name, value] of [['maxWidth', maxWidth], ['maxHeight', maxHeight]] as const) {
        if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
          return invalid('InvalidRequest', `Output "${spec.id}": ${name} must be a positive safe integer.`);
        }
      }

      if (
        maxWidth !== undefined &&
        maxHeight !== undefined &&
        maxWidth * maxHeight > DEFAULT_SAFETY_LIMITS.maxDecodedPixels
      ) {
        return invalid('InvalidRequest', `Output "${spec.id}": requested resize bounds exceed the decoded-pixel safety limit.`);
      }
    }

    if (!isSafeArchiveEntryName(spec.filename)) {
      return invalid('UnsafeArchiveEntry', `Output "${spec.id}" has an unsafe filename: "${spec.filename}".`);
    }

    if (seenIds.has(spec.id)) {
      return invalid('DuplicateAssetId', `Duplicate output id: "${spec.id}".`);
    }

    seenIds.add(spec.id);

    if (seenFilenames.has(spec.filename)) {
      return invalid('DuplicateFilename', `Duplicate output filename: "${spec.filename}".`);
    }

    seenFilenames.add(spec.filename);
  }

  if (options.archive !== undefined && !isSafeArchiveFilename(options.archive.filename)) {
    return invalid(
      'InvalidArchiveFilename',
      `The archive filename must be a safe, flat name ending in ".zip": "${options.archive.filename}".`,
    );
  }

  return { error: undefined };
}
