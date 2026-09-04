import { describe, expect, it } from 'vitest';

import {
  DIMENSION_TIER_SCALE,
  MAX_DIMENSION_TIERS,
  MIN_DIMENSION_PX,
} from '../../src/processing/target-size-limits';
import { calculateDimensionTiers } from '../../src/transforms/dimension-tiers';

describe('calculateDimensionTiers', () => {
  it('always includes tier 0 as the unmodified starting candidate', () => {
    const tiers = calculateDimensionTiers(2000, 1000);

    expect(tiers[0]).toEqual({ width: 2000, height: 1000, tier: 0 });
  });

  it('scales both dimensions by the same factor at each tier, preserving aspect ratio', () => {
    const tiers = calculateDimensionTiers(2000, 1000);

    for (let index = 1; index < tiers.length; index += 1) {
      const previous = tiers[index - 1];
      const current = tiers[index];
      const widthRatio = current.width / previous.width;
      const heightRatio = current.height / previous.height;

      expect(widthRatio).toBeCloseTo(DIMENSION_TIER_SCALE, 1);
      expect(heightRatio).toBeCloseTo(DIMENSION_TIER_SCALE, 1);
      expect(current.tier).toBe(previous.tier + 1);
    }
  });

  it('never produces more than MAX_DIMENSION_TIERS reductions beyond tier 0', () => {
    // A very large starting candidate so the floor is never the limiting factor.
    const tiers = calculateDimensionTiers(1_000_000, 1_000_000);

    expect(tiers.length).toBeLessThanOrEqual(MAX_DIMENSION_TIERS + 1);
    expect(tiers[tiers.length - 1].tier).toBeLessThanOrEqual(MAX_DIMENSION_TIERS);
  });

  it('stops before either dimension would drop below MIN_DIMENSION_PX', () => {
    const tiers = calculateDimensionTiers(100, 100);

    for (const tier of tiers) {
      expect(tier.width).toBeGreaterThanOrEqual(MIN_DIMENSION_PX);
      expect(tier.height).toBeGreaterThanOrEqual(MIN_DIMENSION_PX);
    }

    // The next theoretical tier would have dropped below the floor.
    const last = tiers[tiers.length - 1];
    expect(Math.floor(last.width * DIMENSION_TIER_SCALE)).toBeLessThan(MIN_DIMENSION_PX);
  });

  it('never upscales — every tier is <= the starting candidate', () => {
    const tiers = calculateDimensionTiers(800, 600);

    for (const tier of tiers) {
      expect(tier.width).toBeLessThanOrEqual(800);
      expect(tier.height).toBeLessThanOrEqual(600);
    }
  });

  it('produces only positive integer dimensions', () => {
    const tiers = calculateDimensionTiers(801, 601);

    for (const tier of tiers) {
      expect(Number.isInteger(tier.width)).toBe(true);
      expect(Number.isInteger(tier.height)).toBe(true);
      expect(tier.width).toBeGreaterThan(0);
      expect(tier.height).toBeGreaterThan(0);
    }
  });

  it('handles a starting candidate already near the minimum floor', () => {
    const tiers = calculateDimensionTiers(70, 70);

    // 70 * 0.85 = 59.5 -> floors to 59, below MIN_DIMENSION_PX (64), so no reduction is possible.
    expect(tiers).toEqual([{ width: 70, height: 70, tier: 0 }]);
  });
});
