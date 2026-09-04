# FileSetGo Architecture

## System Shape

```text
                    FILESETGO

             Laravel Product Layer
                     │
                     ▼
                Web Application
                     │
                     ▼
             @filesetgo/core
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
     Preflight                Worker Runtime
        │                         │
        ▼                         ▼
     Safety                    Decode
                                  │
                                  ▼
                              Normalize
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
                 Inspect       Transform       Encode
                    │             │             │
                    └─────────────┼─────────────┘
                                  ▼
                               Validate
                                  │
                                  ▼
                                Export
```

The Laravel layer presents the product. The web application translates user intent into typed core-package jobs. `@filesetgo/core` performs reusable preflight and processing work in the browser. Heavy processing is isolated in a worker runtime.

## Laravel Responsibility

Laravel owns:

- routes;
- pages;
- SEO;
- product copy;
- legal pages;
- future analytics policy;
- future monetization; and
- future promotion policy.

Laravel does not own V1 raster-processing algorithms. It must not become a required ingestion or transformation service for supported V1 workflows.

## Web Application Responsibility

The web application owns interaction orchestration:

- file selection;
- collecting Quick Fit requirements or Guided Fit preset choices;
- displaying preflight metadata and suitability warnings;
- dispatching typed jobs;
- displaying progress and structured errors;
- sending cancellation commands; and
- presenting validated outputs for local download.

FSG-003 is the first realized implementation of this layer: the Quick Fit workflow (`resources/js/quick-fit/`) translates plain-language requirements (target file size, optional maximum dimensions, output format, dimension-flexibility) into `processImage()`/`processImageToTarget()` calls, and translates structured outcomes back into human-language success, unreachable-target, and error presentations. See `docs/governance/DECISIONS.md` ADR-016 for how this layer is internally split (DOM-free orchestration vs. a thin DOM-binding controller) for testability.

## Core-package Responsibility

`@filesetgo/core` owns:

- preflight;
- format identification;
- runtime capabilities;
- workers;
- decode;
- orientation;
- transforms;
- encode;
- validation primitives; and
- errors.

The package exposes processing capabilities, not host-product concepts. Presets orchestrate these primitives without duplicating them.

`processImageToTarget()` (FSG-002) is a bounded orchestration on top of these same primitives, not a second processing architecture: it reuses preflight, the safety gate, decode, orientation normalization, resize, encode, and output validation, adding only a deterministically bounded dimension-tier × quality-probe search loop. It shares the same single active-job runtime slot as `processImage()` — starting either kind of job cancels whichever job (of either kind) is currently active. See `docs/governance/DECISIONS.md` ADR-015 for the search's bounded parameters.

## Architectural Constraints

- Supported V1 processing is browser-first and requires zero server ingestion.
- Heavy work is worker-first and initially limited to one active job.
- Format signatures and container structures are authoritative over filename extensions and declared MIME types.
- Dimensions should be inspected before full bitmap allocation wherever the format permits.
- Every job is identified, cancellable, and protected against stale results.
- Every terminal path releases resources that are no longer needed.
- Export occurs only after output validation succeeds.
- Any repeated-attempt processing (e.g. target-size search) must have an explicit, deterministic upper bound on total work — no unbounded or open-ended loops.
