# FSG-005B Sprint Report — Website Logo Pack & Favicon Suite

## Milestone

FSG-005B — Website Logo Pack & Favicon Suite (see `docs/directives/FSG-005B.md`).

## Parent Milestone

FSG-005 — Packaging & Export Systems.

```text
FSG-005 — Packaging & Export Systems
├── FSG-005A — Multi-Output Packaging Foundation   ✅ CLOSED
└── FSG-005B — Website Logo Pack & Favicon Suite    (this sprint)
```

See "FSG-005 Parent Acceptance Audit" and "FSG-005 Closure Recommendation" below.

## Status

**FSG-005B: Complete. FSG-005 parent: Closed.** Implementation and verification are complete, including the Product Office completion-audit correction round: git history reconciliation, skill-tooling state correction, a governed four-skill design review, a `calculateContainPlan()` floor-rounding fix with required numeric evidence, and primary-ZIP-CTA object-identity test coverage. Closed by explicit Product Office approval; see "Commit Reference" for the closeout commit.

## Base Commit Before FSG-005B

`cf78599c8b6ae4a6b26dba0c8df935143bfccf7b` — the FSG-005A closeout commit (`feat(core): add multi-output packaging foundation`). This is where the `fsg-005b-website-logo-pack` branch was created from; it is no longer the branch's current tip — see "Current Branch / History Note" below.

## Current Branch / History Note

Pre-FSG-005B closeout HEAD: **`f49ae9ee74646b656da76176848c22435c1cb183`** on `fsg-005b-website-logo-pack`. Two commits landed directly on top of the FSG-005A base above, both authored by the project owner (`SilvestrLee <scodilu@gmail.com>`), independently verified via `git log`/`git show --stat`/`git show <sha> -- <file>` rather than taken on claim:

| Commit | Summary | What actually changed |
|---|---|---|
| `4ddb1c7` — `chore: register frontend design agent skills` | Commits the third-party skill lockfile; gitignores the skill payload directories | `.gitignore` (+12 lines: ignores `.agents/skills/` and each individual `.claude/skills/<name>/` directory, with the comment "Third-party agent skills — reproducible from skills-lock.json"); `skills-lock.json` (new file, +65 lines, committed and tracked) |
| `f49ae9e` — `chore: define frontend design skill routing` | Adds governed frontend design-review skill sequencing | `AGENTS.md` and `CLAUDE.md` (identical +18-line "### Frontend Design Skill Routing" subsection under "## Skills Activation" in both files, recommending `ui-ux-pro-max` → `design-taste-frontend` → `21st-*` → `impeccable` for significant new frontend surfaces) |

Neither commit touches any FSG-005B implementation file. This sprint's own FSG-005B changes landed directly on top of this HEAD, unmodified, as the `feat(web): add Website Logo Pack` closeout commit (see "Commit Reference") — nothing was reset, rebased, or replayed to produce it. See "Existing Working Tree Preservation" below.

## Existing Working Tree Preservation

No reset, stash, discard, or checkout was performed at any point during this correction round. `git status --short` before making any change in this pass showed the full, unmodified set of FSG-005B changes already produced earlier in this sprint (every file listed under "Automated Tests" and the Core/Product Boundary sections below) sitting on top of the new `HEAD`, exactly as left. This correction round only *added to* that existing work: the `calculateContainPlan()` floor-rounding fix (see "Fixed-Canvas Contain"), its accompanying test evidence, and this report's corrections. No prior FSG-005B file was reverted, recreated from scratch, or silently dropped.

## Branch

`fsg-005b-website-logo-pack`, created from the commit above.

## Objective

Build the first complete Website Logo Pack workflow: choose a logo → suitability guidance → generate header/favicon/icon assets → review generated files → download individually or as one ZIP → start again. All local, all browser-based, on top of the FSG-005A generic multi-output foundation.

## Product Surface

Website Logo Pack ships as a third first-class product mode — **Logo Pack** — alongside Quick Fit and Guided Fit in the same accessible tablist ("Prepare your website logo files."). It is not buried in a marketing section; it lives in the same dominant workspace as the other two modes. Public positioning: "Creates practical website logo and icon files from your existing logo." No claims of automatic background removal, brand redesign, or guaranteed universal compatibility appear anywhere (directive §46).

## Logo Pack Architecture

