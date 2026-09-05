# FSG-005C Sprint Report — Logo Transparency & Verification

## Milestone

FSG-005C — Logo Transparency & Verification (see `docs/directives/FSG-005C.md`).

## Status

**FSG-005C: Complete. FSG-005 parent: Closed. FSG-006: Paused pending Logo Pack delta recertification.**

Product Office reviewed the first completed implementation and identified one remaining semantic gap before approving closure: `inspectAlpha()`'s generic "does alpha exist" classification was being used, on its own, to decide whether Transparent mode could skip background removal — which could recreate the milestone's own motivating defect (an opaque background reported as transparent) under a different technical condition (a transparent margin wrapping an unremoved opaque background). That correction is recorded in full below, honestly, as a strengthening of the transparency contract, not a hidden fix.

**Product Office approved FSG-005C for closure** after reviewing the corrected implementation and this report. FSG-005 (Packaging & Export Systems) is restored to CLOSED with FSG-005A/FSG-005B/FSG-005C all closed beneath it. FSG-006 remains PAUSED (delta recertification required — not resumed, not modified, not marked closed by this milestone). FSG-007 has not been started.

## Base Commit

`81c78a7b3ed2736d2cc6ba867d1bbc296d142801` — the governed FSG-006 pause checkpoint, the authoritative base named in the FSG-005C directive.

## Branch

`fsg-005c-logo-transparency`, created from the commit above.

## Milestone State

```text
FSG-001   ✅ CLOSED
FSG-002   ✅ CLOSED
FSG-003   ✅ CLOSED
FSG-004   ✅ CLOSED

FSG-005   ✅ CLOSED
├── FSG-005A ✅ CLOSED
├── FSG-005B ✅ CLOSED
└── FSG-005C ✅ CLOSED — Logo Transparency & Verification (this report)

FSG-006   ⏸ PAUSED — delta recertification required; not resumed, not modified, not marked closed
FSG-007   — NOT STARTED
```

## Why This Milestone Exists

A real user tested Website Logo Pack and expected a transparent logo. FSG-005B's contract — preserve the uploaded background, only preserve transparency that already existed — was accurate to what was built, but did not satisfy what "I want a transparent logo" actually means to a non-expert user. FSG-005C corrects this. See directive §1/§2.

## Implementation Status

All items in the directive's discovery/implementation scope are implemented and tested, including the Product Office correction described below:

- explicit background-mode choice (never inferred);
- Original mode (background preserved exactly as supplied);
- Transparent mode two-stage pipeline (prepare-and-verify master → preview → package);
- real pixel alpha inspection (`inspectAlpha`);
- a genuine background-transparency-*readiness* assessment, distinct from raw alpha presence (`assessBackgroundTransparency`) — the correction;
- deterministic, connectivity-aware background removal (`removeConnectedBackground`), now existing-alpha-aware;
- soft edge alpha + colour decontamination;
- three-value removal strength (Gentle/Balanced/Strong);
- tri-state confidence (`verified`/`needs-review`/`failed`) with documented sanity thresholds, now including a post-encode boundary-transparency re-check;
- mandatory post-encode verification (never trusting the pre-encode canvas);
- transparency-aware preview (checkerboard/light/dark, one Blob);
- bounded working raster (1024px), shared single-active-job runtime (4th job kind);
- mode-aware filename/ZIP contracts;
- full cancellation and Blob URL lifecycle at every stage;
- source-replacement invalidation of mode/strength/preview/result;
- ADR-020 and PRODUCT/ARCHITECTURE/SECURITY/TESTING documentation updates;
- the required 15-case deterministic fixture matrix, plus three additional Product Office correction regression cases;
- core, UI, and local browser test coverage;
- the corrected (previously misleading) JPEG background-removal guidance copy.

