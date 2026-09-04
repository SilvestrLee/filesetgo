import {
  DIMENSION_TIER_SCALE,
  MAX_DIMENSION_TIERS,
  MIN_DIMENSION_PX,
} from '../processing/target-size-limits';
import type { DimensionTier } from '../processing/target-size-contracts';

/**
 * The single authoritative source of the target-size engine's bounded
 * dimension step-down sequence (FSG-002 directive §7/§10). Given a
 * starting candidate (already resize-planned and never upscaled), returns
 * tier 0 (the starting candidate) followed by up to MAX_DIMENSION_TIERS
 * further ~15% reductions, preserving aspect ratio, stopping early if a
 * reduction would drop either dimension below MIN_DIMENSION_PX.
 *
 * The returned array is always finite and bounded (at most
 * MAX_DIMENSION_TIERS + 1 entries) — this is what makes the target-size
 * search's total work deterministically bounded (see
 * transforms/quality-search.ts and workers/process-image-to-target.ts).
 */
export function calculateDimensionTiers(
  startWidth: number,
  startHeight: number,
): DimensionTier[] {
  const tiers: DimensionTier[] = [{ width: startWidth, height: startHeight, tier: 0 }];
  let width = startWidth;
  let height = startHeight;

  for (let tier = 1; tier <= MAX_DIMENSION_TIERS; tier += 1) {
    const nextWidth = Math.floor(width * DIMENSION_TIER_SCALE);
    const nextHeight = Math.floor(height * DIMENSION_TIER_SCALE);

    if (nextWidth < MIN_DIMENSION_PX || nextHeight < MIN_DIMENSION_PX) {
      break;
    }

    tiers.push({ width: nextWidth, height: nextHeight, tier });
    width = nextWidth;
    height = nextHeight;
  }

  return tiers;
}
