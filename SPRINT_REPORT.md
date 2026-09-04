# FSG-005A Sprint Report — Multi-Output Packaging Foundation

## Milestone

FSG-005A — Multi-Output Packaging Foundation (see `docs/directives/FSG-005A.md`).

## Parent Milestone

FSG-005 — Packaging & Export Systems.

```text
FSG-005 — Packaging & Export Systems
├── FSG-005A — Multi-Output Packaging Foundation   (this sprint)
└── FSG-005B — Website Logo Pack & Favicon Suite   (not started)
```

**FSG-005 itself remains OPEN.** This sprint closes only the generic foundation; FSG-005B will close the parent milestone if its own acceptance criteria pass.

## Status

FSG-005A: Complete.
FSG-005 parent: Open.

## Base Commit Before FSG-005A

`8cddc182535a83720c6d969a556bb37b633b54bd` — the FSG-004 closeout commit (`feat(web): add Guided Fit presets`).

## Branch

`fsg-005a-packaging-foundation`, created from the commit above.

## Objective

Build the reusable browser-side foundation FSG-005B will use for Website Logo Pack generation: one source image → one decode → multiple deterministic output specifications → multiple validated local assets → an optional ZIP archive → local result only. No product knowledge (logo, favicon, platform names) enters this layer.

## Architecture

`processImageSet()` is orchestration over the existing FSG-001/FSG-002 primitives, not a second processing engine — exactly the same relationship `processImageToTarget()` already has to `processImage()`. The worker-side implementation (`packages/core/src/workers/process-image-set.ts`) reuses `decodeSourceToBitmap`, `createRenderCanvas`, `drawBitmapToCanvas`, and `validateOutput` from `process-image.ts` unchanged. See `docs/governance/DECISIONS.md` ADR-017 for the full architectural record.

## Public Core API

```ts
processImageSet(file: Blob, options: ProcessImageSetOptions): ImageProcessingSetJob

interface ProcessImageSetOptions {
  outputs: ImageSetOutputSpec[];   // { id, filename, output: { format, quality? }, resize? }
  archive?: { filename: string };  // must end in .zip
  onProgress?: (event: ImageSetProcessingProgress) => void;
}

interface ImageSetResult {
  assets: ImageSetAssetResult[];   // ProcessedImageResult + { id, filename }, in requested order
  assetCount: number;
  totalOutputBytes: number;
  archive?: { blob: Blob; filename: string; byteSize: number };
}
```

Reuses `OutputImageFormat`, `ResizeOptions`, and `ProcessedImageResult` from the existing `processing/contracts.ts` rather than redefining format/dimension concepts. No `fflate` type, callback, or option appears anywhere in this public surface.

## Image-Set Processing

`processImageSetInWorker()`: preflights once (in the runtime, before dispatch — same as `processImage`/`processImageToTarget`), decodes once, then for each requested output *sequentially*: computes an independent resize plan, draws to a freshly created canvas, encodes, validates via the real `validateOutput()` (a genuine `preflightImage()` re-check of the encoded bytes), and releases that canvas before starting the next output. Peak memory is bounded by one decoded bitmap + one canvas at a time, regardless of how many outputs are requested.

## One-Decode Reuse

`decodeSourceToBitmap()` and `assertDecodedDimensionsMatch()` run exactly once per job, before the per-output loop begins; the same `ImageBitmap` and normalized dimensions are reused by every output's `drawBitmapToCanvas()` call. Verified directly: `process-image-set.test.ts` asserts `createImageBitmap` (and, for a mocked HEIC source, `decodeHeic`) is called exactly once regardless of output count (2–3 outputs tested).

## Worker Protocol

Added `PROCESS_IMAGE_SET` command and `JOB_COMPLETE_SET` event to `runtime/protocol.ts`, plus optional `assetIndex`/`assetCount` fields on the existing `JOB_PROGRESS` event (used only by image-set jobs; `processImage`/`processImageToTarget` progress events are unaffected). `isImageWorkerEvent()` validates the new event shapes structurally, including the optional `archive` field.

## Concurrency

`ImageProcessingRuntime`'s `JobVariant` gained a third `'set'` member. `MAX_ACTIVE_HEAVY_JOBS = 1` is enforced identically across all three kinds — starting any job (`processImage`, `processImageToTarget`, or `processImageSet`) cancels whichever job, of any kind, is currently active. Verified in `worker-client.test.ts`: starting a `processImageSet` job cancels an in-flight `processImage` job; starting a `processImageToTarget` job cancels an in-flight `processImageSet` job; a stale image-set result from a replaced job is ignored (existing pairwise cross-kind cancellation between `processImage`/`processImageToTarget` was already covered before this sprint).

