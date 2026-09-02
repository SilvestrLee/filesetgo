# FileSetGo Roadmap

This eight-milestone roadmap replaces the earlier fourteen-milestone concept. Milestones are sequenced, but a later milestone may be researched early when that research does not expand the active implementation scope.

## FSG-001 — Core Client Runtime & Safety Foundation

Deliver:

- Laravel product shell;
- TypeScript workspace;
- `@filesetgo/core`;
- preflight;
- magic-byte and container identification;
- browser safety limits;
- worker runtime;
- JPEG, PNG, and WebP pipeline;
- EXIF normalization;
- bounded resize;
- JPEG, PNG, and WebP encoding;
- cancellation;
- resource cleanup;
- HEIC/HEIF technical implementation and evaluation; and
- development proof interface.

## FSG-002 — Target File Size Engine & Guardrails

Deliver:

- target KB/MB processing;
- bounded quality search;
- quality floor;
- dimension step-down;
- hard versus flexible requirements;
- processing-attempt budget; and
- impossible-target handling.

## FSG-003 — Quick Fit Workflow & Public Shell

Deliver the complete public workflow:

```text
Upload
→ Inspect
→ Requirements
→ Process
→ Validate
→ Download
```

## FSG-004 — Preset Engine & Guided Workflows

Deliver:

- preset registry;
- Website Logo Pack;
- Web Image Optimizer; and
- deterministic suitability warnings.

## FSG-005 — Packaging & Export

Deliver:

- ZIP packages;
- filename rules;
- favicon compatibility package;
- Apple touch icon;
- web app icons; and
- optional manifest output.

## FSG-006 — Hardening, Mobile QA & Compatibility

Complete launch-blocking testing for:

- iOS Safari;
- Android Chrome;
- Safari desktop;
- Chrome;
- Firefox;
- Edge;
- memory limits;
- corrupt files;
- oversized images;
- repeated processing;
- cancellation;
- HEIC; and
- EXIF.

This milestone validates or revises provisional safety defaults through real-device benchmarking.

## FSG-007 — SEO Acquisition & Public Launch

Deliver:

- public landing pages;
- shared-engine SEO entry points;
- legal and privacy surfaces;
- production monitoring;
- analytics; and
- public launch.

Example entry points include:

- `/compress-image`;
- `/resize-image`;
- `/compress-image-to-200kb`;
- `/website-logo`;
- `/favicon-generator`; and
- `/website-image-optimizer`.

## FSG-008 — Ecosystem Integration

Deliver:

- Keryon integration;
- `@filesetgo/core` consumption;
- “Powered by FileSetGo” attribution;
- contextual Keryon promotion;
- contextual FileSetGo promotion from Keryon;
- referral measurement; and
- version governance.