`processImageSet()` (FSG-005A) is reused unchanged as the execution engine — no `GuidedFitWorker`/`LogoPackWorker`/second processing architecture was created. `resources/js/logo-pack/compiler.ts` compiles the one authoritative asset catalog (`spec.ts`) into a `ProcessImageSetOptions`; `logo-pack-controller.ts` is a DOM-free orchestration class that composes the *same shared* `QuickFitWorkflow` instance Quick Fit/Guided Fit use — only to read the currently selected source — and drives its own `processImageSet()` job directly (Logo Pack's request shape has nothing to do with Quick Fit's `QuickFitRequirements` contract, so it doesn't go through `workflow.run()`).

## Core/Product Boundary

`@filesetgo/core` gained exactly two new *generic* capabilities, with zero knowledge of "logo," "favicon," "header," or "Logo Pack":

- `transforms/contain.ts` — `calculateContainPlan()`, a fixed-canvas CONTAIN primitive (source → contain → fixed canvas), reusable by any future workflow.
- `icons/ico.ts` — `createIco()`/`validateIcoContainer()`, a small, dependency-free ICO container reader/writer named after the file format, not any product concept.

All Logo Pack-specific knowledge — the exact seven-asset composition, geometry/resolution suitability thresholds, controlled-upscale policy, asset explanations — lives entirely in `resources/js/logo-pack/`, mirroring the `resources/js/presets/` boundary FSG-004 established. See `docs/governance/DECISIONS.md` ADR-018 for the full architectural record.

## Shared Source State

Logo Pack reads the same `QuickFitWorkflow`-owned source (file + preflight) Quick Fit and Guided Fit already share — it never triggers a second `selectFile()`/preflight, and switching to/from Logo Pack does not touch the selected file. `GuidedFitController` (FSG-004) remains the single owner of workspace-mode state; its `QuickFitMode` type gained a third `'logo-pack'` value and its constructor gained an optional `isExternallyBlocked` callback (`controller.ts` wires it to `() => logoPack.getState().status === 'processing'`) so mode-switching is blocked while *either* a Quick-Fit/Guided-Fit job *or* a Logo Pack job is active — without `GuidedFitController` importing `LogoPackController` directly.

## Suitability Assessment

`resources/js/logo-pack/suitability.ts` runs entirely from preflight facts (format/width/height) — no decode, no AI, no visual-quality estimation:

- **Resolution** (`assessResolution`): the required scale factor to fill the 512px icon canvas at 90% content scale, computed via `calculateContainPlan(..., allowUpscale: true).scale` — `≤1` → good, `1–4×` → warning (generation proceeds), `>4×` → **blocking** (generation refused, "This logo is too small to create a useful 512 px website icon. Try a larger source file.").
- **Geometry** (`assessGeometry`): `longerEdge / shorterEdge > 2.5` → warning ("...may appear small inside square favicon and app-icon files..."), never a crop, never blocking.
- **Transparency** (`assessTransparencyGuidance`): JPEG gets an explicit "won't remove the existing background" note; PNG/WebP get a conditional "if your source already contains transparency..." note — never an assertion that transparency exists.
- **Header resolution** (`assessHeaderResolution`): an informational note when the source can't naturally fill the 800×240 high-density header box.

Only the resolution "too-small" case blocks the **Create logo pack** button; every other issue is shown but never prevents generation (directive §26/§27).

## Geometry Guidance

See "Suitability Assessment" above. Threshold recorded in `docs/governance/DECISIONS.md` ADR-018: `GEOMETRY_WARNING_ASPECT_RATIO = 2.5`. Verified numerically at the exact boundary (2.5 → no warning) and just above it (→ warning) in `suitability.test.ts`.

## Resolution/Upscale Rules

`ICON_CONTENT_SCALE = 0.90`, `MAX_ICON_UPSCALE_FACTOR = 4` (ADR-018). Every square icon/favicon output is compiled with `allowUpscale: true` — a narrow, explicit exception to FileSetGo's general no-upscale convention — made safe because the suitability check above refuses to start any processing at all once the required factor exceeds 4×. This is a genuine pre-processing gate, not merely a UI warning: `LogoPackController.createLogoPack()` itself re-checks `assessLogoPackSuitability(...).blocked` before calling `processImageSet()`.

## Transparency/Background Behavior

No background removal, no automatic trim, no pixel-scanning subject extraction anywhere (directive §11/§12). "For the best icon result, use a tightly cropped logo or icon file" style guidance was intentionally omitted from this sprint's copy in favor of the governed transparency/geometry messages already specified by the directive; the source's existing whitespace/background is always preserved as-is.

## Header Outputs

`logo-header.png` (≤400×120) and `logo-header@2x.png` (≤800×240) both use the existing FSG-001 resize-fit primitive (`RasterImageSetOutputSpec` + `resize`) — preserve aspect ratio, no crop, no stretch, no upscale beyond source resolution. Verified: both bounding boxes enforced exactly, aspect ratio preserved, no upscale (`spec.test.ts`).

## Fixed-Canvas Contain

`packages/core/src/transforms/contain.ts`'s `calculateContainPlan()` — pure, deterministic, numerically tested (`contain.test.ts`, 14 tests): landscape/portrait/square centering, exact canvas dimensions preserved regardless of source aspect ratio, 90% content-scale enforcement, `allowUpscale: false` clamps to 1×, `allowUpscale: true` scales up to fill the content area, fully deterministic for identical inputs. Rendering (`workers/process-image-set.ts`'s `drawBitmapContained()`) reuses the existing FSG-001 `scaledTransform()` helper unchanged, only adding a centering offset.

