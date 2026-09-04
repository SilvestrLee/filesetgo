import { describe, expect, it, vi } from 'vitest';

import { MAX_QUALITY_PROBES_PER_TIER } from '../../src/processing/target-size-limits';
import { boundedQualitySearch } from '../../src/transforms/quality-search';

const RANGE = { minQuality: 0.6, maxQuality: 0.95 };

function fakeBlob(byteSize: number): Blob {
  return new Blob([new Uint8Array(byteSize)]);
}

/** A monotonic model encoder: higher quality -> larger byteSize. */
function monotonicEncode(quality: number): Promise<{ blob: Blob; byteSize: number }> {
  const byteSize = Math.round(quality * 100_000);
  return Promise.resolve({ blob: fakeBlob(byteSize), byteSize });
}

describe('boundedQualitySearch', () => {
  it('returns immediately with 1 probe when maxQuality already fits', async () => {
    const result = await boundedQualitySearch(1_000_000, RANGE, monotonicEncode, () => {});

    expect(result.probes).toHaveLength(1);
    expect(result.probes[0].quality).toBe(RANGE.maxQuality);
    expect(result.best?.quality).toBe(RANGE.maxQuality);
  });

  it('returns no candidate with 2 probes when even minQuality does not fit', async () => {
    const result = await boundedQualitySearch(1000, RANGE, monotonicEncode, () => {});

    expect(result.probes).toHaveLength(2);
    expect(result.probes.map((probe) => probe.quality)).toEqual([
      RANGE.maxQuality,
      RANGE.minQuality,
    ]);
    expect(result.best).toBeUndefined();
  });

  it('never performs more than MAX_QUALITY_PROBES_PER_TIER encodes', async () => {
    // A target that requires narrowing, forcing the full probe budget.
    const result = await boundedQualitySearch(50_000, RANGE, monotonicEncode, () => {});

    expect(result.probes.length).toBeLessThanOrEqual(MAX_QUALITY_PROBES_PER_TIER);
  });

  it('selects the highest tested quality whose byteSize <= targetBytes', async () => {
    const result = await boundedQualitySearch(72_000, RANGE, monotonicEncode, () => {});

    expect(result.best).toBeDefined();
    expect(result.best!.byteSize).toBeLessThanOrEqual(72_000);

    for (const probe of result.probes) {
      if (probe.byteSize <= 72_000) {
        expect(result.best!.quality).toBeGreaterThanOrEqual(probe.quality);
      }
    }
  });

  it('uses exactly 1 probe when minQuality equals maxQuality and it fits', async () => {
    const fixedRange = { minQuality: 0.8, maxQuality: 0.8 };
    const result = await boundedQualitySearch(1_000_000, fixedRange, monotonicEncode, () => {});

    expect(result.probes).toHaveLength(1);
    expect(result.best?.quality).toBe(0.8);
  });

  it('uses exactly 1 probe when minQuality equals maxQuality and it does not fit', async () => {
    const fixedRange = { minQuality: 0.8, maxQuality: 0.8 };
    const result = await boundedQualitySearch(1000, fixedRange, monotonicEncode, () => {});

    expect(result.probes).toHaveLength(1);
    expect(result.best).toBeUndefined();
  });

  it('tolerates a non-monotonic encoder and still returns the highest fitting *measured* candidate', async () => {
    // A pathological encoder where quality 0.7 happens to produce a
    // slightly larger file than quality 0.72 (real encoders can do this).
    const sizes: Record<number, number> = {
      0.95: 200_000,
      0.6: 10_000,
      0.775: 60_000,
      0.6875: 30_000,
      0.83125: 90_000, // over target — should never be selected
    };
    const encode = vi.fn((quality: number) => {
      const rounded = Number(quality.toFixed(6));
      const byteSize = sizes[rounded] ?? Math.round(quality * 200_000);
      return Promise.resolve({ blob: fakeBlob(byteSize), byteSize });
    });

    const result = await boundedQualitySearch(80_000, RANGE, encode, () => {});

    expect(result.best).toBeDefined();
    expect(result.best!.byteSize).toBeLessThanOrEqual(80_000);

    for (const probe of result.probes) {
      if (probe.byteSize <= 80_000) {
        expect(result.best!.quality).toBeGreaterThanOrEqual(probe.quality);
      }
    }
  });

  it('checks cancellation before and after every probe', async () => {
    let calls = 0;
    const checkCancelled = vi.fn(() => {
      calls += 1;
    });

    await boundedQualitySearch(50_000, RANGE, monotonicEncode, checkCancelled);

    // At least 2 checks (before/after) per probe actually taken.
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('propagates a cancellation thrown mid-search and stops probing', async () => {
    let probeCount = 0;
    const checkCancelled = vi.fn(() => {
      probeCount += 1;

      if (probeCount > 2) {
        throw new Error('cancelled');
      }
    });

    await expect(
      boundedQualitySearch(50_000, RANGE, monotonicEncode, checkCancelled),
    ).rejects.toThrow('cancelled');
  });
});
