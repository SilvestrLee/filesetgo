# FSG-003 Sprint Report — Quick Fit Workflow & Public Shell

## Milestone

FSG-003 — Quick Fit Workflow & Public Shell (see `docs/directives/FSG-003.md`).

## Status

FSG-003: Complete.

## Base Commit Before FSG-003

`6bc4feced6fb38a2f2150cb41a300b4155646508` — the FSG-002 closeout commit (`feat(core): add bounded target-size engine`). This is the commit the working tree was branched from; it is not a claim about FSG-003's own commit state.

## Branch

`fsg-003-quick-fit-shell`, created from the commit above.

## Objective

Replace the FSG-001 engineering-proof interface with the first real public FileSetGo experience: a Quick Fit workflow where a non-technical user selects an image, states a plain-language requirement (target file size, optional maximum dimensions, output format, dimension-flexibility), runs local browser processing via the existing `@filesetgo/core` APIs, and downloads the ready file — with no upload, no account, and no scope beyond what FSG-003 defines (no presets, packaging, accounts, billing, analytics, or SEO surfaces).

## Public Shell

`resources/views/welcome.blade.php` was fully replaced. Structure: minimal header (brand + Quick Fit/How it works navigation), a compact hero (`File. Set. Go.` / `Get your file ready for where it needs to go.`), the Quick Fit workspace as the visually dominant surface, a 3-step "How it works" section, a privacy-reassurance panel, and a restrained footer. No presets, no monetization UI, no cross-promotion, no fake navigation destinations.

## Quick Fit User Flow

Drop/choose file → inspect (preflight) → set requirements (target size, dimensions, format, dimension-flexibility) → **Get file ready** → processing (with Cancel) → success (summary + download) or unreachable (plain-language explanation + suggestion) or failed (mapped error message) or cancelled → **Start again** returns to idle without a page reload. Selecting a replacement file at any point cancels any active job, invalidates any prior result, and re-inspects the new file.

## UI Architecture

`resources/js/quick-fit/`:

- **Pure logic** (no DOM, no `@filesetgo/core` runtime calls): `state.ts` (typed state model), `format-bytes.ts` (KB/MB↔byte conversion, size formatting, reduction percentage), `filename.ts` (output filename generation), `errors.ts` (error/unreachable-code → human message), `request-plan.ts` (output-format resolution, no-op detection, `processImage`/`processImageToTarget` routing), `summary.ts` (success summary text), `capabilities.ts` (runtime-support translation), `validate-form.ts` (client-side form validation).
- **Orchestration**, DOM-free: `workflow.ts` (`QuickFitWorkflow`) — manages file selection/preflight, routes a requirement set to the correct core API, tracks the active job, and produces `QuickFitState`. Takes its core bindings via constructor injection (`QuickFitCoreClient`), mirroring the existing `ImageWorkerFactory` DI pattern in `runtime/worker-client.ts`.
- **DOM binding**: `controller.ts` — the only module touching `document`; wires form/drop-zone/button events to `QuickFitWorkflow` and renders `QuickFitState` back into the page. `core-client.ts` supplies the real `@filesetgo/core` bindings for production use.
- `resources/js/app.ts` now just bootstraps `./quick-fit/controller`.

See `docs/governance/DECISIONS.md` ADR-016 for the rationale (avoiding a new `jsdom`/DOM-emulation dependency by keeping orchestration logic DOM-free and independently testable).

## TypeScript Project Boundary

Adding `resources/js/quick-fit/tests/**` under the root production `tsconfig.json` (whose `include` already matched all of `resources/js/**/*.ts`) would have pulled Vitest's own type-declaration graph into the same TypeScript project as shipped browser code. That is fixed with an explicit boundary, not a blanket lib-check exemption:

