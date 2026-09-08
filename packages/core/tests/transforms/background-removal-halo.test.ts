import { describe, expect, it } from 'vitest';

import { removeConnectedBackground } from '../../src/transforms/background-removal';
import {
  createRasterWithFineIconStrokes,
  createRasterWithForegroundRects,
} from './fixtures/raster-fixtures';

type Rgb = [number, number, number];
type PolicyName = 'baseline' | 'threshold' | 'denominator-clamp';

interface EdgeSample {
  shape: 'rectangle-edge' | 'one-pixel-stroke' | 'two-pixel-diagonal' | 'curve';
  foreground: Rgb;
  oldBackground: Rgb;
  alphaByte: number;
}

interface PolicyMetrics {
  sampleCount: number;
  foregroundRgbErrorSum: number;
  maximumForegroundRgbError: number;
  compositedErrorSum: number;
  maximumCompositedError: number;
}

/** Nearest 8-bit representations of 0.05, 0.10, 0.15, 0.20, and 0.30. */
const ALPHA_BYTES = [13, 26, 38, 51, 77] as const;
const COMPOSITE_BACKGROUNDS = [
  [248, 250, 252] as Rgb,
  [9, 9, 11] as Rgb,
];
const SHAPES: EdgeSample['shape'][] = [
  'rectangle-edge',
  'one-pixel-stroke',
  'two-pixel-diagonal',
  'curve',
];
const COLOR_PAIRS: Array<{ foreground: Rgb; oldBackground: Rgb }> = [
  { foreground: [0, 0, 0], oldBackground: [255, 255, 255] },
  { foreground: [255, 255, 255], oldBackground: [0, 0, 0] },
  { foreground: [220, 130, 40], oldBackground: [30, 120, 200] },
];

const AUDITOR_POLICY_D_STATUS = 'NOT IMPLEMENTABLE AS SPECIFIED';

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function observedColor(foreground: Rgb, background: Rgb, alpha: number): Rgb {
  return foreground.map((channel, index) =>
    clampByte(alpha * channel + (1 - alpha) * background[index]),
  ) as Rgb;
}

function unblend(observed: Rgb, background: Rgb, alpha: number, denominator: number): Rgb {
  return observed.map((channel, index) =>
    clampByte((channel - (1 - alpha) * background[index]) / denominator),
  ) as Rgb;
}

function applyPolicy(policy: PolicyName, sample: EdgeSample): { rgb: Rgb; alphaByte: number } {
  const alpha = sample.alphaByte / 255;
  const observed = observedColor(sample.foreground, sample.oldBackground, alpha);

  if (policy === 'baseline') {
    return {
      rgb: alpha > 0.05 ? unblend(observed, sample.oldBackground, alpha, alpha) : observed,
      alphaByte: sample.alphaByte,
    };
  }

  if (policy === 'threshold') {
    return {
      rgb: alpha >= 0.2 ? unblend(observed, sample.oldBackground, alpha, alpha) : observed,
      alphaByte: sample.alphaByte,
    };
  }

  return {
    rgb: unblend(observed, sample.oldBackground, alpha, Math.max(alpha, 0.2)),
    alphaByte: sample.alphaByte,
  };
}

function composite(foreground: Rgb, alphaByte: number, background: Rgb): Rgb {
  const alpha = alphaByte / 255;

  return foreground.map((channel, index) =>
    clampByte(alpha * channel + (1 - alpha) * background[index]),
  ) as Rgb;
}

function maximumChannelError(actual: Rgb, expected: Rgb): number {
  return Math.max(...actual.map((channel, index) => Math.abs(channel - expected[index])));
}

function samples(): EdgeSample[] {
  return COLOR_PAIRS.flatMap(({ foreground, oldBackground }) =>
    SHAPES.flatMap((shape) =>
      ALPHA_BYTES.map((alphaByte) => ({ shape, foreground, oldBackground, alphaByte })),
    ),
  );
}

