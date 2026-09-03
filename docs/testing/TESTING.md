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

## Laravel

Laravel uses the existing Laravel PHPUnit test stack. Laravel tests cover routes, pages, product integration, and other Laravel-owned behavior. They do not duplicate browser raster-processing algorithm tests from `@filesetgo/core`.

## Browser and End-to-end Testing

Focused browser testing may use Playwright when it is introduced and approved. Browser tests should exercise the real worker boundary, local file handling, output generation, download behavior, cancellation, stale-result prevention, and runtime capability differences.

FSG-006 requires launch-blocking verification on iOS Safari, Android Chrome, Safari desktop, Chrome, Firefox, and Edge, including constrained-memory and repeated-processing scenarios.

## Required Verification for FSG-001

```text
npm run typecheck
npm run test:core
npm run build
php artisan test --compact
git diff --check
```

Each result must be reported accurately. A command that was not run must not be marked as passing.

## Runtime and Browser Evidence

The local decode → normalize → resize → encode → validate → download path should be proven with the strongest automated evidence available in the environment: unit/integration tests that exercise the real worker-side logic (using browser API fakes where the test runtime lacks them, as `packages/core/tests/workers/process-image.test.ts` does), plus automated browser tooling (Playwright, Claude in Chrome, or equivalent) whenever that tooling is actually usable.

Per "Verification Responsibility" above, a missing manually operated physical-device/browser session is not treated as missing evidence to be chased down before closing a sprint — it is recorded honestly and deferred to FSG-006, which owns the comprehensive real-device and cross-browser compatibility matrix (iOS Safari, Android Chrome, Safari desktop, Chrome, Firefox, Edge, memory pressure, repeated processing).

Whatever was actually run — automated tests, browser automation, or (historically) a manual session — must be reported with enough specificity to be checked: browser/engine and version where applicable, input formats exercised, relevant dimensions, cancellation behavior, and observed result. Unverified browsers and devices must be listed as unverified rather than inferred to pass; a command, test, or browser session that did not run must not be marked as passing.