**Correction landed this round:** the content box a source may occupy (`canvasWidth * contentScale`) was previously used as a **fractional** value directly in the scale computation (e.g. `512 * 0.9 = 460.8` fed straight into `availableWidth / sourceWidth`). This is not equivalent to a floor-rounded integer content box, and the Product Office's completion definition requires the latter: `contentBoxWidth = floor(canvasWidth * 0.90)`. Fixed narrowly — `availableWidth`/`availableHeight` are now `Math.floor(canvasWidth * contentScale)` / `Math.floor(canvasHeight * contentScale)` before anything derives from them — without introducing any icon/Logo Pack-specific concept into this generic primitive (the fix is phrased purely in terms of "canvas," "content box," and "scale," identical to the rest of the module). Required evidence, now asserted directly in `contain.test.ts`'s new `'deterministic floor-rounded content box'` block (a square source matching a square canvas at `allowUpscale: true` makes `drawWidth`/`drawHeight` equal to the content box exactly, proving the box itself was floored rather than merely a draw dimension coincidentally landing on a whole number):

| Canvas | `floor(canvas * 0.90)` | Verified `drawWidth`/`drawHeight` |
|---|---|---|
| 32px | 28 | 28 |
| 180px | 162 | 162 |
| 192px | 172 | 172 |
| 512px | 460 | 460 |

A dedicated test also asserts `drawWidth` is *not* `toBeCloseTo(460.8, 5)` for the 512px case, directly disproving the fractional-basis equivalence the Product Office message warned against. All nine pre-existing `contain.test.ts` assertions that depended on the old fractional behavior (e.g. `drawWidth` of `460.8`/`230.4`, `offsetY` of `512 * 0.05`) were updated to their correct floored values (`460`/`230`, `26`) — the tests were adjusted to the corrected implementation, not the other way around. `resources/js/logo-pack/suitability.ts`'s `assessResolution()`/`assessHeaderResolution()` consume `calculateContainPlan()`'s `.scale` output; both were re-checked against the fix — the required-upscale-factor shifts by less than 0.2% at realistic source sizes and no existing `suitability.test.ts` boundary case sits close enough to flip (verified by hand: the "just under 4×"/"blocks over 4×" boundary tests use 116px/100px sources, both several percentage points clear of the threshold either way). `docs/governance/DECISIONS.md` ADR-018 is updated to record the floor-rounded formula as authoritative.

## Square Icon Outputs

`favicon-32x32.png` (32×32), `apple-touch-icon.png` (180×180), `icon-192x192.png` (192×192), `icon-512x512.png` (512×512) — all `ContainImageSetOutputSpec`, all PNG, all `ICON_CONTENT_SCALE = 0.90`, transparent background, no rounded corners or baked-in iOS styling. Each verified to produce an asset at *exactly* the requested canvas size regardless of source aspect ratio (`process-image-set.test.ts`).

## ICO Architecture

`packages/core/src/icons/ico.ts` — `createIco()` builds a valid `ICONDIR` + `ICONDIRENTRY[]` + PNG-compressed payloads container (reserved=0, type=1, little-endian fields, deterministic entry order). `favicon.ico` is compiled as one `IcoImageSetOutputSpec` with three independently CONTAIN-rendered entries (16/32/48px — `resources/js/logo-pack/spec.ts`'s `ICO_ENTRY_SIZES`, a *product* decision, not enforced by the generic core writer). No BMP/DIB legacy encoding. No new dependency — the writer is entirely FileSetGo-owned, self-contained, and small (see Bundle Observation).

## ICO Validation

`validateIcoContainer()` independently re-parses raw ICO bytes from scratch (header, type, count, every directory entry's bounds/offsets/lengths, every embedded payload's PNG signature and IHDR dimensions) — it never trusts `createIco()`'s own internal state. `process-image-set.ts` additionally confirms the validated entries match the *requested* sizes before accepting the asset. Either check failing fails the *entire* Logo Pack job (`ICO_VALIDATION_FAILED`), never just omits `favicon.ico`. 17 dedicated tests (`icons/ico.test.ts`) including 11 deliberate-corruption cases (bad reserved field, wrong type, zero count, truncated directory, out-of-bounds payload, invalid PNG signature, dimension mismatch, zero-length entry) plus confirmation that the *generic* validator accepts other valid entry sets (it does not itself enforce 16/32/48 — that's the product layer's job).

## Exact Package Contents

Exactly seven public assets, in this exact order, verified in `spec.test.ts` and via a real ZIP round-trip in `process-image-set.test.ts`'s mixed-pack test: `logo-header.png`, `logo-header@2x.png`, `favicon.ico`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192x192.png`, `icon-512x512.png`. No README, no `site.webmanifest`/`browserconfig.xml`, no HTML snippet — deliberately deferred (directive §44/§45; complete manifest metadata needs site/application context FileSetGo doesn't have yet). `favicon.ico`'s internal 16px/48px intermediates are never exposed as separate public assets or ZIP entries — confirmed by `result.assets`/`result.assetCount` staying at the count of *requested* outputs (7), never 9.

