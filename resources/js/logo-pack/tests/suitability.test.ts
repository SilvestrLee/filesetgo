import { describe, expect, it } from 'vitest';

import type { ImagePreflightResult } from '@filesetgo/core';

import {
  assessGeometry,
  assessHeaderResolution,
  assessLogoPackSuitability,
  assessResolution,
  assessTransparencyGuidance,
} from '../suitability';

function preflight(overrides: Partial<ImagePreflightResult> = {}): ImagePreflightResult {
  return {
    format: 'png',
    width: 1000,
    height: 1000,
    megapixels: 1,
    fileSize: 500_000,
    safeToDecode: true,
    ...overrides,
  };
}

describe('assessResolution', () => {
  it('reports GOOD when the source already covers the 512px icon canvas without upscaling', () => {
    const result = assessResolution({ width: 500, height: 500 });
    expect(result.status).toBe('good');
    expect(result.factor).toBeLessThanOrEqual(1);
  });

  it('reports an upscale warning for a moderate required enlargement (>1x, <=4x)', () => {
    const result = assessResolution({ width: 300, height: 300 });
    expect(result.status).toBe('upscale-warning');
    expect(result.factor).toBeGreaterThan(1);
    expect(result.factor).toBeLessThanOrEqual(4);
  });

  it('still allows a required enlargement just under 4x', () => {
    const result = assessResolution({ width: 116, height: 116 });
    expect(result.factor).toBeLessThanOrEqual(4);
    expect(result.status).toBe('upscale-warning');
  });

  it('blocks a required enlargement over 4x', () => {
    const result = assessResolution({ width: 100, height: 100 });
    expect(result.factor).toBeGreaterThan(4);
    expect(result.status).toBe('too-small');
  });
});

describe('assessGeometry', () => {
  it('does not warn at exactly the 2.5 aspect-ratio threshold', () => {
    expect(assessGeometry({ width: 1000, height: 400 })).toBeUndefined();
  });

  it('warns just above the 2.5 aspect-ratio threshold', () => {
    const issue = assessGeometry({ width: 1001, height: 400 });
    expect(issue?.severity).toBe('warning');
  });

  it('does not warn for a square source', () => {
    expect(assessGeometry({ width: 500, height: 500 })).toBeUndefined();
  });
});

describe('assessTransparencyGuidance', () => {
  it('warns that JPEG cannot preserve transparency', () => {
    const issue = assessTransparencyGuidance('jpeg');
    expect(issue?.severity).toBe('info');
    expect(issue?.message).toMatch(/JPEG doesn't support transparency/);
  });

  it('gives a conditional (not asserted) transparency note for PNG', () => {
    const issue = assessTransparencyGuidance('png');
    expect(issue?.message).toMatch(/if your source already contains transparency/i);
  });

  it('gives the same conditional note for WebP', () => {
    const issue = assessTransparencyGuidance('webp');
    expect(issue?.message).toMatch(/if your source already contains transparency/i);
  });
});

describe('assessHeaderResolution', () => {
  it('warns when the source is smaller than the high-density header box', () => {
    const issue = assessHeaderResolution({ width: 400, height: 100 });
    expect(issue?.severity).toBe('info');
  });

  it('does not warn when the source comfortably covers the high-density header box', () => {
    expect(assessHeaderResolution({ width: 2000, height: 600 })).toBeUndefined();
  });
});

describe('assessLogoPackSuitability', () => {
  it('blocks generation only for a too-small source', () => {
    const result = assessLogoPackSuitability(preflight({ width: 100, height: 100 }));
    expect(result.blocked).toBe(true);
    expect(result.issues.some((issue) => issue.severity === 'blocking')).toBe(true);
  });

  it('does not block for a merely warned/informational source', () => {
    const result = assessLogoPackSuitability(preflight({ width: 1000, height: 1000, format: 'jpeg' }));
    expect(result.blocked).toBe(false);
  });

  it('includes transparency guidance in the aggregated issues', () => {
    const result = assessLogoPackSuitability(preflight({ format: 'jpeg' }));
    expect(result.issues.some((issue) => issue.id === 'transparency-jpeg')).toBe(true);
  });
});
