import { BYTES_PER_KB } from '../quick-fit/format-bytes';
import type { OutputFormatChoice } from '../quick-fit/request-plan';
import type { FileSetGoPreset } from './contracts';

/** The Quick Fit form field values a preset should prefill via "Adjust settings" (FSG-004 directive §24/§25). */
export interface QuickFitPrefill {
  targetSizeValue: string;
  targetSizeUnit: 'KB' | 'MB';
  maxWidth: string;
  maxHeight: string;
  outputChoice: OutputFormatChoice;
  allowDimensionReduction: boolean;
}

/**
 * One reusable mapping from a preset to Quick Fit's manual form values —
 * used only by the explicit "Adjust settings" action, never by ordinary
 * mode switching (directive §26).
 */
export function presetToQuickFitFormValues(preset: FileSetGoPreset): QuickFitPrefill {
  const { requirements } = preset;

  return {
    targetSizeValue: requirements.targetBytes === undefined ? '' : String(requirements.targetBytes / BYTES_PER_KB),
    targetSizeUnit: 'KB',
    maxWidth: requirements.maxWidth === undefined ? '' : String(requirements.maxWidth),
    maxHeight: requirements.maxHeight === undefined ? '' : String(requirements.maxHeight),
    outputChoice: requirements.outputFormat,
    allowDimensionReduction: requirements.dimensionPolicy === 'flexible',
  };
}