## One-Decode Reuse

The full seven-asset pack — both headers, all four square icons, and all three ICO entries — decodes the source exactly once. Verified directly: `bitmapCreateCount` stays at 1 across a mixed raster+contain+ico request in `process-image-set.test.ts`, and again for a dedicated ICO-only multi-entry test.

## Sequential Rendering

Outputs (and, within the ICO output, its individual entries) are generated strictly one at a time — each canvas is released (`width = 0; height = 0`) before the next is created, via the shared `releasePreviousCanvas()` helper already used by FSG-005A's raster path, now shared by the `'contain'` and `'ico'` branches too. No more than one active render canvas exists at any point during a Logo Pack job.

## ZIP Packaging

Unchanged from FSG-005A: worker-side `createZipArchive()` (STORE, deterministic fixed `mtime`), `application/zip` MIME, archive filename `<safe-basename>-filesetgo-logo-pack.zip` (`spec.ts`'s `buildArchiveFilename()`, reusing the same strip-extension/fallback-to-a-default pattern as Quick Fit's `buildOutputFilename()`). Real `unzipSync()` round-trip confirms exactly the seven requested entries, correct filenames, correct bytes, correct order, no hidden entries.

## Individual Downloads

`controller.ts` creates one `Blob` object URL per asset (plus one for the ZIP) only when a *new* Logo Pack result arrives (compared by object reference against the last-rendered result), and revokes all of them before creating new ones or on source replacement/reset/`pagehide`. Each download link's accessible name is the actual filename (`aria-label="Download favicon.ico"`, etc.) — never a generic "Download" repeated seven times (directive §53).

## Primary ZIP Experience

The Logo Pack success state has exactly one visually primary action: `#logo-pack-download-zip` ("Download logo pack"), styled identically to every other primary CTA in the app (`bg-blue-700` filled button, `min-h-11`). The seven individual per-asset downloads in `#logo-pack-assets` are styled as secondary (`border-zinc-300`, no fill) and rendered below the primary CTA in DOM order. Verified directly in `controller.ts`'s `renderLogoPack()`: `logoPackZipUrl = URL.createObjectURL(result.archive.blob)` — `result` is `outcome.result`, the exact, untouched `ImageSetResult` returned by `LogoPackController`'s `processImageSet()` job (traced through `logo-pack-controller.ts`: `this.setState({ status: 'success', result: outcome.result })`, no intermediate transformation). **The archive Blob is never rebuilt in the UI layer** — `fflate`'s `zipSync`/`unzipSync` do not appear anywhere in `resources/js/`, confirmed both by source grep and, structurally, by the bundle inspection below (`zipSync`/`unzipSync` markers are absent from `app-*.js`). Coverage sits at the DOM-free product-logic boundary already established for Logo Pack. `logo-pack-controller.test.ts`'s "resolves to a success state with the real result" test was strengthened this round with explicit object-identity assertions (`expect(state.result).toBe(result)`, `.archive`, `.archive.blob`) proving `LogoPackController` surfaces the job's own resolved `ImageSetResult` — including its archive Blob — untouched, not a copy or reconstruction; previously this test only checked `status === 'success'`, not identity. `process-image-set.test.ts`'s mixed-pack test independently proves the core's own `result.archive.blob` round-trips through a real `unzipSync()` to exactly the seven requested entries — together the two tests prove the archive the UI links to is the one the core engine actually built.

## Cancellation / Stale Protection

Cancellation is checked at every documented checkpoint inherited from FSG-005A's `processImageSetInWorker()` (before decode, after decode, before/during/after each output — including each ICO entry — before and after archive creation, before final publication). `LogoPackController` clears its own state (cancelling any active job, discarding any result) whenever the shared `QuickFitWorkflow` transitions to `'inspecting'` (new file selected) or `'idle'` (reset) — the identical pattern `GuidedFitController` already uses for its own preset-result staleness. A cancelled or superseded job can never later surface as a completed pack.

## Accessibility

