# FSG-006 Sprint Report — Hardening, Mobile QA & Compatibility

## Milestone

FSG-006 — Hardening, Mobile QA & Compatibility (see `docs/directives/FSG-006.md`).

## Status

**FSG-006 — PAUSED.**

**Reason:** a real-user Logo Pack validation introduced the approved FSG-005C ("Logo Transparency & Verification") requirement after this FSG-006 certification work was already substantially completed. FSG-005C changes the Logo Pack workflow this milestone certified, so final FSG-006 closure must wait until the new transparency workflow is implemented and its affected paths are re-certified.

**The existing certification is not invalidated.** Everything recorded in this report — the full Chromium/Firefox/WebKit/mobile browser matrix, the P0 protocol fix, the two responsive/accessibility fixes, the same-session stress test, the unsupported-runtime test, and the CI infrastructure — is preserved as an authoritative baseline for the pre-FSG-005C product. It remains pushed, untouched, and unreset on `fsg-006-hardening-compatibility` (verification checkpoint through commit `1a08ff5`, plus this pause/governance-correction commit). `docs/governance/ROADMAP.md` is not touched — FSG-006 is not marked closed there.

FSG-005C now branches from this pause checkpoint as `fsg-005c-logo-transparency`. FSG-006 does not resume during FSG-005C.

## Base Commit

`fb6d75b9536f8d3549ceceb1fc2e52db98a954a8` — the FSG-005B report-correction commit, the authoritative repository checkpoint named in this milestone's directive. Confirmed via `git status`/`git rev-parse HEAD` before branching: working tree clean, HEAD matched exactly.

## Branch

`fsg-006-hardening-compatibility`, created from the commit above (not continued on the FSG-005B branch).

## Milestone State

```text
FSG-001 ✅ CLOSED
FSG-002 ✅ CLOSED
FSG-003 ✅ CLOSED
FSG-004 ✅ CLOSED
FSG-005A ✅ CLOSED
FSG-005B ✅ CLOSED

FSG-005 ⏭ REOPENED
FSG-005C ▶ CURRENT — Logo Transparency & Verification

FSG-006 ⏸ PAUSED — existing certification preserved
FSG-007 — NOT STARTED
```

## Objective

Verify, harden, and certify the existing V1 product surface against real browser engines and mobile viewport conditions — not add a new feature. The question this milestone answers: does the FileSetGo MVP behave reliably in the browsers and viewports real users will actually encounter?

## Scope Freeze

No new presets, file formats, batch processing, Logo Pack assets, accounts, billing, analytics, or marketing sections were introduced. Every change in this sprint is one of: a compatibility/accessibility/responsive fix, a resilience fix, or test infrastructure necessary for this milestone. `docs/product/PRODUCT.md` is unmodified — nothing about the product surface changed. No FSG-007 work was started.

## Browser Tooling

Per directive §8, existing tooling was inspected before installing anything: no Playwright/Cypress/Puppeteer in `package.json`, `node_modules`, or globally; no `tests/browser/` or `playwright.config.*` existed. The `claude-in-chrome` MCP tool available in this environment is a real but different capability — interactive, Chromium-family only, driven turn-by-turn, not a scriptable multi-engine suite producing deterministic per-engine PASS/FAIL counts. This was surfaced to Product Office, who approved installing `@playwright/test` as a new dev-only dependency.

**Version and platform note (see `docs/governance/DECISIONS.md` ADR-019 for full detail):** `@playwright/test@1.63.0` (latest at install time) refuses to install Chromium at all on this host's macOS 12. Testing across versions found `1.55.1` is the *minimum* version fixing a high-severity install-time SSL-certificate-verification-bypass CVE (GHSA-7mvr-c777-76hp) while still supporting macOS 12 — this is the version pinned. WebKit is a separate story: see "Browser Engine Matrix" below.

## Browser Test Architecture

