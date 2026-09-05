# FileSetGo Decision Register

This register contains accepted FileSetGo architecture and product decisions. ADR identifiers are unique and must not be reused.

## ADR-001 — Worker-first processing

**Status:** Accepted

Heavy image processing runs in a browser worker. The UI thread may coordinate jobs and render progress, but it must not perform unrestricted decoding, pixel scans, resizing, repeated compression, or full image transforms.

## ADR-002 — Thin Laravel layer

**Status:** Accepted

Laravel owns the product shell, routes, pages, SEO, copy, legal surfaces, and future host policy. It does not own V1 browser-side raster-processing algorithms or introduce premature backend transformation abstractions.

## ADR-003 — Shared `@filesetgo/core` package

**Status:** Accepted

Reusable preflight, safety, worker, processing, validation, and error primitives live in the TypeScript package `@filesetgo/core`. FileSetGo and approved integrations consume the same package.

## ADR-004 — Provisional 15 MB / 24 MP limits

**Status:** Accepted

The initial hard source-file limit is 15 MB and the initial decoded-pixel limit is 24,000,000 pixels. Exactly 6000 × 4000 pixels is accepted. These are provisional engineering defaults pending FSG-006 device benchmarking.

## ADR-005 — HEIC/HEIF input in V1

**Status:** Accepted

HEIC/HEIF is required as a V1 input format. Its implementation must be browser-side, worker-compatible, and lazy-loaded. No specific decoder library is locked until maintenance, security, license, and memory characteristics are evaluated.

## ADR-006 — SVG deferred

**Status:** Accepted

Arbitrary SVG processing is excluded from V1 until a dedicated architecture addresses sanitization, embedded content, external references, fonts, and rasterization behavior.

## ADR-007 — No automatic whitespace trim

**Status:** Accepted

FileSetGo must not automatically remove whitespace or transparent padding as a universal behavior. Trimming is an explicit, previewable operation or preset rule because whitespace can be intentional content.

## ADR-008 — No blind favicon crop

**Status:** Accepted

FileSetGo must not blindly square-crop unsuitable horizontal logos. Guided favicon flows should prefer a square or icon source and provide deterministic suitability guidance.

## ADR-009 — Single active heavy job

**Status:** Accepted

The initial runtime limit is `MAX_ACTIVE_HEAVY_JOBS = 1`. Concurrency may change only after measured device and memory evidence supports a new limit.

## ADR-010 — Zero server ingestion for supported V1 paths

**Status:** Accepted

Supported V1 files are processed entirely on the user's device. Source files, generated outputs, filenames, EXIF metadata, image binaries, and arbitrary image content are not sent to FileSetGo servers or analytics.

## ADR-011 — Keryon package integration

**Status:** Accepted

Keryon consumes `@filesetgo/core` in the browser and uploads only user-approved generated assets to its own storage or CDN. Keryon concepts, authorization, storage, pricing, and cross-promotion remain host responsibilities and do not enter the core package.

## ADR-012 — Canonical `SPRINT_REPORT.md`

**Status:** Accepted

The repository-root `SPRINT_REPORT.md` is the canonical current sprint or checkpoint report. It is overwritten only for a formally governed report; prior versions remain in Git history. Parallel current sprint-report files are not created.

## ADR-013 — Agent-owned routine verification; FSG-006 owns compatibility certification

**Status:** Accepted

Routine sprint verification is the coding agent's responsibility, not the user's. Agents must not ask a human to perform manual QA that the agent can reasonably perform itself — opening DevTools, inspecting network requests, clicking through an engineering proof interface, running browser test cases, verifying image outputs, testing cancellation, or inspecting console errors. Agents instead run the strongest verification available in their environment: unit/integration tests, TypeScript checking, Laravel/PHPUnit tests, production builds, lint/static analysis, and automated browser tooling (Playwright, Claude in Chrome, or equivalent) when usable.

Inability to obtain a manually operated physical browser/device session does not, by itself, block a sprint from closing. Comprehensive real-device and cross-browser compatibility certification (iOS Safari, Android Chrome, Safari desktop, Chrome, Firefox, Edge, memory-pressure and repeated-processing testing) remains assigned to **FSG-006 — Hardening, Mobile QA & Compatibility** and is not a closure requirement for earlier milestones. Earlier milestones should still use browser automation wherever the environment supports it.

## ADR-014 — HEIC/HEIF decoder: `@discourse/heic`

**Status:** Accepted

**Supersedes:** the FSG-001B sprint report's provisional recommendation of `heic-to`. `heic-to` is not technically defective; it was simply not selected. It was never installed in the working tree at any point covered by this decision — its FSG-001B "recommended candidate" status is superseded before any implementation was built against it.

**Chosen decoder:** `@discourse/heic` (npm), pinned at exact version **`1.0.0`** in `packages/core/package.json` (no caret range, to prevent an unreviewed upgrade — `@discourse/heic` has published only this one version, so there is currently nothing to float to, but the declaration is pinned on principle).

**License:** Apache-2.0. No copyleft/LGPL compliance obligations, unlike `heic-to` or `libheif-js`.

