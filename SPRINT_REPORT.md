# FileSetGo Sprint Report

## Milestone

FSG-006R — External Audit Runtime & Security Hardening

## Status

Product Office accepted the technical remediation and fresh remote certification. FSG-006R is formally closed, FSG-007 is cleared to resume through a separate reconciliation directive, and FSG-008 remains not started.

## Base / Branch

- Stable historical FSG-006 closure: `b291f38ddc137fc7c43b8a6633fa535d6fa2bc53`
- Certified pre-audit application candidate: `09324a6f9c73bae2f66cb40c21d509439ca99a35`
- Branch: `fsg-006r-post-audit-hardening`
- Final remote-certified candidate: `ffa73d24887ecba9af78b3e09194dca3da1d511b`
- FSG-007 preservation checkpoint: `1f1ced66ab43f7093efeed4b0aa56a20ad5eafc2`

The historical FSG-006 closure remains valid evidence for its original candidate. FSG-006R is a new post-audit gate and does not rewrite that history.

## External Audit

The external audit returned **CONDITIONAL PRODUCTION READINESS — PASS WITH REMEDIATIONS** for target-size memory pressure, HEIC cancellation starvation, low-alpha edge quality, and CSP/WASM hardening.

The audit did not provide reproducible physical-device data for the reported iOS memory failure. It also described two source states inaccurately: FileSetGo already hard-terminated cancelled workers, and the HEIC WASM was already a Vite-bundled same-origin asset.

## Finding Disposition

| Finding | External audit claim | FileSetGo source finding | Implemented disposition |
| --- | --- | --- | --- |
| F1 memory | Target-size processing may create client OOM pressure. | Canvas zeroing already existed. Quality-search history retained every probe Blob, and cross-tier `closestMiss` retained a Blob unnecessarily. | Metadata-only probe history and closest-miss state; winner-only binary ownership; ownership and repeated-job tests. |
| F2 cancellation | HEIC/WASM could starve a worker-side cancel message. | Cancellation success never depended on that message: the host settles, detaches handlers, and terminates the worker. | Runtime unchanged; deterministic non-yielding-worker and browser recovery proofs added. |
| F3 halo | Low-alpha decontamination could amplify edge error. | Technically plausible, but the proposed threshold/clamp/falloff had no evidence of a better overall outcome. | Deterministic comparison matrix completed. **NO ALGORITHM CHANGE JUSTIFIED.** |
| F4 CSP/WASM | Production policy and supply-chain controls needed hardening. | WASM was already same-origin and Vite-emitted, but production responses lacked governed browser headers. | Build-derived CSP and modern headers added; exact package plus lockfile integrity retained as the proportionate WASM control. |

## Previous Agent Continuation State

Claude Code stopped with partial uncommitted FSG-006R work on the correct remediation branch at the FSG-006 base. The continuation preserved and reviewed that work rather than resetting or restarting it. The partial quality-search, target-worker, cancellation-test, halo-test, middleware, browser-test, and directive work was completed or corrected in place. No FSG-007 public-launch or visual-design file entered the remediation commits.

## F1 Memory Investigation

ADR-015 behavior remains unchanged: maximum quality first, minimum-quality viability second, bounded remaining search, at most five probes per tier, highest actually tested fitting quality, non-monotonic encoder robustness, existing dimension tiers and quality bounds, and existing structured unreachable outcomes.

The concrete issue was reference lifetime, not an absent canvas cleanup. `boundedQualitySearch()` stored Blob-bearing objects for every quality probe. `processImageToTargetInWorker()` also retained the best miss as a Blob-bearing candidate even though the unreachable public contract needs metadata only. Local max/min bindings were narrowed so losing binary candidates leave decision scope promptly.

## Blob Retention Graph

```text
SOURCE FILE BLOB
  ↓ job-scoped input
DECODED IMAGEBITMAP
  ↓ closed in finally
CURRENT OFFSCREENCANVAS
  ↓ previous tier zeroed before replacement; final tier zeroed in finally
CURRENT ENCODE PROBE BLOB
  ├─ losing/miss → reference leaves decision scope
  └─ fitting best → OPTIONAL WINNER BLOB
PROBE METADATA { quality, byteSize }
  ↓ no binary field
OPTIONAL WINNER BLOB
  ↓ only binary retained by a successful public result
```

