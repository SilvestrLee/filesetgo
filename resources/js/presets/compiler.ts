import type { CropRegion, ImageFormat } from '@filesetgo/core';

import type { QuickFitRequirements } from '../quick-fit/request-plan';
import type { FileSetGoPreset } from './contracts';

/**
 * A source-and-destination-specific approval, supplied by
 * `GuidedFitController` only at the moment it actually runs a preset — this
 * is never part of the static catalog (FSG-007-FIT-002).
 */
export interface PresetGeometryApproval {
  crop?: CropRegion;
  allowUpscale?: boolean;
}

/**
 * Compiles a preset into the exact same `QuickFitRequirements` shape Quick
 * Fit's own form produces (FSG-004 directive §21). This is the entire
 * bridge between Guided Fit and the existing orchestration boundary —
 * `request-plan.ts`'s `planProcessing()` then routes it to
 * `processImageToTarget()` (all three initial presets set `targetBytes`)
 * exactly as it would for a manually entered Quick Fit target request.
 *
 * `approval` carries the user-confirmed crop/upscale decision for an
 * `exactDimensions` preset (FSG-007-FIT-002) — omitted entirely for a
 * bounding-box preset, which never needs one.
 */
export function compilePreset(
  preset: FileSetGoPreset,
  sourceFormat: ImageFormat,
  approval?: PresetGeometryApproval,
): QuickFitRequirements {
  const { requirements } = preset;

  return {
    sourceFormat,
    outputChoice: requirements.outputFormat,
    targetBytes: requirements.targetBytes,
    maxWidth: requirements.maxWidth,
    maxHeight: requirements.maxHeight,
    dimensionPolicy: requirements.dimensionPolicy,
    exactDimensions: requirements.exactDimensions,
    ...(approval?.crop === undefined ? {} : { crop: approval.crop }),
    ...(approval?.allowUpscale === undefined ? {} : { allowUpscale: approval.allowUpscale }),
  };
}