**Upstream/provenance:** `@discourse/heic` is Discourse's own npm-scoped publish of the HEIC decoder from `jamsinclair/jSquash` pull request [#101](https://github.com/jamsinclair/jSquash/pull/101) ("HEIC decoder"), opened 2026-03-30 and, as of this decision, still **open and unmerged** upstream (last upstream activity 2026-04-28). Discourse published their fork as `@discourse/heic@1.0.0` on 2026-05-07 — a single release, no patches since. Despite the unmerged upstream status, the package has substantial real-world usage: 33,720 weekly downloads (npm, week of 2026-08-23). Wraps `libheif` + `libde265`, the same codec lineage as `heic-to` and `libheif-js`. Repository: `github.com/discourse/jSquash`. This is a genuine maintenance-continuity risk (single-org fork of an unmerged PR) and is explicitly not dismissed — see Maintenance-Risk Mitigation below.

**Real decode evidence:** the actual installed package was executed directly in Node (via its documented "manual WASM initialization" path — `init(wasmModule)` with a pre-compiled `WebAssembly.Module`, which sidesteps the package's browser/worker environment auto-detection, itself written for classic `importScripts`-style workers rather than the `{ type: 'module' }` worker this project uses):

```
Real synthetic 64×48 HEIC (self-generated, not copyrighted) → SUCCESS
  width=64 height=48 dataLength=12288 (exact 64*48*4 RGBA match), 69ms
Truncated/corrupt HEIC payload (valid header, cut body)      → clean catchable "Decoding error", 1ms
Random garbage bytes                                          → clean catchable "Decoding error", 1ms
Empty buffer                                                   → clean catchable "Decoding error", 0ms
```

No crash, no hang, no uncaught exception in any case — decode failures surface as a plain catchable `Error`.

**Measured bundle/WASM evidence (not speculative):** `codec/dec/heic_dec.wasm` = 959,554 bytes; `codec/dec/heic_dec.js` (Emscripten glue) = 60,964 bytes; total installed package = ~1.0 MB. This must be lazy-loaded so JPEG/PNG/WebP users never pay it — see FSG-001C implementation.

**Output shape:** `decode(buffer: ArrayBuffer): Promise<ImageData>` — a standard, worker-native `ImageData`-shaped result with no DOM dependency, mapping directly onto the existing raster → normalize → resize → canvas → encode → validate pipeline without an intermediate re-encode step.

**Rationale for choosing `@discourse/heic` over `heic-to` in FSG-001C:** `@discourse/heic` was already declared in the workspace (predating this decision), carries a materially more favorable license (Apache-2.0 vs. LGPL-3.0), produced concrete measured bundle-size evidence rather than an estimate, and — critically — was actually executed against real and malformed input with clean, verifiable results. `heic-to` was never executed; only its npm registry metadata was confirmed before its provisional approval was withdrawn. The maintenance/provenance risk of `@discourse/heic` (single-org fork, unmerged upstream PR, one release) is real and is not outweighed by convenience — it is outweighed by the combination of verified technical fit, the license advantage, and the adapter-isolation strategy below, which keeps the specific dependency choice replaceable.

**Maintenance-risk mitigation (binding for FSG-001C implementation):**
1. `@discourse/heic` is accessed only through a narrow FileSetGo-owned adapter (`decodeHeic()`); no other module imports it directly.
2. The adapter is covered by tests exercising success, malformed/truncated/garbage/empty input, decoder-unavailable, and cancellation paths.
3. Test fixtures are self-generated (not third-party photographs) with known pixel dimensions.
4. The package is lazy-loaded — never in the initial application bundle.
5. No undocumented internal API of the package is used; only its public `decode`/`init` exports.
6. If `@discourse/heic` becomes unsuitable later (e.g., the package is abandoned, or the upstream `jSquash` PR merges and supersedes it), replacing it is intended to be a contained change behind the adapter boundary, not a FileSetGo architecture change.

**Governance effect:** `docs/architecture/FORMAT-SUPPORT.md` is updated to reflect `@discourse/heic` as the selected V1 HEIC/HEIF decoder. `ADR-005`'s requirement that "no specific decoder library is locked until maintenance, security, license, and memory characteristics are evaluated" is satisfied by this ADR and the FSG-001C sprint report's dependency audit.

## ADR-015 — FSG-002 target-size engine: bounded search parameters

**Status:** Accepted

FSG-002's directive left several concrete numeric/design choices to implementation judgment ("choose a conservative bound... document the chosen number and rationale"; "define a sensible initial minimum target size... document chosen target validation limits"; "you may choose better names [for unreachable outcomes], but preserve the semantic distinction"). This ADR records those choices as the FileSetGo-specific bounded-search contract, since they materially affect product behavior (how aggressively dimensions shrink, how small a target is honored, how failures are explained) and should not be re-derived or silently changed by a future sprint without a governance update.

**Quality search:** `minQuality = 0.60`, `maxQuality = 0.95` by default (directive-specified). At most **5** encodes per dimension tier. Strategy: try `maxQuality` first (1 probe, exits immediately if it already fits — the best possible outcome); if not, try `minQuality` (2nd probe, exits immediately if even that doesn't fit — no viable quality at this tier); otherwise binary-search the remaining budget between them. This means most real jobs use far fewer than 5 encodes, while 5 remains the hard ceiling.

**Dimension tiers:** each tier scales both dimensions by **0.85** (directive-specified), preserving aspect ratio. **`MAX_DIMENSION_TIERS = 6`** beyond the initial candidate (7 candidates total including tier 0). Rationale: `0.85^6 ≈ 0.377`, so the smallest tier retains ~38% of the original edge length — a 2000px source steps down to ~754px, still a broadly useful web image size. Combined with a **`MIN_DIMENSION_PX = 64`** floor (neither width nor height may drop below this), dimension reduction stops well before an image becomes practically useless, independent of the tier count alone.

**Deterministic maximum encodes per job** (directive §26, with the parameters above): JPEG/WebP HARD = 5; JPEG/WebP FLEXIBLE = 35 (7 tiers × 5 probes); PNG HARD = 1; PNG FLEXIBLE = 7 (1 encode per tier, no quality search).

**Target byte bounds:** `MIN_TARGET_BYTES = 1024` (1 KB) — no real encoded raster image is meaningfully smaller; a smaller request cannot be a genuine target. `MAX_TARGET_BYTES = 15 MB` — exactly the existing FSG-001 source-file safety cap (`DEFAULT_SAFETY_LIMITS.maxInputBytes`); there is no product reason for a target to exceed the largest file the runtime will ever accept as input.

**Structured unreachable outcomes:** two codes are used, not three. `TARGET_UNREACHABLE_HARD_DIMENSIONS` when `dimensionPolicy: 'hard'` and no quality within range meets the target at the one fixed dimension set. `TARGET_UNREACHABLE_MIN_DIMENSIONS` when `dimensionPolicy: 'flexible'` and the full bounded dimension-tier sequence is exhausted (down to the `MIN_DIMENSION_PX` floor or `MAX_DIMENSION_TIERS` limit) without a fitting candidate. A third code, `TARGET_UNREACHABLE_MIN_QUALITY`, is defined in the public contract for API completeness and potential future use, but the current algorithm has no scenario that produces it distinctly from the two above — a smaller dimension tier essentially always makes minQuality's byte size smaller too, so "quality bottomed out" and "ran out of dimension tiers" collapse into the same terminal failure mode in practice. This is a deliberate simplification, not an oversight.

**Governance effect:** these are the authoritative bounds for the target-size engine; changing any of them (e.g., raising `MAX_DIMENSION_TIERS`, lowering `MIN_TARGET_BYTES`) is a product/algorithm change requiring a governing decision, not a routine code change.

None of the above weakens the standing accuracy rule: an agent must never report verification — automated or manual — that did not actually run. This ADR amends the browser/device verification expectations previously stated for FSG-001 in `docs/directives/FSG-001B.md` and `docs/testing/TESTING.md`; it does not restructure the `docs/governance/ROADMAP.md` milestone sequence.

## ADR-016 — FSG-003 public UI: DOM-free orchestration layer, no jsdom

**Status:** Accepted

FSG-003 required both pure UI-logic tests and workflow-orchestration tests (directive §51/§52) without adding a large frontend-test framework (directive §51's own instruction). `jsdom`/`happy-dom` were not already project dependencies, and adding either to unit-test DOM rendering would be a new devDependency requiring separate approval under standing project rules, purely to test code that could instead be structured not to need a DOM at all.

**Decision:** the Quick Fit client (`resources/js/quick-fit/`) is split so that only one module touches `document`:

- `state.ts`, `format-bytes.ts`, `filename.ts`, `errors.ts`, `request-plan.ts`, `summary.ts`, `capabilities.ts`, `validate-form.ts` — pure functions/types, zero DOM and zero `@filesetgo/core` runtime calls beyond type imports. Directly unit-tested (69 tests).
- `workflow.ts` (`QuickFitWorkflow`) — orchestrates file selection, routes a requirement set to `processImage()`/`processImageToTarget()`, tracks the active job, and produces the typed `QuickFitState`. Takes its `@filesetgo/core` bindings (`preflightImage`, `processImage`, `processImageToTarget`, `getRuntimeCapabilities`) as a constructor-injected `QuickFitCoreClient`, mirroring the existing `ImageWorkerFactory` DI pattern in `runtime/worker-client.ts`. Contains no DOM access, so it is directly unit-tested in Node with a fake core client (22 orchestration tests covering routing, cancellation, stale-result prevention, and error/unreachable paths) — no module mocking (`vi.mock`) and no DOM emulation needed.
- `controller.ts` — the only module that queries `document` and binds DOM events to `QuickFitWorkflow`. Not unit-tested; verified via `npm run build` + `npm run typecheck` and, when available, browser automation (ADR-013). This is a deliberately thin layer: it reads form fields, calls `workflow.selectFile()`/`.run()`/`.cancel()`/`.reset()`, and renders `QuickFitState` back into the DOM — it makes no independent decisions `workflow.ts` doesn't already make.

**Governance effect:** future public-UI sprints (FSG-004+) should follow the same shape — DOM-free pure/orchestration modules covered by Vitest, a thin DOM-binding controller left to build/typecheck/browser-automation verification — rather than introducing `jsdom`/Testing-Library/Playwright component testing to unit-test DOM rendering directly. Introducing a DOM-emulation test dependency remains available if a future sprint's UI complexity genuinely outgrows this pattern, but requires the standing dependency-change approval, not a default.

**TypeScript project boundary (final architecture).** Including `resources/js/quick-fit/tests/**` in the root production `tsconfig.json` (its `include: ["resources/js/**/*.ts", ...]` matches everything under `resources/js/`) would pull `vitest`'s own type-declaration graph into the same TypeScript project as production browser code — a real environment mismatch (test-runner/Node-facing types leaking into the project that represents what ships to the browser), not merely a compile inconvenience. An initial attempt to paper over the resulting errors with root-level `"skipLibCheck": true` was rejected: it addressed the symptom (declaration-file errors) without fixing the actual boundary problem, and applied a lib-check exemption globally to the production project rather than scoping it to where it was actually needed.

The corrected, final structure:

- **`tsconfig.json`** (root, production/browser) — unchanged `compilerOptions` (`types: ["vite/client"]`, no `"node"`), plus an explicit `"exclude": ["resources/js/quick-fit/tests/**"]`. This project represents shipped browser code only; it never sees Node globals or Vitest's types, and no `skipLibCheck` was added to it.
- **`tsconfig.ui-tests.json`** (new, root) — a dedicated project for the Quick Fit test environment: `include: ["resources/js/quick-fit/**/*.ts"]` (both the pure/orchestration source modules and their `tests/*.test.ts` files, so the project is self-contained and typechecks cleanly on its own), `types: ["node"]` (this project legitimately needs Node ambient types, since `vitest`'s own public type surface references them). No `skipLibCheck` here either.
- **`@types/node`** — added as a **devDependency**, used only by `tsconfig.ui-tests.json`'s `types` array. Never reaches the production root project. Not a runtime Node dependency; FileSetGo's shipped browser code does not use Node APIs.
- `npm run typecheck` now runs all four TypeScript projects in sequence (root, `packages/core/tsconfig.json`, `packages/core/tsconfig.worker.json`, `tsconfig.ui-tests.json`); `npm run typecheck:ui` runs just the UI-test project directly.

**A second, independent problem this then exposed (not caused by the above):** with `skipLibCheck` genuinely gone from the root project and `@types/node` correctly supplying Node types, full declaration checking of `tsconfig.ui-tests.json` still failed with `TS2300: Duplicate identifier 'containSubset'`. This is a real upstream defect, unrelated to FileSetGo's own configuration: **Vitest 3.2.7** (the version this project has installed; confirmed to be the latest published 3.x patch — only 4.x/5.x major versions are newer) bundles its own `dist/chunks/global.d.ts`, which declares `Chai.Assert.containSubset` as a property-typed field. Vitest's own `package.json` simultaneously requires `"@types/chai": "^5.2.2"`, and `@types/chai` 5.2.x independently declares that same member as a method. The two declaration styles are not mergeable, so TypeScript reports a duplicate identifier whenever *any* project imports from `vitest` 3.2.7 under full (non-`skipLibCheck`) checking — this is very likely why `packages/core/tsconfig.json`'s pre-existing `skipLibCheck: true` (predating FSG-003, left untouched by this sprint) has been silently absorbing this exact conflict since FSG-001, not only the `node:` built-in imports it was originally documented for.

**Resolution:** a root `package.json` `"overrides"` entry pins the transitive `@types/chai` to `5.0.1` — the last version published before it gained `containSubset` typings at all, which removes the conflicting declaration rather than reconciling it:

```json
"overrides": {
  "@types/chai": "5.0.1"
}
```

This is **types-only** and resolves to a nested `vitest/node_modules/@types/chai` — it does not affect the real `chai`/`vitest` packages used at runtime, and FileSetGo code (production or test) does not import `chai` directly or use `containSubset` anywhere (confirmed by repository-wide search), so there is no behavioral surface. With it in place, `npm run typecheck` passes with **zero errors and zero `skipLibCheck` anywhere** in the four-project chain; `npm ci` followed by the same command reproduces this cleanly from the lockfile.

**This override is accepted as a temporary, governed toolchain-compatibility pin, not a permanent dependency-architecture decision.** It sits outside Vitest's own declared `@types/chai` semver range (`^5.2.2`), which is inherently a form of risk (a future transitive change could re-surface friction differently), even though the empirical evidence above shows no current fallout. **Removal trigger:** the next time FileSetGo upgrades Vitest to a new major version, first try removing this override; if the newer Vitest's bundled declarations no longer conflict with a current `@types/chai`, remove it. This does not need its own dedicated sprint unless removal turns out to be non-trivial.

## ADR-017 — FSG-005A multi-output packaging foundation

**Status:** Accepted

FSG-005A required a genuine architectural addition — not just new data or UI, but a new heavy-job kind (`processImageSet()`) sharing the existing worker/runtime infrastructure, a new dependency (`fflate`) for ZIP archive creation, and new safety limits. This ADR records the resulting architecture as the authoritative reference for FSG-005B and later packaging work.

**One decode, many outputs.** `processImageSetInWorker()` (`packages/core/src/workers/process-image-set.ts`) preflights and decodes the source exactly once, then reuses the shared FSG-001 primitives (`decodeSourceToBitmap`, `createRenderCanvas`, `drawBitmapToCanvas`, `validateOutput`) to produce each requested output sequentially — never in parallel, and never via repeated `processImage()` calls. Each output's canvas is released before the next is created, so peak memory stays bounded by one canvas at a time regardless of how many outputs are requested, exactly like the FSG-002 target-size engine's own dimension-tier loop.

**A third job kind, one shared slot.** `ImageProcessingRuntime` (`runtime/worker-client.ts`) gained a `'set'` `JobVariant` alongside the existing `'standard'` and `'target'` kinds. `MAX_ACTIVE_HEAVY_JOBS = 1` now holds across all three — starting any job kind cancels whichever job (of any kind) is currently active. This required extending, not duplicating, the existing single-job-slot state machine (`beginJob`/`start`/`handleWorkerEvent`/`finish`).

**Package safety bounds** (`processing/image-set-limits.ts`): `MAX_PACKAGE_ASSETS = 16` and `MAX_PACKAGE_TOTAL_OUTPUT_BYTES = 50 * 1024 * 1024` (50 MiB). The asset-count limit is enforced before any processing begins (`validate-image-set-request.ts`); the byte limit is enforced progressively as each output is produced (`process-image-set.ts`), since only the encoder — not the request — knows a given output's final size. Both are initial engineering limits, not marketing promises, matching the framing already established for FSG-001's 15 MB/24 MP limits (ADR-004).

**ZIP library: `fflate@0.8.3`, exact-pinned, MIT licensed.** Approved by the project owner for this sprint specifically (directive §20); verified before installation (name `fflate`, version `0.8.3`, license **MIT**, zero runtime dependencies) and again after (`npm ls fflate` resolves exactly `fflate@0.8.3`). Hidden entirely behind `packages/core/src/archive/zip-adapter.ts` — the only module in FileSetGo that imports `fflate` directly. No `fflate` type, option, or callback appears in any public `@filesetgo/core` export; `createZipArchive()` is not exported from `index.ts` at all (it is a worker-internal implementation detail, used only by `process-image-set.ts` via a lazy dynamic `import()`).

**ZIP strategy:** flat archives only (no directory trees) — enforced by `archive/filename-safety.ts`'s `isSafeArchiveEntryName()`, which rejects any `/`, `\`, or `:` character outright (covering traversal, absolute paths, and drive-letter paths in one check) alongside empty names, `.`, `..`, and null bytes. Every entry uses ZIP STORE (`level: 0`) rather than DEFLATE, since package contents are already-compressed JPEG/PNG/WebP bytes — spending CPU re-compressing them would be wasted work. Every entry (and the archive's own internal timestamp field) uses a fixed deterministic `mtime` (1980-01-01, the ZIP format's own epoch) rather than `fflate`'s current-time default, so identical entries/order reliably produce identical archive bytes (verified directly in `zip-adapter.test.ts`).

**Lazy-loaded, verified by build inspection.** `zip-adapter.ts` (and therefore `fflate`) is only reached through `process-image-set.ts`'s dynamic `import('../archive/zip-adapter')`, itself only invoked when an image-set job actually requests an archive. The production build confirms this: `fflate`'s minified DEFLATE table-building code appears only in its own `zip-adapter-*.js` chunk (9.12 kB), with zero occurrences in `app-*.js` or `image.worker-*.js`. Quick Fit and Guided Fit do not call `processImageSet()` in this sprint (no public UI exists yet — directive §29), so ordinary visitors never load any of this code.

**Governance effect:** FSG-005B must reuse `processImageSet()`/`compilePreset`-style compilation into `ImageSetOutputSpec[]` for the Website Logo Pack rather than introducing a second processing or packaging architecture. Product-specific concepts (favicon, Apple touch icon, Logo Pack naming) belong entirely in a future `resources/js/logo-pack/`-style product layer, exactly as FSG-004's preset knowledge lives in `resources/js/presets/` rather than `@filesetgo/core`.

## ADR-018 — FSG-005B Website Logo Pack: exact composition, fixed-canvas contain, ICO architecture, controlled upscaling

**Status:** Accepted

FSG-005B introduced several concrete numeric/architectural choices the directive left to implementation judgment. This ADR records them as the authoritative Logo Pack contract.

**Exact package composition** (directive §13, `resources/js/logo-pack/spec.ts`): exactly seven public assets, in this order — `logo-header.png`, `logo-header@2x.png`, `favicon.ico`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192x192.png`, `icon-512x512.png`. No README, no manifest, no HTML snippet ships in this milestone (directive §44/§45) — a web manifest specifically requires site/application metadata FileSetGo doesn't have yet; this is deferred, not forgotten.

**Header bounds:** standard header bounding box 400×120px, high-density header bounding box 800×240px (directive §15/§16). Both use the existing FSG-001 resize-fit behavior (`RasterImageSetOutputSpec` with `resize`) — preserve aspect ratio, no crop, no stretch, no upscale beyond source resolution.

**Fixed-canvas CONTAIN primitive** (`packages/core/src/transforms/contain.ts`, directive §17): a new, genuinely generic core primitive — `calculateContainPlan(sourceWidth, sourceHeight, canvasWidth, canvasHeight, contentScale, allowUpscale)` returns a deterministic draw plan (size + centering offset + applied scale). It has no concept of icons or Logo Pack; it is reusable by any future workflow needing "source → contain → fixed canvas." Rendering reuses the existing `scaledTransform()` helper from FSG-001 unchanged (`workers/process-image-set.ts`'s `drawBitmapContained()`), only adding a translation offset to center the content — no new transform math was needed.

**Content box is deterministically floor-rounded, corrected post-implementation:** the content box a source may occupy is `Math.floor(canvasWidth * contentScale)` × `Math.floor(canvasHeight * contentScale)` — an integer pixel box computed *before* it drives the scale calculation, not the fractional `canvasWidth * contentScale` value used directly. The original FSG-005B implementation used the fractional value directly (e.g. `512 * 0.9 = 460.8` fed straight into the scale division); this was corrected in a subsequent completion-audit pass because a fractional content box is not equivalent to a floored one and is not reproducible in whole pixels. Required evidence (a square source matching a square canvas, `allowUpscale: true`, so `drawWidth`/`drawHeight` equal the content box exactly): 32px canvas → 28px box, 180px → 162px, 192px → 172px, 512px → 460px — all asserted directly in `contain.test.ts`. This is the authoritative formula going forward for every Logo Pack icon canvas.

**`ICON_CONTENT_SCALE = 0.90`** (directive §18): every square icon asset's artwork may occupy at most 90% of its canvas on the constraining axis (floor-rounded per above), centered, transparent background, never cropped/stretched/auto-trimmed.

**Controlled icon upscaling, `MAX_ICON_UPSCALE_FACTOR = 4`** (directive §23): icon/favicon `ImageSetOutputSpec`s are compiled with `allowUpscale: true` — an explicit, narrow exception to FileSetGo's general no-upscale convention, safe only because the product layer's suitability evaluator (`resources/js/logo-pack/suitability.ts`) computes the exact required scale factor against the 512px icon canvas *before* any processing begins (reusing `calculateContainPlan(..., allowUpscale: true).scale` purely as a scale calculator, not a render call) and refuses to start generation (`SOURCE_TOO_SMALL_FOR_LOGO_PACK`-equivalent blocking issue) when that factor exceeds 4×. `factor <= 1` → good; `1 < factor <= 4` → warning, generation proceeds; `factor > 4` → blocking.

**Geometry warning threshold `2.5`** (directive §25): `aspectRatio = longerEdge / shorterEdge`; a warning (never a block, never an automatic crop) appears above 2.5, exactly at 2.5 is not warned.

**ICO architecture** (`packages/core/src/icons/ico.ts`, directive §28–§31): a small, dependency-free, FileSetGo-owned ICO container reader/writer — `createIco()`/`validateIcoContainer()` — entirely generic (no "favicon" concept). Every entry is PNG-compressed (never legacy BMP/DIB). `favicon.ico` is compiled as one `IcoImageSetOutputSpec` with three independently CONTAIN-rendered entries (16/32/48px, `ICON_CONTENT_SCALE`, controlled upscale) — the governed 16/32/48 requirement is a Logo Pack *product* decision (`spec.ts`'s `ICO_ENTRY_SIZES`), not something the generic core validator enforces; `validateIcoContainer()` independently re-parses raw bytes from scratch (never trusts `createIco()`'s own internal state) and accepts any valid entry set. `process-image-set.ts` additionally checks the produced ICO's actual entries match what was *requested* before accepting the asset, and fails the whole image-set job if either check fails (`ICO_VALIDATION_FAILED`).

**`ImageSetOutputSpec`/`ImageSetAssetResult` became discriminated unions** (`'raster' | 'contain' | 'ico'` / `RasterAssetResult | IcoAssetResult`) to accommodate ICO's fundamentally different shape (a size *set*, not a single width/height) — a genuine, intentional breaking change to FSG-005A's contract, safe because FSG-005A shipped with zero UI consumers of `processImageSet()`. `processImage()`/`processImageToTarget()` were not touched.

**Product/core boundary held:** `@filesetgo/core` gained only generic capabilities (contain, ICO container format) with zero knowledge of "logo," "favicon," "header," or "Logo Pack." All of that lives in `resources/js/logo-pack/` (`spec.ts` for the composition catalog, `suitability.ts` for geometry/resolution/transparency assessment, `compiler.ts` for translating the catalog into a `ProcessImageSetOptions`, `logo-pack-controller.ts` for orchestration) — mirroring the exact `resources/js/presets/` pattern FSG-004 established.

**Shared workspace-mode ownership extended, not duplicated:** `GuidedFitController` (FSG-004) already owned Quick-Fit/Guided-Fit mode-tab state; rather than introduce a second, competing mode-state owner for Logo Pack, its `QuickFitMode` type gained a third `'logo-pack'` value and its constructor gained an optional `isExternallyBlocked` callback (used to also block mode-switching while a Logo Pack job is active) — `GuidedFitController` still doesn't import `LogoPackController` directly; `controller.ts` wires the callback.

**Governance effect:** any future asset-generation workflow needing a fixed-canvas render should use `calculateContainPlan()`/`ContainImageSetOutputSpec` rather than inventing a parallel primitive. Any future icon-container work should use `packages/core/src/icons/ico.ts` rather than a new dependency. Changing any of the governed numeric values above (content scale, upscale factor, geometry threshold, header/icon bounds, the seven-asset composition) is a product decision requiring a governance update, not a routine code change.

## ADR-019 — FSG-006 browser compatibility infrastructure and a real Logo Pack defect found by it

**Status:** Accepted

FSG-006 introduced real, permanent browser-test infrastructure and, in the process of using it, found and fixed a genuine defect that 307 passing Vitest unit tests had never exercised. Both are material, long-lived decisions recorded here.

**Playwright is the permanent browser-test framework** (`@playwright/test`, dev-only dependency; directive §8/§67). `tests/browser/` is a dedicated boundary, separate from `packages/core/tests`/`resources/js/**/tests` — it runs the real, built, locally served application (`php artisan serve` over the production Vite build) end-to-end, never a synthetic reimplementation of controller logic. `playwright.config.ts` defines `chromium`/`firefox` projects for full functional certification plus four Chromium-based mobile-viewport projects (`mobile-narrow-320`, `mobile-iphone-class`, `mobile-android-class`, `mobile-tablet-class`) for the dedicated responsive-layout suite (directive §11–§14).

**Pinned Playwright version, environment-driven:** `@playwright/test@1.55.1` — the minimum version fixing a high-severity install-time SSL-verification-bypass CVE (GHSA-7mvr-c777-76hp) while still supporting this host's macOS 12 (Monterey) ceiling. Versions ≥1.63 refuse to install Chromium at all on macOS 12; versions <1.55.1 carry the CVE. This is a genuine environment constraint, not an arbitrary choice — re-evaluate this pin if the host OS is upgraded or Playwright's macOS-12 support policy changes.

**WebKit remains a required, governed engine target for FSG-006 — Chromium, Firefox, and WebKit, not two of the three.** It is not waived, and no report may describe it as a settled trade-off Product Office accepted. What is real and unavoidable is a narrower, purely environmental fact: this coding agent's local macOS 12 (Monterey) host cannot run a current, non-CVE-affected Playwright WebKit build at all. Investigated in detail:

- Playwright `1.55.1` (the pin above, chosen for the CVE fix) — the only WebKit build this host can install for macOS 12 (`webkit_mac12_special`, a frozen 2023-era snapshot) is protocol-incompatible with its driver (`Unknown setting: FixedBackgroundsPaintRelativeToDocument` on every `newPage()`). WebKit cannot launch at all.
- Playwright `1.40.0` + WebKit build `1944` — confirmed to actually launch (`webkit OK hi`), but `1.40.0` is subject to the same high-severity SSL-verification-bypass CVE `1.55.1` exists to fix, and build `1944` is itself a multi-year-old snapshot that would not represent current Safari/WebKit behavior even if used.

Neither option gives this specific host a governed-quality local WebKit result. Product Office's direction is to obtain one from an environment that has no such constraint — a supported container/VM running the identical governed toolchain, or a CI runner — not to redefine FSG-006's engine matrix around the local limitation. `.github/workflows/fsg-006-browser-certification.yml`, added specifically to run the full matrix (including WebKit) on a current Ubuntu GitHub Actions runner, obtained exactly that: **WebKit — PASS, 42/45 tests, 3 skipped (the same documented worker-request-visibility tooling limitation Firefox has), 0 failed** (run `33972958935`, full detail in `SPRINT_REPORT.md`'s "GitHub Actions WebKit Result"). Getting there required fixing three pieces of CI-only infrastructure unrelated to FSG-006's product code (an npm optional-dependency resolution bug, a missing/unmigrated sqlite database, and — the one worth remembering — `playwright.config.ts` never having defined a `webkit` project at all, so the first two CI runs silently never executed WebKit despite installing it; a green CI run is not proof a specific engine's project actually ran, only checking the per-project test counts is). No physical Safari or physical device was, or will be, exercised by this — "Playwright WebKit" and "Safari" are not interchangeable terms, and no report may conflate them.

**Mobile-viewport projects use explicit Chromium viewport/touch emulation, not named device presets**, because Playwright's `devices['iPhone …']`/`devices['iPad …']` presets force WebKit, which this local host cannot run. `devices['Pixel 7']` (Chromium-based) is used directly for the Android-class project. Per directive §11, exact device branding matters less than the product behaviors being verified (no horizontal overflow, reachable controls, tap targets, stacking). **This mobile-viewport emulation is not, and does not claim to be, physical-device certification** — it proves CSS/layout/touch-target behavior at real device dimensions, not real-device hardware, GPU, memory, or OS-integration behavior.

**Browser testing is development-only.** `@playwright/test` and everything under `tests/browser/` are dev-only: no test file, fixture, or Playwright package is imported by, bundled into, or shipped in any production artifact (confirmed directly — see SPRINT_REPORT.md "Bundle Observation": every production chunk hash is unchanged or changes only by the exact byte count of real product-code edits). The governed engine targets for FSG-006 are **Chromium, Firefox, and WebKit** — all three, per the paragraph above.

**`skipLibCheck: true` in `tsconfig.browser-tests.json` is a scoped, temporary compatibility workaround**, not a precedent for the main toolchain. It exists solely because `@playwright/test@1.55.1`'s bundled `playwright-core/types/protocol.d.ts` uses a `declare module` syntax this project's TypeScript version (`^7.0.2`) flags as a syntax error (`TS1540`) when checked directly — an upstream declaration-file authoring choice, not a defect in this project's own code. It applies only to this one dedicated tsconfig; the main `tsconfig.json`, `tsconfig.ui-tests.json`, and `tsconfig.worker.json` are untouched and still have no such exception. **Removal trigger:** when Playwright and/or the project's TypeScript version is next upgraded, first test removing this exception. Retain it only if the upstream declaration incompatibility still exists at that point.

**A real, confirmed production defect was found and fixed:** `packages/core/src/runtime/protocol.ts`'s `isImageSetAssetResult()` validated every `ImageSetAssetResult` against the raster-only shape (`isProcessedImageResult()`, requiring `width`/`height`/`format`) unconditionally. `IcoAssetResult` (`kind: 'ico'`, favicon.ico) has none of those fields — it carries `sizes: number[]` instead. Because **every real Website Logo Pack job includes an ICO asset**, this made the main thread's `isImageWorkerEvent()` reject every real `JOB_COMPLETE_SET` message from a real browser Worker, silently discarding it. The worker itself completed correctly (confirmed via temporary instrumentation: decode → all 7 assets → ZIP archive → return, all in well under a second); the UI simply never learned the job had finished and stayed on "Creating your logo pack..." forever, with no error, no timeout, no console output. **This is why Website Logo Pack appeared to hang indefinitely under real Chromium/Firefox automation despite 304/304 core tests passing** — the existing `worker-client.test.ts`/`protocol.test.ts` fixtures for `JOB_COMPLETE_SET` only ever used raster-shaped assets, never one including an ICO asset, so the gap was structurally untested. Fixed by making `isImageSetAssetResult()` branch on `kind` (`'ico'` → validate the actual `IcoAssetResult` shape; otherwise → the existing raster check), with new regression coverage in both `protocol.test.ts` (positive: raster+ICO mix accepted; negative: malformed ICO still rejected) and `worker-client.test.ts` (a full runtime round-trip resolving a mixed-asset result). This is exactly the class of defect FSG-006 exists to catch: a real cross-realm structured-clone/validation boundary that mocked unit tests never crossed.

**A real responsive defect was found and fixed:** the mode tabs (`#mode-tab-quick-fit`/`-guided-fit`/`-logo-pack`) used `min-h-9` (36px), short of the ~44px touch-target guideline directive §13 names them under explicitly — measured at ~40px effective height at a 320px viewport. Changed to `min-h-11` (44px), matching every other primary control in the app. Separately, the Logo Pack asset list's per-row download button rendered its full `Download {filename}` label with `whitespace-nowrap`, forcing that button (and the page) wider than a 320px viewport once a real filename was present. Fixed by shortening the *visible* label to "Download" (the filename is already shown above it in the row) while keeping the full, distinct `Download {filename}` as the `aria-label` — this also removed redundant on-screen text, not just the overflow.

**Governance effect:** any future `ImageSetAssetResult`-shaped discriminated union added to the worker protocol must have its own branch in `isImageSetAssetResult()`, not fall through to the raster check. Any future protocol-envelope test fixture representing a real product result must use the *actual* shape a real workflow produces (all its asset kinds), not a simplified stand-in — a simplified fixture is exactly what let this defect ship past 304 passing tests. `tests/browser/` is now a required, permanent part of the verification surface for any change touching the worker protocol, the Logo Pack UI, or responsive layout, not a one-off FSG-006 artifact.

**CI is verification infrastructure, not a deployment pipeline.** `.github/workflows/fsg-006-browser-certification.yml` exists to obtain a real WebKit (and cross-validated Chromium/Firefox) result on a supported runner; it builds and serves the application only to run the same Playwright suite against it, publishes nothing, and does not touch any production or staging environment. It uses the identical governed `@playwright/test@1.55.1` pin — no second browser-test framework was introduced to solve the WebKit gap.
