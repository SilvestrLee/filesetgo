# FileSetGo Sprint Report

## Milestone

FSG-001C — HEIC/HEIF Decode Integration & FSG-001 Closeout

## Status

**FSG-001C: Complete. FSG-001: Closed.** Approved by the project owner. Per the parent-milestone acceptance audit below, every FSG-001 required outcome, governing constraint, and non-goal is satisfied — the one item that had kept it open since FSG-001B (HEIC decode) is implemented and verified.

## Base Commit

`d6f46b4e1b35cf9093db1f544b61b7163835c3da` (FSG-001B closeout, branch `fsg-001-core-runtime`) — this sprint's work is implemented on top of this commit and, per §28, is not committed yet.

## Work Completed

- Real HEIC/HEIF decode wired into the worker pipeline via a narrow, replaceable adapter (`packages/core/src/workers/heic-decode.ts`) around `@discourse/heic` (see Dependency below).
- Preflight/runtime boundary corrected: a structurally valid, in-limits HEIC file now passes preflight as `ready`/`safeToDecode: true` like any other format. `HEIC_DECODER_UNAVAILABLE` moved from a preflight rejection code to a processing/runtime error, joined by a new `HEIC_INITIALIZATION_FAILED` code.
- Primary-item resolution replaced: HEIC dimensions are now resolved via real `pitm` → `ipma` → `ipco` → `ispe` item-property association (ISO/IEC 23008-12), not "the first `ispe` box found." `irot` (image rotation) is accounted for when it affects width/height.
- Two real ISOBMFF box-parsing bugs found and fixed via testing against a genuine `sips`-generated HEIC file: box `size == 0` ("extends to end of container") and `size == 1` (64-bit "largesize") were previously both rejected as corrupt; both are legal and, per the real fixture, actually used by a mainstream encoder for the trailing `mdat` box.
- A real Vite worker-bundling gap found and fixed: dynamic `import()` inside the `{ type: 'module' }` worker was being inlined into the single worker chunk rather than code-split, silently defeating lazy-loading. Fixed with `worker: { format: 'es' }` in `vite.config.js`, verified against actual build output (see Lazy-Loading Evidence).
- `getRuntimeCapabilities()`'s `heicDecoderAvailable` is no longer hardcoded `false` — it now feature-detects the prerequisites (worker processing + `WebAssembly`) without paying the lazy-load cost.
- 33 new automated tests (109 → 142), including tests that exercise the actual installed `@discourse/heic` package for real (not mocked) against a real, self-generated HEIC fixture.

## Dependency

Per directive §2, `heic-to@1.5.2`'s registry metadata was verified exactly as specified (name, version, license, `heic-to/next` entry point all confirmed) before a separate, unrelated discovery paused implementation: `packages/core/package.json` already declared `@discourse/heic` — an unevaluated, pre-governance dependency. A comparative technical evaluation (real execution, not just metadata) was performed and the project owner selected **`@discourse/heic`** over `heic-to`. `heic-to` was never installed in the final working tree and is not described as technically defective — it simply wasn't chosen. Full rationale, evidence, and license-governance steps are recorded in `docs/governance/DECISIONS.md` **ADR-014**, which supersedes FSG-001B's provisional `heic-to` recommendation.

```
Package:          @discourse/heic
Installed version: 1.0.0 (exact-pinned, no caret range)
License:           Apache-2.0
Provenance:        Discourse's npm-scoped publish of the HEIC decoder from
                    jamsinclair/jSquash PR #101 (opened 2026-03-30, still
                    unmerged upstream as of this decision). Single release,
                    33,720 weekly downloads.
Wraps:              libheif + libde265, compiled to WebAssembly.
```

## Architecture

```
HEIC/HEIF File
    ↓
Preflight (identify + resolve primary item + safety gate)
    ↓
Worker
    ↓
decodeHeicToBitmap()  — lazy import('./heic-decode') only for HEIC
    ↓
decodeHeic()           — fetch+compile+init WASM, real decode() call
    ↓
ImageData → createImageBitmap()
    ↓
[ same pipeline as JPEG/PNG/WebP from here on ]
normalize → bounded resize → canvas → encode → validate → cleanup
```

JPEG/PNG/WebP keep their existing native `createImageBitmap(blob)` path unchanged. Both paths converge before normalize/resize/encode/validate/cleanup — no duplicated processing logic.

## Preflight Semantic Correction

