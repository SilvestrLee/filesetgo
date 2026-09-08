# FileSetGo Testing Strategy

## Principles

Tests cover observable behavior, safety boundaries, protocol contracts, and failure modes. Passing automated tests must not be reported as proof of browser or device behavior that was not actually exercised.

## Verification Responsibility

Routine verification is the coding agent's responsibility, not the user's. Agents must not ask a human to manually open DevTools, inspect network requests, click through an engineering proof interface, run browser test cases, verify image outputs, test cancellation, inspect console errors, or perform other routine QA that the agent can reasonably perform itself.

For each sprint, the agent runs the strongest verification actually available in its environment, which may include: unit and integration tests; TypeScript checking; Laravel/PHPUnit tests; production builds; lint/static analysis; automated browser tests or browser automation (Playwright, Claude in Chrome, or equivalent) when that tooling is usable; worker-runtime tests; network interception/assertions inside automated browser tests; output-signature validation; failure-path tests; and resource-lifecycle tests.

Agents must never claim verification — automated or manual — that did not actually run.

Inability to obtain a manually operated physical browser/device session does not, by itself, block a sprint from closing. If browser automation is unavailable because of environment or tooling constraints, the agent records that limitation honestly and defers the broader runtime-compatibility proof to FSG-006 rather than asking the user to perform the test manually.

Comprehensive real-device and cross-browser compatibility certification — iOS Safari, Android Chrome, Safari desktop, Chrome, Firefox, Edge, memory-pressure testing, repeated processing, large-image behavior under real runtime conditions — is the responsibility of **FSG-006 — Hardening, Mobile QA & Compatibility**, not of earlier milestones. Earlier milestones should still use browser automation wherever it is available in the environment, but a missing physical-device/cross-browser certification is not a closure blocker before FSG-006.

See `docs/governance/DECISIONS.md` ADR-013.

## Unit Tests

Unit coverage includes:

- magic-byte detection;
- JPEG header parsing;
- PNG header parsing;
- WebP header parsing;
- safety thresholds;
- orientation metadata;
- resize math;
- structured errors; and
- cancellation utilities.

Boundary tests must cover values immediately below, exactly at, and immediately above each safety threshold. Malformed and truncated header fixtures must prove bounded failure rather than only valid parsing.

## Core Package

`@filesetgo/core` uses Vitest.

Core-package tests cover public contracts and pure processing logic without depending on Laravel. Worker protocol tests cover job correlation, progress, one terminal event, controlled cancellation, stale-message handling, and structured failures.

Fixtures must be minimal, reviewable, and safe to commit. Tests must not call external conversion services or upload source images.

FSG-005A's multi-output/archive tests (`packages/core/tests/workers/process-image-set.test.ts`, `tests/archive/`, `tests/processing/validate-image-set-request.test.ts`) follow the same pattern: fake `OffscreenCanvas`/`createImageBitmap` browser APIs, real parseable image fixtures padded to controlled byte sizes (`encodeAtSize()`), and a mocked `heic-decode` module for the HEIC-decoded-once assertion (the real HEIC codec path is exercised separately in `heic-decode.test.ts`). ZIP integrity is verified by round-tripping `createZipArchive()`'s output through `fflate`'s own `unzipSync()` — proving exact entries/bytes/order, not merely that a Blob was returned.

FSG-005B adds `packages/core/tests/transforms/contain.test.ts` (numeric geometry assertions against `calculateContainPlan()` — centering, aspect-ratio preservation, upscale clamping — no screenshots) and `packages/core/tests/icons/ico.test.ts` (round-trips real PNG fixtures through `createIco()`/`validateIcoContainer()`, including deliberately corrupted directories/signatures/dimension mismatches). `process-image-set.test.ts` gained dedicated sections for the `'contain'` and `'ico'` output kinds and a mixed raster+contain+ico "logo pack shape" test proving one decode still serves all three. The Logo Pack product layer (`resources/js/logo-pack/tests/`) follows the same DOM-free pattern as `resources/js/presets/tests/` (ADR-016): `spec.test.ts` asserts the exact seven-asset composition and ordering, `suitability.test.ts` tests the geometry/resolution/transparency thresholds numerically at their boundaries, and `logo-pack-controller.test.ts` uses the same fake-core-client, real-`QuickFitWorkflow` pattern `guided-fit-controller.test.ts` established.

