import { describe, expect, it } from 'vitest';

import { planProcessing } from '../../quick-fit/request-plan';
import { compilePreset } from '../compiler';
import { getPresetById } from '../registry';

describe('compilePreset', () => {
  it('compiles web.hero to the governed WebP/1920x1080/500KB/flexible requirement', () => {
    const requirements = compilePreset(getPresetById('web.hero'), 'jpeg');

    expect(requirements).toEqual({
      sourceFormat: 'jpeg',
      outputChoice: 'webp',
      targetBytes: 500 * 1024,
      maxWidth: 1920,
      maxHeight: 1080,
      dimensionPolicy: 'flexible',
    });
  });

  it('compiles web.content to the governed WebP/1600x1600/300KB/flexible requirement', () => {
    const requirements = compilePreset(getPresetById('web.content'), 'png');

    expect(requirements).toEqual({
      sourceFormat: 'png',
      outputChoice: 'webp',
      targetBytes: 300 * 1024,
      maxWidth: 1600,
      maxHeight: 1600,
      dimensionPolicy: 'flexible',
    });
  });

  it('compiles web.card to the governed WebP/800x800/150KB/flexible requirement', () => {
    const requirements = compilePreset(getPresetById('web.card'), 'heic');

    expect(requirements).toEqual({
      sourceFormat: 'heic',
      outputChoice: 'webp',
      targetBytes: 150 * 1024,
      maxWidth: 800,
      maxHeight: 800,
      dimensionPolicy: 'flexible',
    });
  });

  it('routes every initial preset to a processImageToTarget() plan (kind: target)', () => {
    for (const id of ['web.hero', 'web.content', 'web.card'] as const) {
      const plan = planProcessing(compilePreset(getPresetById(id), 'jpeg'));
      expect(plan.kind).toBe('target');
    }
  });

  it('carries the compiled preset options through to the planned processImageToTarget() options', () => {
    const plan = planProcessing(compilePreset(getPresetById('web.card'), 'webp'));

    expect(plan.kind).toBe('target');
    if (plan.kind === 'target') {
      expect(plan.options.targetBytes).toBe(150 * 1024);
      expect(plan.options.dimensions).toEqual({ maxWidth: 800, maxHeight: 800 });
      expect(plan.options.output).toEqual({ format: 'webp' });
      expect(plan.options.dimensionPolicy).toBe('flexible');
    }
  });
});