The mode tablist now has three tabs with full roving-tabindex `ArrowLeft`/`ArrowRight` keyboard cycling (wrapping at both ends), correct `aria-selected`/`aria-controls`. Suitability issues are plain text list items (never color-only), with `role="alert"` reserved for the blocking case and `role="status"` for informational/warning ones. Individual asset downloads carry meaningful `aria-label`s. Success/failure/cancellation are announced through the existing shared `aria-live="polite"` status announcer.

## Responsive Behavior

The Logo Pack panel reuses the same responsive container/typography conventions as Quick Fit/Guided Fit (no new breakpoints introduced); the suitability-issue list and asset-result list are simple stacked flex columns, so they stack naturally on narrow viewports without a forced multi-column grid. Not independently confirmed by browser automation this sprint (see Known Limitations).

## Privacy

Repository-wide `grep` for `fetch(`/`XMLHttpRequest`/`sendBeacon`/`axios`/`FormData`/`multipart` across `packages/core/src/`, `resources/js/`, and `resources/views/welcome.blade.php` found only the pre-existing, unmodified HEIC WASM `fetch()`. Logo Pack transmits nothing: no source image, no generated files, no filename, no selected mode, no suitability assessment. No analytics were added.

## Server Boundary

`routes/web.php` is unchanged (`GET /` only). New Laravel tests confirm no ZIP endpoint, no favicon-generation endpoint, and no Logo Pack upload route exist. All asset generation, ICO assembly, and ZIP creation happen entirely in the browser worker.

## Automated Tests

**New/extended core tests:**

| File | Tests | Covers |
|---|---|---|
| `tests/transforms/contain.test.ts` | 14 | Centering (landscape/portrait/square), exact canvas size, aspect-ratio preservation, upscale clamp on/off, determinism, non-square canvas, deterministic floor-rounded content box (32/180/192/512px evidence) |
| `tests/icons/ico.test.ts` | 17 | Entry order/count, header fields, offsets/lengths, PNG signature/dimension embedding, determinism, 256px convention, 11 corruption-rejection cases, generic-validator non-enforcement of 16/32/48 |
| `tests/workers/process-image-set.test.ts` (extended) | +8 | `'contain'`-kind exact canvas size, contain validation failure, sequential contain rendering; `'ico'`-kind valid asset shape, one-decode-for-multi-entry, ICO validation failure, no internal-entry leakage; mixed raster+contain+ico pack (one decode, order, archive) |
| `tests/processing/validate-image-set-request.test.ts`, `tests/runtime/worker-client.test.ts` | (updated in place) | Adapted to the new discriminated-union contract; behavior unchanged |