FSG-005C adds `packages/core/tests/transforms/alpha-inspection.test.ts` and `packages/core/tests/transforms/background-removal.test.ts` — the latter proves *actual pixel behavior* against synthetic `RgbaRaster` fixtures with known expected structure (`tests/transforms/fixtures/raster-fixtures.ts`: flat backgrounds, disconnected same-coloured foreground, thin strokes, anti-aliased edges, gradients, drop shadows), never merely a returned status flag — the required 15-case fixture matrix (directive §41) is deliberately synthetic rather than a set of real image files, per the directive's own "prefer synthetic fixtures with known expected pixel structure" guidance; graded PASS/NEEDS REVIEW/FAIL results are recorded in `SPRINT_REPORT.md`. `packages/core/tests/workers/process-transparent-master.test.ts` exercises the full worker pipeline (decode → bound → inspect → conditional removal → encode → post-encode re-verify → classify) end to end with a fake canvas/bitmap ecosystem that round-trips *real* pixel data (a stricter fake than `process-image.test.ts` needs, since this pipeline's correctness genuinely depends on pixel content) — including the difficult-case classification tests (gradient background, near-background-coloured border-touching foreground) that must land on `needs-review`/`failed`, never a false `verified`. `runtime/protocol.test.ts` and `runtime/worker-client.test.ts` gained the same positive/negative/shared-job-slot coverage for the new `'transparent-master'` job kind that FSG-005A/FSG-005B established for `processImageSet()` — including a regression case for the ADR-019 defect class (a dedicated validator, not a shape reused from a different job kind). The Logo Pack product layer's `logo-pack-controller.test.ts` covers the explicit background-mode choice, the two-stage Transparent-mode pipeline (preview preparation → preview-ready/needs-review/failed → packaging), strength changes regenerating the preview, and source-replacement invalidating mode/strength/preview together (directive §6).

**Transparency-readiness correction (Product Office review, post-implementation):** `packages/core/tests/transforms/background-transparency.test.ts` proves `assessBackgroundTransparency()` against the exact required regression fixtures — a transparent canvas wrapping an opaque, un-removed background (`createTransparentPaddingAroundOpaqueBackground()`, tested across several rectangle/artwork proportions), incidental alpha (a single stray pixel; a tiny corner), and a genuine transparent-foreground source — asserting the real computed `boundaryConnectedTransparentRatio`/`residualForegroundRatio` evidence, not merely a status flag. `process-transparent-master.test.ts` gained matching end-to-end worker-pipeline regression cases (the same transparent-padding fixture must produce `removalApplied: true`; a single incidental transparent pixel must not bypass removal) proving the decision is wired through the real pipeline, not only the standalone primitive. `background-removal.test.ts` proves `removeConnectedBackground()`'s existing-alpha-aware extension changes nothing for a fully-opaque source (all pre-existing cases pass unmodified) while correctly continuing removal through a source that already carries some real transparency. `tests/browser/specs/logo-pack.spec.ts` adds a real, valid RGBA PNG fixture (`transparent-padding-regression.png`, genuine alpha channel, not synthetic in-memory data) proving the full browser pipeline continues through preparation rather than falsely accepting the source as already transparent, plus a black-background JPEG fixture (`flat-logo-black.jpg`) alongside the existing white-background one, since a single-colour case could not otherwise rule out a colour-specific defect.

## FSG-006R Regression Evidence

FSG-006R adds reference-ownership tests for target-size probe metadata, selected and unreachable results, and earlier-tier candidates; a deterministic non-yielding-worker cancellation test; a `0xFFFFFFFF` HEIC spatial-extents regression; exact flat-archive traversal cases rejected before worker creation; and a measured low-alpha policy matrix covering three foreground/background pairs, four edge/stroke shapes, five 8-bit alpha samples, and light/dark compositing.

