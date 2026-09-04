import { describe, expect, it } from 'vitest';

import { presetToQuickFitFormValues } from '../quick-fit-mapping';
import { getPresetById } from '../registry';

describe('presetToQuickFitFormValues', () => {
  it('maps web.hero exactly to its governed requirement values', () => {
    expect(presetToQuickFitFormValues(getPresetById('web.hero'))).toEqual({
      targetSizeValue: '500',
      targetSizeUnit: 'KB',
      maxWidth: '1920',
      maxHeight: '1080',
      outputChoice: 'webp',
      allowDimensionReduction: true,
    });
  });

  it('maps web.content exactly to its governed requirement values', () => {
    expect(presetToQuickFitFormValues(getPresetById('web.content'))).toEqual({
      targetSizeValue: '300',
      targetSizeUnit: 'KB',
      maxWidth: '1600',
      maxHeight: '1600',
      outputChoice: 'webp',
      allowDimensionReduction: true,
    });
  });

  it('maps web.card exactly to its governed requirement values', () => {
    expect(presetToQuickFitFormValues(getPresetById('web.card'))).toEqual({
      targetSizeValue: '150',
      targetSizeUnit: 'KB',
      maxWidth: '800',
      maxHeight: '800',
      outputChoice: 'webp',
      allowDimensionReduction: true,
    });
  });
});