**New product-layer tests** (`resources/js/logo-pack/tests/`, DOM-free per ADR-016's established pattern):

| File | Tests | Covers |
|---|---|---|
| `spec.test.ts` | 16 | Exact 7-asset composition/order, unique ids/filenames, header bounds, square dimensions, content scale, ICO entry sizes, archive filename generation |
| `suitability.test.ts` | 15 | Resolution good/warning/blocking boundaries, geometry 2.5 threshold (exact + over), JPEG/PNG/WebP transparency guidance, header-resolution warning, aggregate blocking logic |
| `compiler.test.ts` | 3 | Compiled request matches the catalog, archive filename derivation, progress-callback forwarding |
| `logo-pack-controller.test.ts` | 12 | Suitability reflects current source, `createLogoPack()` compiles+runs via `processImageSet()`, blocked suitability prevents generation, no second job while processing, cancellation, success/failure resolution (including object-identity proof that the surfaced result and its archive Blob are the job's own, not a copy — see "Primary ZIP Experience"), stale-result clearing on file replacement, no re-preflight / no `workflow.run()` side effect, reset |

## Laravel Tests

`php artisan test --compact`: **10/10 passing, 22 assertions** (8 pre-existing + 2 new: Logo Pack entry point present; no ZIP/favicon-generation/Logo-Pack-upload route exists).

## Regression Baseline

`npm run test:core`: **304/304 passing** (265 pre-FSG-005B + 14 contain + 17 ico + 8 new process-image-set FSG-005B sections). The 9→14 `contain.test.ts` growth is this correction round's floor-rounding fix and its required evidence (see "Fixed-Canvas Contain"); every other count is unchanged from the original FSG-005B implementation pass. No pre-existing core test's *behavior* changed — `validate-image-set-request.test.ts` and `worker-client.test.ts` needed mechanical `kind: 'raster'` additions to their fixtures for the new discriminated-union contract, nothing more.

`npm run test:ui`: **217/217 passing** (171 pre-FSG-005B + 46 Logo Pack product-layer tests). Count unchanged this round — `logo-pack-controller.test.ts`'s existing "resolves to a success state" test was strengthened in place with object-identity assertions (see "Primary ZIP Experience"), not added to. No Quick Fit/Guided Fit test changed.

`php artisan test --compact`: **10/10 passing, 22 assertions** — unchanged; no Laravel file was touched this correction round.

## Production Build

`npm run build` succeeds. Re-verified this correction round from a fully clean state: `npm ci` (fresh `node_modules` from the committed lockfile, 0 vulnerabilities) followed by `rm -rf public/build node_modules/.vite` and `npm run build` — results reproducible.

## Bundle Observation

**Correction landed this round:** the `app-*.css` row below was previously reported as `39.05 kB` (`+13.11 kB`). A fresh `npm ci` + clean rebuild this round measured `app-*.css` at **25.94 kB — byte-for-byte identical to the FSG-005A baseline**, not larger. The earlier figure was wrong; this table now reflects the freshly re-verified truth rather than carrying the earlier number forward. The explanation is consistent with the "Design Skill Review" finding that Logo Pack's markup reuses sibling panels' existing Tailwind utility classes rather than introducing new ones: Tailwind v4's JIT scanner has nothing new to compile into CSS when every class string (`rounded-xl`, `border-zinc-200`, `min-h-11`, `bg-blue-700`, etc.) was already present in Quick Fit/Guided Fit markup — confirmed directly by grepping the compiled `app-*.css` for `min-h-11` (present, from Logo Pack's own buttons) while the overall byte count still matches the pre-Logo-Pack baseline exactly.

| Asset | FSG-005A closeout | FSG-005B (re-verified) | Delta |
|---|---|---|---|
| `app-*.js` | 52.18 kB | 62.19 kB | +10.01 kB |
| `app-*.css` | 25.94 kB | 25.94 kB | +0.00 kB (corrected — see above) |
| `image.worker-*.js` | 28.42 kB | 32.38 kB | +3.96 kB |
| `zip-adapter-*.js` (hash `BOagJ5MW`) | 9.12 kB | 9.12 kB (identical hash) | unchanged |
| `heic-decode-*.js` (hash `CIxd_bUO`) | 32.54 kB | 32.54 kB (identical hash) | unchanged |
| `heic_dec-*.wasm` (hash `ojH1Dp2m`) | 959.55 kB | 959.55 kB (identical hash) | unchanged |

`app.js` growth covers the entire Logo Pack product layer (spec/suitability/compiler/controller) plus the third-tab UI wiring; `image.worker.js` growth is the new `contain.ts` primitive + `icons/ico.ts` writer/validator + the worker's new `'contain'`/`'ico'` render branches — no new dependency contributed to either. `zip-adapter`/`heic-decode`/`heic_dec.wasm` chunk hashes are **byte-for-byte identical** to FSG-005A's closeout, confirming Logo Pack introduced zero changes to the archive or HEIC lazy-loaded code paths themselves.

## HEIC Lazy-Load Regression

Re-verified this round from the clean `npm ci` rebuild: `app-*.js` and `image.worker-*.js` contain zero HEIC decoder glue markers (`libde265`, `wasmBinaryFile`, `instantiateWasm`); present only in the untouched, identically-hashed `heic-decode-*.js` chunk. HEIC input to Logo Pack reuses the exact same `decodeSourceToBitmap()` HEIC branch every other worker path already uses.

## Archive Lazy-Load Regression

Re-verified this round from the clean `npm ci` rebuild: `zipSync`/`unzipSync` and `fflate` identifier markers are absent from both `app-*.js` and `image.worker-*.js`; the `zip-adapter-*.js` chunk itself (hash `BOagJ5MW`, 9.12 kB) is byte-for-byte identical to the FSG-005A baseline — this is stronger evidence than a literal identifier-string search inside that chunk, since minification renames `fflate`'s internal function names to single letters and a literal `zipSync`/`unzipSync` match inside the minified chunk itself is not expected either way. `grep -rln "processImageSet" resources/js/` (excluding `tests/`) shows it is invoked *only* from `resources/js/logo-pack/compiler.ts` and `resources/js/logo-pack/logo-pack-controller.ts` (plus the necessary `resources/js/quick-fit/core-client.ts` re-export) — Quick Fit and Guided Fit never call it, so visiting any tab before pressing **Create logo pack** never triggers the archive chunk fetch.

## Design Skill Review

Per the governance the project owner committed directly to `AGENTS.md`/`CLAUDE.md` in `f49ae9e` ("### Frontend Design Skill Routing" — see "Current Branch / History Note"), the four recommended skills were invoked in sequence against the existing, already-implemented Logo Pack UI (`welcome.blade.php`'s `#logo-pack-panel`, `controller.ts`'s `renderLogoPack()`). This was an audit of shipped work, not new design — no redesign was performed to "prove a skill was used"; only genuine findings would have produced changes.

| Skill | Scope reviewed | Outcome |
|---|---|---|
| `ui-ux-pro-max` | Workflow clarity, information hierarchy, accessibility, warning-vs-blocking distinction, touch/mobile interaction | No defect found. Confirmed: severity-differentiated suitability issues (`role="alert"` for blocking, `role="status"` for warning/info, distinct red/amber/neutral text color — never color-only), `min-h-11` (44px) touch targets throughout, 8px+ gaps between adjacent controls, primary CTA visually distinct from secondary downloads. |
| `design-taste-frontend` | Composition, typography, spacing, restraint, generic-AI-styling avoidance | No defect found. Confirmed `#logo-pack-review`/`#logo-pack-result` reuse the *exact* card styling every sibling panel already uses (`rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900`) — one shape system, one palette, no new visual language introduced. This skill's rules are largely scoped to marketing/landing pages (its own "Out of Scope" section); the Logo Pack panel is a functional tool surface, so only its restraint/consistency guidance was applicable, and it passed. |
| `21st-ui-review` | Component-level defects: semantic controls, keyboard/focus, touch targets, responsive overflow, duplicate primitives, hardcoded values vs. tokens | The skill's own `21st` CLI (`21st review <path>`) is not installed in this environment and there is no `.21st/design.json` in this repository — this is recorded honestly rather than silently skipped. Its documented fallback (steps 3–5 of its own workflow: inspect composition and runtime states directly against code) was performed instead: confirmed reuse of shared `formatBytes`/`formatLabel` formatting helpers (no duplicated formatting logic), no duplicate list-item primitive introduced beyond the existing imperative-DOM pattern `controller.ts` already uses elsewhere, `aria-label` present on every download control. The skill's own mechanical detector (below, via `impeccable detect`) independently corroborated a clean result. |
| `impeccable` | Final polish: consistency, accessibility, responsiveness, interaction finish | `impeccable context --target resources/views/welcome.blade.php` reported no product/design authority file exists for this skill specifically (`NO_PRODUCT_MD`); per its own routing rules this does not block a scoped review of existing code, only its `init`/`new-work` flows. Ran its mechanical detector directly: `impeccable detect --json resources/views/welcome.blade.php resources/js/quick-fit/controller.ts` → `[]` (zero findings). Manual polish-pass review (its `polish.md` playbook §4–5: flow/hierarchy, layout/type, color/imagery, interaction/state) found every control already has default/hover/focus/active/disabled states, dark-mode variants throughout, and no accidental churn. |

**Material findings:** none. **Changes made because of findings:** none — the existing implementation already satisfied every check across all four skills. **Deferred to FSG-006:** real-browser/device confirmation of keyboard focus order, touch interaction, and responsive stacking (unchanged from this sprint's pre-existing "Known Limitations" entry below — no design skill raised anything new requiring deferral). **Final review outcome:** the shipped Logo Pack UI passes the governed design review without modification.

## Known Limitations

- **Browser automation was not exercised this sprint**, consistent with the pattern recorded since FSG-003 — all verification here is automated-test- and build-inspection-based, per ADR-013. Mode-tab keyboard cycling across three tabs, suitability-review rendering, and responsive stacking are implemented to spec and covered by DOM-free logic/orchestration tests, but not independently confirmed by a real browser session.
- **The `21st` CLI is not installed in this environment** (see "Design Skill Review"); its deterministic scan step was substituted with a manual code-level review per the skill's own documented fallback, and independently corroborated by `impeccable`'s mechanical detector returning zero findings.
- Per directive §75, `docs/product/PRODUCT.md` was updated to accurately record that Website Logo Pack shipped as its own peer product-mode tab (per directive §7) rather than as a Guided Fit preset, which is how the pre-existing product framing originally described it. This is recorded as a factual update, not silently smoothed over.

## FSG-005B Acceptance Audit (directive §74)

| # | Criterion | Status |
|---|---|---|
| 1 | Logo Pack is a real public product mode | Met |
| 2 | Shares selected source with Quick/Guided Fit | Met (tested) |
| 3 | No unnecessary re-preflight on mode changes | Met (tested) |
| 4 | Suitability review occurs before processing | Met |
| 5 | >2.5 aspect-ratio guidance works | Met (tested, exact boundary) |
| 6 | Controlled icon upscaling is assessed | Met (tested) |
| 7 | >4× required icon upscale blocks generation | Met (tested) |
| 8 | No automatic crop exists | Met |
| 9 | No automatic trim exists | Met |
| 10 | No background removal exists | Met |
| 11 | Generic fixed-canvas contain exists | Met (tested) |
| 12 | 90% icon content scale is enforced, deterministically floor-rounded | Met (tested — 32/180/192/512px evidence; see "Fixed-Canvas Contain") |
| 13 | Header standard output is correct | Met (tested) |
| 14 | Header high-density output is correct | Met (tested) |
| 15 | favicon-32x32.png is exactly 32×32 | Met (tested) |
| 16 | apple-touch-icon.png is exactly 180×180 | Met (tested) |
| 17 | icon-192x192.png is exact | Met (tested) |
| 18 | icon-512x512.png is exact | Met (tested) |
| 19 | favicon.ico is valid | Met (tested) |
| 20 | favicon.ico contains 16/32/48 PNG entries | Met (tested) |
| 21 | ICO validation exists | Met (tested, 11 corruption cases) |
| 22 | Full source decodes only once | Met (tested) |
| 23 | Rendering remains sequential | Met |
| 24 | Exactly seven public assets are returned | Met (tested) |
| 25 | ZIP contains exactly those seven assets | Met (tested, real unzip) |
| 26 | No transient ICO PNGs leak into ZIP | Met (tested) |
| 27 | Individual files can be downloaded locally | Met |
| 28 | ZIP can be downloaded locally | Met |
| 29 | Blob URLs are cleaned up | Met |
| 30 | Cancellation works | Met (inherited + re-verified) |
| 31 | Stale result protection works | Met (tested) |
| 32 | HEIC input works | Met (tested) |
| 33 | HEIC remains lazy-loaded | Met (re-verified) |
| 34 | fflate remains lazy-loaded | Met (re-verified) |
| 35 | No server upload/package endpoint exists | Met (audited + tested) |
| 36 | Privacy boundary remains intact | Met (audited) |
| 37 | No manifest is generated | Met |
| 38 | No FSG-006 work begins | Met |
| 39 | Existing core tests remain green | Met (304/304, no pre-existing behavior regressed) |
| 40 | Existing UI tests remain green | Met (217/217) |
| 41 | New core/Logo Pack tests pass | Met (39 new core [34 original + 5 floor-rounding evidence] + 46 new UI) |
| 42 | Laravel tests pass | Met (10/10) |
| 43 | Typecheck passes | Met |
| 44 | Production build passes | Met |
| 45 | FSG-005 parent acceptance audit is completed | Met — see below |
| 46 | No project-owner manual QA is required | Met |
| 47 | Governed design-skill review completed (`ui-ux-pro-max`, `design-taste-frontend`, `21st-ui-review`, `impeccable`) | Met — see "Design Skill Review"; no defects found, no changes required |
| 48 | Primary ZIP CTA downloads the archive Blob returned by `processImageSet()` directly, not a UI-rebuilt ZIP | Met (tested — object-identity assertions; see "Primary ZIP Experience") |

Mode-tab keyboard cycling and responsive stacking are implemented to spec but were not independently confirmed by browser automation this sprint — recorded honestly in Known Limitations rather than claimed as verified.

## FSG-005 Parent Acceptance Audit (directive §73)

| Parent requirement | Status |
|---|---|
| Generic image-set processing | Met (FSG-005A) |
| One-decode multi-output architecture | Met (FSG-005A, extended by FSG-005B's contain/ico kinds) |
| JPEG/PNG/WebP raster assets | Met |
| Generic fixed-canvas contain | Met (FSG-005B) |
| ICO output capability | Met (FSG-005B) |
| Worker-side ZIP creation | Met (FSG-005A) |
| Safe archive filenames | Met (FSG-005A) |
| Deterministic package ordering | Met (FSG-005A, re-verified for the 3-kind mix) |
| Package limits | Met (FSG-005A limits remain authoritative, unmodified) |
| Individual output metadata | Met |
| Local ZIP result | Met |
| Website Logo Pack public workflow | Met (FSG-005B) |
| Favicon suite | Met (FSG-005B) |
| Individual local downloads | Met (FSG-005B) |
| Package local download | Met (FSG-005B) |
| Cancellation | Met |
| Stale-result protection | Met |
| Local-only processing | Met |

## FSG-005 Closure Recommendation

Every parent requirement above is satisfied. **FSG-005 — Packaging & Export Systems is CLOSED**, alongside FSG-005B itself, by explicit Product Office approval.

## Next Milestone

**FSG-006 — Hardening, Mobile QA & Compatibility is NEXT and has not begun.** No FSG-006 work exists in this sprint's changes.

## Commit Reference

This report is included in the FSG-005B / FSG-005 closeout commit:

`feat(web): add Website Logo Pack`

The authoritative commit SHA is recorded in Git history and in the post-commit closeout response. `skills-lock.json` is already committed (in `4ddb1c7`, below the closeout commit) and required no staging action of its own; the gitignored skill *payload* directories (`.agents/skills/`, `.claude/skills/<name>/`) were not staged.
