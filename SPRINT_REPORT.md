# FileSetGo Sprint Report

## Milestone

FSG-001B — Worker Runtime & Local Decode Foundation

## Status

**FSG-001B: Complete.** Implementation is done and verified by the full automated baseline (typecheck, unit/integration tests, production build, Laravel tests, `git diff --check`). Manually operated physical browser/device verification was not performed this sprint (see "Runtime and Browser Verification" below) — per the verification-policy amendment adopted this sprint (`docs/governance/DECISIONS.md` ADR-013, `docs/testing/TESTING.md` "Verification Responsibility"), that is not a closure blocker and does not constitute a compatibility certification; comprehensive cross-browser/device certification remains assigned to FSG-006.

**FSG-001 (parent milestone): not yet closed.** HEIC/HEIF decode remains outstanding (identification is done, decode is not — see "HEIC Evaluation"), which is a genuine remaining FSG-001 commitment independent of the verification-policy question. Per `docs/directives/FSG-001B.md` §89, this places FSG-001 on **Path A — FSG-001C required**.

## Branch

`fsg-001-core-runtime`

## HEAD

`de275f0ab847716159b72a44c91dbafa7676454b` (FSG-001A — this sprint's work is implemented on top of this commit and has not been committed yet; see Commit Reference).

## Objective

Prove that a file which passes FSG-001A's preflight and safety gate can be processed entirely inside the browser through a dedicated worker runtime: decode → normalize orientation → bounded resize → encode → validate → local `Blob`, with typed job correlation, cancellation, stale-result protection, and explicit resource cleanup — without any source or generated image leaving the device.

## Work Completed

- Typed worker message protocol (`PROCESS_IMAGE` / `CANCEL_JOB` commands; `JOB_ACCEPTED` / `JOB_PROGRESS` / `JOB_COMPLETE` / `JOB_FAILED` / `JOB_CANCELLED` events), with exactly one mutually-exclusive terminal event per job.
- A worker client (`ImageProcessingRuntime`) that owns job identity, the mandatory preflight gate, cancellation, stale-result protection, and worker lifecycle (including recreating a fresh worker after any fatal failure).
- A worker-side pipeline (`processImageInWorker`) that decodes via `createImageBitmap`, strips EXIF before decode to avoid double-orientation, normalizes orientation, computes a bounded resize plan, renders through `OffscreenCanvas`, encodes to JPEG/PNG/WebP, and re-validates the encoded output through the real `preflightImage()` gate before returning it.
- Runtime capability detection (`getRuntimeCapabilities`) using feature detection only (no user-agent sniffing).
- A minimal engineering proof UI (`resources/views/welcome.blade.php` + `resources/js/app.ts`) exercising the full public API: file selection, preflight summary, resize/format/quality controls, cancel button, result preview, download, and a runtime-capabilities panel.
- HEIC/HEIF container identification added to preflight (see HEIC Evaluation below) — a new capability beyond FSG-001A, done without touching the JPEG/PNG/WebP paths or their 31 existing tests.
- 77 new automated tests (32 → 109) covering the worker protocol, worker client, decode/encode/cancellation logic, orientation math, resize math, request validation, and HEIC identification.

## Files Changed

Modified:
- `package.json` (root typecheck now also covers `tsconfig.json`)
- `packages/core/src/index.ts` (new public exports)
- `packages/core/src/workers/image.worker.ts` (stub → full typed worker)
- `packages/core/src/preflight/contracts.ts`, `detect-format.ts`, `preflight-image.ts` (HEIC identification)
- `packages/core/tests/preflight/fixtures.ts`, `preflight-image.test.ts` (HEIC fixtures/tests)
- `resources/css/app.css`, `resources/views/welcome.blade.php`, `vite.config.js` (proof UI)
- `resources/js/app.js` → replaced by `resources/js/app.ts`
- `AGENTS.md` (pointer to the new verification-responsibility policy)
- `docs/governance/DECISIONS.md` (new ADR-013 — agent-owned routine verification; FSG-006 owns compatibility certification)
- `docs/testing/TESTING.md` (new "Verification Responsibility" policy section; "Actual Browser and Device Evidence" rewritten as "Runtime and Browser Evidence")

New:
- `packages/core/src/runtime/{protocol,worker-client,capabilities,job-id,constants}.ts`
- `packages/core/src/workers/{process-image,jpeg-decode-source}.ts`
- `packages/core/src/normalize/orientation.ts`
- `packages/core/src/transforms/resize.ts`
- `packages/core/src/processing/{contracts,errors,validate-request}.ts`
- `packages/core/src/preflight/formats/heic.ts`
- `packages/core/tests/runtime/*.ts`, `packages/core/tests/workers/*.ts`, `packages/core/tests/normalize/*.ts`, `packages/core/tests/transforms/*.ts`, `packages/core/tests/processing/*.ts`
- `docs/directives/FSG-001B.md` (including its own verification-policy amendment note and §70/71/87/89 edits)

## Public Core API

```ts
import {
  processImage,
  cancelImageJob,
  getRuntimeCapabilities,
  MAX_ACTIVE_HEAVY_JOBS,
  type ProcessImageOptions,
  type ProcessImageRequest,
  type ProcessedImageResult,
  type FileSetGoRuntimeCapabilities,
  type FileSetGoProcessingError,
} from '@filesetgo/core';

const job = processImage(file, {
  resize: { maxWidth: 1200, maxHeight: 1200, allowUpscale: false },
  output: { format: 'webp', quality: 0.85 },
  onProgress: ({ stage }) => { /* ... */ },
});

const outcome = await job.result; // 'complete' | 'failed' | 'cancelled'
job.cancel();
```

`processImage()` internally calls `preflightImage()` (Approach A from the directive) — there is no public path that reaches the worker without passing the safety gate.

## Worker Architecture

```
HOST/UI → @filesetgo/core (processImage/cancelImageJob/getRuntimeCapabilities)
        → ImageProcessingRuntime (job registry, preflight gate, cancellation, stale-result protection)
        → image.worker.ts (typed protocol)
        → processImageInWorker (decode → normalize → resize → encode → validate → cleanup)
```

Concurrency: `MAX_ACTIVE_HEAVY_JOBS = 1`, implemented as **replace/cancel** (directive §8 Option B): starting a new job cancels and hard-terminates any active job's worker before starting the next. Each job gets a freshly constructed `Worker` instance (no shared/reused worker across jobs), which is also the worker-recovery strategy (directive §23/§40): a crashed or terminated worker never affects the next job because the next job never touches it.

## Safety-Gate Integration

`ImageProcessingRuntime.start()` always calls `preflightImage()` before any worker is created. `FILE_TOO_LARGE`, `DIMENSIONS_TOO_LARGE`, `UNSUPPORTED_FORMAT`, `INVALID_SIGNATURE`, `CORRUPT_IMAGE`, `ANIMATED_IMAGE_UNSUPPORTED`, and (new this sprint) `HEIC_DECODER_UNAVAILABLE` all stop processing before a worker is ever created — verified in `worker-client.test.ts` ("stops a preflight rejection before worker creation") and the new `process-image.test.ts` safety tests. The worker additionally re-checks that the requested output dimensions do not exceed the 24 MP decoded-pixel limit before allocating a bitmap.

## Runtime Capability Detection

`getRuntimeCapabilities()` feature-detects `Worker`, `OffscreenCanvas`, `createImageBitmap`, and per-format encode support (by round-tripping a 1×1 canvas through `convertToBlob()` and back through `preflightImage()` — not just checking the API's existence). No user-agent parsing is used. `heicDecoderAvailable` is always reported `false` this sprint (see HEIC Evaluation) rather than omitted, so the proof UI and any consumer can display it truthfully instead of it looking "unchecked."

## Decode Capabilities

JPEG, PNG, and WebP are decoded via `createImageBitmap()` inside the worker, only after the FSG-001A preflight has already validated the container and read its dimensions. For JPEG specifically, `createOrientationNeutralJpeg()` strips EXIF APP1 segments from the byte stream *before* decode (rather than relying on `imageOrientation: 'auto'`), so the browser decoder never auto-rotates — orientation is applied exactly once, by our own canvas transform. The worker also verifies the decoded bitmap's dimensions match the preflight-reported dimensions, and returns `DECODE_FAILED` (not a raw browser exception) if decode throws or the dimensions disagree.

## EXIF Normalization

`normalize/orientation.ts` implements the full EXIF orientation 1–8 transform matrix (not just 1/3/6/8) and the corresponding normalized-dimension swap for orientations 5–8. `orientation.test.ts` covers all 8 values.

## Resize Capabilities

`transforms/resize.ts` computes a proportional resize plan from `{ maxWidth, maxHeight, allowUpscale }`, defaulting to no upscale and preserving aspect ratio. `resize.test.ts` covers landscape, portrait, no-upscale, and single-bound-constraint cases. The plan is computed from *normalized* (post-orientation) dimensions, and the worker's safety check rejects any resize request whose computed output area exceeds 24,000,000 pixels before allocating a canvas.

## Encoding Capabilities

JPEG, PNG, and WebP encoding via `OffscreenCanvas.convertToBlob()`. Quality is a direct pass-through value (no PNG quality option is sent, matching directive §36) — there is no target-size search loop anywhere in this sprint's code. Output is verified three ways before being returned: the blob's `type` must match the requested MIME type; the blob must be non-empty and its declared size must match `blob.size`; and the encoded bytes are re-run through the real `preflightImage()` to confirm the actual format and pixel dimensions match what was requested — mislabeled or dimension-mismatched output is rejected as `OUTPUT_VALIDATION_FAILED`, not silently returned.

## Cancellation & Stale-Result Protection

Cancellation is cooperative first (the worker checks a cancelled-job set between every stage) with hard termination as the backstop: `cancel()` posts `CANCEL_JOB` to the worker *and* immediately terminates it, so cancellation is never blocked on an uninterruptible decode. Stale-result protection is enforced at two levels: the runtime only starts one job at a time (replacing the prior one), and every worker event is checked against `job.settled` and the current active job ID before being applied — a message for an abandoned or superseded job is silently dropped. `worker-client.test.ts` includes dedicated tests for hard cancellation, job replacement with a late stale result, and ignoring a terminal event carrying a different job ID.

## Resource Cleanup

- `ImageBitmap.close()` and zeroing the canvas dimensions run in a `finally` block in `processImageInWorker`, so cleanup happens on success, decode/encode failure, *and* cancellation (verified directly in `process-image.test.ts`'s cancellation test, which asserts the bitmap was closed even though the job never completed).
- `finish()` in the worker client always clears the worker's message handlers and calls `terminate()`, and clears the active-job slot, regardless of outcome.
- The proof UI revokes its result object URL on every new selection, on `pagehide`, and before rendering a new result.

## HEIC Evaluation

Per the directive (§45–50) and the explicit sprint scope ("preflight-only, no dependency without approval"), this sprint delivers **container identification only**, not decode:

- `preflight/formats/heic.ts` parses the ISOBMFF box structure (`ftyp` → `meta` → `iprp` → `ipco` → `ispe`) to identify HEIC/HEIF by major brand (`heic`, `heix`, `heim`, `heis`, `hevc`, `hevx`, `hevm`, `hevs`, `mif1`, `msf1`) and read the primary image's dimensions from the `ispe` box, bounded and defensive in the same style as the existing JPEG/PNG/WebP parsers (checked offsets/lengths, a box-count bound, a byte bound). AVIF (`avif`/`avis`) is explicitly excluded from HEIC identification so it is not misreported.
- A new preflight error code, `HEIC_DECODER_UNAVAILABLE`, is returned once identification succeeds — the file is *not* silently passed through to the worker, and its inspected format/dimensions are preserved in the rejected result (same pattern as the existing animated-WebP rejection).
- `getRuntimeCapabilities()` reports `heicDecoderAvailable: false` explicitly, and the proof UI shows this in its capabilities panel with an explanatory note.
- **Known simplification, documented in code**: dimensions are read from the *first* `ispe` box under `ipco` rather than resolving full item-property association (`ipma`/`pitm`). This is correct for the common single-primary-image case (verified against a real macOS HEIC file, see Browser/Device Verification) but could misreport dimensions for a multi-image HEIC container whose first property block isn't the primary image. Full resolution is deferred to the decoder-integration sprint.

**Candidates evaluated:** `heic2any`, `libheif-js`, `heic-to`.

```
Candidates evaluated: heic2any, libheif-js, heic-to
Selected candidate:   heic-to (recommended; not installed this sprint — requires approval)
Selected version:     1.5.2 (npm, as of this evaluation)
License:              LGPL-3.0
Lazy loaded:           Architecturally required either way; heic-to supports a dedicated
                       dynamic-import-friendly entry point (`heic-to/next`)
Worker compatible:    Yes — explicit Web Worker entry point (`heic-to/next`)
Bundle impact:        Not precisely measured this sprint (bundlephobia was unreachable from
                       this environment); wraps libheif 1.22.2 compiled to WebAssembly, so
                       expect a WASM payload of several hundred KB to low single-digit MB —
                       must be lazy-loaded regardless, standard JPEG/PNG/WebP users must never
                       pay this cost
Known limitations:    LGPL-3.0 is a copyleft license and needs explicit sign-off before
                       adoption, even though it's designed for dynamic/shared linking; malformed-
                       input behavior, cancellation behavior, and real memory footprint were not
                       empirically tested this sprint (no dependency was installed); Safari has
                       partial native HEIC decode support that could be feature-detected ahead of
                       loading any JS/WASM decoder, which is worth designing for in the follow-up.
```

`heic2any` (already flagged as not to be blindly chosen per `docs/audits/AUDIT-ADOPTION-001.md`) is confirmed **not recommended**: its last release was 3+ years ago (v0.0.4, no 2025/2026 activity) despite high download counts, and it has historically had DOM-coupling problems that fight worker compatibility. `libheif-js` is actively maintained (LGPL-3.0, June 2025 release) and worker-compatible, but is a lower-level API requiring more integration work than `heic-to`'s convenient `heicTo()`/`isHeic()` surface, which maps directly onto our existing Blob-based pipeline.

**Outcome: B — technical decision completed, implementation deferred.** Full HEIC decode remains outstanding FSG-001 scope and is carried forward explicitly (see Next Sprint / FSG-001 Remaining Work).

## Tests & Verification

```
npm run typecheck
PASS

npm run test:core
PASS — 109 tests across 11 files (up from the FSG-001A baseline of 32 tests / 2 files)
  packages/core/tests/preflight/preflight-image.test.ts   40  (31 FSG-001A + 9 new HEIC)
  packages/core/tests/workers/process-image.test.ts       15  (new)
  packages/core/tests/runtime/worker-client.test.ts         8  (new)
  packages/core/tests/runtime/protocol.test.ts             14  (new)
  packages/core/tests/processing/validate-request.test.ts   9  (new)
  packages/core/tests/normalize/orientation.test.ts         8  (new)
  packages/core/tests/transforms/resize.test.ts             7  (new)
  packages/core/tests/workers/jpeg-decode-source.test.ts    5  (new)
  packages/core/tests/runtime/capabilities.test.ts          1  (new)
  packages/core/tests/runtime/job-id.test.ts                1  (new)
  packages/core/tests/index.test.ts                         1  (FSG-001A)

npm run build
PASS

php artisan test --compact
PASS — 2 tests, 2 assertions

git diff --check
PASS (checked against the full working tree, including new untracked files)
```

`process-image.test.ts` is new this sprint and exercises `processImageInWorker` directly against fake `OffscreenCanvas`/`createImageBitmap` globals (Node's test environment has neither), using real, parseable encoded bytes so the pipeline's own re-validation (a genuine `preflightImage()` call) proves out rather than being mocked away. It covers: successful JPEG/PNG/WebP round-trips, no-upscale, decode failure (corrupt payload and dimension-mismatch), `RUNTIME_UNSUPPORTED` with no `OffscreenCanvas`, encoder throwing, mislabeled encoder output, empty/mismatched encoder output, the 24 MP output-dimension safety gate, and cancellation both before and after decode (with an explicit assertion that the decoded bitmap is still closed on the cancelled path).

## Runtime and Browser Verification

**Automated verification (this environment): complete and passing.** `packages/core/tests/workers/process-image.test.ts` exercises the real worker-side decode → normalize → resize → encode → validate logic directly (with `OffscreenCanvas`/`createImageBitmap` fakes standing in for browser APIs Node's test runtime doesn't have, but real, parseable encoded bytes so the pipeline's own re-validation via a genuine `preflightImage()` call actually runs). `worker-client.test.ts` and `protocol.test.ts` exercise the full job lifecycle, cancellation, stale-result protection, and worker-crash recovery against a fake worker transport. Static review of the runtime path (`packages/core/src`, `resources/js`) confirms no `fetch`, `XMLHttpRequest`, `sendBeacon`, `axios`, multipart, or `FormData` usage anywhere in the processing pipeline.

**Automated browser tooling: attempted, not available in this environment.** Two independent avenues were tried:

1. The Claude in Chrome browser extension would not connect (`tabs_context_mcp` returned "Browser extension is not connected") across six attempts, including after the user fully quit and restarted Chrome with the extension installed and the correct account logged in.
2. As a fallback, an isolated `npx playwright` install (in a scratch directory, not added to the project's dependencies) was attempted to drive a real Chromium instance. The `playwright` npm package itself installed, but the environment's network is slow (a plain HTTPS request to the npm registry took the full 10-second timeout), and the browser-binary download was abandoned as impractical on this connection.

**Manually operated physical browser/device session: not performed.** Per `docs/governance/DECISIONS.md` ADR-013 and `docs/testing/TESTING.md` ("Verification Responsibility," adopted this sprint), this is not requested of the user as a closure requirement and does not block FSG-001B. It is recorded honestly rather than assumed to have passed, and the broader cross-browser/device compatibility matrix remains FSG-006's responsibility:

```
Automated (this environment):
Vitest unit/integration suite — PASS (109 tests / 11 files)
Browser automation (Playwright / Claude in Chrome) — not available this sprint

Not certified (deferred to FSG-006, not a closure blocker):
Chrome desktop, Safari desktop, Firefox desktop, Edge,
iOS Safari, Android Chrome
```

A dev server (`composer run dev`, Laravel on `http://127.0.0.1:8002/`, Vite HMR) and a full set of real test fixtures (JPEG/PNG/WebP at matched dimensions, a 12 MP JPEG, a 24 MP-boundary JPEG, a 36 MP oversized JPEG, a real 1200×900 HEIC, and a real 6016×6016 HEIC generated from an actual macOS system wallpaper) were prepared during this sprint; they remain available in the scratch environment if browser automation tooling becomes usable in a future sprint, but per the amended policy their use is not required to close this one.

## Network / Privacy Verification

**Static audit: complete.** `grep -rnE "fetch\(|XMLHttpRequest|sendBeacon|axios|multipart|FormData" packages/core/src resources/js` returns zero matches. `processImage()`'s entire call graph (`worker-client.ts` → `image.worker.ts` → `process-image.ts`) contains no network API of any kind — all data flow is `postMessage`/`Blob`/`OffscreenCanvas` between the main thread and the worker. The PHP application layer was also audited: `grep -rniE "imagecreate|GD\b|Intervention|imagick" app/` returns zero matches, and `routes/web.php` exposes only the `/` welcome route — no upload/conversion endpoint exists.

**Real-traffic capture (DevTools Network tab against an actual running session): not performed**, for the same reason automated browser tooling was unavailable this sprint. Per the amended verification policy this is not a closure blocker; it is recorded honestly rather than assumed.

## Security Verification

- Preflight remains the mandatory gate ahead of every worker dispatch (see Safety-Gate Integration); no code path reaches `createImageBitmap()` without it.
- Decode and encode failures are caught and converted to structured errors (`DECODE_FAILED`, `ENCODE_FAILED`) rather than propagating raw browser exceptions or leaving the runtime in a broken state — verified in both `process-image.test.ts` (direct pipeline) and `worker-client.test.ts` (worker crash recovery).
- The new HEIC box parser (`formats/heic.ts`) follows the same bounded-parsing discipline as the existing JPEG/PNG/WebP parsers: every box read is offset/length-checked against its container's bounds, a box-count bound prevents unbounded scanning of a malicious/malformed container, and all failure paths return the existing structured `CorruptImage`/`InvalidSignature` errors rather than throwing unbounded runtime exceptions. Tests cover a truncated `ftyp` box and a container missing its `ispe` property box.
- No new network, upload, or third-party conversion code was introduced anywhere in this sprint's diff (confirmed by static grep audit, see Network / Privacy Verification).
- No accidental target-size/quality-search optimization exists anywhere in `packages/core/src` (grepped for target-size/binary-search/quality-search patterns — zero matches); JPEG/WebP quality is a single direct pass-through value, matching the FSG-002 scope boundary.
- No server-side image processing exists in the Laravel application layer (`app/` has no GD/Imagick/Intervention usage; `routes/web.php` exposes only the `/` welcome route).
- No Keryon-specific coupling exists in `@filesetgo/core` (grepped for Keryon/church/membership/tenant references — zero matches).

## Performance Observations

Not measured this sprint — collecting `decode_ms`/`resize_ms`/`encode_ms` timing (directive §73) requires a running browser session, which was unavailable (see Runtime and Browser Verification). `resources/js/app.ts` already reports total elapsed time via `performance.now()` around each job for whenever a browser session — automated or otherwise — does become available.

## Known Limitations

- HEIC/HEIF is identified but not decoded; `HEIC_DECODER_UNAVAILABLE` is returned for every HEIC input. This is the primary reason FSG-001 (the parent milestone) is not being closed out this sprint.
- HEIC dimension identification uses the first `ispe` box under `ipco` rather than full `ipma`/`pitm` primary-item resolution (documented in `formats/heic.ts`).
- AVIF remains entirely undetected (returns `UNSUPPORTED_FORMAT`), consistent with `docs/architecture/FORMAT-SUPPORT.md` treating AVIF as a separate, conditional, later decision — not addressed this sprint.
- Automated browser tooling (Playwright, Claude in Chrome) was unavailable in this environment; per the verification-policy amendment adopted this sprint, this is recorded as a limitation, not a blocker, and the broader real-device/cross-browser certification is FSG-006's responsibility.
- No decoded-memory or repeated-processing measurements were collected in a running browser.

## Deferred Work

- HEIC/HEIF decode integration (candidate selected: `heic-to`, pending dependency approval).
- Automated browser-tooling verification (Playwright/Claude in Chrome), if/when that tooling becomes usable in the development environment.
- Performance and memory measurements from an actual running session.
- Comprehensive real-device and cross-browser compatibility certification — explicitly FSG-006 scope, not earlier-milestone scope.
- Target-size compression, presets, packaging, and all other FSG-002+ scope (unchanged — out of scope by design).

## Next Sprint

Per `docs/directives/FSG-001B.md` §88–89 (as amended by ADR-013), FSG-001B itself is complete, but FSG-001 (the parent milestone) is **not** being closed out — the outstanding commitment is HEIC decode, not browser-verification policy. **FSG-001C is required**, and should:

1. Seek explicit approval for the `heic-to` dependency (or reconsider given approval constraints) and wire real HEIC decode into the worker pipeline behind the existing `HEIC_DECODER_UNAVAILABLE` gate.
2. Use automated browser tooling (Playwright, Claude in Chrome, or equivalent) when/if it becomes usable in the development environment, to gather real runtime evidence beyond this sprint's mocked-API unit tests — not as a closure requirement, but because it's the strongest verification actually available when it works.
3. Collect the performance/memory observations this sprint could not.
4. Only then evaluate whether FSG-001's full definition of done is satisfied and the milestone can formally close. Comprehensive cross-browser/device certification itself remains out of scope for FSG-001C — that is FSG-006.

## Commit Reference

Not yet committed. Per this session's operating rules, commits are made only on explicit instruction — implementation, tests, and this report are complete and verified in the working tree, awaiting the user's go-ahead to stage and commit.
