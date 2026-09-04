# FSG-004 Sprint Report — Preset Engine & Guided Workflows

## Milestone

FSG-004 — Preset Engine & Guided Workflows (see `docs/directives/FSG-004.md`).

## Status

FSG-004: Complete.

## Base Commit Before FSG-004

`a7deac8d1b78e1c4c4f60e2c3efbd9e3f3474434` — the FSG-003 closeout commit (`feat(web): add Quick Fit public workflow`).

## Branch

`fsg-004-presets-guided-fit`, created from the commit above.

## Objective

Add a data-driven preset system and the first Guided Fit experience alongside Quick Fit: a user who knows *what an image is for* (not the technical requirement) chooses a FileSetGo-authored recommendation, reviews it, and runs it through the existing processing runtime — with zero new image-processing architecture.

## Preset Architecture

`resources/js/presets/` — entirely new, product-owned TypeScript modules; `@filesetgo/core` and `resources/js/quick-fit/workflow.ts` (`QuickFitWorkflow`) were **not modified**:

- `contracts.ts` — the typed `FileSetGoPreset` schema.
- `catalog.ts` — the single authoritative array of preset data (directive §12).
- `validate-preset.ts` — `validatePreset()` / `validateCatalog()`.
- `registry.ts` — `getAllPresets()` / `getPresetById()` / `tryGetPresetById()` / `getPresetsByCategory()`; validates the catalog at module load and throws on any malformed entry (fail-fast, never silently accepts bad data).
- `compiler.ts` — `compilePreset(preset, sourceFormat)` → the exact same `QuickFitRequirements` shape Quick Fit's manual form produces.
- `already-ready.ts` — `evaluateAlreadyReady(preflight, preset)`, a pure boundary-inclusive comparison against preflight facts only.
- `quick-fit-mapping.ts` — `presetToQuickFitFormValues(preset)`, the one reusable preset→Quick-Fit-form mapping used by "Adjust settings".
- `guided-fit-controller.ts` — `GuidedFitController`, a DOM-free class that composes the unmodified `QuickFitWorkflow` via its existing public API (`selectFile`/`run`/`cancel`/`reset`/`subscribe`/`getState`) and adds only mode/preset-selection state.

## Architectural Boundary

Preset/destination knowledge (preset names, categories, provenance) lives entirely in `resources/js/presets/`. `@filesetgo/core` remains concerned only with safety/processing/transforms/validation and has no concept of "Website Hero" or "FileSetGo preset." Guided Fit produces a `QuickFitRequirements` object and hands it to the same `planProcessing()` → `processImageToTarget()` path Quick Fit already uses (all three initial presets set `targetBytes`, so every compiled preset routes to `processImageToTarget()`, never a second image-processing path).

## Preset Schema

```ts
interface FileSetGoPreset {
  id: string;            // stable machine id, e.g. "web.hero"
  revision: number;       // explicit, starts at 1
  category: string;
  title: string;
  description: string;
  rationale: string;      // short "why this recommendation"
  requirements: {
    targetBytes?: number;
    maxWidth?: number;
    maxHeight?: number;
    outputFormat: OutputImageFormat;   // never 'heic'
    dimensionPolicy: DimensionPolicy;
  };
  provenance: {
    kind: 'filesetgo-recommended' | 'external';
    sourceUrl?: string;    // required when kind === 'external'
    verifiedAt?: string;   // required when kind === 'external'
    reviewAfter?: string;
  };
}
```

Presets hold no executable callbacks — deterministic data only.

## Preset Registry

One authoritative registry (`registry.ts`) backed by one authoritative catalog array (`catalog.ts`). `getPresetById()` throws cleanly for an unknown id rather than silently falling back to another preset; `tryGetPresetById()` returns `undefined` for call sites that need to check first. The whole catalog is validated once at module load; a malformed catalog throws immediately rather than shipping silently.

## Initial Preset Catalog

Exactly three, all `filesetgo-recommended`, revision 1, output WebP, `dimensionPolicy: 'flexible'`:

| ID | Title | Max dimensions | Target |
|---|---|---|---|
| `web.hero` | Large website / hero image | 1920 × 1080 px | 500 KB |
| `web.content` | Website content image | 1600 × 1600 px | 300 KB |
| `web.card` | Card / thumbnail image | 800 × 800 px | 150 KB |

Every numeric value exists exactly once, in `catalog.ts`; the UI (preset cards, recommendation review) renders from the registry at runtime, the compiler reads from the same objects, and tests import the catalog directly — no value is repeated in Blade or hand-typed into tests.

## Recommendation Positioning

