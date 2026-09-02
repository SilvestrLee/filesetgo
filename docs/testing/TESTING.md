# FileSetGo Testing Strategy

## Principles

Tests cover observable behavior, safety boundaries, protocol contracts, and failure modes. Passing automated tests must not be reported as proof of browser or device behavior that was not actually exercised.

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

## Actual Browser and Device Evidence

FSG-001 requires an actual browser proof of the local decode → normalize → resize → encode → validate → download path. Browser and device coverage must name the browser, version, device or operating system, input formats exercised, relevant dimensions, cancellation behavior, and observed result.

Automated DOM tests, typechecking, a production build, or a mocked worker do not count as real-device evidence. Unverified browsers and devices must be listed as unverified rather than inferred to pass.
