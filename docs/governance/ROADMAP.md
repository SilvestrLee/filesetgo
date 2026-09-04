# FileSetGo Roadmap

This eight-milestone roadmap replaces the earlier fourteen-milestone concept. Milestones are sequenced, but a later milestone may be researched early when that research does not expand the active implementation scope.

## FSG-001 — Core Client Runtime & Safety Foundation

**Status: ✅ CLOSED** (sub-sprints FSG-001A ✅ CLOSED, FSG-001B ✅ CLOSED, FSG-001C ✅ CLOSED). See `docs/directives/FSG-001.md`, `FSG-001B.md`, `FSG-001C.md`, and `SPRINT_REPORT.md` for the delivery record and closure audit.

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

**Status: ✅ CLOSED.** See `docs/directives/FSG-002.md`, `docs/governance/DECISIONS.md` ADR-015, and `SPRINT_REPORT.md` for the delivery record and closure audit.

Deliver:

- target KB/MB processing;
- bounded quality search;
- quality floor;
- dimension step-down;
- hard versus flexible requirements;
- processing-attempt budget; and
- impossible-target handling.

## FSG-003 — Quick Fit Workflow & Public Shell

**Status: ✅ CLOSED.** See `docs/directives/FSG-003.md`, `docs/governance/DECISIONS.md` ADR-016, and `SPRINT_REPORT.md` for the delivery record and closure audit.

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

**Status: ✅ CLOSED.** See `docs/directives/FSG-004.md` and `SPRINT_REPORT.md` for the delivery record and closure audit.

Deliver:

- preset registry;
- Website Logo Pack;
- Web Image Optimizer; and
- deterministic suitability warnings.

## FSG-005 — Packaging & Export

**Status: 🟡 OPEN.**

```text
FSG-005 — Packaging & Export Systems
├── FSG-005A — Multi-Output Packaging Foundation
│   ✅ CLOSED — see `docs/directives/FSG-005A.md`, `docs/governance/DECISIONS.md` ADR-017, and `SPRINT_REPORT.md`.
│
└── FSG-005B — Website Logo Pack & Favicon Suite
    ⏭ NEXT — not yet started.
```

FSG-005 itself remains open until FSG-005B closes.

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