No STOP condition (directive §64, and the correction directive's own stop conditions) was triggered. No new dependency was installed or found necessary at any point, including during the correction.

## Governance Supersession

`docs/governance/DECISIONS.md` ADR-020 records this milestone's decisions and explicitly supersedes only the "no background removal" element of FSG-005B's contract (directive §109/§1673, governed by ADR-018). **ADR-018 is unmodified** — it remains the accurate historical record of what FSG-005B shipped. `docs/directives/FSG-005B.md` (a directive, a historical record) was not edited. ADR-020 was extended (not replaced) with a new correction paragraph documenting the transparency-readiness fix below.

## Transparency-Readiness Correction (Product Office Review)

### The problem

The first implementation's decision logic was:

```text
inspectAlpha() → 'opaque' | 'transparency-present'
'transparency-present' → bypass background removal
```

A PNG with a thin transparent margin around an otherwise-opaque white rectangular artwork background genuinely contains alpha — `inspectAlpha()` correctly reports `'transparency-present'`. Bypassing removal on that basis alone would classify the source as already-transparent, preserve the un-removed white rectangle, encode it, detect alpha again on re-verification, and report "Transparent background verified" — recreating FileSetGo's original reported defect under a different technical condition. Product Office identified this before approving closure.

### The fix: a second, still-generic assessment

`inspectAlpha()` was **not** weakened or given product-specific semantics — it remains a narrow, generic pixel-alpha primitive, unchanged in this correction (directive §2). A new module, `packages/core/src/transforms/background-transparency.ts`, adds a distinct, still destination-neutral assessment: **does existing alpha already represent a sufficiently meaningful, prepared, removable BACKGROUND** — not merely "does alpha exist somewhere."

```ts
type ExistingTransparencyStatus =
  | 'opaque'
  | 'alpha-present-background-not-confirmed'
  | 'background-transparency-confirmed';

function assessBackgroundTransparency(raster: RgbaRaster): BackgroundTransparencyAssessment;
```

**Algorithm** (two gates, both connectivity-based, no arbitrary global colour threshold):

1. **Boundary-connected transparency.** An iterative BFS flood-fill from the image border through non-opaque pixels only (pure alpha connectivity — no colour check). Below `MIN_BOUNDARY_TRANSPARENT_RATIO = 0.03` of the whole raster, any alpha present is incidental (a stray pixel, a tiny corner) and is **never confirmed** — `reason: 'insufficient-boundary-transparency'`.
2. **Residual-foreground check.** Of the pixels *not* covered by that boundary-connected region, estimate the colour of the "shoreline" (opaque pixels immediately adjacent to the transparent area) and flood-fill outward from it by colour similarity, confined to that remaining domain. The fraction the flood does **not** reach (`residualForegroundRatio`) is a distinctly-coloured region trapped behind the already-transparent margin — real evidence of an unremoved background wrapping further artwork. Above `MAX_RESIDUAL_FOREGROUND_RATIO_FOR_CONFIRMATION = 0.03`, this is **never confirmed** — `reason: 'unremoved-background-region-detected'`.

Otherwise: `'background-transparency-confirmed'` — removal is safely bypassed.

**`removeConnectedBackground()` itself was made existing-alpha-aware**, since a "not confirmed" source may already carry some real transparency that needs to be correctly incorporated, not treated as if the source were fully opaque:

- A pixel already non-opaque is automatically treated as background-like for seeding and flood expansion — no colour check is needed or appropriate, since it is already transparent.
- The background-colour estimate falls back from the literal border ring to the "shoreline" (opaque pixels adjacent to existing transparency) when the literal border carries no opaque pixels to sample from.
- For the overwhelmingly common fully-opaque source, both of these are no-ops (every pixel is opaque, so the new branches never fire) — **verified directly: all 14 pre-existing `background-removal.test.ts` cases pass unmodified after this change**, with zero threshold or behaviour changes to the opaque-source path.

### Why two independent thresholds, not one

An earlier design considered a single "how much of the canvas is background-like" signal, but constructed evidence proved it cannot, on its own, distinguish a wrapped-background case from a legitimately multi-coloured logo with an interior design detail (e.g. a ring-shaped mark with a lighter-coloured hole) — the two are **geometrically identical** when their proportions match; there is no purely pixel-connectivity signal that separates "background wrapping a smaller logo" from "logo mark with a smaller interior counter." Given this genuine, provable ambiguity, the design deliberately errs toward the safe direction the correction exists to protect: **the residual-ratio gate alone**, calibrated against the actual required regression fixtures (not the hypothetical ambiguous one), correctly resolves every case the directive requires, while a source in the genuinely ambiguous middle ground is routed through preparation rather than risking a second false-bypass. The cost of that is low (the existing-alpha-aware removal algorithm handles an already-good source safely) and the risk it avoids — a false "already transparent" claim — is exactly what this correction exists to prevent.

### Post-encode reinforcement

Directive §9 asked whether "a meaningful minimum/connected transparency condition" should also apply to the *final encoded output*, not only the pre-removal decision. It does now, but deliberately using only the **lighter** boundary-connectivity gate (stage 1 above), not the full residual assessment: a `verified` result is downgraded to `needs-review` (`reason: 'post-encode-boundary-transparency-insufficient'`) if the actual encoded output's boundary-connected transparent ratio falls below `MIN_BOUNDARY_TRANSPARENT_RATIO` — catching "one transparent pixel survived encoding" (directive §9's explicit example) without misclassifying a successfully-processed, genuinely multi-coloured logo (which the full residual check would risk, per the ambiguity above).

## Transparent-Mode Architecture

