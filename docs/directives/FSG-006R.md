# FSG-006R — External Audit Runtime & Security Hardening

## Product Office Directive

An independent external technical audit has returned:

CONDITIONAL PRODUCTION READINESS — PASS WITH REMEDIATIONS

Do NOT blindly implement the auditor's sample code.

The audit is advisory evidence.

Product Office has independently inspected the certified FSG-006 source
and classified the findings as follows:

Finding 1 — Target-size memory pressure:
ACCEPT FOR REMEDIATION / MEASUREMENT

Finding 2 — HEIC cancellation starvation:
CURRENT HOST RUNTIME ALREADY HARD-TERMINATES THE WORKER.
VERIFY; DO NOT REDESIGN WITHOUT NEW EVIDENCE.

Finding 3 — low-alpha decontamination instability:
ACCEPT FOR TARGETED QUALITY INVESTIGATION

Finding 4 — CSP/WASM:
ACCEPT PRODUCTION CSP HARDENING.
AUDITOR'S proposed WASM hash/CSP mechanism is NOT accepted verbatim.

FSG-007 public launch work is PAUSED during this remediation.

Do NOT begin FSG-008.

---

## 1. Preserve the current FSG-007 work first

The current FSG-007 work must not be lost.

Inspect:

git status
git branch --show-current
git diff --stat

The FSG-007 engineering/design work is currently intentionally uncommitted
unless later repository state says otherwise.

Create a narrow preservation checkpoint only if there are material
uncommitted changes that would otherwise be at risk.

Product Office authorizes a temporary WIP preservation commit on the
existing FSG-007 branch with a clearly non-closure message such as:

chore(web): checkpoint FSG-007 before audit remediation

This checkpoint:

- is NOT visual approval;
- is NOT FSG-007 closure;
- is NOT public-launch approval;
- may contain the rejected/current visual exploration solely to preserve
  work;
- must be pushed to the existing FSG-007 branch.

If the working tree is already safely committed/pushed, do not create an
unnecessary checkpoint.

Return the preservation SHA before changing branches.

---

## 2. Create remediation branch

From the stable certified FSG-006 closure:

b291f38ddc137fc7c43b8a6633fa535d6fa2bc53

create:

fsg-006r-post-audit-hardening

Do NOT branch from uncommitted FSG-007 design state.

Record:

FSG-006 — REOPENED
FSG-006R — CURRENT
FSG-007 — PAUSED
FSG-008 — NOT STARTED

Create:

docs/directives/FSG-006R.md

Do not rewrite the historical FSG-006 directive.

---

# WORKSTREAM A — Target-Size Memory Hardening

## 3. Inspect the actual retention graph first

The current code already zeroes the old canvas between dimension tiers and
in `finally`.

Do not report this as missing.

The more concrete retention concern is:

boundedQualitySearch()
currently stores a Blob for EVERY quality probe.

and:

processImageToTargetInWorker()
stores `closestMiss` as a Blob-bearing BestCandidate even though an
unreachable result needs only metadata.

Document the exact live-object graph per tier:

- source Blob;
- decoded ImageBitmap;
- current OffscreenCanvas;
- current encoder Blob;
- retained probe Blobs;
- retained best candidate;
- retained closest miss;
- temporary validation decode resources where applicable.

Do not guess.

---

## 4. Eliminate unnecessary probe-Blob retention

Refactor the target-size search so non-winning probe Blobs are not retained
longer than required.

Preserve enough metadata for deterministic diagnostics:

quality
byteSize

but do not retain every encoded Blob solely because it was probed.

Conceptually prefer:

QualityProbeMetadata {
    quality,
    byteSize
}

plus a separately retained winning Blob where required.

For an unreachable result:

`closestMiss` does NOT require its Blob.

Retain only:

width
height
byteSize
quality

unless a real product contract requires the binary.

Prove that exact output behavior remains unchanged.

---

## 5. Preserve search semantics

Do NOT replace ADR-015's algorithm merely to reduce probe count.

Preserve unless Product Office later approves a measured algorithm change:

- max-quality first;
- min-quality viability second;
- bounded remaining search;
- maximum 5 probes per tier;
- highest tested fitting quality;
- non-monotonic robustness;
- dimension tiers;
- quality bounds;
- structured unreachable outcomes.

Do NOT use the auditor's midpoint-only sample implementation.

A future bpp-seeded search is an optimization experiment, not an immediate
security remediation.

---

## 6. Canvas lifecycle

Retain:

canvas.width = 0
canvas.height = 0

before replacing a tier canvas and in final cleanup.

Audit whether any other canvas/ImageBitmap/ImageData lifecycle in the
target-size path can be explicitly released earlier.

Do not create fresh full-resolution canvases unnecessarily.

---

## 7. Memory-focused deterministic tests

Add tests proving:

- quality search does not return/store Blob objects for non-winning probe
  metadata unless explicitly needed;
- unreachable closest-miss metadata does not retain a Blob;
- previous-tier candidate Blobs become unreachable once the tier is
  discarded;
- only the final winner Blob remains referenced at completion;
- cancellation releases the worker through the existing runtime.

