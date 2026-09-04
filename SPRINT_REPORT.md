# FileSetGo Sprint Report

## Milestone

FSG-002 — Target File Size Engine & Guardrails

## Status

**FSG-002: Complete.** Approved by the project owner.

## Base Commit

`84969a867e095deae84c270654d72c5915e01301` (FSG-001 closeout).

## Branch

`fsg-002-target-size-engine`.

## Objective

A deterministic, bounded target-file-size engine: given an input image, an output format, a target maximum byte size, and a dimension policy, produce either a validated local `Blob` whose encoded size is within the target, or a structured explanation of why it could not be met — never an unbounded search, never a silent violation of the requested constraint.

## Architecture

`processImageToTarget()` is an orchestration on top of the existing FSG-001 primitives, not a second processing pipeline:

```
Input
 → Preflight + safety gate           (reused, unchanged)
 → Worker: decodeSourceToBitmap()    (reused — same HEIC adapter / native createImageBitmap path)
 → For each dimension tier (HARD: 1 tier; FLEXIBLE: up to 7):
     → drawBitmapToCanvas()          (reused — draw once per tier, canvas reused across quality probes)
     → PNG: one deterministic encode
     → JPEG/WebP: boundedQualitySearch() — at most 5 encodes
     → first candidate <= targetBytes wins; else move to the next tier
 → validateOutput()                  (reused, unchanged — real preflightImage() re-check)
 → Local Blob, or a structured TargetSizeUnreachable outcome
```

`decodeSourceToBitmap`, `createRenderCanvas`, `drawBitmapToCanvas`, `checkRuntimeSupport`, and `validateOutput` were extracted from `processImageInWorker` (`workers/process-image.ts`) into shared, independently exported functions specifically so the target-size engine (`workers/process-image-to-target.ts`) could reuse them rather than duplicate the pipeline. `processImageInWorker` itself was refactored to call these same functions — its behavior is unchanged (see Regression Results), but a real cleanup-ordering bug was found and fixed during that refactor (see Known Limitations Found & Fixed).

Both `processImage()` and `processImageToTarget()` are served by the same `ImageProcessingRuntime` class and share its single active-job slot (`runtime/worker-client.ts`) — starting either kind of job cancels whichever job, of either kind, is currently active, so `MAX_ACTIVE_HEAVY_JOBS = 1` holds across both (directive §15).

## Public API

```ts
import { processImageToTarget } from '@filesetgo/core';

const job = processImageToTarget(file, {
  targetBytes: 200_000,
  output: { format: 'webp' },
  dimensions: { maxWidth: 1600, maxHeight: 1600 },
  dimensionPolicy: 'flexible',        // default; 'hard' also supported
  qualityRange: { minQuality: 0.6, maxQuality: 0.95 },  // default
  onProgress: ({ stage }) => { /* 'preflighting' | 'decoding' | 'normalizing' | 'optimizing' | 'finalizing' | 'complete' */ },
});

const outcome = await job.result; // 'complete' | 'unreachable' | 'failed' | 'cancelled'
job.cancel();
```

`@filesetgo/core` has no knowledge of Laravel, Blade, Keryon, or CMS/preset concepts anywhere in this new code (directive §32) — confirmed by the scope grep in Privacy/Scope Audit below.

## Target-Size Contract

New types in `processing/target-size-contracts.ts`: `ProcessImageToTargetOptions`, `SafeImageProcessingTargetRequest` (validated/defaulted, worker-facing), `TargetSizeResult` (extends `ProcessedImageResult` with `targetBytes`, `targetMet: true`, `quality?`, `dimensionsReduced`, `qualityProbeCount`, `dimensionTierCount`), `TargetSizeUnreachable`, and the four-way `ImageProcessingTargetOutcome` union (`complete` / `unreachable` / `failed` / `cancelled`) — `unreachable` is a distinct status, not folded into `failed`, so a caller cannot mistake a valid bounded-search conclusion for a runtime error (directive §19).

Validation (`processing/validate-target-request.ts`) rejects malformed `targetBytes` (non-finite, ≤0, outside `[1024, 15 MB]`), malformed quality bounds (outside `[0,1]`, `minQuality > maxQuality`), an invalid `dimensionPolicy`, and dimensions exceeding the 24 MP safety limit — and resolves all defaults in one place so downstream code never re-derives them.

## Quality-Search Algorithm

