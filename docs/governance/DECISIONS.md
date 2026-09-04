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
