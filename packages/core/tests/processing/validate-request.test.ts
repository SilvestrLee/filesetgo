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

  it('rejects a request specifying both resize and exact', () => {
    const error = validateProcessImageOptions({
      resize: { maxWidth: 800 },
      exact: { width: 800, height: 800 },
      output: { format: 'webp' },
    });

    expect(error?.code).toBe(IMAGE_PROCESSING_ERROR_CODES.InvalidRequest);
  });

  it('accepts a well-formed exact request with a crop', () => {
    const error = validateProcessImageOptions({
      exact: { width: 800, height: 800, crop: { x: 10, y: 20, width: 400, height: 400 } },
      output: { format: 'webp' },
    });

    expect(error).toBeUndefined();
  });

  it.each([
    ['width', 0],
    ['height', -5],
  ] as const)('rejects an invalid exact.%s value', (name, value) => {
    const error = validateProcessImageOptions({
      exact: { width: 800, height: 800, [name]: value },
      output: { format: 'webp' },
    });

    expect(error?.code).toBe(IMAGE_PROCESSING_ERROR_CODES.InvalidRequest);
  });

  it('rejects exact dimensions that could allocate beyond the pixel cap', () => {
    const error = validateProcessImageOptions({
      exact: { width: 6001, height: 4000 },
      output: { format: 'webp' },
    });

    expect(error?.code).toBe(IMAGE_PROCESSING_ERROR_CODES.InvalidRequest);
  });

  it.each([
    ['x', -1],
    ['y', -1],
    ['width', 0],
    ['height', 0],
  ] as const)('rejects an invalid exact.crop.%s value', (name, value) => {
    const error = validateProcessImageOptions({
      exact: {
        width: 800,
        height: 800,
        crop: { x: 0, y: 0, width: 400, height: 400, [name]: value },
      },
      output: { format: 'webp' },
    });

    expect(error?.code).toBe(IMAGE_PROCESSING_ERROR_CODES.InvalidRequest);
  });
});
