import { MAX_TARGET_BYTES, MIN_TARGET_BYTES } from '@filesetgo/core';
import type { CropRegion, DimensionPolicy, ImageFormat } from '@filesetgo/core';

import { checkGeometryApproval } from './crop';
import { formatBytes, unitValueToBytes, type SizeUnit } from './format-bytes';
import { isExactMode, isNoOpRequest, type OutputFormatChoice, type QuickFitRequirements } from './request-plan';

export interface QuickFitFormInput {
  sourceFormat: ImageFormat;
  sourceDimensions: { width: number; height: number };
  targetSizeValue: string;
  targetSizeUnit: SizeUnit;
  maxWidth: string;
  maxHeight: string;
  outputChoice: OutputFormatChoice;
  allowDimensionReduction: boolean;
  /** The user-approved crop region, when the current dialog step has one. */
  confirmedCrop?: CropRegion;
  /** The user's explicit approval to enlarge beyond available source detail. */
  upscaleApproved: boolean;
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
export function parsePositiveInt(raw: string): number | undefined | 'invalid' {
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
    // This form is Quick Fit's own manual entry — unlike Guided Fit's preset
    // compiler (`../presets/compiler.ts`), which also always sets both
    // dimensions as a governed bounding box, both fields filled here always
    // means the user asked for an exact frame (FSG-007-FIT-001).
    exactDimensions: typeof maxWidth === 'number' && typeof maxHeight === 'number',
  };

  if (isExactMode(requirements)) {
    // Defense-in-depth alongside the worker's own rejection (the dialog's
    // step-gating should make this unreachable in practice) — FileSetGo
    // never crops on its own (FSG-007-FIT-001 directive §3/§10). Shared with
    // Guided Fit's preset runner (FSG-007-FIT-002) so the two surfaces can
    // never silently disagree about when approval is mandatory.
    const approval = checkGeometryApproval(
      input.sourceDimensions,
      requirements.maxWidth!,
      requirements.maxHeight!,
      input.confirmedCrop,
      input.upscaleApproved,
    );

    if (!approval.ok) {
      const general = approval.reason === 'crop-required'
        ? 'Confirm the crop area before continuing.'
        : 'Approve enlarging the image before continuing — the requested size is larger than the available detail.';

      return { ok: false, errors: { general } };
    }

    requirements.crop = input.confirmedCrop;
    requirements.allowUpscale = input.upscaleApproved;
  }

  if (isNoOpRequest(requirements)) {
    return { ok: false, errors: { general: 'Add at least one requirement for your file.' } };
  }

  return { ok: true, requirements };
}