- **`tsconfig.json`** (root, production/browser) — unchanged compiler options (`types: ["vite/client"]`, no `"node"`), plus `"exclude": ["resources/js/quick-fit/tests/**"]`. No `skipLibCheck`.
- **`tsconfig.ui-tests.json`** (new) — a dedicated project for the Quick Fit test environment: `include: ["resources/js/quick-fit/**/*.ts"]` (source + tests together, so it's self-contained), `types: ["node"]`. No `skipLibCheck`.
- **`@types/node`** — added as a devDependency, used only by `tsconfig.ui-tests.json`. Node globals never reach the production root project.
- `npm run typecheck` now chains all four projects (root, `packages/core/tsconfig.json`, `packages/core/tsconfig.worker.json`, `tsconfig.ui-tests.json`); `npm run typecheck:ui` runs the UI-test project alone.

With that boundary correctly built, full declaration checking then surfaced a second, independent problem: **Vitest 3.2.7** (the installed version; confirmed the latest published 3.x patch) bundles its own `dist/chunks/global.d.ts` declaring `Chai.Assert.containSubset` as a property, while Vitest's own `package.json` requires `"@types/chai": "^5.2.2"`, and `@types/chai` 5.2.x declares that same member as a method — an unmergeable, genuinely upstream conflict that fires for any project importing `vitest` 3.2.7 without `skipLibCheck`. This is very likely why `packages/core/tsconfig.json`'s pre-existing `skipLibCheck: true` (untouched by this sprint) has silently absorbed this exact conflict since FSG-001, not only the `node:` built-ins it was originally documented for.

**Resolution:** a root `package.json` override pins the transitive `@types/chai` to `5.0.1` (the last version before it gained `containSubset` typings), removing the conflicting declaration:

```json
"overrides": { "@types/chai": "5.0.1" }
```

Verified via `npm ls vitest @types/chai`:

```text
filesetgo@ /Users/silvestr/filesetgo
├─┬ @filesetgo/core@0.1.0 -> ./packages/core
│ └── vitest@3.2.7 deduped
└─┬ vitest@3.2.7
  ├── @types/chai@5.0.1 overridden
  └─┬ @vitest/expect@3.2.7
    └── @types/chai@5.0.1 overridden
```

This is types-only (resolves to a nested `vitest/node_modules/@types/chai`); FileSetGo code never imports `chai` directly or uses `containSubset` (confirmed by repository-wide search), so there is no runtime behavior change. `npm ci` followed by `npm run typecheck` reproduces a clean, zero-error, zero-`skipLibCheck` result from the lockfile alone.

This override is a **temporary, governed toolchain-compatibility pin**, not a permanent dependency decision — it sits outside Vitest's own declared `@types/chai` range. Removal trigger: the next Vitest major-version upgrade should first try removing this override; if the newer bundled declarations no longer conflict, remove it. See `docs/governance/DECISIONS.md` ADR-016 for the full record.

## State Model

`QuickFitState` (`state.ts`) is a discriminated union: `idle`, `inspecting`, `file-rejected`, `ready`, `processing`, `success`, `unreachable`, `failed`, `cancelled`. Each variant only carries the fields valid in that state (e.g. a download URL can't exist without a real result). A selection-sequence counter guards against stale preflight/job resolutions being applied after a newer file selection or reset has already superseded them — the same pattern as the FSG-001B proof UI's `selectionSequence`, generalized into the workflow class.

## Core API Orchestration

`request-plan.ts` routes every requirement set: `processImageToTarget()` whenever a target file size is given (with or without dimensions), `processImage()` for resize/convert-only requests, and no core call at all for a no-op request (same format, no target, no dimension limit — the primary action is disabled with an inline hint in that case). HEIC sources always resolve "Keep original" to WebP output (HEIC cannot be produced as output), whether routed through `processImage()` or `processImageToTarget()`.

## Requirement Inputs

- **Target file size**: optional KB/MB input, converted via `unitValueToBytes()` (1 KB = 1024 B, 1 MB = 1,048,576 B) and validated client-side against the core's `MIN_TARGET_BYTES`/`MAX_TARGET_BYTES`.
- **Maximum width/height**: optional, independent, aspect ratio preserved by core (no crop/stretch controls).
- **Output format**: Keep original / JPEG / PNG / WebP. HEIC sources hide "Keep original" and default to WebP with an inline note. A transparency warning appears when an alpha-capable source (PNG/WebP) is converted to JPEG.
- **Dimension flexibility**: a plain-language toggle ("Allow FileSetGo to reduce dimensions if needed") mapped to `dimensionPolicy: 'flexible' | 'hard'`; hidden until a target size is entered, defaulting to on. No quality slider or numeric compression controls are exposed anywhere.

## HEIC Handling

Unchanged from FSG-001C/FSG-002 at the core level. The public shell accepts HEIC via the file picker (`accept="image/jpeg,image/png,image/webp,image/heic,image/heif"`) and the drop zone; preflight remains authoritative over the accept attribute. Output is always resolved to WebP for HEIC sources (§15).

## Error / Unreachable UX

`errors.ts` maps every `ImageProcessingErrorCode` (preflight ∪ processing) to a plain-language message (no raw codes surfaced) and every `TargetSizeUnreachableCode` to a message plus a concrete suggested next step (allow dimension adjustment; try a larger target; PNG-is-lossless hint for PNG targets). Unreachable is presented as a distinct, non-alarming outcome, separate from the `failed` (system error) panel.

## Success & Download

The success panel is built entirely from the actual returned result metadata (`buildSuccessSummary()` in `summary.ts`) — dimensions, format, byte size, and (for target jobs) whether dimensions had to be reduced, all read from the real `ProcessedImageResult`/`TargetSizeResult`, never assumed. A reduction percentage is shown only when the output is genuinely smaller. Download uses a local Blob object URL and a generated filename (`<original-basename>-filesetgo.<ext>`); no server round-trip. Object URLs are created only on success and revoked before a new result replaces an old one, on reset, and on `pagehide`.

## Accessibility

Skip link to the Quick Fit section; the drop zone is a keyboard-reachable, labeled control (Enter/Space opens the file picker) in addition to supporting drag-and-drop; all form fields have associated labels; a dedicated `aria-live="polite"` announcer reports file-rejection, success, unreachable, error, and cancellation transitions without echoing every internal processing stage; result/error panels use `role="alert"`; status is never conveyed by color alone (text messages accompany every state).

## Responsive Behavior

Layout uses Tailwind's responsive utilities (stacked single-column below `lg`, two-column workspace at `lg` and above); all interactive controls (drop zone, buttons, download link) use `min-h-11` (~44px) for touch-target sizing; the drop zone does not require drag-and-drop (click-to-choose always works). Not verified against a real mobile device or browser automation this sprint — see Known Limitations.

## Privacy

The shell states: "Your image stays on your device while FileSetGo prepares it. It isn't uploaded to FileSetGo." No claim of "no network requests" is made, consistent with the HEIC decoder's legitimate same-origin lazy WASM fetch.

## Runtime Capability Handling

`controller.ts` calls `getRuntimeCapabilities()` once at bootstrap; `capabilities.ts` translates the result to a single plain-language outcome ("FileSetGo is ready in this browser." / "This browser doesn't support the processing features FileSetGo needs.") gated on `workerProcessing`. No capability matrix is shown to users.

## Automated Tests

**Core package regression** (`npm run test:core`): **202/202 passing**, unchanged from the FSG-002 baseline — no core behavior was modified this sprint.

**Quick Fit UI** (`npm run test:ui`, new script added this sprint): **91/91 passing** across 9 files:

| File | Tests | Covers |
|---|---|---|
| `format-bytes.test.ts` | 10 | KB/MB↔byte conversion, size formatting, reduction percentage |
| `filename.test.ts` | 6 | Output filename generation, edge cases |
| `request-plan.test.ts` | 18 | Output-format resolution, transparency warning, no-op detection, `processImage`/`processImageToTarget` routing |
| `errors.test.ts` | 8 | Error-code and unreachable-code → message mapping |
| `summary.test.ts` | 9 | Success summary text, target vs. standard results, reduction label |
| `capabilities.test.ts` | 2 | Runtime-support translation |
| `validate-form.test.ts` | 10 | Client-side form validation, no-op rejection |
| `state.test.ts` | 6 | State-model helpers (`sourceOf`, `isRunnable`, `isProcessing`, `canDownload`) |
| `workflow.test.ts` | 22 | Orchestration: routing (JPEG/PNG/WebP/HEIC, standard vs. target, no-op), cancellation, stale-result prevention on file replacement, error/unreachable propagation, retry after failure, object-URL lifecycle, reset |

Workflow tests use a constructor-injected fake `@filesetgo/core` client (no module mocking, no DOM emulation) per ADR-016.

## Laravel Tests

`php artisan test --compact`: **6/6 passing, 9 assertions.** New `tests/Feature/WelcomeShellTest.php` (4 tests) confirms `GET /` returns 200, the FileSetGo brand and Quick Fit workspace are present in the response, and no upload/conversion/process route has been registered. The pre-existing `ExampleTest.php` (200-status check) is unchanged.

## Production Build

`npm run build` succeeds. Output includes `app-*.js` (38.31 kB), `app-*.css` (24.08 kB), a lean `image.worker-*.js` (25.16 kB), and a separate lazy `heic-decode-*.js` (32.54 kB) + `heic_dec-*.wasm` (959.55 kB) chunk pair.

## HEIC Lazy-Load Regression

Re-verified after this sprint's rebuild: `image.worker-*.js` and `app-*.js` contain only the `HEIC_DECODER_UNAVAILABLE`/`HEIC_INITIALIZATION_FAILED` error-code *strings* (expected — they're part of the shared error-message plumbing), with zero occurrences of the actual decoder glue markers (`libde265`, `wasmBinaryFile`, `instantiateWasm`). Those markers appear only inside the separate `heic-decode-*.js` chunk. The Quick Fit page does not eagerly import the HEIC decoder.

## Network / Privacy Audit

`grep` across `resources/js/quick-fit/`, `resources/js/app.ts`, and `resources/views/welcome.blade.php` for `fetch(`, `XMLHttpRequest`, `sendBeacon`, `axios`, `FormData`, `multipart` — zero matches. The requirements form has no `action`/`method` and its submit handler calls `preventDefault()`, so no native form submission is possible. `routes/web.php` still defines only `GET /`.

## Verification Commands Run

```text
npm run typecheck    → clean
npm run test:core    → 202/202 passing
npm run test:ui      → 91/91 passing
npm run build        → succeeded
php artisan test --compact → 6/6 passing, 9 assertions
vendor/bin/pint --dirty --format agent → passed
git diff --check     → clean (no whitespace errors)
```

`npm run typecheck` now runs four TypeScript projects with zero `skipLibCheck` anywhere in the FSG-003 changes (root production, `packages/core/tsconfig.json`, `packages/core/tsconfig.worker.json`, `tsconfig.ui-tests.json`) — see the "TypeScript Project Boundary" section above and `docs/governance/DECISIONS.md` ADR-016 for the full explanation, including the temporary `@types/chai` compatibility override this required.

Reproducibility was also verified via a clean install: `npm ci` (141 packages, 0 vulnerabilities) followed by the full verification baseline reproduced identical, clean results from `package-lock.json` alone.

## Known Limitations

- **Browser automation was not exercised this sprint.** The Chrome-in-Chrome extension did not connect in this environment (consistent with repeated failures recorded during FSG-001B); per ADR-013/TESTING.md, this is recorded honestly rather than chased or worked around, and does not block closure. `controller.ts` (the DOM-binding layer) is therefore verified by build + typecheck only, not by an automated or manual browser session, this sprint.
- Comprehensive real-device/cross-browser responsive and touch-target verification remains FSG-006 scope, as established in prior sprints.
- No physical/manual QA was requested from or performed by the project owner, per ADR-013.

## FSG-003 Acceptance Audit (directive §68)

| # | Criterion | Status |
|---|---|---|
| 1 | `/` is a real FileSetGo public shell | Met |
| 2 | Quick Fit immediately discoverable | Met |
| 3 | Select/drop JPEG, PNG, WebP, HEIC | Met (preflight-gated) |
| 4 | Preflight rejection translated to UI | Met |
| 5 | Source format/dimensions/size shown | Met |
| 6 | Target size in KB/MB | Met |
| 7 | Optional max dimensions | Met |
| 8 | Output format selectable | Met |
| 9 | HEIC not selectable as output | Met |
| 10 | Flexible/hard exposed in plain language | Met |
| 11 | Target-size jobs use `processImageToTarget()` | Met (tested) |
| 12 | Resize/format-only jobs use `processImage()` | Met (tested) |
| 13 | No-op jobs prevented | Met (tested) |
| 14 | Cancellable processing | Met (tested) |
| 15 | Success shows real output metadata | Met |
| 16 | Local download | Met |
| 17 | Blob URLs cleaned up | Met (tested) |
| 18 | Unreachable distinct from errors | Met |
| 19 | Reset/start-again without reload | Met |
| 20 | Replacement files can't get stale results | Met (tested) |
| 21 | Keyboard usable | Met (drop zone + native controls); not browser-automation verified |
| 22 | Mobile responsive | Built to responsive conventions; not browser-automation verified |
| 23 | Privacy language accurate | Met |
| 24 | No upload/conversion server endpoint | Met (audited + tested) |
| 25 | HEIC remains lazy-loaded | Met (re-verified) |
| 26 | Existing 202 core tests remain green | Met |
| 27 | New UI/workflow tests pass | Met (91/91) |
| 28 | Laravel feature tests pass | Met (6/6) |
| 29 | No FSG-004+ scope begun | Met |
| 30 | No manual project-owner QA required | Met |

Items 21/22 are implemented to spec but not independently confirmed by browser automation or manual testing this sprint (see Known Limitations) — this is recorded honestly rather than claimed as verified.

## Next Milestone

FSG-004 — Preset Engine & Guided Workflows is NEXT and has not begun.

## Commit Reference

This report is included in the FSG-003 closeout commit:

`feat(web): add Quick Fit public workflow`

The authoritative commit SHA is recorded in Git history and in the post-commit closeout response.