The Guided Fit panel states: "These are FileSetGo recommendations — practical starting points for general website use, not platform-specific upload limits." Each recommendation shows a "FileSetGo recommendation" label plus a short rationale (e.g. web.content: "Balances image detail with practical page weight for normal website content."). No claim of universal correctness, guaranteed performance, or SEO impact is made anywhere.

## Provenance/Freshness Model

`provenance.kind` distinguishes `filesetgo-recommended` (all three initial presets) from `external` (none ship yet). `validatePreset()` requires `sourceUrl` and `verifiedAt` whenever `kind === 'external'`, so a future sourced platform preset cannot ship without provenance — enforced by the same validation the catalog itself must pass, not by convention. No dynamic/remote preset fetching exists anywhere; presets ship with the application bundle only.

## Guided Fit UX

The Quick Fit workspace now has two first-class modes, presented as an ARIA tablist (`role="tablist"`/`role="tab"`/`role="tabpanel"`, arrow-key navigation, `aria-selected`) directly above the shared drop zone: **Quick Fit** ("Enter the requirement yourself.") and **Guided Fit** ("Choose what you're preparing."). Guided Fit shows three text-first preset cards (radio-input based) that render their title/use-case/summary from the registry; selecting one shows a recommendation-review panel (format, bounding dimensions, target size, flexibility note, rationale) *before* any processing — clicking a card never starts a job. **Get file ready** is the explicit trigger.

## Quick Fit / Guided Fit Shared State

Both modes share one `QuickFitWorkflow` instance and therefore one selected source file. Switching modes (`GuidedFitController.setMode()`) never calls `selectFile()`, never processes, and is a no-op while a job is `processing` (re-enabled once cancelled/settled) — verified directly in `guided-fit-controller.test.ts` by asserting `preflightImage` call counts stay constant across repeated mode toggles.

## Preset Compiler

`compilePreset(preset, sourceFormat)` maps `preset.requirements` 1:1 onto `QuickFitRequirements`; `planProcessing()` (unchanged from FSG-003) then routes it. Since every initial preset sets `targetBytes`, `plan.kind` is always `'target'` → `processImageToTarget()`. Verified in `compiler.test.ts` for all three presets, including that the resulting `processImageToTarget()` options (`targetBytes`, `dimensions`, `output`, `dimensionPolicy`) exactly match the catalog.

## Adjust Settings

`GuidedFitController.adjustSettings()` switches to Quick Fit mode and returns `presetToQuickFitFormValues(preset)`; `controller.ts` applies those values to the actual form fields (target size/unit, max width/height, output format, dimension-flexibility checkbox) and re-runs the existing transparency-warning/target-size-dependent-field logic. This is the *only* path that overwrites manual Quick Fit values — a plain mode toggle never touches them (verified: `setMode()` alone does not call `adjustSettings()` or touch any form field).

## Already-Ready Handling

`evaluateAlreadyReady()` compares preflight facts only (format, byte size, width, height) against the selected preset's requirements, boundary-inclusive (`<=`). When true, the Guided Fit panel shows "This file already fits this recommendation," hides **Get file ready**, and shows **Use this file** instead — a real `<a download>` pointing at an object URL of the *original, unprocessed* `File`, with the **original filename preserved** (no `-filesetgo` suffix, since nothing was transformed). No processed Blob is manufactured in this case. The object URL is created only while already-ready is true for the current file/preset pair and revoked on every preset change, file change, or panel exit.

## Core API Reuse

No `GuidedFitWorker`/`GuidedFitImageProcessor`/`GuidedTargetEngine` was created. `GuidedFitController.runSelectedPreset()` calls `this.workflow.run(compilePreset(...))` — the exact same `QuickFitWorkflow.run()` method the Quick Fit form calls. `packages/core/` was not touched; `resources/js/quick-fit/workflow.ts` was not touched.

## Result / Unreachable UX