Browser coverage adds 10 consecutive large target-size jobs, deterministic HEIC cancellation/recovery, CSP/header assertions, request method/body inspection across every processing mode, and attached checkerboard/light/dark preview evidence. These tests prove reference ownership and continued runtime operation, not garbage-collector timing or physical-iOS memory behavior.

## Public UI Layer (`resources/js/quick-fit/`, `resources/js/presets/`)

The Quick Fit workflow (FSG-003) uses Vitest, run separately from the core package via `npm run test:ui`. See `docs/governance/DECISIONS.md` ADR-016 for the architectural split this relies on: pure logic modules (`state.ts`, `format-bytes.ts`, `filename.ts`, `errors.ts`, `request-plan.ts`, `summary.ts`, `capabilities.ts`, `validate-form.ts`) are directly unit-tested; the DOM-free `workflow.ts` orchestration layer is tested with a constructor-injected fake `@filesetgo/core` client (no module mocking, no DOM emulation); `controller.ts` is the only module that touches `document` and is left to build/typecheck/browser-automation verification rather than unit tests, since introducing `jsdom` purely to unit-test DOM rendering was deliberately avoided.

FSG-007's appearance preference follows the same split. `resources/js/theme/preference.ts` is pure and unit-tested for accepted values, system resolution, and durable cookie construction; Playwright covers the DOM controller, keyboard operation, immediate switching, OS preference, local-storage persistence, cookie-backed reload/navigation persistence, and explicit-theme precedence over a changed OS preference. Laravel feature tests cover sanitized server rendering plus product-family current/coming-soon/live link behavior and the success-state placement of contextual discovery.

FSG-004's preset system (`resources/js/presets/`) follows the same pattern: `catalog.ts`/`validate-preset.ts`/`registry.ts`/`compiler.ts`/`already-ready.ts`/`quick-fit-mapping.ts` are pure/DOM-free and directly unit-tested; `GuidedFitController` composes the unmodified `QuickFitWorkflow` the same way and is tested identically (a fake core client, no DOM). `npm run test:ui` now runs both `resources/js/quick-fit/tests` and `resources/js/presets/tests`.

## Laravel

Laravel uses the existing Laravel PHPUnit test stack. Laravel tests cover routes, pages, product integration, and other Laravel-owned behavior. They do not duplicate browser raster-processing algorithm tests from `@filesetgo/core`.

## Browser and End-to-end Testing

FSG-006 introduced `@playwright/test` (dev-only, exact-pinned at `1.55.1` — see `docs/governance/DECISIONS.md` ADR-019) as the permanent browser-test framework. `tests/browser/specs/` runs against the real, built, locally served application (`php artisan serve` over the production Vite build), never a synthetic reimplementation of controller logic. `npm run test:browser` runs it (`playwright test`); `npm run typecheck:browser` type-checks the suite separately from the main `npm run typecheck` (a dedicated `tsconfig.browser-tests.json`, mirroring the `tsconfig.ui-tests.json` split from ADR-016).

Engine coverage: `chromium` and `firefox` projects run the full functional certification suite (bootstrap, Quick Fit, Guided Fit, Website Logo Pack, HEIC, cancellation, stale-result/rapid-replacement, reset, invalid-file recovery, accessibility/keyboard, network/privacy boundary, lazy-load runtime verification). Four Chromium-based mobile-viewport projects (`mobile-narrow-320`, `mobile-iphone-class`, `mobile-android-class`, `mobile-tablet-class`) run a dedicated responsive-layout suite (`mobile-viewport.spec.ts`) instead — no horizontal overflow, touch-target sizing, stacking, footer placement, orientation transitions.

**WebKit is not part of this suite in this environment** — ADR-019 records the exact technical reason (a frozen macOS-12 WebKit build incompatible with any non-CVE-affected Playwright driver) and the Product Office decision to accept Chromium+Firefox certification rather than pair a CVE-affected Playwright version with a multi-year-old WebKit snapshot. No claim of WebKit, Safari, or physical-device testing appears anywhere in this codebase's reports unless actually performed.

