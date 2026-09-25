# File. Set. Go. — Current Sprint Report

Date: 2026-09-23

## FSG-007H — Production Traffic Readiness & Compliance Checkpoint (2026-09-23)

**Status: CLOSEOUT COMPLETE — AWAITING FINAL PRODUCT OFFICE REVIEW.** Audit, HSTS production correction, governance-document reconciliation, and the pre-existing browser-test defect fix are all complete. See `docs/compliance/COOKIE-INVENTORY.md`, `docs/compliance/PRIVACY-AND-LEGAL-REVIEW.md`, `docs/compliance/SECURITY-AND-RECOVERY-VERIFICATION.md`, `docs/compliance/COMPLIANCE-DECISION-REGISTER.md`, and `docs/deployment/PRODUCTION-RUNBOOK.md` for full evidence.

This checkpoint corrects the repository/production reconciliation this milestone's directive required:

- Production (`u232789501@195.35.38.16`, `~/domains/filesetgo.com`) was confirmed via authorized SSH to be running git HEAD `ee9207a38d38a4ab942e322ad4ef1e7c47e9cce9` — identical to this repository's HEAD and to `origin`. No undeployed work, no drift.
- This file's prior snapshot (dated 2026-09-15, HEAD `2ff998b`) was stale by two commits: `aa00364` ("release: File Set Go FSG-007 production checkpoint," 2026-09-16) and `ee9207a` ("feat: mature File Set Go homepage," 2026-09-21). The "Working tree: substantial, intentional dirty tree... not to be staged, committed, pushed" note below no longer describes reality — the working tree is clean and the FSG-007G-lineage work has already been committed and is live in production.
- **`/website-image-optimizer` (FSG-007F) status corrected 2026-09-23 (closeout):** live production evidence shows this route is deployed (200 OK), present in `/sitemap.xml`, and linked from the homepage and two other acquisition pages — and was substantially rewritten with three new passing browser-test specs in the `aa00364` commit. Product Office has directed this file's status be corrected to `IMPLEMENTED / DEPLOYED / VISUAL ACCEPTANCE PENDING` (not `PAUSED / NEXT`, and not formally closed) — see "Acquisition Page Status" below and `docs/compliance/COMPLIANCE-DECISION-REGISTER.md` item 4. Final FSG-007 launch certification (full multi-engine browser recertification, formal visual acceptance) remains outstanding.
- Full cookie/browser-storage inventory, privacy/legal page audit, production security recertification (CSP/HSTS/redirect/cookie-attribute verification via live headers and authorized SSH), a Hostinger-specific deployment runbook, and a backup/recovery assessment were completed — see the linked documents. **Closeout (2026-09-23):** a baseline HSTS header (`max-age=15552000`, no `includeSubDomains`/`preload`) was applied to production after verifying certificate/renewal arrangements — see `docs/compliance/SECURITY-AND-RECOVERY-VERIFICATION.md` §3 for before/after evidence and rollback. The pre-existing `header-navigation.spec.ts` mobile privacy-assurance test defect (found by this audit's first browser-suite run) is corrected — with a correction along the way: an initial fix wrongly added mobile-centering CSS to `resources/css/app.css` based on an older FSG-007A-era screenshot; an independent Product Office review caught that the actual accepted FSG-007G baseline (`fsg-007g-homepage-maturity.zip`, newer) shows this section **left-aligned**, not centered. The CSS change was fully reverted (`resources/css/app.css` now has **zero diff** against `origin`) and the test rewritten a second time to assert the real, accepted left-aligned layout. See `docs/compliance/COMPLIANCE-DECISION-REGISTER.md` §3c for the full corrected account. All repository-only changes (`/privacy`/`/terms` wording, the test fix, doc updates) remain **uncommitted**, per explicit instruction not to commit/push/deploy without release authorization — see "Repository" below for the exact working-tree state.
- Automated regression baseline for this checkpoint is recorded in the "Verification Baseline" section below (FSG-007H row).
- **Legal identity reconciliation (2026-09-23, follow-up to closeout):** Product Office supplied verified legal facts — operator **Tsotsia Digitals**, legal form **registered business name / sole proprietorship** (explicitly not an LLC), jurisdiction **Nigeria**, and public privacy contact **`privacy@filesetgo.com`**. Both `/privacy` and `/terms` were updated with these exact facts, replacing the prior honest placeholders. Registered office address, business registration number, edge/CDN log retention period, and sub-processor disclosure were **not** supplied and are **not** invented — both pages now explicitly name these four items as still outstanding. The verified cookie inventory, browser-local processing disclosures, and hosting/CDN data-handling descriptions on `/privacy` were left untouched. Re-verified: `vendor/bin/pint --dirty` passed, full PHPUnit suite passed (38/38, 292 assertions), `npm run build` succeeded, and both routes were rendered locally to confirm correct output. Not committed — see "Repository" below.

## Repository

- Branch: `fsg-007-front-facing-redesign`
- HEAD: `ee9207a38d38a4ab942e322ad4ef1e7c47e9cce9` (verified identical on local, `origin`, and production)
- Working tree: clean (verified 2026-09-23; the dirty-tree note below described the 2026-09-15 snapshot and no longer applies — that work has since been committed via `aa00364` and `ee9207a`).
- Staged: none
- Commit: current as of `ee9207a` (FSG-007H made no application-code commits; audit/documentation only)
- Push: production confirmed already up to date with this HEAD
- Deploy: **already live** — production is serving this exact HEAD today (confirmed via SSH `git rev-parse HEAD` on the production host)

### 2026-09-15 snapshot (historical, preserved for record)

- HEAD at that time: `2ff998bf1ad434395cae1b8ff191478070eac5a5`
- Working tree: substantial, intentional dirty tree. The cumulative accepted FSG-007 work (public redesign through the full FIT-001 → FIT-003-R5.1 remediation sequence) remained uncommitted by deliberate continuation policy — it was preserved without reset or discard across every prior sprint in this lineage and was not to be staged, committed, pushed, or deployed except on explicit Product Office authorization. This has since occurred (see FSG-007H checkpoint above) and is no longer the current state.

## Current Milestone

- FSG-007 — Public Product Experience & Launch: **active**.
- Current sub-directive: FSG-007A (Complete Front-Facing Website Redesign), which the work below sits under.
- Next authorized work: see §"Next Authorized Work" below — FSG-007F is implemented/deployed (visual acceptance pending); final FSG-007 launch certification is the outstanding next step, not a fresh FSG-007F implementation directive.

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
| FSG-007F | Website Image Optimizer acquisition page | `IMPLEMENTED / DEPLOYED / VISUAL ACCEPTANCE PENDING` |
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

**FSG-007F — Website Image Optimizer (`/website-image-optimizer`): `IMPLEMENTED / DEPLOYED / VISUAL ACCEPTANCE PENDING`** (corrected 2026-09-23, FSG-007H closeout, per Product Office direction — this section previously read `PAUSED / NEXT`, which FSG-007H's audit found factually contradicted by production and Product Office has now directed be corrected). It is live, sitemapped, and linked from the homepage and two other acquisition pages, and is covered by three passing dedicated browser-test specs. It is **not** formally closed — Product Office visual acceptance is still outstanding, and it is not yet counted among the five frozen pages above pending that acceptance.

### Why FSG-007F was originally paused, and how it resumed

The initial Website Image Optimizer redesign exposed that its Hero/Content/Card destinations did not actually produce destination-specific geometry — Guided Fit's presets were, at the time, a bounding box rather than an exact frame, so the page's own premise ("choose your destination, get the right result") was not yet true of the underlying product. Rather than ship an acquisition page that visually implied destination-specific outputs the engine could not yet deliver, the page was deliberately paused while FIT-001 through FIT-003 corrected the actual product (exact destination geometry, user-controlled crop, and a truthful processing transition).

### FSG-007F story (implemented — verified live 2026-09-23)

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

This section previously described the above as the required-but-not-yet-built target story. FSG-007H's audit confirmed the live page (commit `aa00364`) actually implements this real workflow — genuine Hero/Content/Card destination geometry, a real crop-focus step, and the real FILE→SET→GO processing grammar — not a smaller or faked version of it, matching this section's own prior requirement.

## Known Limitations

- The governed acquisition deep-link contract selects only a mode/preset entry point (`logo-pack`, `quick-fit`, `guided-fit`); it does not safely preselect a byte target, background treatment, or skip directly to favicon-source selection. Each CTA therefore opens the real workflow at its nearest approved entry point.
- There is no deterministic browser fixture that exercises a genuine mid-processing failure (as opposed to a simulated/injected one); failure-state presentation is verified through the existing injected-error test paths rather than a naturally-failing real job.
- HEIC sources have no native browser thumbnail; the FILE-stage rail and other source previews fall back to a plain file icon for this format by design, not as an unhandled gap.
- A cosmetic fade-out transition between the processing interstitial leaving and the workspace becoming visible was deliberately not implemented (ADR-031) — implementing it risks reintroducing a focus/`inert` ordering race, so the instant cut remains current behavior pending a future milestone with room to solve that ordering properly.
- FSG-007F (Website Image Optimizer) is implemented and deployed but not formally closed — Product Office visual acceptance is still outstanding (see "Acquisition Page Status" above).
- `header-navigation.spec.ts`'s mobile privacy-assurance layout test — a pre-existing defect found and **fixed** by FSG-007H's closeout (2026-09-23), with a correction along the way: test now asserts the real, accepted **left-aligned** `.fsg-home-trust` layout (matching the FSG-007G baseline), not the centered layout an initial fix wrongly added and then reverted. See "Verification Baseline" below and `docs/compliance/COMPLIANCE-DECISION-REGISTER.md` §3c for the full corrected account.
- Two `stress.spec.ts` heavy repeated-cycle tests ("5 repeated Transparent Logo Pack cycles," "10 consecutive large target-size jobs") are **genuinely non-deterministic on this machine, not simply 2-worker CPU contention** — each reproduced a real timeout failure when run completely alone, more than once for one of them (2 fail / 1 pass across 3 solo attempts). Every failure is a timeout waiting for a real state transition after substantial cumulative WASM/canvas work in the same tab, never a wrong-output or stuck-state assertion. Not resolved — root cause (slow hardware vs. a real timing regression) is unconfirmed. See `docs/compliance/COMPLIANCE-DECISION-REGISTER.md` §9 for the full, corrected account (an earlier, over-confident "confirmed flaky, not a defect" characterization from this closeout's first pass has been retracted).
- **Final FSG-007 launch certification remains outstanding**: full multi-engine (Chromium/Firefox/WebKit) and mobile-viewport browser recertification against the current deployed state has not been re-run since `aa00364`/`ee9207a`, and formal Product Office visual acceptance of FSG-007F and FSG-007G has not occurred.

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

### FSG-007H checkpoint (2026-09-23)

| Check | Command | Result |
| --- | --- | --- |
| Laravel | `php artisan test --compact` | PASS — 38 / 38 tests, 292 assertions |
| Pint | `vendor/bin/pint --test` | PASS |
| Typecheck | `npm run typecheck` | PASS |
| Browser typecheck | `npm run typecheck:browser` | PASS |
| Core unit | `npm run test:core` | PASS — 493 / 493 tests, 32 / 32 files |
| UI unit | `npm run test:ui` | PASS — 320 / 320 tests, 24 / 24 files |
| Build | `npm run build` | PASS — output asset hashes (`app-BZp-MVB6.js`, `heic_dec-ojH1Dp2m.wasm`, `zip-adapter-BOagJ5MW.js`, etc.) are byte-identical to what is currently deployed in production's `public_html/build/assets/`, independently confirming production is serving this exact source commit |
| Recovery exercise | from-scratch `git clone` of `origin` at `ee9207a`, fresh throwaway `.env`/`APP_KEY`, `composer install --no-dev`, `npm ci`, `npm run build`, cache commands, `php artisan test --compact` | PASS — clean clone reproduces byte-identical build output and 38/38 passing tests with no dependency on local machine or server state; proves the repository + lockfiles alone are sufficient to rebuild production. See `docs/compliance/SECURITY-AND-RECOVERY-VERIFICATION.md` §6. |
| Browser suite (chromium, local) | `npx playwright test --project=chromium` | 246–250 / 254 passed across final runs, 2 skipped (self-documented `FSG_CAPTURE_*`/`FSG_GENERATE_*`-gated evidence specs), 2–6 failed depending on run — `header-navigation.spec.ts:280` (mobile-trust) is fixed and passing. **Root cause of the remaining failures found and directly demonstrated** (see `docs/compliance/COMPLIANCE-DECISION-REGISTER.md` §9): Playwright's own tracing/screencast overhead, not a product defect — a standalone diagnostic replicating the same workflow completed all 10 iterations in ~3.5s each with flat, bounded memory/Blob-URL/DOM metrics when untraced, and reproduced the exact erratic multi-second-spike pattern when tracing was enabled, with product metrics still flat throughout. |
| Browser suite (firefox, local) | `npx playwright test --project=firefox` | 227/254 passed, 5 skipped, 22 failed, 37.1 min. Same root cause as above, more severe (Firefox is measurably slower for this canvas/WASM workload in this environment) — failures concentrated almost entirely in `processing-transition.spec.ts`, `stress.spec.ts`, `network-privacy.spec.ts`. |
| Browser suite (WebKit, governed CI) | GitHub Actions `fsg-006-browser-certification.yml`, triggered via `workflow_dispatch` against the already-pushed `ee9207a` (no new commit/push) — [run 35945958735](https://github.com/SilvestrLee/filesetgo/actions/runs/35945958735) | Full matrix (chromium+firefox+webkit+mobile): 761 passed, 12 skipped, 13 failed. All infra/build steps succeeded. Failures: the pre-existing mobile-trust bug (not yet deployed to the branch CI reads), a **new, genuine, unresolved finding** — `header-navigation.spec.ts:261` "three deliberate lines" hero-overflow, 100% reproducible in Linux CI across all 3 engines but never once reproduced locally on macOS across ~6 full local runs (see `docs/compliance/COMPLIANCE-DECISION-REGISTER.md` §11) — plus more instances of the item-9 timing pattern and one WebKit-specific skip-link scroll-position assertion. |
| Dark-mode GO-checkmark test | `processing-transition.spec.ts:680` | **Root cause found**: a CSS-transition sampling race in the test itself (`.fsg-processing-rail__node`'s 220ms `color` transition, sampled before it settles) — not a product defect. Directly confirmed the settled color is `rgb(255,255,255)` in both light and dark mode with fresh screenshots. See `docs/compliance/COMPLIANCE-DECISION-REGISTER.md` §10. |

**Net assessment across ~1,300 total test executions this session (local + CI, all engines):** zero wrong-output, data-corruption, or security-relevant failures. Every failure traces to one of: the one known mobile-trust test bug (now fixed locally, not yet deployed), the demonstrated tracing-overhead timing pattern, or the two newly-found-and-explained/flagged items above.
| Production smoke test | homepage, 6 acquisition routes, `/privacy`, `/terms`, `/sitemap.xml`, `/robots.txt`, 404, canonical/HTTPS redirects, security headers, exposed-path probing — against live `https://filesetgo.com` | PASS — see `docs/compliance/SECURITY-AND-RECOVERY-VERIFICATION.md` for full evidence |

Full detail, including the production security/cookie/privacy findings, is in the FSG-007H audit report delivered to Product Office alongside this checkpoint.

## Next Authorized Work

**Final FSG-007 launch certification** — the closeout of the FSG-007H compliance/hardening milestone does not itself constitute FSG-007's own launch certification. Outstanding:

- Full multi-engine (Chromium/Firefox/WebKit) and mobile-viewport browser recertification against the current deployed state (`ee9207a`) has now been run once this session (local Chromium/Firefox, governed WebKit CI) — see Verification Baseline. It should be re-run again once the local-only `header-navigation.spec.ts` mobile-trust fix is deployed, since the CI run above still reflects the pre-fix pushed commit.
- Formal Product Office visual acceptance of FSG-007F (`IMPLEMENTED / DEPLOYED / VISUAL ACCEPTANCE PENDING`) and FSG-007G (implementation authorized; visual approval pending per `docs/directives/FSG-007G.md`).
- Owner-supplied legal facts: operator (Tsotsia Digitals), legal form (registered business name / sole proprietorship, not an LLC), jurisdiction (Nigeria), and privacy contact (`privacy@filesetgo.com`) were supplied 2026-09-23 and applied to `/privacy` and `/terms`. Registered office address, business registration number, edge/CDN log retention period, and sub-processor disclosure remain genuinely outstanding and are explicitly named as such on both pages rather than invented — see the Compliance Decision Register item 1.
- **New, genuine, unresolved finding:** `header-navigation.spec.ts:261`'s mobile hero "three deliberate lines" overflow check fails 100% reproducibly on the Linux CI runner, across all three engines, but has never once reproduced locally on macOS. Leading hypothesis is a font-loading race (`document.fonts.ready` not awaited) or a cross-platform font-rendering difference — not confirmed. See `docs/compliance/COMPLIANCE-DECISION-REGISTER.md` §11.
- The heavy real-processing test timeouts (item 9) now have a demonstrated root cause — Playwright tracing overhead colliding with genuinely CPU-heavy work, not a product defect — but the recommended infrastructure fix (disable tracing for these specs, or shorten their cumulative session length) has not been applied; requires test-owner sign-off.

FSG-007H's own scope (cookie/privacy/security/deployment/monitoring compliance) is closed as of this checkpoint; the items above belong to FSG-007's broader launch-certification milestone, not to FSG-007H.

## Final Status

`FSG-007H CLOSEOUT COMPLETE — FSG-007 FINAL LAUNCH CERTIFICATION OUTSTANDING`
