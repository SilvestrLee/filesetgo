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

## Architectural Constraints

- Supported V1 processing is browser-first and requires zero server ingestion.
- Heavy work is worker-first and initially limited to one active job.
- Format signatures and container structures are authoritative over filename extensions and declared MIME types.
- Dimensions should be inspected before full bitmap allocation wherever the format permits.
- Every job is identified, cancellable, and protected against stale results.
- Every terminal path releases resources that are no longer needed.
- Export occurs only after output validation succeeds.