Fixtures (`tests/browser/fixtures/`) are small, self-generated, real, decodable images (PNG/JPEG/WebP/HEIC, plus deliberately invalid/corrupted/oversized cases) — see `tests/browser/fixtures/README.md` for exact provenance. No fixture is downloaded from a network source.

`tests/browser/specs/design-preview.spec.ts` is an on-demand Chromium capture owned by FSG-007's visual gate. It is excluded from the ordinary browser matrix unless `FSG_CAPTURE_DESIGN=1` is set, then produces the governed desktop/mobile/navigation/source/success/Logo Pack/transparent-preview/theme inventory in `tests/browser/.artifacts/fsg-007d/`. It drives real deterministic fixtures and real workers; it does not synthesize ready states.

FSG-005C extends `logo-pack.spec.ts` with the explicit background-mode choice (no mode preselected; Original vs. Transparent), the full Transparent-mode preview flow (preview appears and is mechanically verified for a real flat-background fixture, all three preview backgrounds render the same Blob, strength changes regenerate the preview, a FAILED/not-ready preview blocks packaging), a real JPEG-source background-removal case (`flat-logo.jpg` — the exact scenario FSG-005C's motivating defect report was about), and mode-aware output filenames/ZIP names. It also corrects the historical FSG-006 JPEG-guidance assertion, which had asserted the pre-FSG-005C claim that FileSetGo "won't remove the existing background automatically" — that claim is no longer true and the test now asserts the corrected, truthful copy instead (see `docs/governance/DECISIONS.md` ADR-020). Every other spec that drives a Logo Pack job to completion (`accessibility.spec.ts`, `cancellation.spec.ts`, `lazy-load.spec.ts`, `network-privacy.spec.ts`, `stale-replacement.spec.ts`, `stress.spec.ts`, `mobile-viewport.spec.ts`) was updated to select a background mode (Original, the lowest-friction single-stage path) before invoking `#logo-pack-create-button`, since that click is now correctly gated on an explicit mode choice. Two new fixtures, `flat-logo.png`/`flat-logo.jpg` (flat white background, solid mark, white interior counter), were added specifically because the existing gradient-ramp fixtures are unsuitable for demonstrating a clean `verified` outcome — see `tests/browser/fixtures/README.md`. This full local suite (`chromium`, `firefox`, and all four mobile-viewport projects) was run and passed in full; WebKit was not re-run for FSG-005C, consistent with FSG-006 remaining paused and its historical certification result not being touched.

## Required Verification

```text
npm run typecheck
npm run test:core
npm run test:ui
npm run build
php artisan test --compact
git diff --check
```

`npm run test:ui` was added in FSG-003 alongside the public UI layer; earlier sprints (FSG-001/FSG-002) had only `test:core`.

Each result must be reported accurately. A command that was not run must not be marked as passing.

## Runtime and Browser Evidence

The local decode → normalize → resize → encode → validate → download path should be proven with the strongest automated evidence available in the environment: unit/integration tests that exercise the real worker-side logic (using browser API fakes where the test runtime lacks them, as `packages/core/tests/workers/process-image.test.ts` does), plus automated browser tooling (Playwright, Claude in Chrome, or equivalent) whenever that tooling is actually usable.

Per "Verification Responsibility" above, a missing manually operated physical-device/browser session is not treated as missing evidence to be chased down before closing a sprint — it is recorded honestly and deferred to FSG-006, which owns the comprehensive real-device and cross-browser compatibility matrix (iOS Safari, Android Chrome, Safari desktop, Chrome, Firefox, Edge, memory pressure, repeated processing).

Whatever was actually run — automated tests, browser automation, or (historically) a manual session — must be reported with enough specificity to be checked: browser/engine and version where applicable, input formats exercised, relevant dimensions, cancellation behavior, and observed result. Unverified browsers and devices must be listed as unverified rather than inferred to pass; a command, test, or browser session that did not run must not be marked as passing.