Cross-tier unreachable `closestMiss` contains only width, height, byte size, and optional quality. Probe history contains only quality and byte size. Tests assert reachable object structure and identity; they do not claim or attempt to schedule JavaScript garbage collection.

## Memory Remediation

- Replaced Blob-bearing quality-probe history with `{ quality, byteSize }` metadata.
- Retained a Blob only for the current selected fitting candidate.
- Made `closestMiss` metadata-only for unreachable outcomes.
- Scoped max/min probe results to their immediate decision blocks.
- Preserved canvas zeroing between tiers and in final cleanup.
- Preserved final `ImageBitmap.close()`.
- Proved that returned unreachable graphs contain no Blob and successful graphs contain only the public winner Blob.
- Proved earlier-tier/non-winning Blobs are not reachable from returned search or worker outcome structures.

No exact MiB release claim is made because no defensible browser memory API measured physical allocation or garbage-collection timing here.

## Stress Evidence

A real browser regression performs 10 consecutive target-size jobs with the largest stable deterministic fixture used by the suite. Every iteration reaches `success` or structured `unreachable`, keeps its own source/result identity, resets cleanly, and cannot leak a stale result into the next iteration. The page remains visible and responsive, console/page errors remain clean, live FileSetGo-created Blob URLs stay bounded at two or fewer, and a final ordinary Quick Fit job succeeds after the sequence.

The scenario passed locally in Chromium and Firefox and remotely in Chromium, Firefox, and Playwright WebKit. It proves stable repeated operation and recovery, not a physical-device memory ceiling.

## Physical iOS Evidence State

**EXTERNAL AUDIT CLAIM — NOT LOCALLY REPRODUCED**

No auditor-supplied device model, OS/browser version, fixture, memory trace, or deterministic reproduction was available. FileSetGo nevertheless fixed the independently demonstrable unnecessary references. This report does not claim that CI proves an iOS Safari OOM is fixed.

## F2 HEIC Cancellation Analysis

The host cancellation path remains the hard guarantee. `cancel()` may post `CANCEL_JOB`, immediately settles the job as cancelled, calls finalization, detaches all worker handlers, and calls `worker.terminate()`. It never waits for a decoder/WASM loop to read the cancel message. No timeout, `AbortController`, or 200 ms grace period was introduced.

## Hard-Termination Evidence

The deterministic fake worker receives `PROCESS_IMAGE`, never handles `CANCEL_JOB`, and never sends a terminal event. The test proves:

1. `cancel()` settles the result as cancelled.
2. `terminate()` is called exactly once.
3. `onmessage`, `onerror`, and `onmessageerror` are detached.
4. A saved late handler/result cannot alter the settled outcome.
5. The next job receives a new worker and completes.

The browser HEIC regression stalls the first real workflow worker at the host boundary, cancels it, observes termination, then verifies the same HEIC file succeeds through a newly created worker.

## F3 Halo Analysis

The experimental 0.20 denominator floor inherited from the partial working tree was treated as Candidate C, not as approved behavior. A policy harness compared RGB decontamination independently of production rewrites, then production thin-stroke/curve fixtures and browser previews checked the selected behavior.

The nearest representable 8-bit alpha samples were 13, 26, 38, 51, and 77, corresponding to 0.0510, 0.1020, 0.1490, 0.2000, and 0.3020. Coverage used black-on-white, white-on-black, and colored-on-contrasting-background pairs; rectangle edges, 1 px strokes, 2 px diagonals, and curves; and compositing over light `[248,250,252]` and dark `[9,9,11]` surfaces.

## Pixel Quality Matrix

Metrics are maximum per-channel RGB distances and accumulated maximum-channel distances, not a fabricated quality percentage. All policies preserve actual output alpha.

| Policy | Exact rule | Samples | Foreground error sum / max | Light+dark composite error sum / max | Disposition |
| --- | --- | ---: | ---: | ---: | --- |
| A — baseline | Unblend when alpha fraction is `> 0.05` using actual alpha as denominator. | 60 | 72 / 10 | 20 / 1 | Best overall. |
| B — threshold | Do not unblend below `0.20`; use baseline at and above it. | 60 | 7,560 / 242 | 1,524 / 33 | Reject: severe retained-background/foreground-color error. |
| C — clamp | Unblend using `max(actualAlpha, 0.20)` while preserving actual output alpha. | 60 | 2,844 / 190 | 504 / 13 | Reject: less severe than B, but materially worse than baseline. |
| D — auditor concept | “Cubic luminance erosion/falloff” without an equation or parameters. | — | — | — | **NOT IMPLEMENTABLE AS SPECIFIED.** |

