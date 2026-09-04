import type { ImageFormat } from '@filesetgo/core';

import type { QuickFitRequirements } from '../quick-fit/request-plan';
import type { FileSetGoPreset } from './contracts';

/**
 * Compiles a preset into the exact same `QuickFitRequirements` shape Quick
 * Fit's own form produces (FSG-004 directive §21). This is the entire
 * bridge between Guided Fit and the existing orchestration boundary —
 * `request-plan.ts`'s `planProcessing()` then routes it to
 * `processImageToTarget()` (all three initial presets set `targetBytes`)
 * exactly as it would for a manually entered Quick Fit target request.
 */
export function compilePreset(preset: FileSetGoPreset, sourceFormat: ImageFormat): QuickFitRequirements {
  const { requirements } = preset;

  return {
    sourceFormat,
    outputChoice: requirements.outputFormat,
    targetBytes: requirements.targetBytes,
    maxWidth: requirements.maxWidth,
    maxHeight: requirements.maxHeight,
    dimensionPolicy: requirements.dimensionPolicy,
  };
}
