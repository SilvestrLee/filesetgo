import { describe, expect, it } from 'vitest';

import { presetToQuickFitFormValues } from '../quick-fit-mapping';
import { getPresetById } from '../registry';

/**
 * As of FSG-007-FIT-002, all three presets are governed exact-frame
 * destinations (`dimensionPolicy: 'hard'`) — "Adjust settings" carries the
 * numeric targets over to Quick Fit's manual form, but never a Guided-Fit
 * -confirmed crop/upscale approval (`../guided-fit-controller.ts`'s
 * docblock); the manual form's own crop/upscale gate re-derives from
 * scratch, exactly as it would for a user who typed the same numbers by
 * hand. `allowDimensionReduction` is correspondingly always false here now.
 */
describe('presetToQuickFitFormValues', () => {
  it('maps web.hero exactly to its governed requirement values', () => {
    expect(presetToQuickFitFormValues(getPresetById('web.hero'))).toEqual({
      targetSizeValue: '500',
      targetSizeUnit: 'KB',
      maxWidth: '1600',
      maxHeight: '900',
      outputChoice: 'webp',
      allowDimensionReduction: false,
    });
  });

  it('maps web.content exactly to its governed requirement values', () => {
    expect(presetToQuickFitFormValues(getPresetById('web.content'))).toEqual({
      targetSizeValue: '300',
      targetSizeUnit: 'KB',
      maxWidth: '1200',
      maxHeight: '800',
      outputChoice: 'webp',
      allowDimensionReduction: false,
    });
  });

  it('maps web.card exactly to its governed requirement values', () => {
    expect(presetToQuickFitFormValues(getPresetById('web.card'))).toEqual({
      targetSizeValue: '150',
      targetSizeUnit: 'KB',
      maxWidth: '800',
      maxHeight: '600',
      outputChoice: 'webp',
      allowDimensionReduction: false,
    });
  });
});