```text
SOURCE (original file, Transparent mode chosen)
  → PROCESS_TRANSPARENT_MASTER job (preflight → decode → bound → inspectAlpha)
  → if opaque OR assessBackgroundTransparency() says not-confirmed:
        removeConnectedBackground(strength)  — existing-alpha-aware
    else: preserved as-is (background transparency genuinely confirmed)
  → encode PNG
  → re-decode the actual encoded Blob, re-run inspectAlpha (post-encode verification)
  → classify: verified | needs-review | failed (+ reason)
  → post-encode boundary-transparency re-check (may downgrade verified → needs-review)
  → TransparentMasterResult { blob, width, height, alphaInspection, removalApplied, strength?, status, reason? }
  → UI preview (checkerboard/light/dark, same Blob)
  → user clicks "Create transparent logo pack" (blocked if status === 'failed')
  → PROCESS_IMAGE_SET job, sourced from the verified master Blob (not the original file)
  → existing FSG-005A/FSG-005B 7-asset packaging pipeline, unchanged
  → ZIP
```

The transparent master is decoded exactly once by the packaging job — the two-stage design does not require holding a full-resolution bitmap in memory across UI think-time between "preview ready" and "user clicks Create" (directive §31).

## Original-Mode Behavior

Original mode performs no background removal. It is *not* forced-opaque: an already-transparent PNG selected under Original mode remains transparent, because FileSetGo is preserving the supplied artwork exactly (directive §7). The existing single-stage FSG-005A/FSG-005B packaging pipeline runs unchanged, sourced from the original uploaded file — no new job kind is involved. This mode is unaffected by the transparency-readiness correction (it never calls `assessBackgroundTransparency()` at all).

## Working Raster Bound & Memory Estimate

`TRANSPARENT_MASTER_MAX_DIMENSION = 1024` px per side (`packages/core/src/workers/process-transparent-master.ts`). Chosen because Logo Pack's largest real outputs are the 800px high-density header and the 512px largest icon — 1024px gives comfortable headroom above both while bounding worst-case memory well below the global 24 MP safety ceiling (ADR-004), which this stage does not use.

**Worst-case RGBA memory:** a 1024×1024 buffer is `1024 × 1024 × 4 = 4,194,304` bytes ≈ 4 MiB. The pipeline holds a small, bounded number of such buffers concurrently: the working canvas's `ImageData` (≤4 MiB), the background-removal output buffer (≤4 MiB, a fresh copy, not in-place), the background-transparency assessment's own bounded scratch arrays (a `Uint8Array` mask and an `Int32Array` queue, each ≤1 MiB at the working-raster bound), and — only transiently, during post-encode verification — a second decode of the *encoded* PNG, which after compression is normally much smaller than the working raster. Worst-case concurrent RGBA/scratch footprint for this stage is therefore on the order of 10–14 MiB, not 100+ MiB.

## Alpha-Inspection Contract

`packages/core/src/transforms/alpha-inspection.ts` — `inspectAlpha(raster: RgbaRaster): AlphaInspectionResult`. A full pixel scan (not sampled — the bounded working raster keeps this cheap, and a partial sample could miss a small transparent region). Returns `sampledPixels`, `fullyTransparentPixels`, `semiTransparentPixels`, `minAlpha`, `maxAlpha`, `transparentRatio`, and `classification: 'opaque' | 'transparency-present'`. Zero product terminology — reusable by any future feature needing "does this raster actually contain alpha transparency," never inferred from format/extension/MIME. **Unchanged by the correction above** — it remains exactly this narrow question; `assessBackgroundTransparency()` is a separate module built on top of it, not a modification to it.

## Removal Algorithm

`packages/core/src/transforms/background-removal.ts` — `removeConnectedBackground(raster, strength)`, boundary-informed and connectivity-aware, never a global colour threshold:

1. Estimate the background colour from the median of the image's own border-ring pixels that are already opaque (resistant to a handful of foreground pixels touching the border); when the source already carries transparency reaching the border (only reached after `assessBackgroundTransparency()` found it unconfirmed), fall back to the "shoreline" — opaque pixels adjacent to that existing transparent region.
2. Iterative (non-recursive, bounded-stack `Int32Array` queue) BFS flood-fill, seeded from border pixels that are either already non-opaque or within the strength's colour-distance threshold, propagating only through 4-connected neighbours satisfying the same condition.
3. Every flood-reached pixel becomes fully transparent.
4. Pixels within a 3px radius of the flood region get a soft, non-binary alpha ramp (not a hard 0/255 cliff) plus RGB decontamination.

