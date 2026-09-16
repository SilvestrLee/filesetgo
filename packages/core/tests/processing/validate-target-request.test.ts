import { describe, expect, it } from 'vitest';

import {
  DEFAULT_QUALITY_RANGE,
  MAX_TARGET_BYTES,
  MIN_TARGET_BYTES,
} from '../../src/processing/target-size-limits';
import { validateProcessImageToTargetOptions } from '../../src/processing/validate-target-request';

function baseOptions() {
  return {
    targetBytes: 100_000,
    output: { format: 'jpeg' as const },
  };
}

describe('validateProcessImageToTargetOptions', () => {
  it('accepts a reasonable target and resolves defaults', () => {
    const { error, resolved } = validateProcessImageToTargetOptions(baseOptions());

    expect(error).toBeUndefined();
    expect(resolved).toMatchObject({
      targetBytes: 100_000,
      output: { format: 'jpeg' },
      dimensionPolicy: 'flexible',
      qualityRange: DEFAULT_QUALITY_RANGE,
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid targetBytes value: %p',
    (targetBytes) => {
      const { error } = validateProcessImageToTargetOptions({
        ...baseOptions(),
        targetBytes,
      });

      expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
    },
  );

  it('accepts targetBytes exactly at MIN_TARGET_BYTES', () => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      targetBytes: MIN_TARGET_BYTES,
    });

    expect(error).toBeUndefined();
  });

  it('rejects targetBytes below MIN_TARGET_BYTES', () => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      targetBytes: MIN_TARGET_BYTES - 1,
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });

  it('accepts targetBytes exactly at MAX_TARGET_BYTES', () => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      targetBytes: MAX_TARGET_BYTES,
    });

    expect(error).toBeUndefined();
  });

  it('rejects targetBytes above MAX_TARGET_BYTES', () => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      targetBytes: MAX_TARGET_BYTES + 1,
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });

  it('rejects an unsupported output format', () => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      output: { format: 'gif' as never },
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });

  it('rejects an invalid dimensionPolicy', () => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      dimensionPolicy: 'aggressive' as never,
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });

  it('accepts an explicit hard dimensionPolicy', () => {
    const { error, resolved } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      dimensionPolicy: 'hard',
    });

    expect(error).toBeUndefined();
    expect(resolved?.dimensionPolicy).toBe('hard');
  });

  it('rejects minQuality greater than maxQuality', () => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      qualityRange: { minQuality: 0.9, maxQuality: 0.5 },
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });

  it.each([-0.1, 1.1, Number.NaN])('rejects an out-of-bounds quality value: %p', (value) => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      qualityRange: { minQuality: value, maxQuality: 0.9 },
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });

  it('accepts custom quality bounds within [0, 1] with minQuality <= maxQuality', () => {
    const { error, resolved } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      qualityRange: { minQuality: 0.4, maxQuality: 0.7 },
    });

    expect(error).toBeUndefined();
    expect(resolved?.qualityRange).toEqual({ minQuality: 0.4, maxQuality: 0.7 });
  });

  it('rejects non-positive-integer dimension values', () => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      dimensions: { maxWidth: -100 },
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });

  it('rejects dimensions whose product exceeds the decoded-pixel safety limit', () => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      dimensions: { maxWidth: 10_000, maxHeight: 10_000 },
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });

  it('rejects a request specifying both dimensions and exact', () => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      dimensions: { maxWidth: 800 },
      exact: { width: 800, height: 800 },
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });

  it("rejects exact combined with an explicit 'flexible' dimensionPolicy", () => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      exact: { width: 800, height: 800 },
      dimensionPolicy: 'flexible',
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });

  it('resolves dimensionPolicy to hard whenever exact is set, even when omitted', () => {
    const { error, resolved } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      exact: { width: 800, height: 800 },
    });

    expect(error).toBeUndefined();
    expect(resolved?.dimensionPolicy).toBe('hard');
    expect(resolved?.exact).toEqual({ width: 800, height: 800 });
  });

  it('accepts a well-formed exact request with a crop', () => {
    const { error, resolved } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      exact: { width: 800, height: 800, crop: { x: 10, y: 20, width: 400, height: 400 } },
    });

    expect(error).toBeUndefined();
    expect(resolved?.exact?.crop).toEqual({ x: 10, y: 20, width: 400, height: 400 });
  });

  it.each([
    ['width', 0],
    ['height', -5],
  ] as const)('rejects an invalid exact.%s value', (name, value) => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      exact: { width: 800, height: 800, [name]: value },
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });

  it('rejects exact dimensions that could allocate beyond the pixel cap', () => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      exact: { width: 6001, height: 4000 },
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });

  it.each([
    ['x', -1],
    ['width', 0],
  ] as const)('rejects an invalid exact.crop.%s value', (name, value) => {
    const { error } = validateProcessImageToTargetOptions({
      ...baseOptions(),
      exact: {
        width: 800,
        height: 800,
        crop: { x: 0, y: 0, width: 400, height: 400, [name]: value },
      },
    });

    expect(error?.code).toBe('INVALID_PROCESSING_REQUEST');
  });
});
