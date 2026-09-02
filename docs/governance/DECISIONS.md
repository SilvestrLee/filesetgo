# FileSetGo Decision Register

This register contains accepted FileSetGo architecture and product decisions. ADR identifiers are unique and must not be reused.

## ADR-001 — Worker-first processing

**Status:** Accepted

Heavy image processing runs in a browser worker. The UI thread may coordinate jobs and render progress, but it must not perform unrestricted decoding, pixel scans, resizing, repeated compression, or full image transforms.

## ADR-002 — Thin Laravel layer

**Status:** Accepted

Laravel owns the product shell, routes, pages, SEO, copy, legal surfaces, and future host policy. It does not own V1 browser-side raster-processing algorithms or introduce premature backend transformation abstractions.

## ADR-003 — Shared `@filesetgo/core` package

**Status:** Accepted

Reusable preflight, safety, worker, processing, validation, and error primitives live in the TypeScript package `@filesetgo/core`. FileSetGo and approved integrations consume the same package.

## ADR-004 — Provisional 15 MB / 24 MP limits

**Status:** Accepted

The initial hard source-file limit is 15 MB and the initial decoded-pixel limit is 24,000,000 pixels. Exactly 6000 × 4000 pixels is accepted. These are provisional engineering defaults pending FSG-006 device benchmarking.

## ADR-005 — HEIC/HEIF input in V1

**Status:** Accepted

HEIC/HEIF is required as a V1 input format. Its implementation must be browser-side, worker-compatible, and lazy-loaded. No specific decoder library is locked until maintenance, security, license, and memory characteristics are evaluated.

## ADR-006 — SVG deferred

**Status:** Accepted

Arbitrary SVG processing is excluded from V1 until a dedicated architecture addresses sanitization, embedded content, external references, fonts, and rasterization behavior.

## ADR-007 — No automatic whitespace trim

**Status:** Accepted

FileSetGo must not automatically remove whitespace or transparent padding as a universal behavior. Trimming is an explicit, previewable operation or preset rule because whitespace can be intentional content.

## ADR-008 — No blind favicon crop

**Status:** Accepted

FileSetGo must not blindly square-crop unsuitable horizontal logos. Guided favicon flows should prefer a square or icon source and provide deterministic suitability guidance.

## ADR-009 — Single active heavy job

**Status:** Accepted

The initial runtime limit is `MAX_ACTIVE_HEAVY_JOBS = 1`. Concurrency may change only after measured device and memory evidence supports a new limit.

## ADR-010 — Zero server ingestion for supported V1 paths

**Status:** Accepted

Supported V1 files are processed entirely on the user's device. Source files, generated outputs, filenames, EXIF metadata, image binaries, and arbitrary image content are not sent to FileSetGo servers or analytics.

## ADR-011 — Keryon package integration

**Status:** Accepted

Keryon consumes `@filesetgo/core` in the browser and uploads only user-approved generated assets to its own storage or CDN. Keryon concepts, authorization, storage, pricing, and cross-promotion remain host responsibilities and do not enter the core package.

## ADR-012 — Canonical `SPRINT_REPORT.md`

**Status:** Accepted

The repository-root `SPRINT_REPORT.md` is the canonical current sprint or checkpoint report. It is overwritten only for a formally governed report; prior versions remain in Git history. Parallel current sprint-report files are not created.
