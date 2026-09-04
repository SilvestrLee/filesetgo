import { describe, expect, it } from 'vitest';

import { BYTES_PER_KB, BYTES_PER_MB, formatBytes, reductionPercentage, unitValueToBytes } from '../format-bytes';

describe('unitValueToBytes', () => {
  it('converts KB using 1024 bytes per KB', () => {
    expect(unitValueToBytes(200, 'KB')).toBe(200 * BYTES_PER_KB);
  });

  it('converts MB using 1,048,576 bytes per MB', () => {
    expect(unitValueToBytes(2, 'MB')).toBe(2 * BYTES_PER_MB);
  });

  it('rounds fractional byte results', () => {
    expect(unitValueToBytes(1.5, 'KB')).toBe(Math.round(1.5 * BYTES_PER_KB));
  });
});

describe('formatBytes', () => {
  it('formats sub-KB sizes as whole bytes', () => {
    expect(formatBytes(843)).toBe('843 B');
  });

  it('formats KB-range sizes with one decimal', () => {
    expect(formatBytes(12_697.6)).toBe('12.4 KB');
  });

  it('formats MB-range sizes with two decimals', () => {
    expect(formatBytes(1.8 * BYTES_PER_MB)).toBe('1.80 MB');
  });

  it('treats negative or non-finite input as 0 B', () => {
    expect(formatBytes(-5)).toBe('0 B');
    expect(formatBytes(Number.NaN)).toBe('0 B');
  });
});

describe('reductionPercentage', () => {
  it('computes a rounded percentage when the output is smaller', () => {
    expect(reductionPercentage(1000, 580)).toBe(42);
  });

  it('returns undefined when the output is the same size or larger', () => {
    expect(reductionPercentage(1000, 1000)).toBeUndefined();
    expect(reductionPercentage(1000, 1200)).toBeUndefined();
  });

  it('returns undefined for a non-positive source size', () => {
    expect(reductionPercentage(0, 0)).toBeUndefined();
  });
});
