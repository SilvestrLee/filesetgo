# FSG-001C — HEIC/HEIF Decode Integration & FSG-001 Closeout

## Authority

Implement only FSG-001C.

Governance precedence remains:

1. MASTER-BLUEPRINT
2. DECISIONS
3. ROADMAP
4. This directive
5. Architecture / security / testing documentation
6. Code

FSG-001A and FSG-001B are closed and must not be reopened except where
a narrowly required compatibility change is necessary to complete HEIC
support.

FSG-001B closeout commit:

d6f46b4e1b35cf9093db1f544b61b7163835c3da

Branch:

fsg-001-core-runtime

Do not begin FSG-002.

---

# 1. Milestone Objective

Complete the remaining commitments of parent milestone FSG-001 by adding
safe browser-side HEIC/HEIF decode support to the existing worker-first
processing pipeline.

Target flow:

HEIC/HEIF File
→ Preflight
→ Safety Gate
→ Worker
→ Lazy HEIC Decoder
→ Raster Bitmap
→ Normalize
→ Bounded Resize
→ JPEG/PNG/WebP Encode
→ Output Validation
→ Local Blob

The source file and generated output must remain entirely on-device.

---

# 2. Explicit Dependency Approval

The project owner approves:

heic-to@1.5.2

for FSG-001C, subject to the constraints in this directive.

Before installation, confirm from the npm registry that:

- requested version is exactly 1.5.2;
- package identity is `heic-to`;
- license metadata remains LGPL-3.0;
- `heic-to/next` remains the documented Web Worker entry point.

If any of those facts differ, STOP and report the difference.

Install the exact approved version.

Do not silently upgrade to another version.

---

# 3. Licensing Governance

Because `heic-to` / bundled libheif components are LGPL licensed:

- do not modify vendored dependency source unless genuinely necessary;
- keep HEIC support isolated from the normal application bundle where
  technically practical;
- preserve applicable copyright/license notices;
- add/update an appropriate project third-party notice/license record;
- document the exact dependency version and license in governance;
- retain a source/repository reference sufficient for future compliance review.

Do not make legal claims that FileSetGo is definitively compliant merely
because these steps were taken.

Record the dependency decision as the next ADR in
`docs/governance/DECISIONS.md`.

---

# 4. Critical Architecture Rule — Lazy Loading

JPEG, PNG and WebP users MUST NOT pay the HEIC decoder cost.

The decoder must be loaded only when processing a HEIC/HEIF input.

Preferred worker-side pattern:

await import('heic-to/next')

Do not statically import HEIC decoder code into the normal processing path.

After production build, inspect Vite output and confirm HEIC decoder code
is emitted as an independently loaded chunk/asset rather than being
included in the normal initial application payload.

Record actual build evidence in SPRINT_REPORT.md.

---

# 5. Correct the Preflight / Runtime Boundary

FSG-001B temporarily returns:

HEIC_DECODER_UNAVAILABLE

from preflight after structurally identifying a valid HEIC file.

That was acceptable while HEIC decode did not exist, but it is not the
desired final architecture.

Correct the boundary.

A structurally valid HEIC/HEIF file that:

- passes the 15 MB file-size limit;
- has valid supported HEIF structure;
- resolves acceptable dimensions;
- is within the 24 MP decoded-pixel limit;

should pass preflight as a recognized HEIC input.

Decoder availability is a processing/runtime concern, not a file-validity
concern.

Therefore:

- remove `HEIC_DECODER_UNAVAILABLE` as a preflight rejection;
- retain it as a structured PROCESSING/runtime error if the decoder cannot
  actually be loaded or initialized;
- do not weaken the mandatory preflight safety gate.

Update contracts/tests accordingly.

---

# 6. HEIC Primary-Image Resolution

Do not permanently rely on:

"first ispe under ipco"

as the authoritative image dimensions.

Implement reliable primary-item resolution sufficient for supported
HEIC/HEIF V1 inputs.

At minimum inspect and correctly relate:

- `pitm` — primary item
- `iprp`
- `ipco` — item properties
- `ipma` — item/property associations
- `ispe` — spatial extents

Support the versions/index-width variants that are materially required by
normal HEIC images.

Do not guess when a structure cannot be safely resolved.

If an HEIC container uses a structure outside the parser's deliberately
supported subset, fail with a structured corrupt/unsupported error rather
than selecting the first dimensions found.

All box traversal must remain bounded.

---

# 7. HEIF Transform Awareness

Before using preflight dimensions as an exact decoded-bitmap invariant,
inspect whether relevant HEIF item properties such as rotation/mirroring
can affect displayed dimensions.

Do not create false `DECODE_FAILED` results merely because the decoder
returns an orientation-normalized bitmap.

If necessary, account for relevant HEIF transforms in the dimension model
or validate using an appropriately normalized expected dimension pair.

Document the chosen behavior.

Do not broaden this into a general HEIF metadata subsystem.

---

# 8. HEIC Decode Adapter

Create a narrow HEIC decoder adapter inside `@filesetgo/core`.

