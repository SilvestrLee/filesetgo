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
});