Production raster regressions confirm 1 px and 2 px strokes, a diagonal, a curve, and disconnected fine detail survive under the retained baseline. Browser automation verifies the `flat-logo.jpg` transparent preview on checkerboard, light, and dark states. Chromium and Firefox raster evidence existed in the relevant test/local evidence; WebKit verified all three states and a clean console without invoking Playwright 1.55’s CSP-incompatible screenshot stylesheet injection. Successful remote run `34234812993` exercised these preview states but did not retain downloadable visual artifacts: its upload step reported no files at `tests/browser/.artifacts/`.

## Selected Edge Policy

**NO ALGORITHM CHANGE JUSTIFIED**

The certified FSG-006 `alpha > 0.05` behavior remains production behavior. The experimental 0.20 denominator clamp was removed.

## F4 CSP Analysis

The production build contains one same-origin application entry, a same-origin module worker, built CSS, local WOFF/WOFF2 fonts, same-origin lazy ZIP and HEIC decoder chunks, and the same-origin emitted HEIC WASM. Transparent previews use Blob image URLs. The product uses no Blob worker, authored inline script, authored inline style, remote font, remote image, or data-image source. Downloads require no additional CSP source. HEIC compilation uses explicit `WebAssembly.compile()`.

Development Vite HMR has different WebSocket and injected-style requirements, so the application middleware applies CSP to built responses when Vite is not running hot. Browser certification disables Laravel Boost’s development-only browser logger so the tests measure the production FileSetGo response rather than its injected inline diagnostics.

## Final CSP

```text
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
```

`'unsafe-eval'`, `'unsafe-inline'`, `data:`, remote origins, and Blob workers are not allowed. `'wasm-unsafe-eval'` is the narrow browser permission for the existing manual WebAssembly compilation; a file hash does not replace that browser requirement.

## Security Headers

- `Content-Security-Policy`: exact policy above.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- Clickjacking prevention is enforced by CSP `frame-ancestors 'none'`.
- `X-XSS-Protection` was not added because it is obsolete.
- HSTS is not emitted by Laravel; it remains owned by the HTTPS edge/hosting layer that terminates TLS.

Laravel feature tests assert the exact response headers. Chromium, Firefox, and WebKit exercised the homepage and all processing workflows without unexplained CSP violations on the final remote candidate.

## WASM Asset State

- Dependency: exact `@discourse/heic@1.0.0`.
- Lockfile package integrity: `sha512-YMW5o0bHvhL4rjzGt7kpr8geqMEhP7yS20Hh5eMJtDOmHuCqn+icpNLr1ImFygU/yN39MUHVenETXcpDG6PPww==`.
- Installed and emitted WASM SHA-256 evidence: `832bfb37148038257e56216d165cfae24a8afaa7cae8fc0ddb1ef4bf495612a9`.
- Build asset: content-hashed, same-origin `heic_dec-ojH1Dp2m.wasm`.
- Runtime: fetched from the Vite asset URL and passed to `WebAssembly.compile()`.

The SHA-256 is recorded as audit evidence, not represented as browser-enforced SRI or an additional enforcement layer.

## WASM Integrity Decision

| Option | Protects | Does not protect | Cost / decision |
| --- | --- | --- | --- |
| Exact dependency + lockfile integrity | Registry/tarball mutation or accidental package substitution during reproducible install. | Compromised build environment, repository, deployed origin, or XSS. | Lowest cost; selected. |
| Build-time expected SHA-256 | Narrow post-install/pre-build binary mutation when the expected digest remains trustworthy. | A compromised build environment can change or bypass both binary and check; no origin/XSS protection. | Upgrade/checksum maintenance; rejected as duplicative for this threat model. |
| Vendored WASM + checksum | Removes live registry retrieval from routine installs and freezes reviewed bytes in the repository. | Repository/build compromise, deployed-origin compromise, or XSS. | Higher patch/provenance maintenance; no current proportional benefit. |
| Runtime digest before compile | Unexpected fetched bytes only while the executing verifier JavaScript remains trusted. | XSS or compromised origin JavaScript can modify/bypass the verifier; it is not SRI. | Fetch/CPU latency and digest maintenance; rejected. |