Because the flood only ever reaches a pixel through a path of background-like (or already-transparent) pixels connected to the image border, a **disconnected** foreground region survives even when its colour closely matches the background — proven directly in `background-removal.test.ts`. This is the specific property that rules out "delete every white/black/near-background pixel" (directive §12).

## Edge Decontamination Method

For soft-edge pixels (within the 3px radius, alpha > ~5%), RGB is recovered using the standard "unblend from a known background" formula:

```text
observed = alpha·fg + (1-alpha)·bg
fg = (observed - (1-alpha)·bg) / alpha
```

This recovers an estimate of the true foreground colour rather than leaving the old background bleeding through as a colour-fringed halo. Proven via a relative-improvement test (`distanceToForeground(decontaminated) < distanceToForeground(original)`), since no synthetic fixture supplies a perfect ground-truth blend fraction to match exactly.

## Strength Mapping

```text
BACKGROUND_REMOVAL_THRESHOLDS = { gentle: 18, balanced: 34, strong: 55 }
```

Euclidean RGB colour-distance, out of a maximum possible ~441. Never exposed to the user as a number — only as Gentle/Balanced/Strong. Balanced is the governed default the instant Transparent mode is chosen (directive §15). The selector is hidden entirely when the source already has real transparency (`removalApplied === false`).

## Verification Logic (Post-Encode)

`decodeEncodedRaster()` re-decodes the **actual encoded Blob** (`createImageBitmap` → fresh `OffscreenCanvas` → `getImageData`) and returns its real pixel raster — never trusting the pre-encode canvas. The caller re-runs `inspectAlpha()` on that real output; if it is not actually transparent, the result is `failed` (`encoded-output-opaque`) regardless of what the pre-encode canvas looked like. **As of the correction**, when the result would otherwise be `verified`, the caller additionally re-runs `computeBoundaryConnectedTransparency()` (the lighter of the two background-transparency gates) against the same real decoded output — downgrading to `needs-review` (`post-encode-boundary-transparency-insufficient`) if the final file's connected transparent margin is not real, meaningful evidence of a background. This is deliberately the same class of check ADR-019 established was missing at the protocol layer — applied here at the pixel/output layer, now in two stages.

## Ambiguity / Sanity-Check Logic

Applied in order, only when removal was attempted (a source whose background transparency was genuinely confirmed skips all of this — its removal never ran):

| Check | Threshold | Outcome | Reason code |
|---|---|---|---|
| Remaining opaque ratio | `< 0.02` | `failed` | `insufficient-remaining-foreground` |
| Removed ratio | `< 0.01` | `needs-review` | `no-meaningful-background-change` |
| Background colour variance | `> 40` | `needs-review` | `non-flat-background` |
| Border-seed ambiguous ratio | `> 0.25` | `needs-review` | `ambiguous-border` |
| *(applies regardless of removal)* Post-encode boundary-connected transparency | `< 0.03` | `needs-review` | `post-encode-boundary-transparency-insufficient` |

Otherwise: `verified`. The first four thresholds were derived from and validated against the original fixture matrix (directive §26); the background-transparency thresholds (`0.03`/`0.03`) were derived from the correction's own fixture evidence — see "Transparency-Readiness Correction" above. None were invented to make tests pass.

## Preview Architecture

The product layer renders the single generated transparent-master `Blob` against a real CSS checkerboard (`.fsg-checkerboard` in `resources/css/app.css`, a `conic-gradient`, theme-aware for light/dark), a light background, and a dark background — toggled by CSS class changes on the same `<img>`/frame, never three separately generated images (directive §27). All three toggle buttons are real, keyboard-reachable, `aria-pressed` buttons at 44px minimum height.

## Blob URL Lifecycle

`resources/js/quick-fit/controller.ts` tracks `logoPackPreviewUrl` independently of the existing ZIP/asset URL tracking. It is created once per distinct `TransparentMasterResult` (identity-compared, not re-created on every render) and revoked on: regeneration (strength/mode change), a new preview replacing an old one, leaving the preview-ready state (packaging success, cancellation, failure, reset), source replacement, and `pagehide` (via the existing render-on-state-change cycle, since `logoPack.reset()` synchronously triggers a re-render that clears the URL before the page unloads).

## Cancellation

`prepareTransparentMaster()` is a 4th job kind sharing `ImageProcessingRuntime`'s single active-job slot (`MAX_ACTIVE_HEAVY_JOBS = 1`, ADR-009) alongside `processImage()`/`processImageToTarget()`/`processImageSet()`. Cancellation is checked at every stage boundary (decoding, normalizing/resizing, the removal pass, encoding, and finalizing/post-encode verification) via the existing `assertNotCancelled()` pattern. A cancelled preview or packaging job can never later resolve into current state (`LogoPackController`'s stale-job-reference guards, proven in `logo-pack-controller.test.ts`). After cancellation, the user can retry immediately — `retryTransparentPreview()`/re-selecting a mode re-runs the job without a page refresh.

