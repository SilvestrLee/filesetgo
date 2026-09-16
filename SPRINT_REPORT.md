# File. Set. Go. — Current Sprint Report

Date: 2026-09-15

## Repository

- Branch: `fsg-007-front-facing-redesign`
- HEAD: `2ff998bf1ad434395cae1b8ff191478070eac5a5`
- Working tree: substantial, intentional dirty tree. The cumulative accepted FSG-007 work (public redesign through the full FIT-001 → FIT-003-R5.1 remediation sequence) remains uncommitted by deliberate continuation policy — it was preserved without reset or discard across every prior sprint in this lineage and is not to be staged, committed, pushed, or deployed except on explicit Product Office authorization.
- Staged: none
- Commit: not created
- Push: not performed
- Deploy: not performed

## Current Milestone

- FSG-007 — Public Product Experience & Launch: **active**.
- Current sub-directive: FSG-007A (Complete Front-Facing Website Redesign), which the work below sits under.
- Next authorized work: **FSG-007F — Website Image Optimizer** (paused; see §"Next Authorized Work" — not to begin without a fresh Product Office implementation directive).

## Completed / Frozen Work

| Milestone | Scope | Status |
| --- | --- | --- |
| FSG-007A | Public redesign / brand reconciliation | `ACCEPTED` |
| FSG-007B | Modal-first workspace refinement (stable FILE/SET/GO workspace, Quick Fit/Guided Fit/Logo Pack task surfaces, modal grammar, mobile full-screen task treatment) | `CLOSED / FROZEN` |
| FSG-007C | Prepare Logo acquisition page | `CLOSED / FROZEN` |
| FSG-007D | Transparent Logo + Favicon Generator acquisition family | `CLOSED / FROZEN` |
| FSG-007E | Compress Image + Convert to WebP acquisition family | `CLOSED / FROZEN` |
| FIT-001 | Quick Fit correctness / exact geometry / user-controlled crop | `CLOSED / FROZEN` |
| FIT-001B | Unified source experience and modal reconciliation | `CLOSED / FROZEN` |
| FIT-002 | Guided Fit destination geometry (Hero/Content/Card exact frames) | `CLOSED / FROZEN` |
| FIT-003 | First-class processing transition, through final accepted revision R5.1 | `CLOSED / FROZEN` |
| FSG-007F | Website Image Optimizer acquisition page | `PAUSED / NEXT` |
| FSG-008 | Ecosystem Integration | `NOT STARTED` |

## Quick Fit Final Contract

**Protected/frozen.**

Quick Fit means: *"I know the requirement. Make the file meet it."*

Geometry:

- Width only → proportional resize.
- Height only → proportional resize.
- Width + Height → exact output dimensions.
- If the source and requested output aspect differ, user-controlled crop is required. File. Set. Go. never silently crops.
- Enlargement always requires explicit user approval.
- Once confirmed, exact geometry remains fixed while encoding works toward the byte target — the target-size search (ADR-015) varies quality/tier within that fixed frame, never the frame itself.

UI: modal-based; compact internal rail; unified source confirmation shared with Guided Fit and Logo Pack; persistent task footer; contextual next action; blocking approvals (crop confirmation, upscale approval) must be discoverable, never silently skippable.

## Guided Fit Final Contract

**Protected/frozen.**

Guided Fit means: *"I know where the image will be used. Recommend what it should become."*

Canonical destination recommendations (FSG-007-FIT-002, ADR-028):

| Destination | Dimensions | Aspect | Format | Target |
| --- | --- | --- | --- | --- |
| Hero | 1600 × 900 | 16:9 | WebP | under 500 KB |
| Content | 1200 × 800 | 3:2 | WebP | under 300 KB |
| Card | 800 × 600 | 4:3 | WebP | under 150 KB |

These are File. Set. Go.'s own practical recommendations, not claimed universal web standards. Destination geometry is exact once a recommendation is accepted — not a bounding box. Cropping to reach that exact frame is always user-controlled, never automatic. Enlargement requires approval, identically to Quick Fit. Result truth (dimensions/format/size shown on GO) always comes from the actual validated output Blob's own metadata, never echoed-back request figures.