`transforms/quality-search.ts`, `boundedQualitySearch()`. Strategy (never more than **5** encodes): probe `maxQuality` first — if it fits, done (1 probe, best possible outcome). Otherwise probe `minQuality` — if even that doesn't fit, no viable quality exists at this tier (2 probes). Otherwise binary-search the remaining budget between them. `best` is always selected from actually-measured probe results by highest fitting quality, never assumed from a theoretical monotonic ordering (directive §25) — verified by a dedicated non-monotonic-encoder test.

## Dimension-Tier Bound (Chosen Parameters)

`transforms/dimension-tiers.ts`, `calculateDimensionTiers()`. Each tier scales both dimensions by **0.85**, preserving aspect ratio. **`MAX_DIMENSION_TIERS = 6`** beyond the initial candidate (7 total, including tier 0): `0.85^6 ≈ 0.377`, so the smallest tier retains ~38% of the original edge length — a 2000px source steps down to ~754px, still broadly useful. **`MIN_DIMENSION_PX = 64`**: neither dimension may drop below this regardless of tier count. Full rationale recorded in `docs/governance/DECISIONS.md` ADR-015.

## HARD Behavior

Dimensions are authoritative — exactly one tier is ever tried. Only quality (JPEG/WebP) or a single deterministic encode (PNG) is varied. If no candidate meets `targetBytes`, the result is `TARGET_UNREACHABLE_HARD_DIMENSIONS` — dimensions are never silently reduced.

## FLEXIBLE Behavior

The requested (or safety-resize-planned) dimensions are the starting candidate. Quality search is tried at that tier first; only if no quality within range meets the target does the engine step down to the next bounded tier and retry. If every tier is exhausted, the result is `TARGET_UNREACHABLE_MIN_DIMENSIONS`. Never upscales (reuses the existing `calculateResizePlan` with `allowUpscale: false` for the starting candidate, then only ever shrinks further).

## PNG Behavior

No fake quality search. Exactly one deterministic encode per dimension tier attempted (verified: `encodeCalls[i].quality === undefined` for every PNG test). HARD = 1 possible encode total; FLEXIBLE = at most 7.

## Deterministic Maximum Encode Counts

```
JPEG/WebP HARD:      5   (1 dimension tier x up to 5 quality probes)
JPEG/WebP FLEXIBLE:  35  (7 dimension tiers x up to 5 quality probes each)
PNG HARD:            1   (1 dimension tier x 1 deterministic encode)
PNG FLEXIBLE:         7  (7 dimension tiers x 1 deterministic encode each)
```

## Structured Unreachable Outcomes

