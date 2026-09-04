import { DEFAULT_SAFETY_LIMITS } from '../preflight/safety';
import type { TargetSizeQualityRange } from './target-size-contracts';

/**
 * Quality search defaults and bounds (FSG-002 directive §6/§21). The
 * search never goes below minQuality or above maxQuality — these are not
 * merely defaults, they are the hard ceiling/floor even when a caller
 * supplies custom bounds.
 */
export const DEFAULT_QUALITY_RANGE: TargetSizeQualityRange = {
  minQuality: 0.6,
  maxQuality: 0.95,
};

/** Absolute floor/ceiling a caller-supplied quality range may not exceed. */
export const ABSOLUTE_QUALITY_BOUNDS: TargetSizeQualityRange = {
  minQuality: 0,
  maxQuality: 1,
};

/**
 * At most this many encodes per dimension tier when searching for a
 * quality that meets targetBytes (FSG-002 directive §8). The search
 * strategy (see transforms/quality-search.ts) tries maxQuality and
 * minQuality first (1–2 probes) and only spends the remaining probes on
 * binary narrowing, so most jobs use far fewer than 5.
 */
export const MAX_QUALITY_PROBES_PER_TIER = 5;

/**
 * Each dimension tier scales both dimensions by this factor
 * (FSG-002 directive §7), preserving aspect ratio.
 */
export const DIMENSION_TIER_SCALE = 0.85;

/**
 * Maximum number of dimension-reduction tiers below the initial candidate
 * (FSG-002 directive §10). Chosen conservatively: at 0.85^tier, 6 tiers
 * retains ~38% of the original edge length (0.85^6 ≈ 0.377) — a 2000px
 * image would step down to ~754px, which is still a broadly useful web
 * image size. Beyond that, further reduction has diminishing product
 * value and risks producing an image too small to be useful, which the
 * minimum-dimension floor below also guards against directly.
 */
export const MAX_DIMENSION_TIERS = 6;

/**
 * Neither the width nor the height of a dimension-tier candidate may drop
 * below this many pixels (FSG-002 directive §10). Below this, an image is
 * no longer usefully "an image" for any realistic web destination —
 * search stops and the job is reported as target-unreachable rather than
 * silently producing a near-unusable result.
 */
export const MIN_DIMENSION_PX = 64;

/**
 * targetBytes below this is rejected outright (FSG-002 directive §20) —
 * no real encoded raster image is realistically ever this small, so a
 * smaller request cannot be a genuine target and would otherwise just
 * guarantee an "unreachable" search after wasted work.
 */
export const MIN_TARGET_BYTES = 1024;

/**
 * targetBytes may not exceed the existing 15 MB source-file safety cap
 * (FSG-002 directive §20) — there is no product reason for a "target" to
 * exceed the largest file the runtime will ever accept as input.
 */
export const MAX_TARGET_BYTES = DEFAULT_SAFETY_LIMITS.maxInputBytes;