function measurePolicy(policy: PolicyName): PolicyMetrics {
  const metrics: PolicyMetrics = {
    sampleCount: 0,
    foregroundRgbErrorSum: 0,
    maximumForegroundRgbError: 0,
    compositedErrorSum: 0,
    maximumCompositedError: 0,
  };

  for (const sample of samples()) {
    const result = applyPolicy(policy, sample);
    const foregroundError = maximumChannelError(result.rgb, sample.foreground);
    metrics.sampleCount += 1;
    metrics.foregroundRgbErrorSum += foregroundError;
    metrics.maximumForegroundRgbError = Math.max(metrics.maximumForegroundRgbError, foregroundError);

    for (const background of COMPOSITE_BACKGROUNDS) {
      const expected = composite(sample.foreground, sample.alphaByte, background);
      const actual = composite(result.rgb, result.alphaByte, background);
      const error = maximumChannelError(actual, expected);
      metrics.compositedErrorSum += error;
      metrics.maximumCompositedError = Math.max(metrics.maximumCompositedError, error);
    }
  }

  return metrics;
}

function alphaAt(data: Uint8ClampedArray | Uint8Array, width: number, x: number, y: number): number {
  return data[(y * width + x) * 4 + 3];
}

describe('FSG-006R low-alpha decontamination policy matrix', () => {
  it('uses the exact nearest 8-bit alpha samples required by the directive', () => {
    expect(ALPHA_BYTES.map((alpha) => Number((alpha / 255).toFixed(4)))).toEqual([
      0.051,
      0.102,
      0.149,
      0.2,
      0.302,
    ]);
  });

  it('preserves output alpha under every defined RGB policy', () => {
    for (const sample of samples()) {
      expect(applyPolicy('baseline', sample).alphaByte).toBe(sample.alphaByte);
      expect(applyPolicy('threshold', sample).alphaByte).toBe(sample.alphaByte);
      expect(applyPolicy('denominator-clamp', sample).alphaByte).toBe(sample.alphaByte);
    }
  });

  it('shows the baseline has the lowest visible and foreground-color error across the full matrix', () => {
    expect(measurePolicy('baseline')).toEqual({
      sampleCount: 60,
      foregroundRgbErrorSum: 72,
      maximumForegroundRgbError: 10,
      compositedErrorSum: 20,
      maximumCompositedError: 1,
    });
    expect(measurePolicy('threshold')).toEqual({
      sampleCount: 60,
      foregroundRgbErrorSum: 7560,
      maximumForegroundRgbError: 242,
      compositedErrorSum: 1524,
      maximumCompositedError: 33,
    });
    expect(measurePolicy('denominator-clamp')).toEqual({
      sampleCount: 60,
      foregroundRgbErrorSum: 2844,
      maximumForegroundRgbError: 190,
      compositedErrorSum: 504,
      maximumCompositedError: 13,
    });
  });

  it('records that the auditor policy cannot be compared without an exact mathematical definition', () => {
    expect(AUDITOR_POLICY_D_STATUS).toBe('NOT IMPLEMENTABLE AS SPECIFIED');
  });

  it('keeps one-pixel and two-pixel straight strokes after retaining the baseline policy', () => {
    const raster = createRasterWithForegroundRects(40, 40, [255, 255, 255], [
      { x0: 14, y0: 8, x1: 15, y1: 32, color: [10, 10, 10] },
      { x0: 22, y0: 8, x1: 24, y1: 32, color: [10, 10, 10] },
    ]);
    const result = removeConnectedBackground(raster, 'balanced');

    expect(alphaAt(result.data, 40, 14, 20)).toBe(255);
    expect(alphaAt(result.data, 40, 22, 20)).toBe(255);
    expect(alphaAt(result.data, 40, 23, 20)).toBe(255);
  });

  it('keeps the existing diagonal, curve, and disconnected-detail fixture after retaining the baseline policy', () => {
    const result = removeConnectedBackground(
      createRasterWithFineIconStrokes(60, 60, [255, 255, 255], [15, 15, 15]),
      'balanced',
    );
    const diagonalMid = Math.floor(60 * 0.15) + Math.floor(60 * 0.4 * 0.5);
    const curveX = Math.floor(60 * 0.75);
    const curveY = Math.floor(60 * 0.75) - Math.floor(60 * 0.25);
    const detailX = Math.floor(60 * 0.45) + 2;
    const detailY = Math.floor(60 * 0.55);

    expect(alphaAt(result.data, 60, diagonalMid, diagonalMid)).toBeGreaterThan(0);
    expect(alphaAt(result.data, 60, curveX, curveY)).toBeGreaterThan(0);
    expect(alphaAt(result.data, 60, detailX, detailY)).toBeGreaterThan(0);
  });
});