Do not claim JS GC timing from a unit test.

Test reference ownership, not garbage-collector behavior.

---

## 8. Browser stress

Extend the browser stress suite with repeated large target-size work.

At minimum:

10 consecutive target-size jobs

using the largest safe deterministic fixture practical in CI without
destabilizing the runner.

Verify:

- every job completes or returns structured unreachable;
- subsequent jobs continue functioning;
- no worker-lock leakage;
- no stale output;
- no page crash.

This is not equivalent to physical iOS memory certification.

State that honestly.

---

## 9. Physical iOS audit evidence

The external auditor specifically claims OOM on constrained iOS Safari.

Do NOT claim this is reproduced unless there is actual evidence accessible
to this environment.

If the external audit supplied:

- device model;
- iOS version;
- Safari version;
- fixture dimensions;
- source format;
- target;
- exact reproduction procedure;
- measured memory or crash report;

record it.

If not available, report:

EXTERNAL AUDIT CLAIM — NOT LOCALLY REPRODUCED

Do not dismiss it.

The code-level retention remediation still proceeds because unnecessary
Blob retention is independently demonstrable.

Do not ask the project owner to perform manual QA.

---

# WORKSTREAM B — HEIC CANCELLATION VERIFICATION

## 10. Preserve the current hard cancellation architecture

Current runtime behavior is:

cancelImageJob()
→ optionally post CANCEL_JOB
→ immediately finish(cancelled)
→ finish() calls worker.terminate()

The runtime does NOT wait for the worker's message queue.

Therefore the external auditor's proposed 200ms timeout fallback is not
required by the current implementation.

Do NOT introduce AbortController or a 200ms timer merely to mirror the
audit.

---

## 11. Add explicit non-yielding-worker test

Create/extend a worker-client test with a fake worker that:

- accepts PROCESS_IMAGE/HEIC;
- never handles CANCEL_JOB;
- never sends a terminal response.

Call cancel().

Assert synchronously/ deterministically:

- result resolves cancelled;
- worker.terminate() is called;
- worker handlers are detached;
- later synthetic worker messages cannot change the settled outcome;
- a subsequent job can create/use a fresh worker.

This is the direct proof for the audit concern.

---

## 12. Real HEIC cancellation regression

Retain/run browser HEIC cancellation coverage where deterministic.

Do not introduce timing-flaky assertions merely to catch WASM in one exact
instruction window.

The host-side hard-termination unit/integration proof is authoritative for
the non-yielding-worker property.

---

# WORKSTREAM C — HALO / DECONTAMINATION QUALITY

## 13. Do not implement the cubic falloff blindly

The audit claims low-alpha unblend instability.

Current code performs RGB decontamination when:

alphaFraction > 0.05

This deserves evidence.

Do NOT immediately change it to 0.20.

Do NOT add erosion/cubic luminance falloff without comparison evidence.

---

## 14. Build targeted halo fixtures

Create deterministic raster fixtures for:

1. black mark anti-aliased against white background;
2. white mark anti-aliased against black background;
3. colored mark against complementary background;
4. thin 1–2 px strokes;
5. curved strokes;
6. alpha fractions around:
   0.05
   0.10
   0.15
   0.20
   0.30

For each fixture compute the expected composited edge appearance over:

light background
dark background

Measure residual background-color contamination.

Do not rely only on screenshots.

---

## 15. Compare candidate policies

Evaluate at minimum:

A. existing >0.05 decontamination;

B. decontamination only at >=0.20 with lower-alpha handling;

C. a denominator clamp / confidence-weighted decontamination;

D. the auditor's proposed low-alpha erosion/falloff concept only if it can
be defined precisely.

Score each against:

- halo reduction;
- thin-stroke survival;
- color fidelity;
- curve smoothness;
- semi-transparent detail preservation.

Choose the smallest defensible correction.

If no candidate clearly improves the matrix without new damage:

STOP and report.

Do not tune tests to favor one method.

---

## 16. Visual browser evidence

For the selected correction, capture actual transparent preview fixtures on:

checkerboard
light
dark

Use automated browser capture.

No project-owner manual QA.

---

# WORKSTREAM D — CSP / WASM HARDENING

## 17. Record what already exists

The HEIC WASM is already passed through Vite using:

@discourse/heic/...heic_dec.wasm?url

and emitted as a production asset.

Do NOT claim FSG-006 used a completely unhashed arbitrary remote WASM URL.

The decoder fetch is same-origin.

---

## 18. Audit current production resource requirements

Build production assets.

Determine the minimum CSP required by the REAL build for:

- application JS;
- Vite-generated worker;
- CSS;
- fonts;
- blob preview images;
- data images if truly needed;
- downloads;
- HEIC WASM fetch;
- WebAssembly.compile();
- any current inline script/style.

Do not copy a generic CSP from the audit.

---

## 19. Implement production security-header middleware

If the application currently has no governed security headers, add a
narrow Laravel middleware or equivalent host-level mechanism.

At minimum evaluate:

Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
frame-ancestors via CSP
HSTS deployment ownership

