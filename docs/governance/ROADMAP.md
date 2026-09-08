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

**Status: ✅ CLOSED.**

```text
FSG-005 — Packaging & Export Systems
✅ CLOSED
├── FSG-005A — Multi-Output Packaging Foundation
│   ✅ CLOSED — see `docs/directives/FSG-005A.md`, `docs/governance/DECISIONS.md` ADR-017, and `SPRINT_REPORT.md`.
│
├── FSG-005B — Website Logo Pack & Favicon Suite
│   ✅ CLOSED — see `docs/directives/FSG-005B.md`, `docs/governance/DECISIONS.md` ADR-018, and `SPRINT_REPORT.md`.
│
└── FSG-005C — Logo Transparency & Verification
    ✅ CLOSED — see `docs/directives/FSG-005C.md`, `docs/governance/DECISIONS.md` ADR-020, and `SPRINT_REPORT.md`.
```

Deliver:

- ZIP packages;
- filename rules;
- favicon compatibility package;
- Apple touch icon;
- web app icons; and
- optional manifest output.

## FSG-006 — Hardening, Mobile QA & Compatibility

**Historical status: ✅ CLOSED AT ORIGINAL CHECKPOINT.** Resumed after FSG-005C for a delta recertification pass, closing the CI dependency-install reproducibility gap and recertifying the affected Logo Pack transparency paths. Final certified closure candidate `09324a6f9c73bae2f66cb40c21d509439ca99a35` (GitHub Actions run `34025426493`): Chromium 60/60, Firefox 57/60 (3 governed skips), Playwright WebKit 57/60 (3 governed skips), mobile 20/20 — 194 passed, 6 accepted skips, 0 failed. See `docs/directives/FSG-006.md` and ADR-021.

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

### FSG-006R — External Audit Runtime & Security Hardening

**Status: ✅ CLOSED.** Product Office accepted final certified application candidate `ffa73d24887ecba9af78b3e09194dca3da1d511b` after GitHub Actions run `34234812993` completed with 218 passed, 6 governed skips, and 0 failed. FSG-006R preserves the valid historical FSG-006 closure while recording the post-audit target-size reference-lifetime hardening, host-side HEIC cancellation proof, evidence-based halo decision, and production CSP/security headers. See `docs/directives/FSG-006R.md` and ADR-023.

## FSG-007 — SEO Acquisition & Public Launch

**Status: ▶ CURRENT / RESUMED AFTER FSG-006R.** Work remains preserved at `1f1ced66ab43f7093efeed4b0aa56a20ad5eafc2` pending a separate Product Office reconciliation directive. This status clears FSG-007 to resume; it does not integrate its divergent lineage from this branch.

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

**Status: NOT STARTED.**

Deliver:

- Keryon integration;
- `@filesetgo/core` consumption;
- “Powered by FileSetGo” attribution;
- contextual Keryon promotion;
- contextual FileSetGo promotion from Keryon;
- referral measurement; and
- version governance.