Before (FSG-001B): a structurally valid HEIC file was rejected at preflight with `HEIC_DECODER_UNAVAILABLE`, because no decoder existed yet.

Now: `HEIC_DECODER_UNAVAILABLE` no longer appears in `IMAGE_PREFLIGHT_ERROR_CODES` at all — it lives in `IMAGE_PROCESSING_ERROR_CODES` alongside a new `HEIC_INITIALIZATION_FAILED`. A HEIC file that passes the 15 MB size cap, resolves valid ISOBMFF/primary-item structure, and is within the 24 MP decoded-pixel cap now returns `{ status: 'ready', safeToDecode: true }`, exactly like JPEG/PNG/WebP. Decoder availability is only ever surfaced if the worker actually fails to lazily load or initialize the decoder for a specific job — it is a processing-time concern, not a file-validity concern, per directive §5.

## Primary-Item Handling

`packages/core/src/preflight/formats/heic.ts` now performs real primary-item resolution:

1. Read the primary item ID from `pitm` (supports both the 16-bit and 32-bit item-ID FullBox versions).
2. Read `ipma`'s item→property-index associations (supports both the 1-byte and 2-byte property-index encoding, selected by the box's `flags` field, and both item-ID widths).
3. Walk `ipco`'s children in document order to build an indexed property list.
4. Resolve the primary item's associated properties by index (not by scanning for the first `ispe`); require an `ispe` among them.
5. If an `irot` property is also associated and indicates a 90° or 270° rotation, swap the reported width/height to match the visually-correct (post-rotation) dimensions — under the documented assumption that `@discourse/heic`'s `decode()` returns already orientation-normalized pixels (typical libheif default behavior). If that assumption is ever wrong for a given file, the existing decoded-dimension consistency check in `process-image.ts` will catch the mismatch and fail cleanly (`DECODE_FAILED`) rather than silently return wrong pixels.

Any structure outside this supported subset (missing `pitm`, no `ipma` entry for the primary item, no `ispe` among its properties, an out-of-range property index, a malformed/truncated `ipma`, or more properties than the bounded scan limit) is rejected with a structured `CORRUPT_IMAGE` error rather than guessing — per directive §6, "do not guess when a structure cannot be safely resolved."

`imir` (mirroring) is intentionally not modeled, since it doesn't affect width/height and FileSetGo does not implement a general HEIF transform-matrix system (directive §7).

**Real-world validation:** testing the parser against an actual `sips`-generated HEIC file (not just hand-built synthetic fixtures) surfaced two real bugs in the box-size handling (see Work Completed) that no synthetic fixture had exercised, both now fixed and covered by dedicated tests.

## Lazy-Loading Evidence

Actual production build output (`npm run build`, clean rebuild):

```
public/build/assets/image.worker-CmS0mdb6.js     20.73 kB   (always loaded; JPEG/PNG/WebP + tiny HEIC dispatch/error-mapping code)
public/build/assets/heic-decode-CIxd_bUO.js       32.54 kB   (lazy; only fetched on the first HEIC job)
public/build/assets/heic_dec-ojH1Dp2m.wasm       959.55 kB   (lazy; gzip 309.81 kB; only fetched on the first HEIC job)
public/build/assets/app-pMQ4sJOR.js               25.16 kB   (main UI entry, unaffected)
```

This was not achieved automatically: the initial build inlined the entire `@discourse/heic` + Emscripten glue into the single worker chunk (`image.worker.js` grew to 53.45 kB, and grepping it for codec-specific strings like `libde265`/`wasmBinaryFile` matched), because Vite's default worker build format does not code-split dynamic imports. Adding `worker: { format: 'es' }` to `vite.config.js` fixed this — confirmed by re-inspecting the rebuilt output: `image.worker.js` dropped back to 20.73 kB with **zero** codec-specific string matches, while a new, separate `heic-decode-*.js` chunk plus the `.wasm` asset appeared, containing those markers. `app-*.js` (the main UI entry) also has zero matches.

## Decoder Behavior (Real, Executed Evidence)