## Asset Validation

Every output passes the same `validateOutput()` real-preflight re-check `processImage()` already uses before being added to the result. If any required output fails validation, the whole `processImageSetInWorker()` call rejects — no partial asset list is ever returned. Verified with a deliberately mislabeled output (PNG-typed Blob containing real JPEG bytes) causing the entire operation to reject.

## Package Bounds

`MAX_PACKAGE_ASSETS = 16` — enforced in `validate-image-set-request.ts` before any decode/processing begins (cheap, up-front rejection). `MAX_PACKAGE_TOTAL_OUTPUT_BYTES = 50 * 1024 * 1024` (50 MiB) — enforced progressively inside the worker as each output's real encoded byte size becomes known, since only the encoder (not the request) can determine a given output's final size. Both are recorded in `docs/governance/DECISIONS.md` ADR-017 as initial engineering limits, not marketing promises. Tested at the exact boundary (accepted) and one byte over (rejected) using controlled-size fixtures (`encodeAtSize()`), not real multi-tens-of-MB image generation.

## Filename Safety

`archive/filename-safety.ts`'s `isSafeArchiveEntryName()` rejects any name containing `/`, `\`, or `:` outright — a single check that covers path traversal (`../`, `..\`), absolute paths, and drive-letter paths at once — plus empty names, `.`, `..`, and null bytes. Archives are flat only (FSG-005A directive §17); no directory-tree support exists. This check runs in `validate-image-set-request.ts` before any processing, not only at archive-creation time. Duplicate output ids and duplicate filenames are both rejected the same way, before expensive work starts.

## Archive Architecture

`archive/zip-adapter.ts` is the *only* module in FileSetGo that imports `fflate` directly. `createZipArchive(entries)` is a worker-internal implementation detail — it is not exported from `packages/core/src/index.ts` and never appears in any public contract. `process-image-set.ts` reaches it only through a dynamic `import('../archive/zip-adapter')`, invoked only when a job's `archive` option is actually present.

## fflate Dependency

Approved by the project owner for this sprint specifically. Verified before installation and again after:

```text
name: fflate
version: 0.8.3   (exact-pinned in packages/core/package.json — no caret range)
license: MIT
runtime dependencies: none
```

`npm ls fflate`:

```text
filesetgo@ /Users/silvestr/filesetgo
└─┬ @filesetgo/core@0.1.0 -> ./packages/core
  └── fflate@0.8.3
```

No other archive library (JSZip or otherwise) was installed.

## ZIP Strategy