The rest of the worker pipeline should not know about the third-party API.

Conceptually:

decodeHeic(file/blob)
→ ImageBitmap-compatible raster result

The adapter owns:

- lazy import of `heic-to/next`;
- decoder initialization;
- conversion of dependency exceptions into FileSetGo errors;
- decoded-dimension validation;
- cancellation boundaries;
- resource ownership.

Prefer the dependency's bitmap output if reliable so FileSetGo does not
perform an unnecessary intermediate JPEG/PNG encode merely to obtain
pixels.

Do not expose `heic-to` types throughout the core architecture.

---

# 9. Worker Integration

Extend the existing FSG-001B worker pipeline.

JPEG/PNG/WebP:

retain the current native createImageBitmap path.

HEIC/HEIF:

use the HEIC adapter.

After decoding, both paths converge onto the same existing:

normalize
→ resize
→ canvas
→ encode
→ validate
→ cleanup

pipeline.

Avoid duplicated processing logic.

---

# 10. Output Scope

HEIC/HEIF is INPUT ONLY.

Supported FSG-001 outputs remain:

- JPEG
- PNG
- WebP

Do not add HEIC output.
Do not add AVIF output.
Do not begin target-size compression.

---

# 11. Safety Limits

Existing limits remain authoritative:

MAX_INPUT_BYTES = 15 MB
MAX_DECODED_PIXELS = 24,000,000

Exactly-at-limit inputs remain valid.

Reject over-limit HEIC inputs before the expensive decoder is loaded.

Do not allow HEIC decode to bypass preflight.

Do not increase limits during this sprint.

---

# 12. Memory Discipline

HEIC decode may be significantly more memory-intensive than native
JPEG/PNG/WebP decoding.

Maintain:

MAX_ACTIVE_HEAVY_JOBS = 1

Avoid unnecessary copies of:

- source Blob;
- ArrayBuffer;
- decoded raster;
- intermediate encoded image.

Release all decoder/bitmap/canvas resources as soon as ownership ends.

Hard worker termination must remain the final cancellation backstop.

---

# 13. Cancellation

Cancellation semantics from FSG-001B remain authoritative.

For HEIC:

- check cancellation immediately before lazy decoder import;
- check again after decoder initialization;
- check again after decode;
- continue existing checks through resize/encode;
- hard worker termination remains allowed when dependency decode is
  non-interruptible.

A cancelled HEIC job must never later complete into the UI.

Stale-result protections must remain intact.

---

# 14. Decoder Failure Handling

Map failures to FileSetGo structured errors.

Distinguish where practical:

- HEIC decoder unavailable / dynamic import failed
- HEIC decoder initialization failed
- malformed/corrupt HEIC decode
- decoded dimension inconsistency
- runtime unsupported
- job cancelled

Do not expose raw dependency stack traces as public processing results.

Do not silently fall back to server processing.

---

# 15. Runtime Capabilities

Update:

getRuntimeCapabilities()

so `heicDecoderAvailable` is no longer hardcoded false.

Do not load the HEIC decoder merely to answer capabilities.

Determine capability from the build/runtime prerequisites that can be
feature-detected without paying the lazy-load cost.

If exact availability cannot be guaranteed until dynamic import occurs,
document the semantics clearly:

"runtime appears capable; actual decoder initialization is verified on
first HEIC job."

Do not use user-agent sniffing.

---

# 16. Native HEIC Fast Path

A native Safari/browser HEIC fast path is OPTIONAL in this sprint.

Do not create a complex native-vs-WASM dual architecture merely for an
optimization.

Priority is deterministic HEIC support through one dependable worker path.

Native optimization may be deferred to FSG-006 or a later performance
refinement.

---

# 17. HEIC Test Fixtures

Do not commit third-party photographs merely for HEIC testing.

If a real binary HEIC fixture is needed, prefer a small self-generated
test image with known dimensions and simple generated pixel content.

Keep fixtures small.

Document fixture provenance.

Do not include macOS wallpaper files or other copyrighted test imagery in
the repository.

---

# 18. Required Automated Tests

Extend the automated suite to cover, at minimum:

HEIC preflight:
- valid HEIC passes preflight;
- exact size boundary behavior remains correct;
- 24 MP exact boundary remains accepted;
- >24 MP rejected before decoder;
- malformed box lengths rejected;
- missing primary item rejected where required;
- primary item not first property resolves correctly;
- AVIF is still not misidentified as HEIC.

Primary-item parser:
- pitm resolution;
- ipma property association;
- ispe selection for correct item;
- malformed association;
- out-of-range property index;
- bounded box traversal.

HEIC decoder adapter:
- lazy import occurs only on HEIC;
- JPEG/PNG/WebP never request HEIC module;
- successful bitmap result;
- decoder import failure;
- decoder initialization/decode failure;
- decoded dimension mismatch;
- cancellation before import;
- cancellation after decode.

Worker pipeline:
- HEIC → JPEG;
- HEIC → PNG;
- HEIC → WebP;
- resize;
- no-upscale;
- output validation;
- cleanup;
- stale-result suppression.