Selected control: exact dependency plus committed lockfile integrity and reproducible `npm ci`, supported by content-hashed build output and CSP/XSS prevention. CI/deployment integrity remains the control for compromised build/origin threats.

## ISOBMFF Malformed Regression

A deterministic HEIC/ISOBMFF fixture encodes `0xFFFFFFFF` width and height in its spatial-extents property. Preflight returns structured `DIMENSIONS_TOO_LARGE` with `safeToDecode: false`; the unsafe pixel product is not treated as a safe integer. A runtime test proves rejection occurs before worker creation, so decoder invocation and bitmap allocation cannot begin.

## ZIP Traversal

Flat-archive validation explicitly rejects:

- `../../../etc/passwd`
- `..\..\evil`
- `/absolute/path`
- `C:\evil`
- an embedded null byte

Broader pre-existing Unix/Windows traversal and drive-path variants remain covered. A safe ordinary filename remains accepted. Request-level runtime evidence proves an unsafe output is rejected as `UNSAFE_ARCHIVE_ENTRY` before any worker/image processing begins.

## Network / Privacy

Playwright records request URL, origin, method, and body/post data across:

1. Quick Fit JPEG, PNG, and WebP.
2. Target-size.
3. Guided Fit.
4. Logo Pack Original plus ZIP download.
5. Logo Pack Transparent preview plus ZIP download.
6. HEIC.

Every processing request observed was same-origin, `GET`, and bodyless. There is no user-file upload or processing endpoint and no analytics payload. HEIC performs the expected same-origin decoder/WASM static fetch. Static application requests are allowed; this is not described as “zero network requests.” Browser storage remains empty of FileSetGo-created user-file content.

## Core Tests

`npm run test:core`: **382 / 382 passed** across 28 files. Historical certified baseline: 358 / 358. The increase is additive regression evidence; no baseline behavior was removed.

## UI Tests

`npm run test:ui`: **242 / 242 passed** across 20 files, matching the historical certified baseline.

## Laravel Tests

`php artisan test --compact`: **11 / 11 passed, 33 assertions**. Historical baseline: 10 tests / 22 assertions. The added feature test covers the exact security headers.

## Browser Tests

Local full matrix: **153 passed, 3 governed skips, 0 failed** in Chromium, Firefox, and four mobile projects. The three Firefox skips are existing worker-request observability limits in Playwright’s Firefox transport. After the test-only WebKit evidence correction, browser typecheck and the impacted Chromium/Firefox Logo Pack suite passed 30 / 30. The final candidate then passed the complete six-project matrix remotely.

## Remote Browser Matrix

GitHub Actions run `34234812993`, manual dispatch, candidate `ffa73d24887ecba9af78b3e09194dca3da1d511b`:

| Project | Passed | Governed skips | Failed |
| --- | ---: | ---: | ---: |
| Chromium | 68 | 0 | 0 |
| Firefox | 65 | 3 | 0 |
| Playwright WebKit | 65 | 3 | 0 |
| Mobile narrow 320 | 5 | 0 | 0 |
| Mobile iPhone-class | 5 | 0 | 0 |
| Mobile Android-class | 5 | 0 | 0 |
| Mobile tablet-class | 5 | 0 | 0 |
| **Total** | **218** | **6** | **0** |

The six governed skips are the three existing worker-scope request-observation checks in Firefox and WebKit; product workflows still execute before each engine-tooling skip is classified.

The remote run completed the preview-state assertions successfully, but its artifact-upload step reported `No files were found with the provided path: tests/browser/.artifacts/`. Therefore run `34234812993` is browser-execution evidence, not a claim of retained downloadable screenshot artifacts.

## Bundle

Production build (`vite 8.2.2`) succeeded:

