import { describe, expect, it, vi } from 'vitest';

import {
  hasDimensionLimit,
  isExactMode,
  isNoOpRequest,
  planProcessing,
  resolveOutputFormat,
  shouldWarnAboutTransparency,
  type QuickFitRequirements,
} from '../request-plan';

function baseRequirements(overrides: Partial<QuickFitRequirements> = {}): QuickFitRequirements {
  return {
    sourceFormat: 'jpeg',
    outputChoice: 'original',
    dimensionPolicy: 'flexible',
    ...overrides,
  };
}

describe('resolveOutputFormat', () => {
  it('keeps the source format for "original" on a non-HEIC source', () => {
    expect(resolveOutputFormat('png', 'original')).toBe('png');
  });

  it('resolves "original" on a HEIC source to WebP', () => {
    expect(resolveOutputFormat('heic', 'original')).toBe('webp');
  });

  it('uses the explicit choice when one other than "original" is given', () => {
    expect(resolveOutputFormat('heic', 'jpeg')).toBe('jpeg');
    expect(resolveOutputFormat('jpeg', 'png')).toBe('png');
  });
});

describe('shouldWarnAboutTransparency', () => {
  it('warns when an alpha-capable source is converted to JPEG', () => {
    expect(shouldWarnAboutTransparency('png', 'jpeg')).toBe(true);
    expect(shouldWarnAboutTransparency('webp', 'jpeg')).toBe(true);
  });

  it('does not warn for non-JPEG output or non-alpha sources', () => {
    expect(shouldWarnAboutTransparency('png', 'webp')).toBe(false);
    expect(shouldWarnAboutTransparency('jpeg', 'jpeg')).toBe(false);
  });
});

describe('hasDimensionLimit', () => {
  it('is true when either dimension is set', () => {
    expect(hasDimensionLimit({ maxWidth: 100, maxHeight: undefined })).toBe(true);
    expect(hasDimensionLimit({ maxWidth: undefined, maxHeight: 100 })).toBe(true);
  });

  it('is false when neither dimension is set', () => {
    expect(hasDimensionLimit({ maxWidth: undefined, maxHeight: undefined })).toBe(false);
  });
});

describe('isExactMode', () => {
  it('is true when both dimensions are set AND exactDimensions is explicitly true', () => {
    expect(isExactMode({ maxWidth: 800, maxHeight: 800, exactDimensions: true })).toBe(true);
  });

  it('is false when only one or neither dimension is set, even with the flag', () => {
    expect(isExactMode({ maxWidth: 800, maxHeight: undefined, exactDimensions: true })).toBe(false);
    expect(isExactMode({ maxWidth: undefined, maxHeight: 800, exactDimensions: true })).toBe(false);
    expect(isExactMode({ maxWidth: undefined, maxHeight: undefined, exactDimensions: true })).toBe(false);
  });

  it('is false when both dimensions are set but exactDimensions is not explicitly true — this is what keeps Guided Fit\'s governed bounding-box presets (which also always set both dimensions) routed through the original, unchanged aspect-preserving path', () => {
    expect(isExactMode({ maxWidth: 800, maxHeight: 800 })).toBe(false);
    expect(isExactMode({ maxWidth: 800, maxHeight: 800, exactDimensions: false })).toBe(false);
  });
});

describe('isNoOpRequest', () => {
  it('is true for "keep original" with no target and no dimensions', () => {
    expect(isNoOpRequest(baseRequirements())).toBe(true);
  });

  it('is false when a target size is requested', () => {
    expect(isNoOpRequest(baseRequirements({ targetBytes: 100_000 }))).toBe(false);
  });

  it('is false when a dimension limit is requested', () => {
    expect(isNoOpRequest(baseRequirements({ maxWidth: 800 }))).toBe(false);
  });

  it('is false when the output format actually changes', () => {
    expect(isNoOpRequest(baseRequirements({ outputChoice: 'png' }))).toBe(false);
  });

  it('is false for a HEIC source even with "original" selected, since HEIC always converts', () => {
    expect(isNoOpRequest(baseRequirements({ sourceFormat: 'heic' }))).toBe(false);
  });
});