On success, if the result came from a preset run, the result panel adds "Prepared for: `<preset title>`" above the existing factual result detail — the actual returned `ProcessedImageResult`/`TargetSizeResult` metadata remains the sole source of truth for dimensions/format/size (unchanged from FSG-003's `buildSuccessSummary()`). On `unreachable`, an **Adjust settings** button appears (only when the unreachable result came from a preset run) that sends the same preset into Quick Fit via `adjustSettings()` so the user can loosen the target/dimensions/format themselves. `targetMet: true` from the core result remains the sole success criterion — nothing is presented as successful merely because a preset was selected or processing completed.

## Accessibility

Mode selector: real `role="tablist"`/`tab`/`tabpanel` semantics, `aria-selected`, roving `tabindex`, `ArrowLeft`/`ArrowRight` navigation, visible focus rings. Preset choice: native radio inputs with associated labels inside a `role="radiogroup"`; selection state is structural (`:checked`), not color-only (the selected card also gets a visible border/ring change). Recommendation changes are announced through the existing shared `aria-live="polite"` announcer (`status-announcer`) with a concise summary line, not exhaustive detail.

## Responsive Behavior

Preset cards use `grid gap-4 sm:grid-cols-3` — a single column on narrow mobile, three columns from the `sm` breakpoint up. The recommendation-review panel and all Guided Fit action buttons reuse the same responsive container/typography conventions as the rest of the Quick Fit workspace; no fixed-width elements were introduced. Not independently confirmed by browser automation or a real device this sprint (see Known Limitations).

## Privacy

No network code was added anywhere in `resources/js/presets/` or the Guided Fit additions to `controller.ts`/`welcome.blade.php`. Preset selection, recommendation review, and "already ready" evaluation are all pure client-side computations against already-local preflight facts — nothing is transmitted. `routes/web.php` is unchanged (`GET /` only); confirmed via a repository-wide `grep` for `fetch(`/`XMLHttpRequest`/`sendBeacon`/`axios`/`FormData`/`multipart` (zero matches outside the pre-existing, unmodified HEIC WASM fetch path).

## TypeScript Governance

FSG-003's TypeScript project boundary is unchanged and preserved: `tsconfig.json` (root, production) still excludes test directories and never gains `"node"` in `types`; `tsconfig.ui-tests.json` now also includes `resources/js/presets/**/*.ts` (source + tests) alongside `resources/js/quick-fit/**/*.ts`. No `skipLibCheck` was reintroduced anywhere. The governed `@types/chai@5.0.1` override was **not touched** — `npm ci` this sprint installed the identical 141 packages as FSG-003's closeout, confirming no dependency drift. Vitest was not upgraded.

## Automated Tests

**Core package regression** (`npm run test:core`): **202/202 passing**, unchanged — `@filesetgo/core` was not modified this sprint.

**UI tests** (`npm run test:ui`, now spanning `resources/js/quick-fit/tests` and `resources/js/presets/tests`): **171/171 passing** (91 unchanged FSG-003 tests + 80 new):

| File | Tests | Covers |
|---|---|---|
| `presets/tests/catalog.test.ts` | 15 | Exactly 3 presets, stable/unique ids, revision 1, catalog validates, WebP-only, all `filesetgo-recommended`, governed numeric values |
| `presets/tests/validate-preset.test.ts` | 19 | Every rejection case (§13): empty id, bad revision, missing title/description, HEIC/unsupported output, invalid targetBytes/dimensions, oversized dimensions, invalid dimensionPolicy/provenance, external-provenance requirements, duplicate id |
| `presets/tests/registry.test.ts` | 7 | `getAllPresets`/`getPresetById` (throws cleanly)/`tryGetPresetById`/`getPresetsByCategory` |
| `presets/tests/compiler.test.ts` | 5 | All three presets compile to their exact governed `QuickFitRequirements`, and route to `processImageToTarget()` |
| `presets/tests/already-ready.test.ts` | 10 | Qualifying/oversized/over-target/format-mismatch (JPEG/PNG/HEIC) cases, exact byte and dimension boundaries (both directions) |
| `presets/tests/quick-fit-mapping.test.ts` | 3 | Exact prefill values for all three presets |
| `presets/tests/guided-fit-controller.test.ts` | 21 | Mode switching (shared file, no re-preflight, disabled while processing), preset selection (including unknown-id failure), running a preset (routing, success/unreachable/failure preset-context retention), reset/file-replacement (preset state clearing, stale-result protection), already-ready integration, adjust-settings behavior |

## Laravel Tests

`php artisan test --compact`: **8/8 passing, 17 assertions** (6 pre-existing + 2 new). `WelcomeShellTest` gained `test_no_dynamic_preset_route_exists` and `test_the_public_shell_presents_guided_fit_and_its_initial_presets` (confirms the mode tabs, `guided-fit-panel`, and all three `data-preset-id` markers render).

## Production Build

`npm run build` succeeds.

## Bundle Observation

| Asset | FSG-003 closeout | FSG-004 | Delta |
|---|---|---|---|
| `app-*.js` | 38.31 kB | 48.19 kB | +9.88 kB |
| `app-*.css` | 24.08 kB | 25.94 kB | +1.86 kB |
| `image.worker-*.js` | 25.16 kB | 25.16 kB | unchanged |
| `heic-decode-*.js` | 32.54 kB | 32.54 kB | unchanged |
| `heic_dec-*.wasm` | 959.55 kB | 959.55 kB | unchanged |

The app bundle growth covers the entire new feature (preset schema/validation/registry/compiler/already-ready/mapping logic, the `GuidedFitController` orchestration class, and all of `controller.ts`'s new Guided Fit DOM wiring) — not merely three data records — so it is proportionate; the preset *data* itself (`catalog.ts`) is a few hundred bytes. No lazy-loading was added for the preset catalog, per directive §58 ("do not create lazy-loading complexity for a tiny static catalog unless there is evidence it is necessary") — there is none. Worker and HEIC-related chunks are byte-for-byte unchanged, confirming zero impact on the processing runtime.

## HEIC Lazy-Load Regression

Re-verified after this sprint's rebuild: `app-*.js` and `image.worker-*.js` contain zero occurrences of the HEIC decoder glue markers (`libde265`, `wasmBinaryFile`, `instantiateWasm`); those markers appear only inside the untouched `heic-decode-*.js` chunk.

## Known Limitations

- **Browser automation was not exercised this sprint.** Consistent with the pattern recorded in FSG-003 (Chrome-in-Chrome did not connect in this environment); not re-attempted repeatedly per standing "avoid rabbit holes" guidance. Per ADR-013/TESTING.md this is recorded honestly and does not block closure — mode switching, preset keyboard selection, and mobile card stacking are implemented to spec and covered by DOM-free orchestration/logic tests, but were not independently confirmed by a real browser session or device this sprint.
- Comprehensive real-device/cross-browser verification remains FSG-006 scope.
- No project-owner manual QA was requested or performed, per ADR-013.

## FSG-004 Acceptance Audit (directive §60)

| # | Criterion | Status |
|---|---|---|
| 1 | Typed preset schema exists | Met |
| 2 | One authoritative preset registry exists | Met |
| 3 | Preset IDs stable and unique | Met (tested) |
| 4 | Preset revision explicit | Met (all = 1) |
| 5 | Preset validation exists | Met (tested) |
| 6 | Provenance distinguishes recommended vs. external | Met |
| 7 | External provenance requires source/freshness metadata | Met (tested) |
| 8 | Exactly three initial presets ship | Met (tested) |
| 9 | Initial presets use the governed values | Met (tested) |
| 10 | Initial presets positioned as FileSetGo recommendations | Met |
| 11 | Quick Fit remains available | Met |
| 12 | Guided Fit available alongside Quick Fit | Met |
| 13 | Quick Fit/Guided Fit share selected file state | Met (tested) |
| 14 | Mode switching does not unnecessarily re-preflight | Met (tested) |
| 15 | Guided Fit shows recommendation before processing | Met |
| 16 | Preset execution routes through existing processing APIs | Met (tested) |
| 17 | No second image-processing architecture exists | Met |
| 18 | Guided Fit target jobs use `processImageToTarget()` | Met (tested) |
| 19 | Selected preset context survives to result presentation | Met (tested) |
| 20 | Adjust settings prefills Quick Fit correctly | Met (tested) |
| 21 | Normal mode switching does not overwrite manual values | Met (tested) |
| 22 | Already-ready WebP detection deterministic | Met (tested) |
| 23 | Already-ready files not unnecessarily re-encoded | Met |
| 24 | Unreachable distinct from failure | Met (tested) |
| 25 | Reset/replacement-file stale protection correct | Met (tested) |
| 26 | Preset selection keyboard accessible | Met (radio inputs + labels); not browser-automation verified |
| 27 | Responsive layout implemented | Met; not browser-automation verified |
| 28 | Privacy guarantees remain accurate | Met (audited) |
| 29 | No remote preset lookup exists | Met |
| 30 | No third-party/platform preset ships without sourcing | Met |
| 31 | No FSG-005 packaging functionality has begun | Met |
| 32 | Existing 202 core tests remain green | Met |
| 33 | Existing Quick Fit tests remain green | Met (91/91) |
| 34 | New preset/Guided Fit tests pass | Met (80/80) |
| 35 | Laravel tests pass | Met (8/8) |
| 36 | Typecheck passes under governed TS boundaries | Met |
| 37 | Production build passes | Met |
| 38 | HEIC remains lazy-loaded | Met (re-verified) |
| 39 | No project-owner manual QA required | Met |

Items 26/27 are implemented to spec but not independently confirmed by browser automation this sprint (see Known Limitations) — recorded honestly rather than claimed as verified.

## Next Milestone

FSG-005 — Packaging & Export Systems is NEXT and has not begun.

## Commit Reference

This report is included in the FSG-004 closeout commit:

`feat(web): add Guided Fit presets`

The authoritative commit SHA is recorded in Git history and in the post-commit closeout response.
