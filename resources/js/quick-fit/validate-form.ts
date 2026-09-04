import { MAX_TARGET_BYTES, MIN_TARGET_BYTES } from '@filesetgo/core';
import type { DimensionPolicy, ImageFormat } from '@filesetgo/core';

import { formatBytes, unitValueToBytes, type SizeUnit } from './format-bytes';
import { isNoOpRequest, type OutputFormatChoice, type QuickFitRequirements } from './request-plan';

export interface QuickFitFormInput {
  sourceFormat: ImageFormat;
  targetSizeValue: string;
  targetSizeUnit: SizeUnit;
  maxWidth: string;
  maxHeight: string;
  outputChoice: OutputFormatChoice;
  allowDimensionReduction: boolean;
}

export interface QuickFitFormErrors {
  targetSize?: string;
  maxWidth?: string;
  maxHeight?: string;
  general?: string;
}

export type QuickFitFormResult =
  | { ok: true; requirements: QuickFitRequirements }
  | { ok: false; errors: QuickFitFormErrors };

/** Parses an optional positive-integer field. `undefined` = left blank; `'invalid'` = present but not usable. */
function parsePositiveInt(raw: string): number | undefined | 'invalid' {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  const value = Number(trimmed);

  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    return 'invalid';
  }

  return value;
}

/**
 * Reads and validates the Quick Fit requirements form (FSG-003 directive
 * §44). This is an early-clarity check, not a security boundary — the core
 * package's own validation remains authoritative for every job it runs.
 */
export function readQuickFitForm(input: QuickFitFormInput): QuickFitFormResult {
  const errors: QuickFitFormErrors = {};
  let targetBytes: number | undefined;

  const trimmedTarget = input.targetSizeValue.trim();

  if (trimmedTarget.length > 0) {
    const value = Number(trimmedTarget);

    if (!Number.isFinite(value) || value <= 0) {
      errors.targetSize = 'Enter a target size greater than zero.';
    } else {
      const bytes = unitValueToBytes(value, input.targetSizeUnit);

      if (bytes < MIN_TARGET_BYTES) {
        errors.targetSize = `Target size must be at least ${formatBytes(MIN_TARGET_BYTES)}.`;
      } else if (bytes > MAX_TARGET_BYTES) {
        errors.targetSize = `Target size must be ${formatBytes(MAX_TARGET_BYTES)} or less.`;
      } else {
        targetBytes = bytes;
      }
    }
  }

  const maxWidth = parsePositiveInt(input.maxWidth);

  if (maxWidth === 'invalid') {
    errors.maxWidth = 'Enter a whole number of pixels greater than zero.';
  }

  const maxHeight = parsePositiveInt(input.maxHeight);

  if (maxHeight === 'invalid') {
    errors.maxHeight = 'Enter a whole number of pixels greater than zero.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  const requirements: QuickFitRequirements = {
    sourceFormat: input.sourceFormat,
    outputChoice: input.outputChoice,
    targetBytes,
    maxWidth: typeof maxWidth === 'number' ? maxWidth : undefined,
    maxHeight: typeof maxHeight === 'number' ? maxHeight : undefined,
    dimensionPolicy: (input.allowDimensionReduction ? 'flexible' : 'hard') as DimensionPolicy,
  };

  if (isNoOpRequest(requirements)) {
    return { ok: false, errors: { general: 'Add at least one requirement for your file.' } };
  }

  return { ok: true, requirements };
}
