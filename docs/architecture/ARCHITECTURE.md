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

FSG-004 adds Guided Fit (`resources/js/presets/`) as a second way to arrive at the same requirement shape, not a second processing path. A preset compiler (`compilePreset()`) converts a destination/use-case preset directly into the identical `QuickFitRequirements` shape Quick Fit's own form produces; `GuidedFitController` composes the existing, unmodified `QuickFitWorkflow` (`resources/js/quick-fit/workflow.ts`) by calling its public API, the same way the Quick Fit form's controller does. Destination/product knowledge (preset catalog, categories, provenance) stays entirely in `resources/js/presets/` — `@filesetgo/core` and `QuickFitWorkflow` remain destination-neutral and were not modified.

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

`processImageSet()` (FSG-005A) extends the same pattern to multiple outputs from one source: it decodes exactly once, then reuses the same render/encode/validate primitives sequentially for each requested output, and shares the identical single active-job runtime slot as `processImage()`/`processImageToTarget()` — a third kind competing for the same one-job invariant, not a separate concurrency model. An optional ZIP archive step (`packages/core/src/archive/`) is layered on top, itself hidden behind a FileSetGo-owned adapter so no third-party archive library type ever appears in a public `@filesetgo/core` contract. Package/output-count and total-byte safety limits mirror the safety-limit pattern established for source files (ADR-004) and the target-size search (ADR-015). See `docs/governance/DECISIONS.md` ADR-017.

FSG-005B adds the Website Logo Pack (`resources/js/logo-pack/`) on top of the same `processImageSet()` foundation, contributing two new *generic* core capabilities in the process — a fixed-canvas CONTAIN render primitive (`transforms/contain.ts`) and a small dependency-free ICO container reader/writer (`icons/ico.ts`) — neither of which has any concept of "logo," "favicon," or "icon." `ImageSetOutputSpec`/`ImageSetAssetResult` became discriminated unions (`'raster' | 'contain' | 'ico'`) to represent this without polluting `processImage()`/`processImageToTarget()`. All Logo Pack-specific knowledge (the exact seven-asset composition, geometry/resolution suitability assessment, controlled-upscale policy) lives in `resources/js/logo-pack/`, mirroring the `resources/js/presets/` boundary FSG-004 established. See `docs/governance/DECISIONS.md` ADR-018.

## Architectural Constraints

- Supported V1 processing is browser-first and requires zero server ingestion.
- Heavy work is worker-first and initially limited to one active job.
- Format signatures and container structures are authoritative over filename extensions and declared MIME types.
- Dimensions should be inspected before full bitmap allocation wherever the format permits.
- Every job is identified, cancellable, and protected against stale results.
- Every terminal path releases resources that are no longer needed.
- Export occurs only after output validation succeeds.
- Any repeated-attempt processing (e.g. target-size search) must have an explicit, deterministic upper bound on total work — no unbounded or open-ended loops.