## Filename Contracts

Given a safe source basename (`extractSafeBasename()` in `resources/js/logo-pack/spec.ts` — final extension stripped, slashes/backslashes/null bytes removed, an all-dots or empty result falls back to `"logo"`):

**Transparent mode:** `{basename}-transparent.png`, `{basename}-transparent@2x.png`, `favicon.ico`, `favicon-32x32.png`, `apple-touch-icon.png`, `icon-192x192.png`, `icon-512x512.png`.

**Original mode:** `{basename}-original.png`, `{basename}-original@2x.png`, plus the same five fixed icon files.

`favicon.ico` and the fixed icon filenames are unchanged and mode-independent (directive §34). Both modes still produce exactly seven public assets.

## ZIP Contracts

`{basename}-filesetgo-transparent-logo-pack.zip` (Transparent mode) / `{basename}-filesetgo-original-logo-pack.zip` (Original mode) — verified end-to-end via real downloaded-filename assertions in `tests/browser/specs/logo-pack.spec.ts`.

## Required Fixture Matrix (Directive §41/§59), Plus Correction Regressions

The original 15 categories are preserved as originally numbered; three additional Product Office correction regression cases are recorded explicitly (16-18) rather than folded into the original count, per the correction directive's §13. All 15 original cases are synthetic, deterministic `RgbaRaster` fixtures with known expected pixel structure (`packages/core/tests/transforms/fixtures/raster-fixtures.ts`), per the directive's own "prefer synthetic fixtures with known expected pixel structure" guidance — real image files were additionally used for the two JPEG-format cases and the end-to-end browser proofs. Classification outcomes are computed directly from the real returned metrics run through the exact thresholds documented above (not estimated).