Regression:
- all existing 109 tests must continue passing unless a test is
  intentionally changed because HEIC preflight semantics changed;
- any changed test must have an explicit reason.

Do not reduce coverage to preserve a test count.

---

# 19. Real Decoder Verification

Where technically possible in the agent environment, exercise the actual
installed `heic-to` package against a small real/self-generated HEIC file.

Prefer automated execution.

If browser automation becomes available, use it.

If it remains unavailable, DO NOT ask the user to manually test.

Per ADR-013, inability to obtain a physical/manual browser session is not
by itself a blocker.

Record exactly what was and was not verified.

Cross-browser/device compatibility certification remains FSG-006.

---

# 20. Network Privacy

HEIC support must not introduce:

- upload APIs;
- remote conversion;
- external image requests;
- analytics containing file content;
- source-file transmission.

The dependency must run locally.

Audit the processing path for:

fetch(
XMLHttpRequest
sendBeacon
axios
FormData
multipart

Differentiate application network calls from Vite/browser loading of local
build assets.

No source image bytes may leave the user's device.

---

# 21. Build Verification

After implementation run:

npm run typecheck
npm run test:core
npm run build
php artisan test --compact
git diff --check

Inspect production build assets.

Confirm:

- normal initial bundle does not contain the HEIC decoder payload;
- HEIC decoder is lazy;
- package builds successfully through Vite;
- no accidental FSG-002 implementation exists.

---

# 22. Dependency Audit

Record:

- exact installed heic-to version;
- package lock change;
- license;
- libheif version bundled by that release;
- lazy chunk/assets produced by Vite;
- approximate HEIC-specific payload size from actual production build;
- whether WASM/JS assets are emitted;
- any CSP considerations discovered.

Do not use speculative bundle estimates once the package is installed.
Use actual build artifacts.

---

# 23. Documentation Updates

Update only documents that actually require synchronization, including as
appropriate:

- docs/governance/DECISIONS.md
- docs/architecture/FORMAT-SUPPORT.md
- docs/architecture/ARCHITECTURE.md
- docs/security/SECURITY.md
- docs/testing/TESTING.md
- docs/directives/FSG-001C.md
- docs/governance/ROADMAP.md

Do not rewrite unrelated governance.

Create:

docs/directives/FSG-001C.md

containing the implemented directive.

---

# 24. Parent FSG-001 Acceptance Audit

After HEIC implementation is complete, audit the ORIGINAL FSG-001
requirements rather than merely FSG-001C.

Confirm the parent milestone now provides:

Select
→ Preflight
→ Safety
→ Worker
→ Decode
→ Normalize
→ Bounded resize
→ Encode
→ Validate
→ Local output

for all required V1 input formats:

- JPEG
- PNG
- WebP
- HEIC/HEIF

Confirm:

- no server ingestion;
- no main-thread heavy processing architecture;
- 15 MB input cap;
- 24 MP decoded cap;
- one heavy job;
- cancellation;
- stale-result protection;
- structured errors;
- resource cleanup;
- output validation;
- Keryon independence;
- no FSG-002 target-size engine.

If all parent acceptance criteria are satisfied under current governance,
close FSG-001.

If a genuine parent requirement is still missing, do NOT force closure.
Report the remaining gap.

---

# 25. FSG-006 Boundary

Do not block FSG-001 closure solely because these have not yet received a
full physical compatibility matrix:

- Chrome desktop
- Safari desktop
- Firefox desktop
- Edge
- iOS Safari
- Android Chrome

Comprehensive compatibility certification remains FSG-006 under ADR-013.

Any actual automated browser evidence obtained in FSG-001C should still
be recorded.

---

# 26. Out of Scope

Do NOT implement:

- target file-size search;
- binary quality search;
- preset system;
- logo pack;
- favicon generation;
- ZIP packaging;
- bulk processing;
- PDF processing;
- SVG support;
- AVIF output;
- accounts;
- billing;
- API;
- Keryon integration;
- analytics;
- cross-promotion;
- production marketing UI.

These belong to later milestones.

---

# 27. Sprint Report

At completion, COMPLETELY OVERWRITE root:

SPRINT_REPORT.md

Do not create numbered historical sprint-report files.

The report must include:

- milestone;
- status;
- base commit;
- work completed;
- exact dependency/version/license;
- architecture;
- preflight semantic correction;
- primary-item handling;
- lazy-loading evidence;
- actual production HEIC bundle size;
- decoder behavior;
- tests;
- build results;
- privacy audit;
- known limitations;
- FSG-001 parent acceptance audit;
- FSG-001 closure decision;
- next milestone.

Do not claim browser/device compatibility that was not verified.

---

# 28. Commit Boundary

Do NOT commit automatically merely because implementation is complete.

First return the completed SPRINT_REPORT.md and verification result for
review.

Await explicit project-owner approval before committing.

Suggested eventual commit message:

feat(core): add HEIC decode support

Do not begin FSG-002 until FSG-001 is formally closed.