| Asset | Current | Change from FSG-006 closure |
| --- | ---: | --- |
| Main application JS | 70.15 kB / 20.26 kB gzip | Unchanged at displayed precision; same content hash `BaMmPqzC`. |
| Worker JS | 40.89 kB | About +0.05 kB; expected target-size ownership changes; hash `CSAvD_Ob`. |
| HEIC lazy decoder JS | 32.54 kB | Unchanged; hash `CIxd_bUO`. |
| ZIP lazy adapter JS | 9.12 kB | Unchanged; hash `BOagJ5MW`. |
| HEIC WASM | 959.55 kB / 309.81 kB gzip | Byte-identical; hash `ojH1Dp2m`. |
| Application CSS | 35.79 kB / 7.46 kB gzip | Unchanged. |

No new chunk or runtime dependency was added.

## Dependencies

- `npm ci`: passed; 147 packages installed, 0 vulnerabilities reported.
- `npm ls @playwright/test`: `@playwright/test@1.55.1`.
- No `package.json`, lockfile, Composer manifest, or Composer lock change.
- No new runtime or development dependency.

## Defects Found

1. **Product defect:** quality history and cross-tier closest-miss state retained unnecessary encoded Blobs.
2. **Test environment defect:** Laravel Boost’s development-only browser logger injected inline script and diagnostic POSTs into the local certification server, conflicting with production CSP/privacy assertions.
3. **Test instrumentation defect:** Playwright 1.55’s WebKit screenshotter unconditionally injected a temporary inline stylesheet, producing one CSP error per visual-evidence screenshot in remote run `34233849019`.

No active HEIC cancellation vulnerability was found. No evidence justified a halo algorithm change.

## Defect Disposition

1. Blob ownership fixed and covered by reference-graph and repeated-job tests.
2. Certification server starts with `BOOST_BROWSER_LOGS_WATCHER=false`; no production policy was weakened and normal non-CSP development behavior remains available.
3. Final test still verifies all three WebKit preview states and clean console. Chromium/Firefox raster evidence existed in the relevant test/local evidence where Playwright does not inject that stylesheet; remote run `34234812993` did not retain downloadable artifacts. No WebKit product test is skipped. The final full remote run is green.

## Remaining Limitations

- No physical constrained-iOS memory reproduction or quantitative device memory trace was available.
- JavaScript tests prove reference ownership, not immediate garbage collection.
- Local macOS cannot launch the governed current WebKit build; remote Linux WebKit provides certification.
- HSTS and build/deployment integrity remain hosting/CI responsibilities.
- A compromised origin or XSS can bypass a JavaScript runtime digest; the selected WASM control does not claim otherwise.

## Local Verification

- `npm ci`: passed.
- `npm ls @playwright/test`: passed, version 1.55.1.
- `npm run typecheck`: passed.
- `npm run typecheck:browser`: passed, including after the final test-only correction.
- `npm run test:core`: 382 / 382 passed.
- `npm run test:ui`: 242 / 242 passed.
- `php artisan test --compact`: 11 / 11 passed, 33 assertions.
- `npm run build`: passed.
- `vendor/bin/pint --dirty --format agent`: passed.
- `vendor/bin/pint --test`: passed.
- `git diff --check`: passed before checkpointing.
- Local Playwright: 153 passed, 3 governed skips; final impacted suite: 30 / 30 passed.

## FSG-006R Recommendation

**FSG-006R CLOSED**

The four findings have evidence-backed dispositions, local baselines are green, and one immutable final candidate passed Chromium, Firefox, Playwright WebKit, and all mobile projects remotely.

## FSG-007 Resume Recommendation

**FSG-007 SAFE TO RESUME**

Product Office accepted and closed FSG-006R. No runtime, security, compatibility, dependency, or launch-blocking defect remains open from this gate. FSG-007 is cleared to resume after the separately governed reconciliation of this remediation lineage with its preserved checkpoint.

## Commit Reference

- Runtime hardening checkpoint: `d85652c7c1f0015a408ab7e1444714f03656a0ed` — `fix(core): harden runtime after external audit`
- Final test-instrumentation checkpoint: `ffa73d24887ecba9af78b3e09194dca3da1d511b` — `test(browser): preserve CSP during WebKit evidence`
- Successful remote certification: GitHub Actions run `34234812993`
- Superseded failed run (test-instrumentation evidence only): `34233849019`

`SPRINT_REPORT.md` was written after remote certification and remains outside the immutable application candidate. The formal closure commit is documentation/governance only and records a distinct identity from that candidate.
