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

function validateOutputFormat(id: string, output: { format: string; quality?: number }): string | undefined {
  if (!(output.format in OUTPUT_IMAGE_MIME_TYPES)) {
    return `Output "${id}" has an unsupported format.`;
  }

  if (output.format === 'png' && output.quality !== undefined) {
    return `Output "${id}": PNG output does not accept a quality value.`;
  }

  if (output.quality !== undefined && (!Number.isFinite(output.quality) || output.quality < 0 || output.quality > 1)) {
    return `Output "${id}": quality must be between 0 and 1.`;
  }

  return undefined;
}

function validatePositiveDimension(id: string, name: string, value: number | undefined): string | undefined {
  if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
    return `Output "${id}": ${name} must be a positive safe integer.`;
  }

  return undefined;
}

/**
 * Validates a `processImageSet()` request before any decode/processing
 * begins (FSG-005A directive §13/§17/§18/§19; FSG-005B directive §17/§18
 * for the `'contain'`/`'ico'` kinds) — duplicate ids/filenames, unsafe
 * archive entry names, and the asset-count limit are all rejected cheaply
 * up front, before any expensive work starts.
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

    if (spec.kind === 'raster') {
      const formatIssue = validateOutputFormat(spec.id, spec.output);

      if (formatIssue !== undefined) {
        return invalid('InvalidRequest', formatIssue);
      }

      if (spec.resize !== undefined) {
        const { maxWidth, maxHeight } = spec.resize;

        if (maxWidth === undefined && maxHeight === undefined) {
          return invalid('InvalidRequest', `Output "${spec.id}": resize must provide maxWidth, maxHeight, or both.`);
        }

        const widthIssue = validatePositiveDimension(spec.id, 'maxWidth', maxWidth);
        const heightIssue = validatePositiveDimension(spec.id, 'maxHeight', maxHeight);

        if (widthIssue !== undefined) return invalid('InvalidRequest', widthIssue);
        if (heightIssue !== undefined) return invalid('InvalidRequest', heightIssue);

        if (
          maxWidth !== undefined &&
          maxHeight !== undefined &&
          maxWidth * maxHeight > DEFAULT_SAFETY_LIMITS.maxDecodedPixels
        ) {
          return invalid('InvalidRequest', `Output "${spec.id}": requested resize bounds exceed the decoded-pixel safety limit.`);
        }
      }
    } else if (spec.kind === 'contain') {
      const formatIssue = validateOutputFormat(spec.id, spec.output);

      if (formatIssue !== undefined) {
        return invalid('InvalidRequest', formatIssue);
      }

      const widthIssue = validatePositiveDimension(spec.id, 'canvas.width', spec.canvas.width);
      const heightIssue = validatePositiveDimension(spec.id, 'canvas.height', spec.canvas.height);

      if (widthIssue !== undefined) return invalid('InvalidRequest', widthIssue);
      if (heightIssue !== undefined) return invalid('InvalidRequest', heightIssue);

      if (spec.canvas.width * spec.canvas.height > DEFAULT_SAFETY_LIMITS.maxDecodedPixels) {
        return invalid('InvalidRequest', `Output "${spec.id}": canvas dimensions exceed the decoded-pixel safety limit.`);
      }

      if (!Number.isFinite(spec.contentScale) || spec.contentScale <= 0 || spec.contentScale > 1) {
        return invalid('InvalidRequest', `Output "${spec.id}": contentScale must be between 0 (exclusive) and 1.`);
      }
    } else {
      if (spec.entries.length === 0) {
        return invalid('InvalidRequest', `Output "${spec.id}": an ICO output must request at least one entry.`);
      }

      for (const entry of spec.entries) {
        const sizeIssue = validatePositiveDimension(spec.id, 'entries[].size', entry.size);

        if (sizeIssue !== undefined) {
          return invalid('InvalidRequest', sizeIssue);
        }

        if (!Number.isFinite(entry.contentScale) || entry.contentScale <= 0 || entry.contentScale > 1) {
          return invalid('InvalidRequest', `Output "${spec.id}": entries[].contentScale must be between 0 (exclusive) and 1.`);
        }
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