## Unified Source Contract

**Protected/frozen.**

One active homepage source is the source of truth. Homepage FILE state provides: thumbnail (where browser-supported), filename, format, dimensions, size, and a "Replace image" action.

Quick Fit, Guided Fit, and Logo Pack all consume that one source. Logo Pack has no independent uploader.

A no-source workflow request (choosing a task before a file is loaded) tells the user to choose an image, preserves the requested workflow's intent, and resumes that workflow automatically after a successful upload. Tabs change only the selected mode; launcher buttons request entry into a workflow — neither bypasses the single-source model.

## User-Controlled Crop Invariant

**Protected/frozen.**

> File. Set. Go. must never crop an image on its own to meet a requirement.

File. Set. Go. may: determine that a crop is needed; calculate the required aspect; present a neutral initial frame.

The user must: choose the image focus; review the crop; explicitly confirm it.

Final processing uses source-resolution crop coordinates. Quick Fit and Guided Fit share the identical locked-ratio crop engine (`resources/js/quick-fit/locked-crop-stage.ts`) rather than two implementations.

## Processing Interstitial Contract

**Protected/frozen — final FIT-003 (R5.1) system.**

Canonical principle:

> Task modals own decisions.
> The processing interstitial owns work.
> The workspace owns results.

Flow after final task confirmation:

```
TASK MODAL
    │  (synchronous close — no animation, no deferred timer)
    ▼
FULL-PAGE FILE → SET → GO PROCESSING STATE
    │  (minimum-dwell floor + atomic reveal)
    ▼
READY
    │
    ▼
WORKSPACE + POPULATED GO
```

The task modal is removed synchronously before the processing state appears — there is no window in which a modal and the interstitial are both visible, and no per-tool in-modal processing presentation exists any more (those were deleted outright in R4, not merely hidden).

### Processing Visual Grammar

FILE → SET → GO is the structural processing grammar, not a decorative loader.

