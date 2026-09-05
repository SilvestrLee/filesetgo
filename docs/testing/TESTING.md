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

## Public UI Layer (`resources/js/quick-fit/`, `resources/js/presets/`)

The Quick Fit workflow (FSG-003) uses Vitest, run separately from the core package via `npm run test:ui`. See `docs/governance/DECISIONS.md` ADR-016 for the architectural split this relies on: pure logic modules (`state.ts`, `format-bytes.ts`, `filename.ts`, `errors.ts`, `request-plan.ts`, `summary.ts`, `capabilities.ts`, `validate-form.ts`) are directly unit-tested; the DOM-free `workflow.ts` orchestration layer is tested with a constructor-injected fake `@filesetgo/core` client (no module mocking, no DOM emulation); `controller.ts` is the only module that touches `document` and is left to build/typecheck/browser-automation verification rather than unit tests, since introducing `jsdom` purely to unit-test DOM rendering was deliberately avoided.

FSG-004's preset system (`resources/js/presets/`) follows the same pattern: `catalog.ts`/`validate-preset.ts`/`registry.ts`/`compiler.ts`/`already-ready.ts`/`quick-fit-mapping.ts` are pure/DOM-free and directly unit-tested; `GuidedFitController` composes the unmodified `QuickFitWorkflow` the same way and is tested identically (a fake core client, no DOM). `npm run test:ui` now runs both `resources/js/quick-fit/tests` and `resources/js/presets/tests`.

## Laravel

Laravel uses the existing Laravel PHPUnit test stack. Laravel tests cover routes, pages, product integration, and other Laravel-owned behavior. They do not duplicate browser raster-processing algorithm tests from `@filesetgo/core`.

## Browser and End-to-end Testing

FSG-006 introduced `@playwright/test` (dev-only, exact-pinned at `1.55.1` — see `docs/governance/DECISIONS.md` ADR-019) as the permanent browser-test framework. `tests/browser/specs/` runs against the real, built, locally served application (`php artisan serve` over the production Vite build), never a synthetic reimplementation of controller logic. `npm run test:browser` runs it (`playwright test`); `npm run typecheck:browser` type-checks the suite separately from the main `npm run typecheck` (a dedicated `tsconfig.browser-tests.json`, mirroring the `tsconfig.ui-tests.json` split from ADR-016).

Engine coverage: `chromium` and `firefox` projects run the full functional certification suite (bootstrap, Quick Fit, Guided Fit, Website Logo Pack, HEIC, cancellation, stale-result/rapid-replacement, reset, invalid-file recovery, accessibility/keyboard, network/privacy boundary, lazy-load runtime verification). Four Chromium-based mobile-viewport projects (`mobile-narrow-320`, `mobile-iphone-class`, `mobile-android-class`, `mobile-tablet-class`) run a dedicated responsive-layout suite (`mobile-viewport.spec.ts`) instead — no horizontal overflow, touch-target sizing, stacking, footer placement, orientation transitions.

**WebKit is not part of this suite in this environment** — ADR-019 records the exact technical reason (a frozen macOS-12 WebKit build incompatible with any non-CVE-affected Playwright driver) and the Product Office decision to accept Chromium+Firefox certification rather than pair a CVE-affected Playwright version with a multi-year-old WebKit snapshot. No claim of WebKit, Safari, or physical-device testing appears anywhere in this codebase's reports unless actually performed.

Fixtures (`tests/browser/fixtures/`) are small, self-generated, real, decodable images (PNG/JPEG/WebP/HEIC, plus deliberately invalid/corrupted/oversized cases) — see `tests/browser/fixtures/README.md` for exact provenance. No fixture is downloaded from a network source.

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
