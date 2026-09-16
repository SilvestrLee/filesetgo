import type {
  ImagePreflightResult,
  OutputImageFormat,
  ProcessedImageResult,
  TargetSizeResult,
} from '@filesetgo/core';

import { formatBytes, reductionPercentage } from './format-bytes';

const FORMAT_LABELS: Record<OutputImageFormat, string> = {
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
};

export function formatLabel(format: OutputImageFormat): string {
  return FORMAT_LABELS[format];
}

export function isTargetResult(result: ProcessedImageResult | TargetSizeResult): result is TargetSizeResult {
  return 'targetMet' in result;
}

export interface SuccessSummary {
  headline: string;
  detail: string;
  reductionLabel?: string;
}

/**
 * Builds the plain-language success summary (FSG-003 directive §22/§23)
 * entirely from the actual returned result metadata — never assumed or
 * recomputed — so FileSetGo never claims a target was met, or dimensions
 * were reduced, unless the core result says so.
 */
export function buildSuccessSummary(
  source: ImagePreflightResult,
  result: ProcessedImageResult | TargetSizeResult,
): SuccessSummary {
  const reduction = reductionPercentage(source.fileSize, result.byteSize);
  const reductionLabel = reduction === undefined ? undefined : `${reduction}% smaller`;

  if (isTargetResult(result)) {
    // `dimensionsReduced` only reflects whether the BYTE-TARGET SEARCH itself
    // shrank dimensions beyond what was requested — it says nothing about
    // whether the requested/destination frame already differs from the
    // source (an exact destination frame, e.g. Guided Fit's Hero/Content/
    // Card, FSG-007-FIT-002-R1). Comparing actual output dimensions against
    // the actual source dimensions — exactly like the non-target branch
    // below already does — is what makes "without reducing the dimensions"
    // true or false from the user's own point of view.
    const dimensionsChanged = result.width !== source.width || result.height !== source.height;
    const wasEnlarged = result.width > source.width || result.height > source.height;

    let detail: string;

    if (result.dimensionsReduced) {
      detail = `FileSetGo reduced the dimensions to meet your ${formatBytes(result.targetBytes)} limit.`;
    } else if (dimensionsChanged) {
      detail = `FileSetGo prepared it at ${result.width} × ${result.height} and brought it under ${formatBytes(result.targetBytes)}.`;

      if (wasEnlarged) {
        detail += ' Source was enlarged with your approval.';
      }
    } else {
      detail = `FileSetGo got it under ${formatBytes(result.targetBytes)} without reducing the dimensions.`;
    }

    return { headline: 'Your file is ready.', detail, reductionLabel };
  }

  const dimensionsChanged = result.width !== source.width || result.height !== source.height;
  const formatChanged = (result.format as string) !== source.format;
  const parts: string[] = [];

  if (dimensionsChanged) {
    parts.push(`resized it to ${result.width} × ${result.height}`);
  }

  if (formatChanged) {
    parts.push(`converted it to ${formatLabel(result.format)}`);
  }

  const detail = parts.length > 0
    ? `FileSetGo ${parts.join(' and ')}.`
    : 'Your file is ready to download.';

  return { headline: 'Your file is ready.', detail, reductionLabel };
}