`tests/browser/specs/*.spec.ts` — a dedicated boundary, never mixed into `packages/core/tests`/`resources/js/**/tests`. Tests run against the real, built, locally served application (`php artisan serve` over the production `npm run build` output via Playwright's `webServer` config), asserting real DOM/state (`#status-message[data-state]`, result panels, asset lists) rather than screenshots. `tests/browser/helpers/app.ts` provides shared, DOM-free-style helpers (`gotoApp`, `selectMode`, `uploadFile`, `waitForStatus`, `collectConsoleProblems`, `collectRequests`). `tests/browser/fixtures/` holds small, self-generated, real, decodable images (see its own `README.md` for exact provenance — PNG/JPEG/WebP/HEIC gradients built with `struct`+`zlib`/macOS `sips`/`cwebp`, plus deliberately invalid/corrupted/truncated cases and one larger 4800×3200 real-world-scale JPEG). `npm run test:browser` runs the suite; `npm run typecheck:browser` type-checks it separately (dedicated `tsconfig.browser-tests.json`, `skipLibCheck: true` scoped narrowly to work around a pre-existing TS-version/Playwright-bundled-`.d.ts` incompatibility — the main `npm run typecheck` is untouched).

## Browser Engine Matrix

WebKit is a required, governed engine target — it has not been waived, and this milestone does not close with it unexecuted. What is real is a narrower, purely environmental fact, corrected from an earlier draft of this report that overstated it as a settled trade-off: **this coding agent's local macOS 12 host cannot run a current, non-CVE-affected Playwright WebKit build at all**, full investigation in `docs/governance/DECISIONS.md` ADR-019. Per Product Office direction, WebKit execution was obtained from a supported environment instead of being redefined away — no local Docker/VM runtime was available in this environment (checked directly: `docker` is not installed), so a GitHub Actions workflow (`.github/workflows/fsg-006-browser-certification.yml`) running Playwright on a current Ubuntu runner was used.

**Playwright-version correction:** an earlier draft of this report claimed that CI run used "the identical governed `@playwright/test@1.55.1` pin." That was not accurate at the time. `package.json` then declared `"@playwright/test": "^1.55.1"` (a caret range, not an exact pin — corrected below, see "Reproducibility Correction"), and the CI workflow's install step dropped `package-lock.json` to work around the rolldown optional-dependency bug, so npm was free to resolve any `1.x` release satisfying that range. **The exact `@playwright/test`/browser build versions actually exercised in run `33972958935` were never captured or logged** (the workflow did not run `npm ls @playwright/test` or an equivalent version-print step). The PASS result remains valid evidence that the application worked correctly against whatever real Chromium, Firefox, and WebKit engine builds Playwright actually installed and ran there — it is not evidence that those were specifically version `1.55.1`'s bundled browsers.

| Engine | Classification | Evidence |
|---|---|---|
| Chromium | **PASS** | 45/45 — GitHub Actions run [`33972958935`](https://github.com/SilvestrLee/filesetgo/actions/runs/33972958935); also 45/45 locally |
| Firefox | **PASS** | 42/45, 3 skipped with a documented, non-product tooling reason (see below); 0 failed — same CI run; also matches locally |
| **WebKit** | **PASS** | **42/45, 3 skipped (same documented tooling reason, generalized to any non-Chromium engine), 0 failed** — real Playwright WebKit execution on a Linux GitHub Actions runner, triggered by commit `383cc2a` on this branch (exact Playwright/browser build version not captured from that run — see correction above) |

All three engine results above come from **one single CI run** (`33972958935`) for direct comparability — Chromium/Firefox were re-run there too, not merely copied from the earlier local numbers, and they match exactly.

**No Safari or physical device was tested at any point.** "WebKit" throughout this report refers only to Playwright's automated WebKit browser engine — never Safari, never a physical device. This distinction is stated explicitly per directive §55, not implied, everywhere WebKit is mentioned.

**WebKit local-environment investigation, for the record (not a decision to skip WebKit — a record of why it needed a different environment):**
- Playwright `1.55.1` (the governed pin, chosen for its CVE fix) — the only WebKit build installable for macOS 12 (`webkit_mac12_special`, a frozen 2023-era snapshot) is protocol-incompatible with this version's driver (`Unknown setting: FixedBackgroundsPaintRelativeToDocument` on every `newPage()`). WebKit cannot launch at all.
- Playwright `1.40.0` + WebKit build `1944` — confirmed to actually launch (`webkit OK hi`) in isolation, but `1.40.0` carries the same SSL-verification-bypass CVE `1.55.1` exists to fix, and build `1944` is a multi-year-old snapshot that would not represent current WebKit/Safari behavior even if adopted. Neither the CVE exposure nor the non-representative result were acceptable, so this combination was not used anywhere, including in CI.

**The 3 skips on Firefox, and the same 3 on WebKit:** `lazy-load.spec.ts`'s three tests assert which chunks a request-collector observed. Playwright reliably surfaces requests made *from inside* a module Worker (both `image.worker.js` itself and its own dynamic `import()` of `zip-adapter.js`/`heic-decode.js`) through `page.on('request')` only under Chromium's CDP transport — Firefox's Juggler protocol and WebKit's own remote protocol do not expose worker-scope requests the same way — independently reconfirmed while building the Firefox Logo Pack cancellation test (a `page.route()` interceptor for the same worker-scope request recorded zero hits in Firefox despite the job completing normally). This is a Playwright tooling limitation shared by both non-Chromium engines, not a product behavior difference — the same lazy-loading fact is independently and more strongly proven by the byte-for-byte-unchanged chunk-hash bundle inspection below. Each skipped test still runs its full real functional flow up to the point of the unavailable assertion; only the network-observation assertion itself is skipped, with the reason printed inline. The same limitation made one Logo Pack cancellation test (see "Cancellation Certification") skip only its cancel-mid-flight assertion on non-Chromium engines specifically, while still running the complete flow — this is why that test's condition is `browserName === 'chromium'`, generalizing cleanly to WebKit without any change needed once WebKit actually ran.

## GitHub Actions WebKit Result

**WebKit — PASS. 42/45 tests passing, 3 skipped (documented tooling limitation above), 0 failed.**

Obtained from workflow run [`33972958935`](https://github.com/SilvestrLee/filesetgo/actions/runs/33972958935) (`.github/workflows/fsg-006-browser-certification.yml`, commit `383cc2a`), triggered by a push to `fsg-006-hardening-compatibility`, on a `ubuntu-latest` GitHub Actions runner — Node 22, PHP 8.5, `@playwright/test` (per "Playwright-version correction" above, the exact resolved version from that specific run was not captured — `package.json` at that commit declared `^1.55.1` and the CI install step dropped the lockfile), Playwright WebKit installed via `npx playwright install --with-deps webkit`. The job built the real production assets (`npm run build`) and served the real application (`php artisan serve`) exactly as the local suite does; no synthetic reimplementation.

**This required three infrastructure fixes along the way, all fully resolved, none touching FSG-006 product code or test assertions:**
1. `npm ci` (and even a lockfile-respecting `npm install`) failed on the Linux runner with the documented `npm/cli#4828` optional-dependency bug — Vite's rolldown bundler couldn't resolve its Linux-x64 native binding from a macOS-authored lockfile. Fixed by dropping the lockfile for this CI-only install (the repository's committed `package-lock.json` is untouched).
2. `php artisan serve` never came up (`Timed out waiting 30000ms from config.webServer`) — `.env.example` defaults `SESSION_DRIVER`/`CACHE_STORE`/`QUEUE_CONNECTION` to `database`, and `database/database.sqlite` is gitignored, so it didn't exist in a fresh CI checkout. Fixed by creating the file and running migrations before starting the server.
3. **The most consequential one:** the first two (otherwise-successful) CI runs silently never executed WebKit at all, despite installing it — `playwright.config.ts` never defined a `webkit` project. `npx playwright test` only ever runs the projects a config actually declares, regardless of which browser binaries are installed. Fixed by adding a `webkit` project, included only when `CI` is set (this local host still cannot launch it — see "Browser Engine Matrix"). This is recorded plainly because it would have been easy to mistake "the workflow succeeded" for "WebKit was verified" without checking the actual per-project test counts, which is exactly why this report cross-checked exact `[webkit]`-tagged pass/skip/fail counts from the raw CI log rather than trusting the green checkmark alone.

## Reproducibility Correction

Two more governance/reproducibility issues surfaced on review, corrected here:

**`@playwright/test` was not actually exact-pinned when the WebKit run above executed**, despite ADR-019 and earlier drafts of this report describing it that way. `package.json` declared `"@playwright/test": "^1.55.1"` — a caret range, not an exact version. **Corrected now:** changed to `"@playwright/test": "1.55.1"` and `package-lock.json` regenerated through the normal governed workflow (`npm install`, not the CI-only lockfile-dropping path). Verified: `npm ci` followed by `npm ls @playwright/test` resolves exactly `@playwright/test@1.55.1`, locally. This local exact pin did not exist at the time run `33972958935` executed, which is exactly why that run's own resolved version cannot be claimed retroactively (see "Playwright-version correction" above).

**CI reproducibility is not solved, and this report does not pretend it is.** The CI workflow's install step still drops `package-lock.json` to work around the `npm/cli#4828` rolldown optional-dependency bug (see item 1 above) — meaning the remote dependency graph, including `@playwright/test` itself, is not fully lockfile-reproducible from that job. This is recorded as an open FSG-006 infrastructure limitation, to be resolved (a real cross-platform fix — not a hard-coded Rolldown native-binding package guess) before FSG-006's final certification, not before this pause. No fresh 155-test remote run was performed for this governance correction alone, per Product Office instruction — the Logo Pack contract this suite certifies is about to change under FSG-005C regardless, which would make re-running it now redundant.

## Mobile Viewport Matrix

Four Chromium-based projects (named-device presets were not used for iPhone/iPad-class viewports because Playwright's `devices['iPhone …']`/`devices['iPad …']` force WebKit, which this host cannot run — directive §11 explicitly allows behavior over device branding):

| Project | Viewport | Result |
|---|---|---|
| `mobile-narrow-320` | 320×640, touch | 5/5 PASS |
| `mobile-iphone-class` | 390×844, touch, iOS Safari UA | 5/5 PASS |
| `mobile-android-class` | Chromium's real `devices['Pixel 7']` preset (412×839, touch) | 5/5 PASS |
| `mobile-tablet-class` | 810×1080, touch | 5/5 PASS |

Each project runs `mobile-viewport.spec.ts`: bootstrap (no overflow, mode-tab touch targets), Quick Fit form (reachable/tappable/no overflow through a real success), Website Logo Pack (suitability review + all 7 asset rows + primary/secondary CTA sizing + no overflow through a real success), footer placement, and a portrait↔landscape resize check. All 20/20 pass after the two responsive fixes recorded under "Defects Found."

## Quick Fit Certification

Real flows exercised end-to-end through the actual worker/runtime (`quick-fit.spec.ts`): a target-size job (bounded quality search), a plain output-format conversion with a real confirmed download event, a 4800×3200 (15.36 MP) large representative image resized and re-encoded successfully (directive §51 — comfortably under the 24 MP/15 MB safety limits, chosen to catch canvas/worker/resource problems tiny fixtures can't), and a deterministic unreachable target-size case (1 KB target on a real photo, dimension reduction disabled) presented as unreachable — never a system failure — with a working "Adjust settings" recovery path.

## Guided Fit Certification

`guided-fit.spec.ts`: selecting a preset shows the recommendation review and does **not** start processing by itself; "Get file ready" then completes and the result carries the selected preset's context (`#result-prepared-for`). "Adjust settings" switches to Quick Fit, retains the same source (no second preflight — confirmed by the still-correct format label), and prefills the exact `web.card` preset values (150 KB / 800×800 / WebP). An already-ready source (a WebP already under the preset's limits) is reported as needing no processing, and "Use this file" downloads the real original file untouched (confirmed via a real download event with the original filename).

## Logo Pack Certification

`logo-pack.spec.ts`: a complete successful flow from a shared source produces exactly the seven named public assets, `favicon.ico` exactly once, no README/manifest/browserconfig text anywhere in the result, a primary "Download logo pack" CTA that produces a real `*-filesetgo-logo-pack.zip` download event, and a clean reset back to the initial workspace. A wide (8:1) logo shows the geometry warning without blocking generation. A too-small (60×60) logo blocks generation with the exact governed message, `Create logo pack` disabled, and replacing it with an adequate source restores the ability to generate. A JPEG source gets the truthful "won't remove the existing background" note, never a transparency/removal claim. **This certification is what found and proved the fix for the P0 defect recorded under "Defects Found" — every one of these flows was completely broken (stuck on "processing" forever) before that fix.**

## HEIC Certification

`heic.spec.ts`: a real, self-generated, valid HEIC file (reused from `packages/core/tests/workers/heic-fixture.ts`'s existing provenance) is selected, correctly identified (`#source-format` shows HEIC), shown the truthful "HEIC can't be used as an output format, so your ready file will be WebP" note, and processes to a real successful WebP result through the actual decoder — in both Chromium and Firefox.

## Download Certification

Real download events (`page.waitForEvent('download')`), not merely `<a>` presence, are asserted for: Quick Fit's plain-conversion result (`.webp` extension), Guided Fit's already-ready "Use this file" (exact original filename), and Website Logo Pack's primary ZIP CTA (`*-filesetgo-logo-pack.zip` filename pattern). Quick Fit's target-size and large-image flows assert the `blob:` href and a well-formed `download` filename attribute directly.

## ZIP Certification

The real Logo Pack browser flow's confirmed ZIP download (above) is the browser-level evidence; exact-entry-count/no-extra-files verification is already proven at the core level by `process-image-set.test.ts`'s real `unzipSync()` round-trip (unchanged this sprint) — browser tests were not given their own unzip logic, consistent with directive §19's "do not expose unzip code to production UI merely for browser tests."

## Invalid Input / Recovery

`invalid-file.spec.ts`: a non-image file is rejected with a real, non-empty message and the app remains usable without a reload — a valid file selected immediately afterward succeeds. A truncated JPEG (valid signature, no data) is rejected the same way. A file with real PNG bytes but a `.jpg` name/MIME is correctly identified as PNG — binary preflight, not the extension, is authoritative.

## Cancellation Certification

`cancellation.spec.ts`: cancelling a Quick Fit target-size job (using the 4800×3200 fixture for a real processing window) reaches `cancelled`, no later success silently replaces it, and a subsequent job still completes — on both Chromium and Firefox. Cancelling a Website Logo Pack job reaches `cancelled` on Chromium (a `page.route()` delay on the `zip-adapter` chunk deterministically holds the job at its archiving stage — a genuine network condition, not a sleep — since even a 15 MP source can otherwise complete before a Cancel click round-trip reliably lands on a fast engine/CPU); mode switching in both directions afterward remains functional with no stale processing lock, and a subsequent Logo Pack generation still succeeds. **On Firefox specifically**, the same worker-scope request-visibility gap documented under "Browser Engine Matrix" also prevents `page.route()` from ever intercepting that request (confirmed directly: 0 route hits recorded), so this one test lets the job complete instead of forcing an unreliable cancel-mid-flight window there — Firefox's shared cancellation architecture is still fully proven by the Quick Fit cancellation test immediately above it (identical single-job-slot runtime and cancellation primitives), and the rest of this test (mode switching, subsequent generation) still runs for real on Firefox.

## Stale-Result Certification

`stale-replacement.spec.ts`: selecting File A then immediately File B (both `setInputFiles` calls fired back-to-back, so File A's async preflight can genuinely still be in flight) leaves File B authoritative in both Quick Fit and Website Logo Pack — confirmed again after a settle delay to rule out a late overwrite.

## Reset Certification

`reset.spec.ts` (Quick Fit) and `logo-pack.spec.ts` (Logo Pack): reset from a successful result and from a rejected-file state both restore the initial workspace (source panel hidden, result hidden, drop-zone label restored) and accept a new file successfully afterward, with no stale Blob URL errors observed.

## Capability Fallbacks

`gotoApp()`'s shared assertion (`#runtime-unsupported` hidden) ran on every single test in the suite across both certified engines — the capability-gated unsupported-runtime banner never appeared, confirming Chromium and Firefox both satisfy FileSetGo's processing contract cleanly.

**Real browser-level capability-fallback certification** (`unsupported-runtime.spec.ts`, Product Office gap §4): `page.addInitScript()` removes `window.Worker`, `window.OffscreenCanvas`, or `window.createImageBitmap` — the exact three globals `getRuntimeCapabilities()` feature-detects — *before* the application's own JS runs on the page, a standard Playwright environment-simulation technique operating on the real browser environment, not a mock of FileSetGo's own code. In every case: `#runtime-unsupported` becomes visible with the real, correct message ("This browser doesn't support the processing features FileSetGo needs."), the entire `#quick-fit-app` workspace is hidden rather than left in a broken half-enabled state, and zero console errors or exceptions occur. A fourth test removes `window.WebAssembly` (the HEIC-decoder-specific prerequisite, not part of the core `workerProcessing` contract) and confirms ordinary JPEG processing still completes normally — proving the capability gate is scoped correctly, not overly broad. All four pass on both Chromium and Firefox.

## Accessibility / Keyboard Audit

`accessibility.spec.ts`: exactly one `<h1>`; all three mode tabs expose `role="tab"`/`aria-controls`; the drop zone is a real `role="button" tabindex="0"` control; the primary Quick Fit CTA is keyboard-focusable and activatable with Enter, completing a real job; a blocking file rejection is announced through the shared `aria-live` status announcer; every Logo Pack download control has a distinct accessible name (via `aria-label`, never a bare repeated "Download"); and focus is never left stranded inside now-hidden content after a cancellation. `bootstrap.spec.ts` additionally confirms ArrowLeft/ArrowRight roving-tabindex cycling with automatic activation across all three tabs.

## Responsive / Mobile Audit

See "Mobile Viewport Matrix" above. Two real defects were found and fixed here — see "Defects Found."

## Touch Target Audit

Mode tabs, the primary Quick Fit CTA, and the Logo Pack "Create"/download controls were measured directly (`boundingBox()`) against a ~44 CSS px floor at every mobile viewport. One real gap was found (mode tabs) and fixed — see "Defects Found." Every other audited control already met the floor.

## Console / Exception Audit

`collectConsoleProblems()` (console errors + `pageerror`, i.e. uncaught exceptions and unhandled rejections) ran attached for every certified successful workflow in `bootstrap.spec.ts`, `quick-fit.spec.ts`, `logo-pack.spec.ts`, and `network-privacy.spec.ts`. Zero unexplained entries were observed across any run in this sprint's final, green suite. The one benign, expected log line present on every page load — Laravel Boost's dev-tooling `🔍 Browser logger active (MCP server detected)` notice — is a `console.log`, not an error, and is unrelated to FileSetGo's own code; it was not suppressed, only correctly excluded from the "errors" filter.

## Network / Privacy Audit

`network-privacy.spec.ts`, at the real network level (not code inspection): normal JPEG/PNG/WebP/HEIC processing issues zero requests to any non-application origin; the ZIP adapter loads as a local application asset; no `localStorage`/`sessionStorage`/`IndexedDB`/Cache Storage entry is created for user-file content after a real successful job. See `docs/security/SECURITY.md`'s new "FSG-006 Browser-Level Re-confirmation" section.

## Lazy-Load Runtime Audit

`lazy-load.spec.ts` (Chromium; see "Browser Engine Matrix" for the Firefox tooling limitation): a normal JPEG job never requests the HEIC decoder or ZIP adapter chunks; the HEIC decoder chunk is requested only once a HEIC file is actually processed, not merely selected; opening the Logo Pack tab alone never requests the ZIP adapter chunk, which is requested only once generation actually starts. Cross-checked against the bundle inspection below — all three lazy chunk hashes are byte-for-byte identical to the FSG-005B baseline.

## Browser Storage Audit

Covered in "Network / Privacy Audit" above — `localStorage`, `sessionStorage`, `indexedDB.databases()`, and `caches.keys()` are all confirmed empty after a real successful processing job.

## Security Regression

No governed security boundary was weakened to make any browser test pass. Magic-byte/container validation, the 15 MB/24 MP limits, archive filename protection, and output re-validation are all unchanged this sprint (no core safety-boundary file was modified — only `runtime/protocol.ts`'s worker-*event*-shape validator, which is a protocol-correctness fix, not a content-safety boundary). `docs/security/SECURITY.md` records the browser-level re-confirmation.

## Stress / Resource Testing

**Dedicated same-session resource-lifecycle stress test** (`stress.spec.ts`, Product Office gap §3), one page/session per test, no arbitrary sleeps — only observable state transitions:

- **5 repeated Quick Fit cycles** (alternating JPEG/PNG sources, select → process → assert exactly one visible result → reset → repeat). Blob URL lifecycle is instrumented by wrapping `URL.createObjectURL`/`revokeObjectURL` via `page.addInitScript()` (tracking, not mocking, the real calls) — after 5 full cycles plus one final selection, at most 2 Blob URLs remain alive (the current, not-yet-reset source preview), not a count that grows with the number of cycles.
- **5 repeated Website Logo Pack generation cycles** in one session — exactly 7 asset rows every single cycle (never accumulating), Blob URL count bounded the same way.
- **5 source-replacement cycles plus one cancellation/restart cycle** in one session — File B is authoritative every time, and the tool completes a normal job immediately after a cancel/restart with no unrecovered processing lock.

All three pass on Chromium and Firefox. No stuck worker state, stale result, accumulating visible result state, failed subsequent job, Blob URL growth, or unrecovered processing lock was observed in any iteration.

## Performance Observations

Engineering observations only, not a performance guarantee. On this host (2 physical CPUs, `workers: 2` to avoid CPU-contention-induced false timeouts):

| Flow | Chromium | Firefox |
|---|---|---|
| Quick Fit target-size (640×480 gradient JPEG) | ~3s (incl. navigation) | ~3–12s |
| Website Logo Pack (600×600 PNG, 7 assets + ICO + ZIP) | ~4.6s | ~4–14s |
| Large image (4800×3200) resize + re-encode | ~3.8s | ~4.9s |

Firefox showed noticeably more run-to-run variance than Chromium on this shared, CPU-constrained host — this drove the cancellation tests' route-delay technique (see "Cancellation Certification") and is recorded here rather than smoothed over.

## Defects Found

| # | Severity | Description |
|---|---|---|
| 1 | **P0** | `runtime/protocol.ts`'s `isImageWorkerEvent()`/`isImageSetAssetResult()` validated every `ImageSetAssetResult` against the raster-only shape (`width`/`height`/`format`) unconditionally. Every real Logo Pack job includes an ICO asset (`favicon.ico`), which has none of those fields — this silently rejected the real `JOB_COMPLETE_SET` message from every real browser Worker for every real Logo Pack job, leaving the UI stuck on "Creating your logo pack..." forever with no error, no timeout, no console output. The worker itself completed correctly every time (confirmed via temporary instrumentation, removed before commit). 304 pre-existing core tests never caught this because `worker-client.test.ts`/`protocol.test.ts`'s `JOB_COMPLETE_SET` fixtures only ever used raster-shaped assets. |
| 2 | **P2** | The three mode tabs used `min-h-9` (36px, measuring ~40px effective), short of the ~44px touch-target guideline directive §13 names them under explicitly, measured directly at a 320px viewport. |
| 3 | **P2** | The Logo Pack per-asset download button rendered its full `Download {filename}` label with `whitespace-nowrap`, forcing the button (and the page) wider than a 320px viewport for any real filename. |

## Defect Disposition

All three defects were fixed in this sprint, not deferred — P0/P1 must be resolved before closure (directive §63) and both P2s were cheap, correct, in-scope compatibility/accessibility fixes (§2/§64 permit exactly this).

1. **Fixed.** `isImageSetAssetResult()` now branches on `kind`: `'ico'` validates the actual `IcoAssetResult` shape (`blob`, `mimeType`, `byteSize`, `sizes: number[]`); anything else validates against the existing raster shape. New regression tests: `protocol.test.ts` gained a positive case (a real raster+ICO mixed result is accepted) and a negative case (a malformed ICO asset — missing `sizes` — is still rejected); `worker-client.test.ts` gained a full runtime round-trip test resolving a mixed-asset result end-to-end. See `docs/governance/DECISIONS.md` ADR-019.
2. **Fixed.** Mode tabs changed to `min-h-11` (44px), matching every other primary control already in the app (`process-button`, `logo-pack-create-button`, etc.) — this is a consistency fix, not a new pattern.
3. **Fixed.** The download button's visible label shortened to "Download" (the filename is already shown in the row above it); the full, distinct `Download {filename}` remains as the `aria-label` for the accessible name. This also removed redundant on-screen text, not just the overflow.

No P3/polish-only issues were identified this sprint.

## Design / UX Review

Per directive §58, FSG-006 is QA, not redesign — the full four-skill pipeline was not run for every fix. `ui-ux-pro-max` was queried for touch-target guidance (`"tab touch target minimum size" --domain ux`), confirming WCAG 2.2 AA's actual web minimum is 24 CSS px and that the app's own existing 44px convention (used everywhere else) is the right target to bring the mode tabs in line with — not an arbitrary overcorrection. `impeccable`'s mechanical detector (`impeccable detect`) ran against every changed UI file (`welcome.blade.php`, `controller.ts`) after the fixes and returned zero findings, matching FSG-005B's clean baseline. `design-taste-frontend` and the `21st.dev` skills were not invoked — no visual/component-design issue was found that would warrant them; both defects found were a numeric sizing gap and a text-wrap/label-length issue, not composition or visual-language problems.

## Automated Unit/Integration Baseline

`npm run test:core`: **307/307 passing** (304 pre-FSG-006 + 3 new regression tests proving the P0 fix: one in `protocol.test.ts`'s positive-case table, one in its negative-case table, one full-runtime test in `worker-client.test.ts`). No pre-existing test's behavior changed.

`npm run test:ui`: **217/217 passing**, unchanged.

`php artisan test --compact`: **10/10 passing, 22 assertions**, unchanged — no Laravel file was touched this sprint.

## Browser Test Counts

**GitHub Actions, full 7-project matrix including WebKit (run `33972958935`, the authoritative cross-engine result): 155 tests total, 149 passed, 6 skipped (documented tooling limitation, 3 on Firefox + 3 on WebKit), 0 failed.**

| Project | Passed | Skipped | Failed |
|---|---|---|---|
| chromium | 45 | 0 | 0 |
| firefox | 42 | 3 | 0 |
| **webkit** | **42** | **3** | **0** |
| mobile-narrow-320 | 5 | 0 | 0 |
| mobile-iphone-class | 5 | 0 | 0 |
| mobile-android-class | 5 | 0 | 0 |
| mobile-tablet-class | 5 | 0 | 0 |

**Local (Chromium/Firefox/4 mobile projects — WebKit cannot run on this host, see "Browser Engine Matrix"): 110 tests total, 107 passed, 3 skipped, 0 failed**, re-run twice back to back until both runs were completely green, not merely "passed once." The two totals are consistent: 155 CI − 45 webkit-project tests = 110, matching the local total exactly.

This includes the two new specs added to close Product Office gaps §3/§4 (`stress.spec.ts`, `unsupported-runtime.spec.ts` — 11 tests together, run on chromium/firefox/webkit, not against the mobile-viewport projects).

**Two test-reliability fixes landed alongside the product fixes, both confirmed as test-timing issues, not product defects, by passing reliably in isolation and only failing under added parallel load:** `accessibility.spec.ts`'s focus-after-cancellation check now uses `expect.poll()` instead of an instant snapshot (a browser's own focus-clearing when a focused control is hidden is not necessarily synchronous with the script that hides it, under real CPU contention); `logo-pack.spec.ts`'s primary success-path test no longer asserts an intermediate `processing` state before `success` (the same "job finishes faster than a round-trip check" pattern already fixed elsewhere in this suite).

## Production Build

`npm run build` succeeds. Verified from a fully clean state: `npm ci` (fresh `node_modules` from the committed lockfile, 0 vulnerabilities) → `rm -rf public/build node_modules/.vite` → `npm run build`.

## Bundle Observation

| Asset | FSG-005B baseline | FSG-006 | Delta |
|---|---|---|---|
| `app-*.js` | 62.19 kB | 62.41 kB | +0.22 kB (the `protocol.ts` ICO-branch validator + the two UI fixes) |
| `app-*.css` | 25.94–25.97 kB | 26.06 kB | +~0.1 kB (negligible; no new utility classes of note) |
| `image.worker-*.js` (hash `7xiD-vqa`) | 32.38 kB | 32.38 kB (identical hash) | unchanged |
| `zip-adapter-*.js` (hash `BOagJ5MW`) | 9.12 kB | 9.12 kB (identical hash) | unchanged |
| `heic-decode-*.js` (hash `CIxd_bUO`) | 32.54 kB | 32.54 kB (identical hash) | unchanged |
| `heic_dec-*.wasm` (hash `ojH1Dp2m`) | 959.55 kB | 959.55 kB (identical hash) | unchanged |

The `image.worker.js` chunk is byte-for-byte identical because `runtime/protocol.ts`'s validator functions are only imported by `worker-client.ts` (main thread), never by the worker itself — confirmed directly by the unchanged hash, not assumed. `@playwright/test` is a dev-only dependency; it contributes zero bytes to any production bundle (confirmed by the identical/near-identical hashes above).

## Physical Device Limitation

No physical device or real Safari instance was available to, or used by, this agent — including in the GitHub Actions run used to obtain a real WebKit result (a Linux CI runner executing Playwright's automated WebKit browser engine, not Safari and not a physical device). This limitation is stated plainly, in every place WebKit is discussed in this report, rather than worked around or implied away. No claim of physical-device or Safari certification appears anywhere in this report.

## Known Limitations

- **This local macOS 12 environment cannot run a current, non-CVE-affected Playwright WebKit build** (see "Browser Engine Matrix" and ADR-019) — a real, documented environment constraint, addressed by obtaining WebKit execution from a supported GitHub Actions runner rather than treated as a reason to redefine the engine matrix.
- **3 Firefox lazy-load tests, and one Firefox Logo Pack cancellation assertion, are skipped/adapted** due to the same Playwright/Firefox worker-request-visibility tooling limitation (see "Browser Engine Matrix") — the underlying product facts (lazy loading, and shared cancellation architecture) are independently proven elsewhere (unchanged bundle hashes; the Quick Fit cancellation test).
- **No physical device or real Safari testing** — see "Physical Device Limitation."
- **HEIC decoder-failure simulation** (directive §52) was not added — reliable simulation would require invasive test-only code paths in the decoder; existing unit coverage (`heic-decode.test.ts`) already exercises corrupt/truncated/empty HEIC payloads at the decode-function level with clean catchable errors, which was not touched this sprint.

## FSG-006 Acceptance Audit (directive §71)

| # | Criterion | Status |
|---|---|---|
| 1 | Existing core baseline remains green | Met (307/307) |
| 2 | Existing UI baseline remains green | Met (217/217) |
| 3 | Existing Laravel baseline remains green | Met (10/10, 22 assertions) |
| 4 | Typecheck passes | Met |
| 5 | Production build passes | Met |
| 6 | Chromium compatibility passes | Met (45/45 local) |
| 7 | Firefox compatibility passes | Met (42/45 local, 3 documented tooling skips, 0 failed) |
| 8 | WebKit compatibility passes | **Met (42/45, 3 documented tooling skips, 0 failed — real GitHub Actions run `33972958935`, see "GitHub Actions WebKit Result")** |
| 9 | Mobile viewport compatibility passes | Met (20/20 across 4 projects) |
| 10 | 320px layout remains functional | Met (tested directly, one real defect found and fixed) |
| 11 | Quick Fit browser flow passes | Met |
| 12 | Guided Fit browser flow passes | Met |
| 13 | Logo Pack browser flow passes | Met (was broken before this sprint's P0 fix) |
| 14 | Target-size processing browser flow passes | Met |
| 15 | HEIC path is browser-tested | Met (Chromium + Firefox) |
| 16 | ZIP generation/download is browser-tested | Met |
| 17 | Invalid-file recovery works | Met |
| 18 | Cancellation recovery works | Met |
| 19 | Rapid replacement stale protection works | Met |
| 20 | Reset recovery works | Met |
| 21 | Already-ready Guided Fit works | Met |
| 22 | Wide-logo warning works | Met |
| 23 | Too-small Logo Pack block works | Met |
| 24 | JPEG background guidance remains truthful | Met |
| 25 | Mode keyboard navigation works | Met |
| 26 | No horizontal overflow in governed mobile viewports | Met (after fix) |
| 27 | Critical controls have adequate touch targets | Met (after fix) |
| 28 | No unexplained browser console/page exceptions remain | Met |
| 29 | Source/output files are not uploaded | Met |
| 30 | HEIC decoder remains lazy | Met |
| 31 | ZIP adapter remains lazy | Met |
| 32 | No persistent user-file browser storage exists | Met |
| 33 | Security boundaries remain intact | Met |
| 34 | No P0/P1 compatibility defects remain | Met (the one found was fixed) |
| 35 | P2/P3 issues are resolved or explicitly dispositioned | Met (both P2s fixed; no P3s found) |
| 36 | Bundle regression is understood | Met (+0.22 kB app.js, all lazy chunks byte-identical) |
| 37 | Physical-device limitation, if any, is stated truthfully | Met |
| 38 | No project-owner manual QA is required | Met |
| 39 | FSG-007 work has not begun | Met |

## Launch-Readiness Recommendation

**NOT READY FOR FSG-007 — FSG-005C must complete and affected FSG-006 certification must be resumed.**

Every FSG-006 Acceptance Audit item recorded in this report was genuinely Met against the *pre-FSG-005C* Logo Pack contract, including WebKit (§8, real 42/45-passing GitHub Actions result). That evidence is preserved as a valid baseline, not discarded. But FSG-005C changes the Logo Pack workflow this milestone certified, so the certification as a whole cannot be called final or launch-ready until the new transparency workflow exists and its affected paths (Logo Pack certification, suitability messaging, any new/changed asset behavior) are re-verified against this same browser matrix.

## Next Milestone

FSG-005C — Logo Transparency & Verification, branching from this pause checkpoint as `fsg-005c-logo-transparency`. FSG-006 does not resume during FSG-005C. FSG-007 remains **not started**, and will not start before both FSG-005C and the resumed FSG-006 certification are closed.

## Commit Reference

**None of the following are the FSG-006 closure commit** — FSG-006 is PAUSED, not closed, and `docs/governance/ROADMAP.md` is not touched by any of them.

| Commit | Contents |
|---|---|
| `7c2c86d` | The complete FSG-006 browser-test suite, the P0 protocol fix, the two responsive/accessibility fixes, and the CI workflow definition |
| `b0ad341` | CI fix: `npm ci` → `npm install` (attempt 1 at the rolldown optional-dependency bug) |
| `c7f3d72` | CI fix: drop the lockfile for the CI-only install (attempt 2, the one that worked) |
| `414578e` | CI fix: create and migrate the sqlite database so `php artisan serve` actually starts |
| `383cc2a` | Fix: add the missing `webkit` Playwright project so CI actually executes it (this is the commit the real WebKit result above came from) |
| `1a08ff5` | Report update recording the real WebKit result |
| *(this pause commit)* | `chore(governance): pause FSG-006 for Logo Pack correction` — this Status/version/Playwright-pin/reproducibility correction, per this Product Office pause directive |

`fsg-005c-logo-transparency` branches from the pause commit above.
