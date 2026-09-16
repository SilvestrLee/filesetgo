import { describe, expect, it } from 'vitest';

import { planProcessing } from '../../quick-fit/request-plan';
import { compilePreset } from '../compiler';
import { getPresetById } from '../registry';

describe('compilePreset', () => {
  it('compiles web.hero to the governed WebP/1600x900/500KB exact-frame requirement', () => {
    const requirements = compilePreset(getPresetById('web.hero'), 'jpeg');

    expect(requirements).toEqual({
      sourceFormat: 'jpeg',
      outputChoice: 'webp',
      targetBytes: 500 * 1024,
      maxWidth: 1600,
      maxHeight: 900,
      dimensionPolicy: 'hard',
      exactDimensions: true,
    });
  });

  it('compiles web.content to the governed WebP/1200x800/300KB exact-frame requirement', () => {
    const requirements = compilePreset(getPresetById('web.content'), 'png');

    expect(requirements).toEqual({
      sourceFormat: 'png',
      outputChoice: 'webp',
      targetBytes: 300 * 1024,
      maxWidth: 1200,
      maxHeight: 800,
      dimensionPolicy: 'hard',
      exactDimensions: true,
    });
  });

  it('compiles web.card to the governed WebP/800x600/150KB exact-frame requirement', () => {
    const requirements = compilePreset(getPresetById('web.card'), 'heic');

    expect(requirements).toEqual({
      sourceFormat: 'heic',
      outputChoice: 'webp',
      targetBytes: 150 * 1024,
      maxWidth: 800,
      maxHeight: 600,
      dimensionPolicy: 'hard',
      exactDimensions: true,
    });
  });

  it('forwards an approved crop and upscale approval when supplied (FSG-007-FIT-002)', () => {
    const crop = { x: 0, y: 0, width: 800, height: 450 };
    const requirements = compilePreset(getPresetById('web.hero'), 'jpeg', { crop, allowUpscale: true });

    expect(requirements.crop).toEqual(crop);
    expect(requirements.allowUpscale).toBe(true);
  });

  it('omits crop and allowUpscale entirely when no approval is supplied', () => {
    const requirements = compilePreset(getPresetById('web.hero'), 'jpeg');

    expect(requirements.crop).toBeUndefined();
    expect(requirements.allowUpscale).toBeUndefined();
  });

  it('routes every initial preset to a processImageToTarget() plan (kind: target)', () => {
    for (const id of ['web.hero', 'web.content', 'web.card'] as const) {
      const plan = planProcessing(compilePreset(getPresetById(id), 'jpeg'));
      expect(plan.kind).toBe('target');
    }
  });

  it('carries the compiled preset options through to the planned processImageToTarget() options as an exact frame', () => {
    const plan = planProcessing(compilePreset(getPresetById('web.card'), 'webp'));

    expect(plan.kind).toBe('target');
    if (plan.kind === 'target') {
      expect(plan.options.targetBytes).toBe(150 * 1024);
      expect(plan.options.exact).toEqual({ width: 800, height: 600 });
      expect(plan.options.output).toEqual({ format: 'webp' });
      expect(plan.options.dimensionPolicy).toBe('hard');
    }
  });

  it('carries a confirmed crop through to the planned exact-frame options', () => {
    const crop = { x: 100, y: 0, width: 600, height: 600 };
    const plan = planProcessing(compilePreset(getPresetById('web.card'), 'webp', { crop, allowUpscale: true }));

    expect(plan.kind).toBe('target');
    if (plan.kind === 'target') {
      expect(plan.options.exact).toEqual({ width: 800, height: 600, crop, allowUpscale: true });
    }
  });
});