| # | Fixture | Grade | Reason |
|---|---|---|---|
| 1 | White-background JPEG logo | **PASS** | Flat white background fully removed; foreground fully opaque. Proven at the pixel level (`background-removal.test.ts`) and end-to-end against a real, decoded, encoded JPEG (`flat-logo.jpg`, browser test asserts "✓ Transparent background verified"). |
| 2 | Black-background JPEG logo | **PASS** | Flat black background fully removed; foreground fully opaque. Proven at the pixel level and, as of the correction, **also end-to-end against a real black-background encoded JPEG** (`flat-logo-black.jpg`, browser test asserts "✓ Transparent background verified") — closing the gap where only a synthetic raster previously stood in for this case. |
| 3 | Flat coloured-background logo | **PASS** | Flat blue background (`[30,120,200]`) fully removed; foreground fully opaque. |
| 4 | Already-transparent PNG | **PASS** | `assessBackgroundTransparency()` confirms background transparency; removal correctly bypassed entirely (`removalApplied: false`); existing alpha preserved exactly; `verified`. |
| 5 | Logo with white interior elements | **PASS** | An enclosed white "counter" region survives untouched (never connected to the true exterior background) even though its colour exactly matches the background. `backgroundColorVariance: 0`, `borderAmbiguousRatio: 0` → `verified`. |
| 6 | Logo with black interior elements | **PASS** | Same mechanism as #5 with a black enclosed interior — `verified`. |
| 7 | Thin typography | **PASS** | A 2px-wide vertical stroke survives fully opaque; `verified` (`removedRatio: 0.96`, `remainingOpaqueRatio: 0.04` — small but real, not destroyed). |
| 8 | Fine icon strokes | **PASS** | **As of the correction, a genuinely independent fixture** (`createRasterWithFineIconStrokes` — a diagonal stroke, a curved arc, and a disconnected short detail, not the same geometry as #7): all three survive background removal; exterior fully removed; `remainingOpaqueRatio` stays under 10% of canvas. Previously shared the exact typography fixture; now distinct evidence per user/Product Office request. |
| 9 | Curved/anti-aliased edges | **PASS** | A soft, non-binary alpha ramp is produced at the edge (not only hard 0/255), and decontamination measurably moves edge colour toward the true foreground colour. `verified` (`backgroundColorVariance: 0`). |
| 10 | Gradient background | **NEEDS REVIEW** | `non-flat-background` — `backgroundColorVariance: 131` (border ring spans the full gradient range). Intentional: directive §18 explicitly allows this; the result is a genuine transparent output that should be visually inspected, not silently accepted as clean. **Unchanged by the correction**, per its explicit instruction not to tune thresholds until this silently becomes verified. |
| 11 | Drop shadow | **PASS** | A flattened, one-directional drop shadow blending into the background is substantially removed (`removedRatio: 0.885`) without destroying the foreground shape (`remainingOpaqueRatio: 0.115`, foreground interior fully opaque); border stays flat white (`variance: 0`) → `verified`. |
| 12 | Semi-transparent elements | **PASS** | A uniform 128-alpha source: `assessBackgroundTransparency()` confirms (boundary ratio 100%, nothing remains to evaluate for a residual), removal is bypassed, and the exact original alpha values (`minAlpha`/`maxAlpha` both 128) survive through encode and post-encode re-verification unchanged. |
| 13 | Foreground colour similar to background | **NEEDS REVIEW** | `ambiguous-border` — a foreground region touching the image border with colour close to the background (distance ≈52, within `strong`'s threshold) yields `borderAmbiguousRatio: 0.4375` (> 0.25). Correctly not reported as a clean `verified` success. **Unchanged by the correction.** |
| 14 | High-resolution source | **PASS** | A 2000×2000 source is bounded to ≤1024px per side and still processes to completion (`process-transparent-master.test.ts`); a flat-background 1024×1024 raster at the bound classifies `verified`. |
| 15 | Small/low-resolution source | **PASS** | A 10×10 raster processes without error or degenerate output; `verified`. |
| **16** | **Transparent padding around an opaque background (Product Office correction, critical regression)** | **PASS (correctly NOT-confirmed → prepared)** | The exact defect-recreation scenario: a transparent canvas wraps an opaque white rectangle containing distinct coloured artwork. `assessBackgroundTransparency()` returns `alpha-present-background-not-confirmed` (`reason: 'unremoved-background-region-detected'`, `boundaryConnectedTransparentRatio: 0.51`, `residualForegroundRatio: 0.082`, computed from the real 400×400 fixture); removal then runs and actually removes the white rectangle. Verified at three levels: the standalone assessment (`background-transparency.test.ts`, across 4 rectangle/artwork proportions from 0.08 to 0.69 residual), the full worker pipeline (`process-transparent-master.test.ts`, `removalApplied: true`), and a **real, valid RGBA PNG** end-to-end in the browser (`transparent-padding-regression.png`, Chromium, preview appears, packaging completes). |
| **17** | **Incidental alpha — single pixel / tiny corner (Product Office correction)** | **PASS (correctly NOT-confirmed → not treated as prepared)** | An otherwise fully opaque, varied-colour raster with (a) one stray transparent pixel or (b) a 3×3 transparent corner. Both correctly fail the first gate (`boundaryConnectedTransparentRatio` of `0` and `~0.006` respectively, both under `0.03`), `reason: 'insufficient-boundary-transparency'`. Verified at the assessment level and the full worker-pipeline level (removal still runs; the fixture's overall lack of real background/foreground structure is then separately and correctly caught by the existing sanity checks rather than a false clean success). |
| **18** | **Genuine transparent source bypass (Product Office correction, protects the optimization)** | **PASS (correctly confirmed → bypassed)** | The existing "foreground + transparent exterior + anti-aliased edges" fixture (#4's underlying raster) and the uniform semi-transparent fixture (#12) both correctly reach `background-transparency-confirmed` and skip removal — proving the correction does not regress the case it must protect (needlessly reprocessing, and risking damage to, artwork that was already correctly prepared). |

**Result: 16/18 PASS (13 original + 3 correction regressions), 2/18 NEEDS REVIEW (both intentional difficult cases, unchanged by the correction), 0/18 FAILED.** No common flat-background/typography/edge case was destroyed or degraded, and the specific defect Product Office identified is now demonstrably prevented — the directive §17/§59 quality bar for common cases is met, so no STOP condition was triggered.

## Core Test Totals

`npm run test:core`: **27 test files, 358 tests, all passing** (up from 26 files/345 tests before the correction). The correction added `transforms/background-transparency.test.ts` (10 tests) and extended `transforms/background-removal.test.ts` (+1 fine-icon-stroke test, now 15) and `workers/process-transparent-master.test.ts` (+2 regression tests, now 11).

## UI Test Totals

`npm run test:ui`: **20 test files, 242 tests, all passing.** (Unaffected by the correction — the decision logic it fixes lives entirely in `@filesetgo/core`, not the product/UI layer; `logo-pack-controller.test.ts`'s existing coverage of mode selection, the two-stage preview pipeline, strength changes, packaging gates, cancellation/retry, and stale-result/reset protection required no changes.)

## Laravel Totals

`php artisan test --compact`: **10 tests, 22 assertions, all passing.** No Laravel/PHP file was touched by FSG-005C (`vendor/bin/pint --test` also passes clean — nothing to format).

## Browser Results (Local — Directive §47, Re-run After the Correction)

Run against the real, built, locally served application (`php artisan serve` over the production `npm run build` output), per the existing FSG-006 Playwright infrastructure. **This is the local subset directive §47 calls for — not a re-run of the full remote FSG-006 certification matrix, and WebKit was not exercised** (consistent with FSG-006 remaining paused and its historical certification result not being touched or reused as FSG-005C evidence).

- **Chromium:** 51/51 passed (up from 49 — the two new correction tests: black-background JPEG, transparent-padding-regression PNG).
- **Firefox:** 48/51 passed, 3 skipped (the pre-existing, documented worker-scope-request-observability limitation from ADR-019 — unrelated to FSG-005C, the same 3 cases already skip on Firefox for every prior milestone).
- **Mobile viewport (4 projects — narrow-320, iPhone-class, Android-class, tablet-class):** 20/20 passed, unaffected by the correction.

`tests/browser/specs/logo-pack.spec.ts` gained, as of the correction: a black-background JPEG test (renaming the existing white-background test for clarity) and the CRITICAL REGRESSION test using a real, valid RGBA PNG (`transparent-padding-regression.png`) proving the browser-level product continues through preparation rather than falsely accepting the source as already transparent, and that packaging still completes successfully afterward.

## Corrected Copy

`resources/js/logo-pack/suitability.ts`'s JPEG transparency guidance previously said *"FileSetGo won't remove the existing background automatically"* — true under FSG-005B's contract, no longer true under FSG-005C. This is now: *"JPEG doesn't support transparency in the file itself, but choosing Transparent background below will attempt to remove this logo's background automatically."* The PNG/WebP guidance was corrected similarly. The historical FSG-006 browser assertion that checked the old wording (`tests/browser/specs/logo-pack.spec.ts`) was updated in place — per directive §48 — to assert the corrected, truthful copy instead, with an explanatory comment recording why the old assertion is intentionally no longer true. **Unaffected by the transparency-readiness correction** — no further copy changes were needed; the "✓ Transparent background verified" wording already only fires from `TransparentMasterResult.status === 'verified'`, which is now gated by the corrected decision logic rather than raw alpha presence (directive §7 of the correction).

## Typecheck / Build / Pint Results

```text
npm ci                        → 146 packages, 0 vulnerabilities
npm ls @playwright/test       → @playwright/test@1.55.1 (exact, unchanged)
npm run test:core             → 27 files, 358 tests passed
npm run test:ui               → 20 files, 242 tests passed
php artisan test --compact    → 10 tests, 22 assertions passed
npm run typecheck             → clean (tsconfig.json, packages/core/tsconfig.json,
                                  packages/core/tsconfig.worker.json, tsconfig.ui-tests.json)
npm run typecheck:browser     → clean (tsconfig.browser-tests.json)
npm run build                 → succeeded
vendor/bin/pint --test        → passed (no PHP files touched)
git diff --check              → clean, no whitespace errors
```

All re-run in full after the correction, in addition to during the original implementation pass.

## Bundle Delta

`public/build/` is gitignored — no committed pre-FSG-005C production build exists to diff byte-for-byte. The current build's chunk set is unchanged from FSG-006's baseline (`app-*.js`, `app-*.css`, `zip-adapter-*.js`, `heic-decode-*.js`, `image.worker-*.js`, `heic_dec-*.wasm`, font assets) — **no new chunk name appears**, confirming no new production dependency was pulled into the bundle, including after the correction (the new `background-transparency.ts` module is bundled into the existing `image.worker-*.js` chunk, which grew from 37.91 kB to 40.84 kB — consistent with real added algorithm code, not a new dependency). `app-*.js` (the main UI bundle) is unchanged by the correction at 69.94 kB (20.22 kB gzip), since the fix lives entirely in worker-side code.

## Dependencies

**None added, none upgraded, none removed — including during the correction.** `package.json`/`package-lock.json` are byte-for-byte unchanged by this milestone (confirmed via `git status` — neither file appears in the diff). No STOP condition requiring a dependency-approval request to Product Office was triggered (directive §39; correction directive's stop conditions were also all checked and none applied).

## Privacy / Security Audit

All transparency preparation, including the new background-transparency assessment, runs inside the existing worker architecture — no network request of any kind is issued. `tests/browser/specs/network-privacy.spec.ts` was re-run locally, unmodified, against the corrected Transparent-mode flow (including the new regression fixture) with no new network activity observed. No new `localStorage`/`sessionStorage`/`IndexedDB`/Cache Storage usage was introduced. Archive/path-safety rules are unchanged and reused as-is. See `docs/security/SECURITY.md`'s "Untrustworthy transparent-master output" threat-model entry and `docs/governance/DECISIONS.md` ADR-020 (now including the correction paragraph).

## Known Limitations

- **Difficult cases are genuinely difficult, by design.** Gradient backgrounds and border-touching near-background-coloured foreground correctly land on `needs-review`, not `verified` — this is the directive's explicit intended behaviour, not a defect. **Confirmed unchanged by the correction** (directive §12 of the correction explicitly required this — verified directly, not merely asserted).
- **An intrinsic, provable geometric ambiguity exists** between "a background region wrapping smaller trapped artwork" and "a legitimately multi-coloured logo mark with a smaller interior design detail" (e.g. a ring with a lighter-coloured hole) — these produce mathematically identical connectivity/colour evidence when their proportions match, so no purely pixel-based signal can perfectly separate them in every case. The correction's threshold is deliberately calibrated to catch the directive's required regression fixture while erring toward re-running (safe) preparation rather than a false bypass in the ambiguous middle ground; a large, single-colour foreground mark with a small interior colour detail may occasionally be routed through preparation unnecessarily rather than bypassed as an optimization. This is a documented, evidence-based trade-off, not an oversight — see "Why two independent thresholds, not one" above.
- **The soft-edge radius (3px) and ramp width (2× the strength threshold) are a reasonable but not exhaustively tuned choice** — real-world anti-aliasing gradients wider than a few pixels may receive a more abrupt transition than an ideal matting algorithm would produce. This is a deterministic, non-ML approach by design and does not claim professional cutout quality.
- **Drop-shadow handling is removal-oriented, not shadow-aware.** The algorithm has no explicit concept of "this region is a shadow, preserve it softly" — a shadow blending into the background is treated the same as background and largely removed, which is usually the visually correct outcome for a website logo but is not a guarantee for every possible shadow style.
- **FSG-006 remains paused**, per directive §58. This branch's changes to the Logo Pack UI mean FSG-006's existing Logo Pack browser tests needed updating for correctness — this was necessary to keep the *existing* suite green against the *new* UI, not a re-certification. A full FSG-006 resume/delta-recertification pass (including WebKit and the unresolved CI lockfile-reproducibility issue) remains Product Office's separate, later directive.
- **No byte-for-byte pre-FSG-005C production bundle was preserved** to diff against (`public/build/` is gitignored).

## Acceptance Criteria Self-Check (Directive §63, Re-verified After the Correction)

Every applicable criterion in the directive's closure checklist was re-verified true after the correction: explicit background choice with distinct Transparent/Original intents; actual-pixel transparency detection **and a genuine background-transparency-readiness assessment distinct from raw detection**; existing transparency preserved only when genuinely confirmed; opaque-source removal exists and meets the common-case quality bar; thin typography/ordinary edges/independent fine strokes survive; soft (non-binary) edge alpha; halo behaviour addressed via decontamination; PNG-only transparent master; mandatory post-encode re-inspection **plus a post-encode background-transparency re-check**; opaque/destructive/falsely-bypassed output cannot masquerade as a clean success; ambiguous results surfaced truthfully; preview uses the actual generated Blob across all three views; packaging gated on package-eligible status and sourced from the verified master; exact transparent/original filename and ZIP contracts; unchanged `favicon.ico`/icon filenames; no blind crop/trim, aspect ratio preserved; cancellation, stale-result protection, source-replacement invalidation, and reset all work; bounded Blob lifecycle; worker-side, browser-local, memory-bounded processing; no unapproved dependency; the full 18-case fixture matrix (15 original + 3 correction regressions) evaluated with no false clean success; all automated tests green; relevant local browser tests pass; Quick Fit/Guided Fit regressions remain green; the existing FSG-006 P0 protocol fix remains green (ADR-019's ICO regression coverage still passes unmodified); FSG-006 remains PAUSED; FSG-007 remains NOT STARTED.

## Product Office Closure Recommendation

**Product Office approved FSG-005C closure.** All mandatory common-case quality criteria pass; the specific defect-recreation scenario Product Office identified is demonstrably prevented at three independent levels of evidence (unit, worker-pipeline, and real-browser-file); both original difficult-case results remain truthful and unchanged; no STOP condition was triggered at any point; the full required baseline (core/UI/PHP tests, both typechecks, build, Pint, `git diff --check`, and local Chromium/Firefox/mobile-viewport Playwright) is green after the correction. FSG-005 (Packaging & Export Systems) is restored to CLOSED. FSG-006 remains PAUSED pending a separate Product Office delta-recertification directive. FSG-007 has not been started.

## Commit Reference

This report is included in the FSG-005C closeout commit:

`feat(web): add verified Logo Pack transparency`

The authoritative SHA is recorded in Git history and in the post-commit closeout response.