describe('planProcessing', () => {
  it('returns kind "none" for a no-op request', () => {
    expect(planProcessing(baseRequirements())).toEqual({ kind: 'none' });
  });

  it('routes a resize-only request to processImage (standard)', () => {
    const plan = planProcessing(baseRequirements({ maxWidth: 800 }));

    expect(plan.kind).toBe('standard');
    if (plan.kind === 'standard') {
      expect(plan.options.resize).toEqual({ maxWidth: 800, maxHeight: undefined, allowUpscale: false });
      expect(plan.options.output).toEqual({ format: 'jpeg' });
    }
  });

  it('routes a format-only request to processImage (standard)', () => {
    const plan = planProcessing(baseRequirements({ outputChoice: 'webp' }));

    expect(plan.kind).toBe('standard');
    if (plan.kind === 'standard') {
      expect(plan.options.resize).toBeUndefined();
      expect(plan.options.output).toEqual({ format: 'webp' });
    }
  });

  it('routes a target-size request to processImageToTarget', () => {
    const plan = planProcessing(baseRequirements({ targetBytes: 200_000 }));

    expect(plan.kind).toBe('target');
    if (plan.kind === 'target') {
      expect(plan.options.targetBytes).toBe(200_000);
      expect(plan.options.dimensions).toBeUndefined();
      expect(plan.options.dimensionPolicy).toBe('flexible');
    }
  });

  it('routes a target-size request with dimensions to processImageToTarget with dimensions included', () => {
    const plan = planProcessing(baseRequirements({ targetBytes: 200_000, maxWidth: 1200, dimensionPolicy: 'hard' }));

    expect(plan.kind).toBe('target');
    if (plan.kind === 'target') {
      expect(plan.options.dimensions).toEqual({ maxWidth: 1200, maxHeight: undefined });
      expect(plan.options.dimensionPolicy).toBe('hard');
    }
  });

  it('forwards the onProgress callback into the resolved options', () => {
    const onProgress = vi.fn();
    const plan = planProcessing(baseRequirements({ maxWidth: 800 }), onProgress);

    expect(plan.kind).toBe('standard');
    if (plan.kind === 'standard') {
      expect(plan.options.onProgress).toBe(onProgress);
    }
  });

  describe('exact mode (exactDimensions: true, both dimensions set)', () => {
    it('routes to processImage (standard) with an `exact` field instead of `resize`', () => {
      const plan = planProcessing(baseRequirements({ maxWidth: 800, maxHeight: 800, exactDimensions: true }));

      expect(plan.kind).toBe('standard');
      if (plan.kind === 'standard') {
        expect(plan.options.resize).toBeUndefined();
        expect(plan.options.exact).toEqual({ width: 800, height: 800 });
      }
    });

    it('includes a confirmed crop and upscale approval when present', () => {
      const crop = { x: 10, y: 20, width: 400, height: 400 };
      const plan = planProcessing(baseRequirements({
        maxWidth: 800,
        maxHeight: 800,
        exactDimensions: true,
        crop,
        allowUpscale: true,
      }));

      expect(plan.kind).toBe('standard');
      if (plan.kind === 'standard') {
        expect(plan.options.exact).toEqual({ width: 800, height: 800, crop, allowUpscale: true });
      }
    });

    it('routes to processImageToTarget with `exact` and forces dimensionPolicy to hard, regardless of the requirement', () => {
      const plan = planProcessing(baseRequirements({
        maxWidth: 800,
        maxHeight: 800,
        exactDimensions: true,
        targetBytes: 150_000,
        dimensionPolicy: 'flexible',
      }));

      expect(plan.kind).toBe('target');
      if (plan.kind === 'target') {
        expect(plan.options.dimensions).toBeUndefined();
        expect(plan.options.exact).toEqual({ width: 800, height: 800 });
        expect(plan.options.dimensionPolicy).toBe('hard');
      }
    });

    it('does NOT enter exact mode for a Guided-Fit-shaped request (both dimensions set, exactDimensions absent) — regression guard for the governed bounding-box presets', () => {
      const plan = planProcessing(baseRequirements({
        maxWidth: 1920,
        maxHeight: 1080,
        targetBytes: 500 * 1024,
        dimensionPolicy: 'flexible',
      }));

      expect(plan.kind).toBe('target');
      if (plan.kind === 'target') {
        expect(plan.options.exact).toBeUndefined();
        expect(plan.options.dimensions).toEqual({ maxWidth: 1920, maxHeight: 1080 });
        expect(plan.options.dimensionPolicy).toBe('flexible');
      }
    });
  });
});
