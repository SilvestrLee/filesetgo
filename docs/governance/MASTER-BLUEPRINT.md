# FileSetGo Master Blueprint

## Status and Scope

This document is the highest-authority product and technical blueprint for FileSetGo. It governs product intent, architecture, privacy, safety, milestones, and implementation boundaries.

The product identity is:

- **Public brand:** File. Set. Go.
- **Operational/product name:** FileSetGo
- **Domain:** `filesetgo.com`
- **Core package:** `@filesetgo/core`
- **Milestones:** `FSG-###`
- **Repository:** `SilvestrLee/filesetgo`

## Governance Authority

Repository authority descends in this order:

1. `docs/governance/MASTER-BLUEPRINT.md`
2. `docs/governance/DECISIONS.md`
3. `docs/governance/ROADMAP.md`
4. the current directive in `docs/directives/`
5. architecture, security, and testing documentation
6. implementation

If lower-level implementation conflicts with a higher-level governing document, implementation must stop until the conflict is resolved. The conflict must be settled in the appropriate governing document before implementation resumes.

## Product Definition

FileSetGo turns an input file and a destination or set of requirements into a validated, ready-to-use output.

> Get your file ready for where it needs to go.

The product supports two interaction models:

- **Quick Fit:** the user knows the technical requirements.
- **Guided Fit:** the user knows the destination, and a preset defines the requirements and outputs.

Both models use the same processing engine. See [`../product/PRODUCT.md`](../product/PRODUCT.md).

## Core Lifecycle

```text
SOURCE FILE
    ↓
PREFLIGHT
    ↓
SAFETY GATE
    ↓
DECODE
    ↓
NORMALIZE
    ↓
INSPECT / TRANSFORM
    ↓
ENCODE
    ↓
VALIDATE
    ↓
EXPORT
    ↓
READY FILE
```

Each stage must have a defined responsibility, structured outcome, and bounded failure mode. No output is described as ready until it has passed output validation.

## Core Principles

### Outcome before operation

FileSetGo should primarily solve:

> What does this file need to be ready for?

Technical image controls may support that outcome, but they must not be the only interaction model.

### Browser-first

Supported V1 image processing happens on the user's device. The browser is the default execution environment for decoding, transforming, encoding, and validating supported raster files.

### Worker-first

Heavy image processing must not execute unrestricted on the UI thread. Expensive decoding, pixel inspection, resizing, encoding, and future bounded target-size searches belong in a worker runtime.

### No mandatory account

Core public utilities do not require login. Accounts, subscriptions, billing, cloud storage, and processing history are outside initial V1 scope.

### Shared engine

Quick Fit and Guided Fit use the same processing primitives in `@filesetgo/core`. Host applications orchestrate those primitives; they do not reimplement them.

### Presets are orchestration

Presets define requirements, outputs, suitability rules, naming, and packaging. They do not duplicate processing algorithms.

### Privacy by architecture

Supported V1 files do not need to pass through FileSetGo servers. Source files, generated outputs, filenames, EXIF metadata, and image content are excluded from analytics.

## Product and Runtime Boundaries

The Laravel product layer owns routes, pages, SEO, product copy, legal surfaces, and future host-level analytics, monetization, and promotion policy.

`@filesetgo/core` owns reusable browser-processing capabilities: preflight, format identification, safety checks, workers, decoding, orientation, transforms, encoding, validation primitives, and structured errors.

Keryon is a consumer of the shared core package, not its owner. Domain-specific concepts, storage, authorization, and pricing remain in Keryon.

## V1 Runtime Baseline

The initial safety defaults are:

- `MAX_INPUT_FILE_SIZE = 15 MB`
- `MAX_DECODED_PIXELS = 24,000,000`
- `MAX_ACTIVE_HEAVY_JOBS = 1`

These values are provisional engineering defaults pending FSG-006 device benchmarking. Header-level metadata should be inspected before expensive bitmap allocation wherever the format permits.

Required V1 raster input support is JPEG, PNG, WebP, and HEIC/HEIF. Required V1 raster output support is JPEG, PNG, and WebP. SVG is deferred unless a dedicated sanitization and rasterization architecture is approved.

## Delivery Model

The canonical delivery sequence is the eight-milestone roadmap in [`ROADMAP.md`](ROADMAP.md). Work within a milestone is governed by its active directive. The current implementation directive is [`../directives/FSG-001.md`](../directives/FSG-001.md).

`SPRINT_REPORT.md` is the canonical repository checkpoint report. It is overwritten only when a governed sprint or checkpoint is formally reported; historical reports remain available through Git history.