Executed directly against the actual installed `@discourse/heic` package (not mocked) in `packages/core/tests/workers/heic-decode.test.ts`, using the package's documented "manual WASM initialization" path (`init(wasmModule)` with a pre-compiled `WebAssembly.Module`) — this also sidesteps a real compatibility gap in the package's own environment auto-detection (`ENVIRONMENT_IS_WEB`/`ENVIRONMENT_IS_WORKER` checks are written for classic `importScripts`-style workers; neither matches inside FileSetGo's `{ type: 'module' }` worker):

```
Real, self-generated 64×48 HEIC (see Fixture Provenance)  → SUCCESS, width=64 height=48, dataLength=12288 (exact RGBA match)
Truncated HEIC payload (real fixture, cut in half)          → clean HeicDecodeError('DECODE_FAILED'), runtime remains usable
Random garbage bytes                                        → clean HeicDecodeError('DECODE_FAILED')
Empty buffer                                                 → clean HeicDecodeError('DECODE_FAILED')
WASM asset fetch failure                                     → HeicDecodeError('HEIC_DECODER_UNAVAILABLE'), retried cleanly on next job
Decoder init failure (mocked)                                → HeicDecodeError('HEIC_INITIALIZATION_FAILED')
Cancellation before import / after init / after decode       → propagates the caller's own cancellation error at each of the 3 required checkpoints
```

**Fixture provenance:** `packages/core/tests/workers/heic-fixture.ts` embeds a 589-byte real HEIC file as base64. It was generated entirely locally: a 64×48 PNG with a deterministic procedural color ramp (no photograph, no third-party or copyrighted content) was built with a ~30-line Python script using only the standard library (`struct` + `zlib`), then converted to HEIC with macOS's built-in `sips -s format heic`. No binary asset file was committed to the repository — the fixture lives as a documented constant in a `.ts` file, consistent with the rest of the test suite's fixture style.

## Tests

```
npm run test:core
PASS — 142 tests across 13 files (up from FSG-001B's 109 tests / 11 files)

  packages/core/tests/preflight/preflight-image.test.ts               52  (+12 new HEIC: primary-item resolution,
                                                                             rotation, malformed structures, bounded
                                                                             traversal, AVIF non-misidentification)
  packages/core/tests/workers/process-image.test.ts                   25  (+10 new: HEIC -> JPEG/PNG/WebP, lazy-
                                                                             loading isolation, error mapping,
                                                                             cancellation, cleanup, dimension check)
  packages/core/tests/workers/heic-decode.test.ts                     10  (new: real decoder + adapter control flow)
  packages/core/tests/workers/process-image-heic-import-failure.test.ts 1  (new: dynamic chunk-load failure, isolated
                                                                             in its own file — vi.resetModules()
                                                                             would otherwise leak into shared tests)
  packages/core/tests/runtime/worker-client.test.ts                    8  (unchanged, FSG-001B)
  packages/core/tests/runtime/protocol.test.ts                        14  (unchanged, FSG-001B)
  packages/core/tests/processing/validate-request.test.ts              9  (unchanged, FSG-001B)
  packages/core/tests/normalize/orientation.test.ts                    8  (unchanged, FSG-001B)
  packages/core/tests/transforms/resize.test.ts                        7  (unchanged, FSG-001B)
  packages/core/tests/workers/jpeg-decode-source.test.ts                5  (unchanged, FSG-001B)
  packages/core/tests/runtime/capabilities.test.ts                     1  (unchanged — Node still reports every
                                                                             capability false, including
                                                                             heicDecoderAvailable, since workerProcessing
                                                                             gates it and Node has no Worker/OffscreenCanvas)
  packages/core/tests/runtime/job-id.test.ts                            1  (unchanged, FSG-001B)
  packages/core/tests/index.test.ts                                     1  (unchanged, FSG-001A)
```

No existing test was changed to accommodate this sprint except the HEIC block in `preflight-image.test.ts` (rewritten because the preflight semantics genuinely changed — HEIC now reaches `ready` instead of being rejected) — an explicit, reasoned change, not a coverage reduction (31→52 HEIC-adjacent assertions net).

## Build Results

```
npm run typecheck            PASS
npm run test:core            PASS — 142 tests / 13 files
npm run build                PASS (see Lazy-Loading Evidence for chunk detail)
php artisan test --compact   PASS — 2 tests, 2 assertions
git diff --check             PASS
```

No accidental FSG-002 (target-size search) implementation exists — confirmed by grepping `packages/core/src` for target-size/binary-search/quality-search patterns (zero matches, same result as FSG-001B).

## Privacy Audit

`grep -rnE "fetch\(|XMLHttpRequest|sendBeacon|axios|multipart|FormData" packages/core/src resources/js` → **exactly one match**: `heic-decode.ts`'s `fetch(wasmAssetUrl)`, which loads the HEIC decoder's own locally-bundled `.wasm` asset (a same-origin, build-emitted file — see Lazy-Loading Evidence) and carries no user data of any kind. No source image bytes, filenames, or any other content are transmitted anywhere. No upload API, remote conversion service, or third-party endpoint was introduced.

## Known Limitations

- `@discourse/heic`'s maintenance/provenance risk is real and accepted, not eliminated — see ADR-014's mitigation strategy (adapter isolation, no undocumented internal APIs, replaceable boundary).
- The `irot`-affects-decoder-output assumption (see Primary-Item Handling) is based on typical libheif default behavior and reasoning about the package's API surface, not confirmed against an actual rotated real-world HEIC sample (the self-generated `sips` fixture has no rotation applied, so it could not exercise this path). The dimension-consistency check fails safely if the assumption is ever wrong for a given file.
- `imir` (mirroring) is not modeled at all, by design (directive §7).
- The 64-bit "largesize" box form is supported only for skipping past boxes this parser doesn't need to look inside (as required to correctly walk siblings, per the real-fixture bug fix); it is not supported for boxes this parser actively parses (none of `ftyp`/`meta`/`pitm`/`iprp`/`ipco`/`ipma`/`ispe`/`irot` are realistically ever ≥4 GB).
- Native browser HEIC fast paths (e.g., Safari's partial built-in support) were explicitly out of scope for this sprint (directive §16) — every browser currently goes through the same WASM decoder.
- Comprehensive real-device/cross-browser certification remains FSG-006 scope per ADR-013; this sprint's "real decoder verification" is genuine executed evidence in Node against the actual dependency, not a substitute for that certification.

## FSG-001 Parent Acceptance Audit

Checked against `docs/directives/FSG-001.md`'s Required Outcomes and Governing Constraints:

```
@filesetgo/core package                                    ✓
Typed worker protocol                                       ✓ (runtime/protocol.ts)
Safe preflight                                               ✓
JPEG dimension inspection                                    ✓
PNG dimension inspection                                     ✓
WebP dimension inspection                                    ✓
Format signature detection                                   ✓ (now includes HEIC)
15 MB initial source limit                                   ✓
24 MP initial decoded-dimension limit                        ✓
EXIF orientation handling                                    ✓ (normalize/orientation.ts)
Proportional resize                                          ✓ (transforms/resize.ts)
JPEG, PNG, and WebP encoding                                 ✓
Controlled cancellation                                      ✓
Structured error vocabulary                                  ✓
Browser-side HEIC technical path                             ✓ (this sprint — was the sole remaining gap)
Zero source-image upload                                     ✓ (confirmed by privacy audit, this and prior sprints)
Development proof UI                                         ✓

Supported processing remains on the user's device             ✓
Heavy processing runs in a worker, one active heavy job        ✓ (MAX_ACTIVE_HEAVY_JOBS = 1, cancel-on-replace)
HEIC dependency evaluated (maintenance/security/license/       ✓ (ADR-014)
  worker-compat/memory)
SVG outside this milestone                                     ✓ (untouched)
Outputs validated before local download                        ✓ (validateOutput(), applies to HEIC-sourced output too)
Cancellation/completion release resources                      ✓ (bitmap.close(), canvas zeroing, worker termination,
                                                                    object-URL revocation — unchanged from FSG-001B,
                                                                    now proven to apply identically to the HEIC path)

Non-goals respected: target-size optimizer, Logo Pack, favicon generator, presets, ZIP packaging,
PDF processing, accounts, payments, public API, Keryon integration, cross-promotion — confirmed absent
by grep audit (zero matches) and by design (no such code was written).
```

## FSG-001 Closure Decision

**Path B — FSG-001 Closeout. Approved and CLOSED.** All parent acceptance criteria above are satisfied under current governance. The item that kept FSG-001 open through FSG-001B — HEIC/HEIF decode — is implemented, tested with real executed evidence against the actual dependency, and verified not to compromise the standard JPEG/PNG/WebP path (lazy-loading confirmed via actual build inspection). No genuine parent requirement remained missing. FSG-001A, FSG-001B, and FSG-001C are all CLOSED.

This closure decision does **not** depend on physical browser/device certification, per ADR-013 — that remains FSG-006's responsibility and was not claimed here.

## Next Milestone

**FSG-002 — Target File Size Engine & Guardrails is NEXT but has not begun.**

## Commit Reference

This report is included in the FSG-001C / FSG-001 closeout commit:

`feat(core): add HEIC decode support`

The authoritative commit SHA is recorded in Git history and in the post-commit closeout response.
