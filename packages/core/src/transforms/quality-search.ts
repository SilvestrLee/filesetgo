import { MAX_QUALITY_PROBES_PER_TIER } from '../processing/target-size-limits';
import type { TargetSizeQualityRange } from '../processing/target-size-contracts';

export interface QualityProbe {
  quality: number;
  byteSize: number;
  blob: Blob;
}

export interface QualitySearchResult {
  /** Every probe actually encoded, in the order they were attempted (at most 5). */
  probes: QualityProbe[];
  /** The highest-quality probe whose byteSize <= targetBytes, if any. */
  best: QualityProbe | undefined;
}

/**
 * Bounded quality search for one dimension tier (FSG-002 directive §8/§9).
 *
 * Strategy (never more than MAX_QUALITY_PROBES_PER_TIER encodes):
 *   1. Try maxQuality. If it already fits, that is the best possible
 *      outcome at this tier — return immediately (1 probe).
 *   2. Otherwise try minQuality. If even minQuality does not fit, no
 *      quality in the permitted range can meet the target at this
 *      dimension tier — return with no best candidate (2 probes), so the
 *      caller can either step down a dimension tier (FLEXIBLE) or report
 *      the target as unreachable (HARD).
 *   3. Otherwise minQuality fits and maxQuality does not: binary-search
 *      the remaining probe budget (up to 3 more) between them for the
 *      highest quality that still fits.
 *
 * `best` is always chosen from the actually-measured probes by highest
 * fitting quality — never assumed from a theoretical monotonic ordering
 * (FSG-002 directive §25), so an occasional non-monotonic encoder result
 * cannot cause a worse-than-necessary candidate to be selected among the
 * probes actually taken.
 */
export async function boundedQualitySearch(
  targetBytes: number,
  qualityRange: TargetSizeQualityRange,
  encode: (quality: number) => Promise<{ blob: Blob; byteSize: number }>,
  checkCancelled: () => void,
): Promise<QualitySearchResult> {
  const probes: QualityProbe[] = [];

  async function probe(quality: number): Promise<QualityProbe> {
    checkCancelled();
    const { blob, byteSize } = await encode(quality);
    checkCancelled();
    const result: QualityProbe = { quality, byteSize, blob };
    probes.push(result);
    return result;
  }

  const atMax = await probe(qualityRange.maxQuality);

  if (atMax.byteSize <= targetBytes) {
    return { probes, best: atMax };
  }

  if (qualityRange.maxQuality === qualityRange.minQuality) {
    return { probes, best: undefined };
  }

  const atMin = await probe(qualityRange.minQuality);

  if (atMin.byteSize > targetBytes) {
    return { probes, best: undefined };
  }

  let best = atMin;
  let low = qualityRange.minQuality;
  let high = qualityRange.maxQuality;

  while (probes.length < MAX_QUALITY_PROBES_PER_TIER) {
    const mid = (low + high) / 2;
    const midResult = await probe(mid);

    if (midResult.byteSize <= targetBytes) {
      if (midResult.quality > best.quality) {
        best = midResult;
      }

      low = mid;
    } else {
      high = mid;
    }
  }

  return { probes, best };
}
