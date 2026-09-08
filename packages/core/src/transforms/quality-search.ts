import { MAX_QUALITY_PROBES_PER_TIER } from '../processing/target-size-limits';
import type { TargetSizeQualityRange } from '../processing/target-size-contracts';

/**
 * Metadata for a probe that was encoded but is not (or is no longer) the
 * best candidate. Deliberately excludes `blob` (FSG-006R Workstream A,
 * directive §4): a non-winning probe's encoded bytes serve no purpose once
 * a better candidate is found or the probe doesn't fit, so this type makes
 * it structurally impossible to retain them by accident.
 */
export interface QualityProbeMetadata {
  quality: number;
  byteSize: number;
}

/** The current best candidate — the only probe per search whose Blob is worth keeping alive. */
export interface QualityBestCandidate extends QualityProbeMetadata {
  blob: Blob;
}

export interface QualitySearchResult {
  /** Every probe actually attempted this tier, in order (at most 5) — metadata only, no Blob retained. */
  probes: QualityProbeMetadata[];
  /** The highest-quality probe whose byteSize <= targetBytes, if any — the only probe whose Blob survives the search. */
  best: QualityBestCandidate | undefined;
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
  const probes: QualityProbeMetadata[] = [];

  // Encodes and records this probe's metadata unconditionally. Each caller
  // keeps the returned Blob in the narrowest possible block and promotes it
  // to `best` only when it is a selected candidate (FSG-006R ADR-023).
  async function probe(quality: number): Promise<QualityBestCandidate> {
    checkCancelled();
    const { blob, byteSize } = await encode(quality);
    checkCancelled();
    probes.push({ quality, byteSize });
    return { quality, byteSize, blob };
  }

  {
    const atMax = await probe(qualityRange.maxQuality);

    if (atMax.byteSize <= targetBytes) {
      return { probes, best: atMax };
    }
  }

  if (qualityRange.maxQuality === qualityRange.minQuality) {
    return { probes, best: undefined };
  }

  let best: QualityBestCandidate;

  {
    const atMin = await probe(qualityRange.minQuality);

    if (atMin.byteSize > targetBytes) {
      return { probes, best: undefined };
    }

    best = atMin;
  }

  let low = qualityRange.minQuality;
  let high = qualityRange.maxQuality;

  while (probes.length < MAX_QUALITY_PROBES_PER_TIER) {
    const mid = (low + high) / 2;
    const midResult = await probe(mid);

    if (midResult.byteSize <= targetBytes) {
      if (midResult.quality > best.quality) {
        // The superseded candidate's Blob (previously held by `best`) is no
        // longer referenced anywhere after this reassignment and becomes
        // GC-eligible immediately — never retained in `probes` in the first
        // place (FSG-006R Workstream A).
        best = midResult;
      }

      low = mid;
    } else {
      high = mid;
    }
  }

  return { probes, best };
}
