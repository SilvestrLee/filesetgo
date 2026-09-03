import { describe, expect, it } from 'vitest';

import { IMAGE_PROCESSING_ERROR_CODES } from '../../src/processing/contracts';
import { validateProcessImageOptions } from '../../src/processing/validate-request';

describe('processing request validation', () => {
  it('accepts direct JPEG and WebP quality values at the inclusive boundaries', () => {
    expect(
      validateProcessImageOptions({
        output: { format: 'jpeg', quality: 0 },
      }),
    ).toBeUndefined();
    expect(
      validateProcessImageOptions({
        output: { format: 'webp', quality: 1 },
      }),
    ).toBeUndefined();
  });

  it('rejects a PNG quality value because it has no defined meaning', () => {
    const error = validateProcessImageOptions({
      output: { format: 'png', quality: 0.8 },
    });

    expect(error?.code).toBe(IMAGE_PROCESSING_ERROR_CODES.InvalidRequest);
  });

  it.each([-0.01, 1.01, Number.NaN])(
    'rejects the invalid quality value %s',
    (quality) => {
      const error = validateProcessImageOptions({
        output: { format: 'jpeg', quality },
      });

      expect(error?.code).toBe(IMAGE_PROCESSING_ERROR_CODES.InvalidRequest);
    },
  );

  it('requires at least one bounded resize dimension', () => {
    const error = validateProcessImageOptions({
      resize: {},
      output: { format: 'webp' },
    });

    expect(error?.code).toBe(IMAGE_PROCESSING_ERROR_CODES.InvalidRequest);
  });

  it.each([
    ['maxWidth', 0],
    ['maxHeight', 1.5],
  ] as const)('rejects invalid %s values', (name, value) => {
    const error = validateProcessImageOptions({
      resize: { [name]: value },
      output: { format: 'webp' },
    });

    expect(error?.code).toBe(IMAGE_PROCESSING_ERROR_CODES.InvalidRequest);
  });

  it('rejects resize bounds that could allocate beyond the pixel cap', () => {
    const error = validateProcessImageOptions({
      resize: { maxWidth: 6001, maxHeight: 4000, allowUpscale: true },
      output: { format: 'webp' },
    });

    expect(error?.code).toBe(IMAGE_PROCESSING_ERROR_CODES.InvalidRequest);
  });
});
