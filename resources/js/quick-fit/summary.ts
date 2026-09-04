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
    const detail = result.dimensionsReduced
      ? `FileSetGo reduced the dimensions to meet your ${formatBytes(result.targetBytes)} limit.`
      : `FileSetGo got it under ${formatBytes(result.targetBytes)} without reducing the dimensions.`;

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
