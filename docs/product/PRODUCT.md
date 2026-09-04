# FileSetGo Product Definition

## Identity

- **Public brand:** File. Set. Go.
- **Operational/product name:** FileSetGo
- **Domain:** `filesetgo.com`
- **Core package:** `@filesetgo/core`
- **Milestone prefix:** `FSG-`
- **GitHub repository:** `SilvestrLee/filesetgo`

## Core Proposition

> Input file + destination or requirements → validated ready-to-use output

The primary public positioning is:

> Get your file ready for where it needs to go.

FileSetGo is outcome-oriented. It starts with what a file must be ready for, then applies and validates the technical operations required to produce that result.

## Brand Interaction Concept

### File

Choose the source file.

### Set

Define the requirements or choose the destination or preset.

### Go

Process, validate, and download.

Together, these stages express the public brand: **File. Set. Go.**

## Product Interaction Models

### Quick Fit

Quick Fit serves users who already know their technical requirements. A user can request outcomes such as:

- under 200 KB;
- 500 × 500 pixels;
- JPEG;
- WebP; or
- maximum dimensions.

Quick Fit exposes requirements without requiring the user to choose implementation algorithms.

### Guided Fit

Guided Fit serves users who know where a file is going but do not know the destination's technical requirements. The selected workflow supplies requirements, output definitions, validation, and packaging.

Examples include:

- Website Logo Pack;
- Web Image Optimizer;
- future application-file preparation; and
- future ecommerce-image preparation.

Quick Fit and Guided Fit must use the same processing primitives from `@filesetgo/core`.

Guided Fit's first realized presets (FSG-004) are three FileSetGo-authored general website-image recommendations — Large website/hero image, Website content image, and Card/thumbnail image — deliberately positioned as recommendations, not sourced platform requirements.

**Website Logo Pack (FSG-005B) shipped as its own first-class public workspace tab — "Logo Pack" — alongside Quick Fit and Guided Fit, rather than as a preset selectable from within the Guided Fit tab.** This was an explicit product decision recorded in `docs/directives/FSG-005B.md` §7. It remains conceptually a "guided" experience (the user states what a file is for; FileSetGo supplies the technical requirements and packaging) — only its information architecture differs from the original three-Guided-Fit-workflow framing above. Web Image Optimizer remains unimplemented and unassigned to either shape.

## Initial V1 Workflows

V1 is initially organized around:

1. Quick Fit;
2. Website Logo Pack; and
3. Web Image Optimizer.

## Explicit V1 Exclusions

V1 does not initially include:

- PDF processing;
- DOC or DOCX processing;
- video;
- audio;
- accounts;
- subscriptions;
- billing;
- cloud file storage;
- processing history;
- a public API;
- AI generative editing;
- a general design editor; or
- arbitrary SVG processing.

## Product Boundaries

FileSetGo is a public, standalone product that is independently useful and broader than Keryon.

Keryon is an integration and an early real-world validation environment. It is not the parent product. Keryon may consume `@filesetgo/core`, but Keryon-specific concepts must not shape or leak into the shared processing package.