HSTS should only be emitted by the application if that is appropriate for
the actual deployment topology; otherwise document it as a reverse
proxy/hosting responsibility.

Do not add obsolete headers merely to make a checklist longer.

---

## 20. CSP policy

Start from least privilege based on measured requirements.

The final policy must not use:

unsafe-eval

unless separately justified.

If WebAssembly.compile requires:

'wasm-unsafe-eval'

for the supported browsers, document that narrow requirement explicitly.

Do NOT claim that a SHA-256 hash of the `.wasm` file replaces the browser's
WASM compilation CSP permission unless demonstrated by real browser tests.

Test:

normal homepage
Quick Fit
Guided Fit
Logo Pack
HEIC decode
transparent preview
ZIP download

under the actual CSP.

No CSP console violations may remain unexplained.

---

## 21. WASM integrity decision

Separately investigate whether we should pin/verify the HEIC WASM bytes.

Options may include:

- exact package + lockfile integrity only;
- build-time expected SHA-256 verification;
- vendored known artifact + checksum;
- runtime fetch + digest verification before compile.

For each option report:

- threat actually mitigated;
- threat NOT mitigated;
- maintenance burden;
- build/runtime cost;
- whether XSS could bypass the check;
- whether it helps against package-registry/supply-chain mutation.

Do not implement an integrity system that creates security theater.

Product Office will accept the simplest option that meaningfully reduces
the real threat.

---

# WORKSTREAM E — AUDIT CHECKLIST REGRESSIONS

## 22. Malformed ISOBMFF dimension case

Add a deterministic malformed HEIC/ISOBMFF fixture that claims extreme or
overflow-like dimensions including a 0xFFFFFFFF-style case where
structurally appropriate.

Assert:

- preflight rejects safely;
- no decode occurs;
- no allocation is attempted;
- structured error returned.

Cover checked arithmetic/bounds.

---

## 23. ZIP traversal

Retain/add explicit tests including:

../../../etc/passwd

..\..\evil

/absolute

C:\evil

null-byte forms

Assert rejection before processing.

Do not weaken the flat-archive policy.

---

## 24. Zero-network regression

Re-run existing browser network/privacy coverage through:

Quick Fit
target-size
Logo Pack Original
Logo Pack Transparent
HEIC

Confirm no user-file payload is sent to:

same-origin processing endpoint
external origin
analytics endpoint

Ordinary static-asset requests are allowed.

Do not phrase this as "zero network requests."

---

# 25. Do not implement audit roadmap features

Explicitly OUT OF SCOPE for FSG-006R:

PNG quantization
Potrace/vectorization
SVG output
SSIM
comparison slider
new formats
new presets
new Logo Pack assets

Record them as future candidates only.

---

# 26. Governance

Create ADR-023 or next available ADR:

Post-Audit Runtime Hardening

Record:

- external audit finding;
- finding disposition;
- memory-retention correction;
- HEIC cancellation verification;
- halo decision;
- CSP/security-header policy;
- WASM integrity decision;
- remaining physical-device limitation.

Do not rewrite prior ADRs.

Update:

ARCHITECTURE.md
SECURITY.md
TESTING.md

only where the final implemented behavior actually changes.

---

# 27. Full verification

Run:

npm ci
npm ls @playwright/test
npm run typecheck
npm run typecheck:browser
npm run test:core
npm run test:ui
php artisan test --compact
npm run build
vendor/bin/pint --test
git diff --check

Run relevant Playwright suites.

If security headers or runtime code changed materially, run fresh remote:

Chromium
Firefox
Playwright WebKit
mobile projects

against one candidate commit before recommending closure.

Do not reuse the pre-remediation FSG-006 run as certification of changed
runtime/security behavior.

---

# 28. SPRINT_REPORT.md

Overwrite only the canonical root report.

Required sections:

- Milestone
- External Audit
- Finding Disposition
- F1 Memory Investigation
- Blob Retention Graph
- Memory Remediation
- Stress Evidence
- Physical iOS Evidence State
- F2 HEIC Cancellation Analysis
- Hard-Termination Evidence
- F3 Halo Analysis
- Pixel Quality Matrix
- Selected Edge Policy
- F4 CSP Analysis
- Final CSP
- Security Headers
- WASM Asset State
- WASM Integrity Decision
- ISOBMFF Malformed Regression
- ZIP Traversal
- Network/Privacy
- Core Tests
- UI Tests
- Laravel Tests
- Browser Tests
- Remote Browser Matrix
- Bundle
- Dependencies
- Remaining Limitations
- FSG-006R Recommendation
- FSG-007 Resume Recommendation
- Commit Reference

---

# 29. Closure recommendations

Use exactly:

FSG-006R READY TO CLOSE

or

FSG-006R NOT READY TO CLOSE

And separately:

FSG-007 SAFE TO RESUME

or

FSG-007 REMAINS PAUSED

Do not begin FSG-007 automatically.

---

# 30. Stop before final closure commit

Checkpoint commits required for remote CI are authorized.

Do NOT create the formal FSG-006R closure commit automatically.

At the quality gate:

STOP.

Return the report to Product Office.

Do not resume FSG-007.
Do not begin FSG-008.