- Desktop: horizontal rail.
- Mobile: genuine vertical FILE ↓ SET ↓ GO progression (not the desktop rail scaled down).
- Preparing: FILE complete, SET active, GO pending.
- Validating (only for tools whose real phase model has one): FILE complete, SET complete, GO checking.
- Ready: all three complete, GO strongest.
- A real source preview may appear in the FILE stage (reusing the existing unified-source thumbnail pipeline).
- Task context stays concise, and for any tool whose context wording varies by phase (currently only Logo Pack's asset-count line), it is derived live from the real phase — never frozen as a single string that can go on saying "Preparing" once the state is Ready (R5.1).

### Processing Timing

- `MIN_PREPARING_VISIBLE_MS = 1200`
- `READY_DWELL_MS = 600`

These are presentation timing only. Worker execution begins immediately on confirmation. There is no fake percentage and no artificial computational delay. A naturally slow job that has already been visibly preparing at least as long as the floor receives zero additional wait — the floor never stacks on top of real work.

### Processing Safety

- Actual output validation precedes Ready.
- GO's displayed metadata comes from the actual validated output, never echoed request figures.
- GO is populated before the workspace is revealed (atomic handoff).
- Cancellation uses real worker termination, not a UI-only abort.
- Stale jobs cannot replace the current result.
- The workspace is marked `inert` while processing is active.
- Normal site chrome (header/footer) is suppressed during processing.
- Reduced-motion preferences retain full state clarity — the glyph renders statically rather than disappearing.
- Result focus moves to the result heading after a successful handoff.

### Logo Pack

- Uses the unified source; no separate uploader.
- Seven governed assets, unchanged.
- Shares the same processing interstitial as Quick Fit and Guided Fit.
- Preparing context: `Preparing 7 website-ready logo assets`.
- Ready context: `7 website-ready logo assets` (R5.1 — no longer carries "Preparing" into the Ready state).

## Acquisition Page Status

Approved/frozen acquisition pages (5):

1. Prepare Logo (`/prepare-logo-for-website`)
2. Transparent Logo (`/transparent-logo-for-website`)
3. Favicon Generator (`/favicon-generator`)
4. Compress Image (`/compress-image-for-website`)
5. Convert to WebP (`/convert-image-to-webp`)

**Not approved:**

`/website-image-optimizer` is **FSG-007F — Website Image Optimizer**, status `PAUSED / NEXT`. It is not one of the five frozen acquisition pages above and must not be represented as approved or complete in any governance document. Its existing Blade/CSS/test work is not discarded — it is unfinished work awaiting a fresh Product Office implementation directive, not a shipped page.

### Why FSG-007F paused

The initial Website Image Optimizer redesign exposed that its Hero/Content/Card destinations did not actually produce destination-specific geometry — Guided Fit's presets were, at the time, a bounding box rather than an exact frame, so the page's own premise ("choose your destination, get the right result") was not yet true of the underlying product. Rather than ship an acquisition page that visually implied destination-specific outputs the engine could not yet deliver, the page was deliberately paused while FIT-001 through FIT-003 corrected the actual product (exact destination geometry, user-controlled crop, and a truthful processing transition). FSG-007F can now resume against real product behavior.

### Next FSG-007F story (recorded only — not implemented)

```
SOURCE
  │
  ▼
CHOOSE DESTINATION
  │
  ▼
HERO / CONTENT / CARD
  │
  ▼
RECOMMENDATION
  │
  ▼
USER-CONTROLLED IMAGE FOCUS IF REQUIRED
  │
  ▼
FILE → SET → GO PROCESSING INTERSTITIAL
  │
  ▼
VALIDATED READY RESULT
```

The acquisition page must demonstrate this real workflow — not a smaller or faked version of it.

## Known Limitations

- The governed acquisition deep-link contract selects only a mode/preset entry point (`logo-pack`, `quick-fit`, `guided-fit`); it does not safely preselect a byte target, background treatment, or skip directly to favicon-source selection. Each CTA therefore opens the real workflow at its nearest approved entry point.
- There is no deterministic browser fixture that exercises a genuine mid-processing failure (as opposed to a simulated/injected one); failure-state presentation is verified through the existing injected-error test paths rather than a naturally-failing real job.
- HEIC sources have no native browser thumbnail; the FILE-stage rail and other source previews fall back to a plain file icon for this format by design, not as an unhandled gap.
- A cosmetic fade-out transition between the processing interstitial leaving and the workspace becoming visible was deliberately not implemented (ADR-031) — implementing it risks reintroducing a focus/`inert` ordering race, so the instant cut remains current behavior pending a future milestone with room to solve that ordering properly.
- FSG-007F (Website Image Optimizer) is paused/incomplete; its existing implementation should not be treated as representative of the final acquisition-page story in §"Next FSG-007F story" above.

## Verification Baseline

Run and confirmed current as of this checkpoint (2026-09-15):

| Check | Command | Result |
| --- | --- | --- |
| Core unit | `npm run test:core` | PASS — 493 / 493 tests, 32 / 32 files |
| UI unit | `npm run test:ui` | PASS — 320 / 320 tests, 24 / 24 files |
| Laravel | `php artisan test --compact` | PASS — 38 / 38 tests, 292 assertions |
| Typecheck | `npm run typecheck` | PASS |
| Browser typecheck | `npm run typecheck:browser` | PASS |
| Build | `npm run build` | PASS |
| Pint | `vendor/bin/pint --dirty --format agent` | PASS |
| Diff hygiene | `git diff --check` | PASS (no whitespace errors) |
| Processing browser suite | `npx playwright test tests/browser/specs/processing-transition.spec.ts --project=chromium` | PASS — 20 / 20 (single-worker run; one parallel-worker run showed a "Duplicate submit" flake under contention that reproduced 3 / 3 clean in isolation and 20 / 20 clean single-worker — not a reproducible defect) |

Full-suite launch recertification (all browser engines, all specs) was intentionally not run as part of this governance checkpoint.

## Next Authorized Work

`FSG-007F — Website Image Optimizer`

Implementation is not authorized until Product Office issues a fresh implementation directive for FSG-007F against the corrected FIT-001–FIT-003 product behavior.

## Final Status

`FSG-007 GOVERNANCE CHECKPOINT RECONCILED — FSG-007F NEXT`