Two codes are actually reachable: `TARGET_UNREACHABLE_HARD_DIMENSIONS` and `TARGET_UNREACHABLE_MIN_DIMENSIONS`. A third, `TARGET_UNREACHABLE_MIN_QUALITY`, exists in the public contract for API completeness but has no distinct producing scenario in the current algorithm (a smaller dimension tier essentially always makes `minQuality`'s byte size smaller too, so "quality bottomed out" and "ran out of tiers" collapse into the same terminal case). This is a deliberate, documented simplification (ADR-015), not an oversight. Every unreachable outcome carries `bestAttempt` (the closest-measured candidate across the whole search, tracked independent of tier/probe success) when at least one candidate was ever encoded, plus `qualityProbeCount`/`dimensionTierCount` for FSG-003's future UX.

## HEIC Behavior

HEIC remains input-only (no HEIC output added). A HEIC source reaches the target-size engine through the exact same `decodeSourceToBitmap()` used by the standard pipeline — no duplicated HEIC decode logic. Verified for HEIC → JPEG, HEIC → PNG, and HEIC → WebP target-size requests, each confirming the lazily-imported HEIC adapter (`workers/heic-decode.ts`) is invoked exactly once regardless of how many dimension tiers/quality probes the subsequent search performs (decode happens once; only rendering/encoding repeats).

## Cancellation

Checked at every point the directive requires (§16): before decode, after decode, before/after each quality probe (inside `boundedQualitySearch`'s `probe()` helper), before each dimension-tier transition, after resize (before encoding begins), and before final result publication. Hard worker termination remains the backstop (unchanged from FSG-001). A cancelled search resolves through the same `WorkerProcessingFailure` / `PROCESSING_CANCELLED` path as the standard pipeline — verified it never produces a stale `met`/`unreachable` result after cancellation, and that the decoded bitmap is still closed even when cancellation interrupts mid-search.

## Resource Cleanup

The canvas is created once per dimension tier and reused across that tier's quality probes (quality only affects encoding, not the drawn pixels) rather than recreated per probe — an explicit memory-discipline choice (directive §27). Superseded canvases are zeroed before the next tier's canvas is created. The decoded bitmap is closed in a `finally` block covering the whole search, matching FSG-001's existing guarantee. Losing candidate `Blob`s are not explicitly retained beyond their tier's loop iteration — only the current `best` and `closestMiss` candidates are held across iterations.

## Known Limitation Found & Fixed During This Sprint

Extracting `decodeSourceToBitmap`/canvas helpers out of `processImageInWorker` initially introduced a real regression: performing the post-decode cancellation and dimension-mismatch checks *inside* the extracted function meant a bitmap acquired successfully could be leaked (never `.close()`d) if either check then threw, because the caller's own `bitmap` variable was only ever assigned *after* the function returned — so a throw from inside never reached the outer `finally` cleanup. Caught immediately by the existing FSG-001B regression suite (one test failed: "cancels after decode and still releases the decoded bitmap"). Fixed by moving those checks back out to the caller, run immediately after assigning the caller's own variable — restoring the exact ordering the original code already relied on, and now shared correctly by both `processImageInWorker` and `processImageToTargetInWorker`. Full regression suite confirmed clean afterward.

## Tests

```
npm run test:core
PASS — 202 tests across 17 files (up from FSG-001C's 142 tests / 13 files)

  New this sprint:
  packages/core/tests/workers/process-image-to-target.test.ts     20  (JPEG/WebP/PNG x HARD/FLEXIBLE, HEIC input,
                                                                        cancellation, output validation, bounds)
  packages/core/tests/processing/validate-target-request.test.ts  19  (targetBytes/quality/dimension validation)
  packages/core/tests/transforms/quality-search.test.ts            9  (bounded search, non-monotonic tolerance,
                                                                        cancellation)
  packages/core/tests/transforms/dimension-tiers.test.ts           7  (aspect ratio, no-upscale, floor, tier bound)
  packages/core/tests/runtime/worker-client.test.ts                13 (was 8 — +5: shared job-slot cross-kind
                                                                        cancellation, met/unreachable event handling,
                                                                        stale target-size result suppression)

  Unchanged from FSG-001C (142 total): preflight-image (52), process-image (25), heic-decode (10),
  process-image-heic-import-failure (1), protocol (14), validate-request (9), orientation (8), resize (7),
  jpeg-decode-source (5), job-id (1), capabilities (1), index (1)
```

No existing test was changed to accommodate this sprint. `process-image.test.ts`'s tests continued to pass through the `processImageInWorker` refactor unmodified — they are the regression evidence that the refactor is behavior-preserving.

## Regression Results

`npm run typecheck` and `npm run test:core` were run repeatedly through this sprint's refactor of `process-image.ts`; the only failure encountered (see Known Limitation Found & Fixed) was caught by the *existing* FSG-001B suite, not a new test, and is now fixed with the full suite green.

## Privacy / Scope Audit

```
grep -rnE "fetch\(|XMLHttpRequest|sendBeacon|axios|multipart|FormData" packages/core/src resources/js
  → exactly 1 match: heic-decode.ts's existing same-origin WASM asset fetch (unchanged from FSG-001C).
    No new network path was introduced for target-size optimization (directive §28).

grep -rniE "keryon|church|membership|tenant|logo.?pack|favicon|zip.?packag|cms.?preset" packages/core/src
  → 0 matches.

git status — 0 PHP files touched this sprint (pure @filesetgo/core TypeScript change set).
```

## Build Results

```
npm run typecheck            PASS
npm run test:core            PASS — 202 tests / 17 files
npm run build                PASS
php artisan test --compact   PASS — 2 tests, 2 assertions
git diff --check             PASS
```

Production build confirms HEIC lazy-loading isolation is untouched by this sprint (identical chunk hashes to the FSG-001C build):

```
public/build/assets/image.worker-KAD2TI8R.js     25.16 kB   (grew from 20.73 kB — see Performance Observations)
public/build/assets/heic-decode-CIxd_bUO.js       32.54 kB   (lazy, unchanged hash — untouched this sprint)
public/build/assets/heic_dec-ojH1Dp2m.wasm       959.55 kB   (lazy, unchanged hash — untouched this sprint)
public/build/assets/app-DFkPIp2I.js               28.35 kB   (grew from 25.16 kB — see below)
```
Zero HEIC codec markers (`libde265`/`wasmBinaryFile`/`heic_dec`) in `image.worker.js` or `app.js`; both present only in the separate lazy `heic-decode.js` chunk — reconfirmed with the same grep methodology as FSG-001C.

## Performance Observations

- Maximum configured probe count: 5 per tier (`MAX_QUALITY_PROBES_PER_TIER`).
- Maximum dimension tiers: 7 total including tier 0 (`MAX_DIMENSION_TIERS = 6` reductions).
- Theoretical maximum encodes per job: 35 (JPEG/WebP FLEXIBLE) — see Deterministic Maximum Encode Counts.
- Observed encode counts in representative tests: "already under target" = 1; "quality search only" = 2–5; "dimension step-down required" = tier-count-dependent, always within the documented bound. All confirmed via `encodeCalls.length` assertions in the automated suite, not estimated.
- Bundle size: `image.worker.js` grew from 20.73 kB to 25.16 kB and the main UI entry (`app.js`) grew from 25.16 kB to 28.35 kB. This is the target-size engine's orchestration code (the shared `ImageProcessingRuntime` class, dimension-tier/quality-search logic, contracts) becoming part of the same always-loaded module graph as the existing standard pipeline — unlike HEIC's WASM codec, the directive does not require this code to be lazy-split, and it is ordinary application logic of comparable weight to the rest of the processing pipeline, not an optional heavyweight dependency.
- No automated browser timing was available in this environment (see Known Limitations); no physical-device benchmarking was attempted (explicitly FSG-006 scope, per directive §34).

## Known Limitations

- `TARGET_UNREACHABLE_MIN_QUALITY` is defined but not currently reachable by the algorithm (see Structured Unreachable Outcomes) — documented, not a bug.
- No real browser session exercised this sprint's code (same infrastructure constraints as FSG-001C: no working browser-automation connection in this environment). All evidence is from Vitest against fake `OffscreenCanvas`/`createImageBitmap`/`ImageData` globals (for the search/orchestration logic) and, for HEIC, the real installed decoder (inherited from FSG-001C, unchanged). Per ADR-013, this does not block closure; comprehensive browser/device certification remains FSG-006 scope.
- No automated performance/timing benchmarking against real encoder latency — only encode *counts* were verified, not wall-clock duration, since Node has no real `OffscreenCanvas.convertToBlob` to time.
- The `bestAttempt` reported in an unreachable outcome reflects the smallest byte size seen across the whole search, which is a reasonable "closest miss" but is not guaranteed to be the single best candidate a differently-ordered search might have found — an inherent property of any bounded (non-exhaustive) search, not specific to this implementation.

## FSG-002 Acceptance Audit

Checked against `docs/directives/FSG-002.md` §36:

```
1.  targetBytes validated (range, type, NaN/infinite rejected)         ✓
2.  JPEG bounded quality search works                                  ✓
3.  WebP bounded quality search works                                  ✓
4.  PNG deterministic lossless target behavior                         ✓
5.  HARD dimension policy works                                        ✓
6.  FLEXIBLE dimension policy works                                    ✓
7.  Quality probes bounded to <= 5 per tier                            ✓ (enforced in boundedQualitySearch, tested)
8.  Dimension tiers explicitly bounded                                 ✓ (MAX_DIMENSION_TIERS = 6, tested)
9.  Total encode attempts deterministically bounded                    ✓ (documented per format/policy combination)
10. Aspect ratio preserved                                             ✓ (tested)
11. No upscale by default                                              ✓ (reuses existing no-upscale resize plan)
12. Unreachable targets return structured outcomes                     ✓ (distinct `unreachable` status, not `failed`)
13. Target success always satisfies final bytes <= targetBytes         ✓ (tested explicitly)
14. Output validation remains mandatory                                ✓ (reuses real validateOutput(), tested with
                                                                            a real mislabeling case)
15. Cancellation/stale protection remains correct                      ✓ (tested at every required checkpoint, plus
                                                                            cross-job-kind stale-result suppression)
16. HEIC input works through the engine                                ✓ (HEIC -> JPEG/PNG/WebP tested)
17. All FSG-001 safety/privacy invariants remain intact                ✓ (see Privacy/Scope Audit; 24 MP cap enforced
                                                                            in the new worker path too)
18. Automated regression suite passes                                  ✓ (202/202)
19. No FSG-003 functionality begun                                     ✓ (grep-confirmed; no UI styling, no presets)
```

All 19 criteria satisfied.

## Next Milestone

FSG-003 — Quick Fit Workflow & Public Shell is NEXT and has not begun.

## Commit Reference

This report is included in the FSG-002 closeout commit:

`feat(core): add bounded target-size engine`

The authoritative commit SHA is recorded in Git history and in the post-commit closeout response.