Every entry (and the archive's own metadata) uses ZIP STORE (`level: 0`) — no DEFLATE — since package contents are already-compressed JPEG/PNG/WebP bytes; re-compressing them would waste CPU without shrinking the result (verified in `zip-adapter.test.ts`: a 50,000-byte highly-repetitive input produces an archive *larger* than the input, proving no DEFLATE ran). Every entry's `mtime` is fixed to `1980-01-01T00:00:00Z` (the ZIP format's own epoch) instead of `fflate`'s current-time default, so `createZipArchive()` is deterministic — verified directly by generating the same archive twice and comparing bytes exactly. Archive creation happens synchronously inside the worker (never on the main thread), gated by the same `MAX_PACKAGE_TOTAL_OUTPUT_BYTES` limit that already bounded the assets being archived.

## Lazy-Load Evidence

Production build output:

```text
public/build/assets/zip-adapter-BOagJ5MW.js     9.12 kB   (new, separate chunk)
public/build/assets/app-DYvyzjF8.js             52.18 kB  (was 48.19 kB; +3.99 kB)
public/build/assets/image.worker-BNK2ViNE.js    28.42 kB  (was 25.16 kB; +3.26 kB)
public/build/assets/heic-decode-CIxd_bUO.js     32.54 kB  (unchanged)
public/build/assets/heic_dec-ojH1Dp2m.wasm      959.55 kB (unchanged)
```

`fflate`'s minified DEFLATE table-building code was confirmed present *only* in `zip-adapter-*.js` (identifiable directly in the chunk despite minification) and **absent** from both `app-*.js` and `image.worker-*.js` (checked for `fflate`/`zipSync`/`unzipSync` markers — zero matches in either). The app/worker growth is the new `'set'`-kind branching logic added to the already-shared `ImageProcessingRuntime` class and `image.worker.ts` dispatcher (real code that ships either way, since those files are already part of the Quick Fit bundle) — not `fflate` itself. Quick Fit and Guided Fit do not call `processImageSet()` anywhere in this sprint (no public UI exists yet, per directive §29), so ordinary visitors never trigger the `zip-adapter` chunk's fetch at all.

## Cancellation

Checked before decode, after decode, before each output (dimension-plan computation), after each canvas draw, after each encode, before archive creation, after archive bytes are produced, and before final result publication — matching the checkpoint list in directive §13. Verified: cancellation after the first of two outputs completes stops before the second starts; cancellation mid-asset (during the encode step) stops there; a cancelled job's decoded bitmap is still closed and its canvas still released (the same `finally`-based cleanup pattern as `processImage`/`processImageToTarget`).

## Resource Cleanup

The decoded bitmap is closed and the active canvas released (`width = 0; height = 0`) in a single `finally` block covering the whole job, regardless of success, failure, or cancellation — identical discipline to the existing FSG-001/FSG-002 workers. No object URLs are created anywhere inside `@filesetgo/core`; that remains host/UI responsibility, unchanged.

## Privacy

Repository-wide `grep` for `fetch(`/`XMLHttpRequest`/`sendBeacon`/`axios`/`FormData`/`multipart` across `packages/core/src/`, `resources/js/`, and `resources/views/welcome.blade.php` found only the pre-existing, unmodified HEIC WASM `fetch()` (`workers/heic-decode.ts`) — the two other superficial matches were false positives from the string "FormData" appearing inside an unrelated variable name (`transformData` in the HEIC orientation parser) and are not network calls. No server packaging/upload endpoint was created; `routes/web.php` is unchanged (`GET /` only). `fflate` is bundled locally, never loaded from a CDN.

## Automated Tests

**New core tests**, all passing:

| File | Tests | Covers |
|---|---|---|
| `tests/archive/filename-safety.test.ts` | 11 | Path traversal, absolute paths, drive letters, null bytes, empty/`.`/`..`, nested directories, `.zip` suffix requirement |
| `tests/archive/zip-adapter.test.ts` | 6 | Round-trip via real `unzipSync()`, exact bytes, order preservation, empty archive, determinism, STORE-not-DEFLATE |
| `tests/processing/validate-image-set-request.test.ts` | 18 | Empty/oversized output lists, per-output field validation, duplicate ids/filenames, unsafe/invalid filenames, archive filename validation |
| `tests/workers/process-image-set.test.ts` | 17 | Multi-output generation, order, one-decode reuse (incl. mocked HEIC), mixed formats, per-output resize, progress asset index/count, one-failure-fails-all, package byte limit (exact boundary + over-limit), cancellation (between/during assets, cleanup-on-cancel), archive creation + integrity + no-archive-when-unrequested |
| `tests/runtime/protocol.test.ts` (extended) | +6 | `JOB_COMPLETE_SET`/progress-with-asset-info valid-event recognition; malformed image-set result rejection |
| `tests/runtime/worker-client.test.ts` (extended) | +5 | `PROCESS_IMAGE_SET` dispatch, asset progress forwarding, cross-kind cancellation (both directions), stale image-set result suppression |

**Total new tests: 63** (11+6+18+17+6+5), exactly matching the 202→265 core baseline delta.

## Regression Baseline

`npm run test:core`: **265/265 passing** (202 pre-existing + 63 new — zero pre-existing tests were modified in behavior, only two assertions adjusted to match richer, still-correct event payloads: a `toContainEqual` widened to `expect.objectContaining` after adding `jobId` alongside the new asset-progress fields).

`npm run test:ui`: **171/171 passing**, unchanged — no `resources/js/` product code was touched this sprint.

`php artisan test --compact`: **8/8 passing, 17 assertions**, unchanged.

## Production Build

`npm run build` succeeds (verified twice; one transient network failure from the unrelated build-time Google/Bunny font-fetch plugin was retried and succeeded cleanly — no relation to this sprint's changes).

## Bundle Observation

See "Lazy-Load Evidence" above for exact before/after sizes. Summary: `zip-adapter` is a new, separate, properly lazy chunk (9.12 kB); `app.js`/`image.worker.js` grew modestly (+3.99 kB / +3.26 kB) from the shared runtime's new `'set'`-kind branches, not from `fflate`; HEIC-related chunks are byte-for-byte unchanged.

## HEIC Regression

Re-verified: `app-*.js` and `image.worker-*.js` contain zero HEIC decoder glue markers (`libde265`, `wasmBinaryFile`, `instantiateWasm`); those appear only in the untouched `heic-decode-*.js` chunk. HEIC input processing itself was not modified — `process-image-set.ts` calls the same `decodeSourceToBitmap()` HEIC branch `process-image.ts` and `process-image-to-target.ts` already use.

## Known Limitations

- **Browser automation was not exercised this sprint** (consistent with the pattern recorded since FSG-003) — but per directive §45, FSG-005A has no required public UI, so this is not a meaningful gap for this sprint's actual deliverable. All verification is automated-test- and build-inspection-based, per ADR-013.
- `docs/product/PRODUCT.md` was deliberately **not** updated — FSG-005A introduces no product-facing concept (directive §29/§30 explicitly exclude a public surface), so there is nothing accurate to add there yet. FSG-005B will be the first sprint with real product copy to record.
- The 50 MiB/16-asset limits are, per ADR-017 (mirroring ADR-004's framing), initial engineering defaults, not values validated against real device memory constraints — that validation remains FSG-006 scope.

## FSG-005A Acceptance Audit (directive §46)

| # | Criterion | Status |
|---|---|---|
| 1 | Generic typed image-set contract exists | Met |
| 2 | Image-set processing occurs as one heavy job | Met |
| 3 | Source is preflighted once | Met |
| 4 | Source is decoded once | Met (tested) |
| 5 | Multiple outputs reuse the decoded source | Met (tested) |
| 6 | Outputs are processed sequentially | Met |
| 7 | JPEG/PNG/WebP outputs work | Met (tested) |
| 8 | HEIC input works without duplicate decode | Met (tested) |
| 9 | Every output is validated | Met (tested) |
| 10 | One failed required output fails the set | Met (tested) |
| 11 | Cancellation works between outputs | Met (tested) |
| 12 | Stale-result protection works | Met (tested) |
| 13 | Existing heavy-job concurrency invariant remains intact | Met (tested) |
| 14 | Generic archive adapter exists | Met |
| 15 | fflate@0.8.3 is exact-pinned and isolated | Met |
| 16 | ZIP creation occurs off the main thread | Met (in worker) |
| 17 | ZIP contains exact expected entries | Met (tested, real unzip) |
| 18 | Entry filenames are validated | Met (tested) |
| 19 | Duplicate filenames/IDs are rejected | Met (tested) |
| 20 | Path traversal is rejected | Met (tested) |
| 21 | Asset-count limit is enforced | Met (tested) |
| 22 | Total-output-byte limit is enforced | Met (tested) |
| 23 | Archive result is application/zip | Met (tested) |
| 24 | Archive code is lazy-loaded | Met (build-verified) |
| 25 | Quick Fit/Guided Fit do not eagerly load archive code | Met (build-verified) |
| 26 | No server packaging/upload endpoint exists | Met (audited) |
| 27 | No Website Logo Pack UI exists | Met |
| 28 | No favicon/ICO generation exists | Met |
| 29 | Existing core/UI/Laravel baselines remain green | Met (265/171/8) |
| 30 | New image-set/archive tests pass | Met (63/63) |
| 31 | Typecheck passes | Met |
| 32 | Production build passes | Met |
| 33 | HEIC remains lazy | Met (re-verified) |
| 34 | Privacy invariants remain intact | Met (audited) |
| 35 | FSG-005 remains OPEN | Met — not claimed closed anywhere in this report |
| 36 | FSG-005B becomes NEXT | Pending project-owner closure approval |

## FSG-005 Parent Status

**OPEN.** Only the generic multi-output/packaging foundation (FSG-005A) is complete. The Website Logo Pack, favicon/ICO generation, and any public packaging UI remain entirely unbuilt and are FSG-005B's scope.

## Next Milestone

FSG-005B — Website Logo Pack & Favicon Suite is NEXT and has not begun.

## Commit Reference

This report is included in the FSG-005A closeout commit:

`feat(core): add multi-output packaging foundation`

The authoritative commit SHA is recorded in Git history and in the post-commit closeout response.
