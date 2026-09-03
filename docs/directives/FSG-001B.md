# FSG-001B — Worker Runtime & Local Decode Foundation

**Product:** File. Set. Go.
**Operational Name:** FileSetGo
**Repository:** `SilvestrLee/filesetgo`
**Core Package:** `@filesetgo/core`
**Parent Milestone:** FSG-001 — Core Client Runtime & Safety Foundation
**Directive:** FSG-001B
**Status:** Ready for Implementation
**Previous Sprint:** FSG-001A — Preflight & Safety Gate
**Governing Documents:**

1. `docs/governance/MASTER-BLUEPRINT.md`
2. `docs/governance/DECISIONS.md`
3. `docs/governance/ROADMAP.md`
4. `docs/directives/FSG-001.md`
5. `docs/architecture/ARCHITECTURE.md`
6. `docs/architecture/CLIENT-RUNTIME.md`
7. `docs/architecture/PROCESSING-RUNTIME.md`
8. `docs/architecture/SAFETY-LIMITS.md`
9. `docs/architecture/FORMAT-SUPPORT.md`
10. `docs/security/SECURITY.md`
11. `docs/security/PRIVACY-ENGINEERING.md`
12. `docs/testing/TESTING.md`
13. `AGENTS.md`

---

## Amendment — Verification Policy (post-implementation)

Sections 70, 71, 84, 87, and 89 below are amended by the project-wide verification
policy adopted in `docs/testing/TESTING.md` ("Verification Responsibility") and
`docs/governance/DECISIONS.md` (ADR-013). In summary:

- User-operated manual browser/device testing (clicking through the proof UI,
  opening DevTools, manually inspecting the Network tab) is **not** a
  Definition-of-Done requirement for this or future sprints.
- The coding agent is responsible for running the strongest automated
  verification available in its environment: unit/integration tests,
  TypeScript checking, production builds, Laravel tests, and automated browser
  automation (e.g. Playwright, Claude in Chrome) where the environment
  supports it.
- Inability to obtain a manually operated physical browser/device session does
  **not**, by itself, block a sprint from closing.
- Comprehensive real-device and cross-browser compatibility certification
  (iOS Safari, Android Chrome, Safari desktop, Chrome, Firefox, Edge,
  memory-pressure and repeated-processing testing) remains assigned to
  **FSG-006 — Hardening, Mobile QA & Compatibility** and is not required to
  close FSG-001B or other pre-FSG-006 sprints.
- None of the above weakens the accuracy rule: an agent must never claim
  verification — automated or manual — that did not actually run.

Where a numbered section below still reads as if manual browser testing is
mandatory, the amendment above governs.

---

# 1. Directive Purpose

FSG-001B establishes the first real browser-side image-processing runtime for FileSetGo.

FSG-001A proved that FileSetGo can inspect untrusted JPEG, PNG, and WebP inputs without performing a full image decode.

FSG-001B must now prove that a file which successfully passes the preflight and safety gates can be processed entirely inside the browser using a dedicated worker runtime.

The target vertical path is:

```text
SOURCE FILE
    ↓
FSG-001A PREFLIGHT
    ↓
SAFETY GATE
    ↓
WORKER JOB
    ↓
DECODE
    ↓
ORIENTATION NORMALIZATION
    ↓
BOUNDED RESIZE
    ↓
ENCODE
    ↓
OUTPUT VALIDATION
    ↓
LOCAL RESULT BLOB
```

The central architecture requirement is:

> **No image reaches the expensive decode stage unless FileSetGo's preflight result has already declared the source safe for decode.**

---

# 2. Sprint Objective

Implement and verify a reusable worker-first runtime within `@filesetgo/core` that can:

* accept a safe JPEG, PNG, or WebP input;
* create and track a typed processing job;
* process the image outside the main UI thread;
* decode the raster image;
* apply JPEG EXIF orientation;
* proportionally resize the image;
* encode the result to JPEG, PNG, or WebP;
* return a locally generated `Blob`;
* report output metadata;
* support cancellation;
* prevent stale results;
* recover cleanly from decode or worker failure;
* explicitly release processing resources; and
* perform all of the above without uploading the source or generated output to FileSetGo servers.

---

# 3. Definition of Success

FSG-001B is successful when all of the following are true:

```text
Safe JPEG
    ↓
Worker
    ↓
Decode
    ↓
Normalize
    ↓
Resize
    ↓
WebP
    ↓
Local Blob
```

works.

The equivalent path must also work for:

* PNG input;
* WebP input;
* JPEG output;
* PNG output;
* WebP output.

Additionally:

* EXIF orientation is correctly applied;
* malformed compressed image payloads fail cleanly;
* cancelling a job prevents stale output delivery;
* repeated sequential jobs do not leave stale processing state;
* heavy image processing is not performed unrestricted on the main thread;
* no image binary is sent across the network.

---

# 4. Existing FSG-001A Capabilities

FSG-001B must reuse the existing preflight implementation rather than reimplementing it.

FSG-001A already provides:

* JPEG binary identification;
* PNG binary identification;
* WebP binary identification;
* JPEG dimensions;
* PNG dimensions;
* WebP dimensions;
* JPEG EXIF orientation extraction;
* WebP animation detection;
* 15 MB source-size gate;
* 24 MP decoded-pixel gate;
* structured preflight results;
* structured preflight errors;
* bounded file reads;
* binary-content-over-extension behavior.

The processing runtime must treat this as an authoritative prerequisite.

---

# 5. Required Processing Architecture

The implementation must preserve this separation:

```text
┌───────────────────────────────┐
│          HOST / UI            │
│                               │
│ File Selection                │
│ State                         │
│ Progress Rendering            │
│ Cancel Button                 │
│ Result Presentation           │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│      @filesetgo/core          │
│                               │
│ preflightImage()              │
│ processImage()                │
│ cancelJob()                   │
│ getRuntimeCapabilities()      │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│        WORKER CLIENT          │
│                               │
│ Job Registry                  │
│ Worker Lifecycle              │
│ Cancellation                  │
│ Stale Result Protection       │
│ Progress Transport            │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│        IMAGE WORKER           │
│                               │
│ Decode                        │
│ Normalize Orientation         │
│ Resize                        │
│ Encode                        │
│ Output Validation             │
│ Cleanup                       │
└───────────────────────────────┘
```

---

# 6. Main-Thread Boundary

The main application/UI thread may perform:

* file selection;
* basic product UI state management;
* calling `preflightImage()`;
* displaying metadata;
* invoking the core processing API;
* displaying coarse processing progress;
* sending cancellation commands;
* receiving the final result;
* initiating a local download.

The main thread must not become the default implementation location for:

* raster decode loops;
* large pixel scans;
* repeated canvas resizing;
* expensive image conversion;
* HEIC decoding;
* iterative compression;
* full-resolution image manipulation.

---

# 7. Worker-First Requirement

All meaningful image transformation work must be performed within a Web Worker where the runtime supports the required capabilities.

Create or complete a worker equivalent to:

```text
packages/core/src/workers/image.worker.ts
```

The worker should not contain FileSetGo product UI logic.

It should accept typed processing commands and return typed processing events.

---

# 8. Initial Concurrency Policy

The approved initial policy remains:

```text
MAX_ACTIVE_HEAVY_JOBS = 1
```

Do not attempt parallel heavy-image processing in this sprint.

Reasons include:

* mobile Safari memory limits;
* decoded raster memory amplification;
* simultaneous canvas allocations;
* predictable cleanup;
* simpler cancellation semantics.

If multiple jobs are requested, the implementation must define deterministic behavior.

Acceptable approaches:

### Option A — Queue

The next job waits.

### Option B — Replace

A new host request cancels the current job and starts the newer request.

For the FileSetGo interactive utility, **replace/cancel behavior is preferred when the same UI workflow changes files**.

---

# 9. Public Processing API

Expose the runtime through the package's public API.

A conceptual API may resemble:

```ts
import {
    processImage,
    cancelImageJob,
    getRuntimeCapabilities,
} from '@filesetgo/core';
```

Example:

```ts
const result = await processImage(file, {
    resize: {
        maxWidth: 1200,
        maxHeight: 1200,
        allowUpscale: false,
    },
    output: {
        format: 'webp',
        quality: 0.85,
    },
});
```

Exact naming can improve during implementation.

Avoid exposing internal worker mechanics directly to host applications.

---

# 10. Processing Request Contract

Introduce one canonical request contract.

Conceptually:

```ts
export interface ProcessImageRequest {
    file: Blob | File;
    resize?: ResizeOptions;
    output: OutputOptions;
}
```

Potential resize structure:

```ts
export interface ResizeOptions {
    maxWidth?: number;
    maxHeight?: number;
    allowUpscale?: boolean;
}
```

Potential output structure:

```ts
export interface OutputOptions {
    format: 'jpeg' | 'png' | 'webp';
    quality?: number;
}
```

Avoid arbitrary configuration dictionaries.

---

# 11. Mandatory Preflight Gate

`processImage()` must not blindly decode the input.

The implementation must either:

### Approach A

Internally call `preflightImage()`.

or:

### Approach B

Require a valid preflight result produced by `preflightImage()`.

For the public package API, Approach A is safer unless there is a strong performance reason otherwise.

Conceptual flow:

```ts
const preflight = await preflightImage(file);

if (!preflight.safeToDecode) {
    return rejection;
}

return processSafeImage(...);
```

There must not be a public processing path that quietly bypasses the safety gate.

---

# 12. Preflight Rejection Behavior

The following FSG-001A outcomes must stop processing before worker decode:

* `FILE_TOO_LARGE`;
* `DIMENSIONS_TOO_LARGE`;
* `UNSUPPORTED_FORMAT`;
* `INVALID_SIGNATURE`;
* `CORRUPT_IMAGE`;
* `ANIMATED_IMAGE_UNSUPPORTED`.

The worker must never receive a job known to have failed the safety gate.

---

# 13. Runtime Capability Detection

Implement a runtime capability probe.

Conceptual output:

```ts
export interface FileSetGoRuntimeCapabilities {
    webWorker: boolean;
    offscreenCanvas: boolean;
    createImageBitmap: boolean;
    jpegDecode: boolean;
    pngDecode: boolean;
    webpDecode: boolean;
    jpegEncode: boolean;
    pngEncode: boolean;
    webpEncode: boolean;
    heicDecoderAvailable?: boolean;
}
```

The final structure should only contain capabilities that can be meaningfully detected.

Do not use user-agent parsing as the primary decision mechanism.

---

# 14. Feature Detection Principle

Behavior should depend on actual capabilities.

Prefer:

```ts
typeof OffscreenCanvas !== 'undefined'
```

over:

```ts
navigator.userAgent.includes('Safari')
```

Browser-name heuristics should only be used if a proven platform bug cannot be handled through capability detection.

Such exceptions must be documented.

---

# 15. OffscreenCanvas

The preferred worker rendering mechanism is:

```text
Web Worker
    ↓
OffscreenCanvas
```

This supports worker-side raster transforms without blocking the UI.

However:

> FileSetGo must be worker-first, not blindly OffscreenCanvas-only.

If an environment lacks a capability required by the processing path, return a structured runtime-unsupported result unless a tested safe fallback exists.

---

# 16. Main-Thread Fallback Policy

Do not implement unrestricted heavy main-thread canvas processing simply to achieve nominal browser support.

A fallback is acceptable only when:

* workload is tightly bounded;
* UI responsiveness remains acceptable;
* memory behavior is understood;
* the fallback is explicitly tested;
* it does not undermine worker-first architecture.

If this cannot be proven during FSG-001B, use a controlled:

```text
RUNTIME_UNSUPPORTED
```

result.

---

# 17. Worker Message Protocol

Worker messages must be typed.

Minimum request types:

```text
PROCESS_IMAGE
CANCEL_JOB
```

Minimum response/event types:

```text
JOB_ACCEPTED
JOB_PROGRESS
JOB_COMPLETE
JOB_FAILED
JOB_CANCELLED
```

---

# 18. Job Identity

Every processing request receives a unique job ID.

Example format:

```text
fsgjob_01...
```

The exact ID implementation is not important as long as IDs are:

* unique enough for current session use;
* opaque to consumers;
* consistent across worker communication.

---

# 19. Stale-Result Protection

The following scenario must be safe:

```text
User selects File A
    ↓
File A begins processing
    ↓
User selects File B
    ↓
File A completes late
```

File A's result must not overwrite File B's UI state.

The worker client/host must associate responses with active job IDs.

Abandoned job results must be ignored or prevented.

---

# 20. Processing Progress

Use **stage progress**, not invented precise percentages.

Approved stages may include:

```text
accepted
decoding
normalizing
resizing
encoding
finalizing
complete
```

Example event:

```ts
{
    type: 'JOB_PROGRESS',
    jobId,
    stage: 'encoding',
}
```

Do not claim:

```text
73%
```

unless the operation provides a meaningful basis for that percentage.

---

# 21. Decode Stage

Required V1 decode inputs for FSG-001B:

* JPEG;
* PNG;
* WebP.

The worker should decode safe source inputs into a raster representation suitable for later transformation.

Where practical, use:

```text
createImageBitmap()
```

inside the worker.

This is appropriate **after** preflight safety validation.

It must not replace the FSG-001A header inspection.

---

# 22. Decode Failure

A file may have valid-enough header metadata yet contain corrupt compressed pixel data.

Therefore:

```text
Preflight PASS
```

does not guarantee:

```text
Decode PASS
```

The worker must catch decode exceptions and return:

```text
DECODE_FAILED
```

The worker must not:

* crash permanently;
* hang;
* propagate an arbitrary raw browser exception as the public API;
* leave the runtime unusable for the next job.

---

# 23. Worker Recovery

After a fatal worker-level failure, the worker client must be able to recreate a clean worker instance.

The following must be possible:

```text
Bad image
    ↓
Worker failure
    ↓
Controlled error
    ↓
New image
    ↓
Successful processing
```

One malformed image must not require a full browser refresh.

---

# 24. EXIF Orientation Normalization

FSG-001A detects JPEG EXIF orientation.

FSG-001B must apply it.

At minimum support and verify:

* orientation 1;
* orientation 3;
* orientation 6;
* orientation 8.

---

# 25. Orientation Semantics

Expected high-level behavior:

### Orientation 1

No transform.

### Orientation 3

Rotate 180°.

### Orientation 6

Rotate 90° clockwise.

### Orientation 8

Rotate 90° counter-clockwise.

Orientations that involve mirroring should either:

* be implemented correctly now; or
* be handled explicitly according to the full 1–8 orientation model.

Do not silently mis-handle EXIF orientation values.

---

# 26. Normalized Dimensions

When orientation rotates width and height, the output metadata must reflect the normalized dimensions.

Example:

```text
Stored source:
4000 × 3000

Orientation:
6

Visual normalized image:
3000 × 4000
```

The transformation planner must operate on normalized visual dimensions.

---

# 27. Metadata Policy

FileSetGo V1 does not need to preserve arbitrary source EXIF metadata.

Outputs may be re-encoded from normalized pixels.

This reduces:

* location metadata leakage;
* orientation ambiguity;
* unnecessary metadata payload;
* hidden arbitrary source content.

Do not add metadata preservation during FSG-001B.

---

# 28. Resize Primitive

Implement a reusable proportional resize operation.

Conceptual input:

```ts
{
    maxWidth: 1200,
    maxHeight: 1200,
    allowUpscale: false,
}
```

Expected behavior:

```text
4000 × 3000
→ max 1200 × 1200
→ 1200 × 900
```

---

# 29. Aspect-Ratio Preservation

Default resizing must preserve source aspect ratio.

Do not distort the image.

The lower-level architecture may later support exact or cover operations, but FSG-001B should focus on safe proportional resizing.

---

# 30. No-Upscale Default

If the source is:

```text
800 × 600
```

and requirements are:

```text
max 1200 × 1200
```

the result should remain:

```text
800 × 600
```

when:

```text
allowUpscale = false
```

This should be tested.

---

# 31. Working Resolution

FSG-001B should avoid holding multiple unnecessary full-resolution raster buffers.

A source that passes the 24 MP hard limit may still be reduced early if its output dimensions are much smaller.

Example:

```text
6000 × 4000
→ requested longest edge 1200
```

The implementation should avoid repeatedly transforming a full 24 MP raster where a smaller bounded working representation can be used safely.

---

# 32. Encoding

Required output formats:

* JPEG;
* PNG;
* WebP.

The worker must return an encoded `Blob`.

---

# 33. Output Result Contract

Introduce one canonical processed-image result.

Conceptually:

```ts
export interface ProcessedImageResult {
    blob: Blob;
    width: number;
    height: number;
    format: 'jpeg' | 'png' | 'webp';
    mimeType: string;
    byteSize: number;
}
```

Optional processing metadata may include:

* source dimensions;
* normalized dimensions;
* whether resizing occurred.

Avoid unnecessary public complexity.

---

# 34. JPEG Quality

JPEG output should accept quality where supported.

Conceptual range:

```text
0.0 – 1.0
```

FSG-001B does not implement target-size searching.

The caller supplies a direct quality value.

---

# 35. WebP Quality

WebP may accept a direct quality value where the browser encoder supports it.

Again:

> This is not the target-file-size engine.

No quality search loops belong in FSG-001B.

---

# 36. PNG Quality

Do not expose meaningless JPEG-style quality behavior for PNG unless the chosen implementation actually supports a meaningful PNG optimization mechanism.

For FSG-001B:

> PNG is raster re-encoding, not target-size PNG optimization.

---

# 37. Output Format Verification

Do not assume that requesting:

```ts
'image/webp'
```

guarantees that the runtime produced WebP.

Verify the generated blob type and/or encoded signature where appropriate.

If WebP encoding is unavailable:

```text
RUNTIME_UNSUPPORTED
```

or a dedicated encoding failure must be returned.

Do not mislabel a PNG/JPEG as WebP.

---

# 38. Cancellation

Processing must support explicit cancellation.

A consumer should be able to:

```ts
cancelImageJob(jobId)
```

or use the final agreed equivalent.

---

# 39. Cancellation Requirements

Cancellation must:

* mark the job abandoned;
* stop further processing steps where practical;
* prevent result delivery;
* clean temporary resources;
* emit or resolve with a controlled cancellation state;
* leave the runtime usable.

---

# 40. Hard Cancellation

If browser image decoding cannot be meaningfully interrupted, the worker may be terminated for hard cancellation.

If this mechanism is used:

1. terminate worker;
2. mark cancelled job complete as cancelled;
3. clear job registry;
4. create a fresh worker instance;
5. accept future jobs normally.

Document the chosen strategy.

---

# 41. Resource Lifecycle

Processing code must explicitly release resources.

Review and handle:

* `ImageBitmap.close()`;
* temporary `OffscreenCanvas` references;
* intermediate `Blob` objects;
* object URLs generated by package code;
* transferred buffers;
* image-data arrays;
* active worker listeners;
* job registry entries;
* cancellation tokens/state.

Do not rely entirely on eventual garbage collection for obviously disposable heavy resources.

---

# 42. Sequential-Job Safety

Verify this sequence:

```text
Process File 1
→ complete

Process File 2
→ complete

Process File 3
→ complete
```

No earlier result should reappear.

No abandoned job should remain active.

No worker should become unusable.

---

# 43. Error Vocabulary

Extend the existing typed errors where necessary.

Likely additions include:

```text
DECODE_FAILED
ENCODE_FAILED
RUNTIME_UNSUPPORTED
PROCESSING_CANCELLED
WORKER_FAILED
```

If `WORKER_FAILED` is not needed externally, keep internal errors internal.

Do not add redundant codes without clear semantics.

---

# 44. Error Contract

The public API must continue using structured errors.

Conceptually:

```ts
export interface FileSetGoProcessingError {
    code: ProcessingErrorCode;
    message: string;
    recoverable: boolean;
}
```

Raw browser exceptions can be preserved internally for debugging but must not become the canonical consumer API.

---

# 45. HEIC / HEIF Evaluation

HEIC/HEIF is a required V1 input under ADR-005.

FSG-001B must begin or complete the technical evaluation.

The implementation must not compromise the standard JPEG/PNG/WebP processing path.

---

# 46. HEIC Dependency Requirements

Evaluate candidate browser HEIC decoders against:

* maintenance activity;
* latest release health;
* libheif currency where applicable;
* license;
* transitive dependencies;
* bundle size;
* Web Worker compatibility;
* lazy-loading support;
* Safari compatibility;
* memory behavior;
* malformed input handling;
* primary-image semantics;
* multi-image HEIC behavior.

---

# 47. HEIC Lazy Loading

Standard users must not pay the HEIC dependency cost.

Required architecture:

```text
JPEG / PNG / WebP
        ↓
native standard pipeline

HEIC / HEIF
        ↓
detect container
        ↓
dynamic import
        ↓
HEIC decoder
        ↓
worker decode
        ↓
normalized standard raster
```

---

# 48. HEIC Package Decision

Do not assume `heic2any` is automatically the preferred implementation.

The final completion report must state:

```text
Candidates evaluated:
Selected candidate:
Selected version:
License:
Lazy loaded:
Worker compatible:
Bundle impact:
Known limitations:
```

If no implementation reaches the required standard, report it as a technical blocker or explicit continuation item.

Do not quietly remove HEIC from V1.

---

# 49. HEIC Scope for This Sprint

Two acceptable FSG-001B outcomes exist:

## Outcome A — Implemented

HEIC safely enters the standard worker raster pipeline.

or:

## Outcome B — Technical Decision Completed

The correct library and architecture are selected, but implementation is explicitly scheduled into the final FSG-001 sub-sprint.

JPEG/PNG/WebP processing must not be delayed unnecessarily if HEIC requires isolated follow-up work.

---

# 50. No HEIC Server API

HEIC conversion may not use:

* Cloudinary conversion;
* external conversion websites;
* Laravel upload;
* serverless conversion endpoints;
* hidden third-party file upload.

The V1 privacy architecture requires client-side HEIC handling.

---

# 51. Proof Interface

FSG-001B may introduce a minimal engineering proof surface if needed.

It must not become the final Quick Fit UX.

Suggested interface:

```text
File. Set. Go.

Choose an image

Detected:
JPEG
4032 × 3024
12.2 MP
3.7 MB
Safe ✓

Resize longest edge:
[1200]

Output:
[WebP ▼]

Quality:
[0.85]

[Process Locally]
```

Result:

```text
Before
4032 × 3024
3.7 MB

After
1200 × 900
184 KB
WebP

[Download]
```

---

# 52. Proof Interface Boundary

Do not spend this sprint building:

* polished homepage;
* Guided Fit;
* presets;
* user onboarding;
* accounts;
* marketing sections;
* dashboards;
* Logo Pack UI.

The surface exists only to validate the processing architecture.

---

# 53. Privacy Requirements

Supported JPEG, PNG, and WebP processing must remain completely local.

There must be no:

* multipart upload;
* base64 image POST;
* Laravel temporary upload;
* image API call;
* third-party conversion call;
* binary telemetry upload.

---

# 54. Network Verification

Browser developer tools must be used during manual verification.

Process at least one supported image and confirm that no request contains:

* source binary;
* output binary;
* source filename as telemetry;
* Base64 file representation.

Document the result in `SPRINT_REPORT.md`.

---

# 55. Analytics

Do not add production analytics during FSG-001B.

Performance metrics may be logged or measured locally during development.

Do not send file data externally.

---

# 56. Security Boundary

All source files remain untrusted even after preflight.

Preflight means:

> Safe enough to attempt decode under current limits.

It does not mean:

> Guaranteed valid image.

Decode must remain exception-safe.

---

# 57. Threat Scenarios to Test

At minimum consider:

### Valid header, corrupt payload

Preflight succeeds.

Decode fails.

Expected:

```text
DECODE_FAILED
```

Runtime remains usable.

---

### Oversized source

FSG-001A rejects.

Worker never receives file.

---

### >24 MP image

FSG-001A rejects.

No bitmap allocation.

---

### Animated WebP

FSG-001A rejects.

No decode path.

---

### User changes files during processing

Old job cancelled or abandoned.

No stale result.

---

# 58. TypeScript Architecture

Maintain strict TypeScript separation between normal browser modules and worker modules.

Do not reintroduce the prior DOM/WebWorker global collision.

Existing project configuration must remain valid.

If additional worker-specific typings are needed, keep the worker compiler context isolated.

---

# 59. Package Structure

A reasonable structure may evolve toward:

```text
packages/core/src/
├── index.ts
├── preflight/
├── runtime/
│   ├── capabilities.ts
│   ├── worker-client.ts
│   ├── job-registry.ts
│   └── cancellation.ts
├── workers/
│   └── image.worker.ts
├── decode/
├── normalize/
├── transforms/
│   └── resize.ts
├── encoding/
├── errors/
└── types/
```

Do not create empty directories or speculative interfaces merely to mirror this example.

Implement only what the sprint genuinely uses.

---

# 60. Testing Requirements

FSG-001B must materially expand `npm run test:core`.

Tests should include logical unit tests and browser-oriented tests where needed.

---

# 61. Runtime Capability Tests

Test deterministic capability helpers where possible.

Avoid tests that merely mock everything to true without validating any behavior.

---

# 62. Worker Protocol Tests

Verify:

* job request contract;
* accepted event;
* progress event typing;
* completion;
* failure;
* cancellation;
* job-ID matching.

---

# 63. Decode Tests

Cover:

* valid JPEG;
* valid PNG;
* valid WebP;
* valid-looking preflight but corrupt compressed payload;
* controlled decode failure.

---

# 64. Orientation Tests

Verify normalized results for:

* orientation 1;
* orientation 3;
* orientation 6;
* orientation 8.

Where feasible, verify actual pixel orientation rather than only computed transform matrices.

---

# 65. Resize Tests

At minimum:

### Landscape

```text
4000 × 3000
max 1200 × 1200
→ 1200 × 900
```

### Portrait

```text
3000 × 4000
max 1200 × 1200
→ 900 × 1200
```

### No upscale

```text
800 × 600
max 1200 × 1200
allowUpscale false
→ 800 × 600
```

### Single-bound constraint

Verify max-width-only or max-height-only behavior if supported.

---

# 66. Encode Tests

Verify:

* JPEG output is actual JPEG;
* PNG output is actual PNG;
* WebP output is actual WebP;
* resulting Blob size > 0;
* result dimensions are correct.

---

# 67. Cancellation Tests

Verify:

```text
Start job
→ cancel
→ completion result must not be delivered as success
```

Then:

```text
Start new job
→ succeeds
```

---

# 68. Stale Result Tests

Simulate:

```text
Job A starts
Job B replaces A
A returns late
```

Only Job B is accepted by host state.

---

# 69. Worker Failure Recovery Test

A failed worker must not permanently disable processing.

Verify:

```text
Bad job
→ failure

Good job
→ success
```

---

# 70. Browser Testing Requirement (amended)

This sprint introduces real browser image APIs, so runtime verification
matters. **This is the coding agent's responsibility, not the user's.**

The agent must use the strongest automated verification available in its
environment: unit/integration tests exercising the real decode/encode/resize
logic (with browser API fakes where the test runtime lacks them), and browser
automation (Playwright, Claude in Chrome, or equivalent) when that tooling is
actually usable in the environment.

User-operated manual testing — asking a human to click through the proof UI,
open DevTools, or manually exercise cancellation — is **not** required to
satisfy this section.

If browser automation is unavailable because of environment or tooling
constraints (e.g. a browser-automation extension will not connect, or the
network cannot support a browser-binary download), that is a recorded
limitation, not a blocker: defer the broader cross-browser/device proof to
FSG-006 and close this sprint on its automated verification baseline. Do not
ask the user to perform the test manually as a substitute.

Do not claim any browser or device was verified when it was not.

---

# 71. Browser Verification Report (amended)

The completion report must distinguish what actually ran:

```text
Automated (this environment):
Vitest unit/integration suite — PASS (N tests)
Browser automation — PASS / not available (state which)

Not certified (deferred to FSG-006):
Chrome desktop, Safari desktop, Firefox desktop, Edge,
iOS Safari, Android Chrome
```

Do not convert assumptions into compatibility claims. Absence of manual or
automated browser evidence does not block closure — it is reported honestly
and carried forward to FSG-006, which owns the compatibility matrix.

---

# 72. Large-Image Test

Where practical, manually test:

* ~12 MP JPEG;
* near-24 MP JPEG.

Observe:

* processing success;
* UI responsiveness;
* cancellation;
* worker stability.

FSG-001B does not yet finalize the hard-limit calibration.

That remains FSG-006.

---

# 73. Performance Measurements

Capture development measurements where practical:

```text
preflight_ms
decode_ms
normalize_ms
resize_ms
encode_ms
total_ms
```

These do not need to become product analytics.

They are useful for architecture validation.

---

# 74. Memory Observation

Review browser memory behavior where tooling allows.

Specifically observe:

* image processing;
* repeated sequential jobs;
* cancellation;
* new-file replacement.

Exact cross-browser memory accounting is not required to close FSG-001B, but obvious retention problems are blockers.

---

# 75. Documentation Updates

If implementation changes a previously governed architectural assumption, update the relevant document within the same sprint.

Likely documents potentially affected:

```text
docs/architecture/CLIENT-RUNTIME.md
docs/architecture/PROCESSING-RUNTIME.md
docs/architecture/FORMAT-SUPPORT.md
docs/architecture/SAFETY-LIMITS.md
docs/security/SECURITY.md
docs/security/PRIVACY-ENGINEERING.md
docs/governance/DECISIONS.md
```

Do not change governance simply to fit accidental implementation.

Material architecture changes require explicit rationale.

---

# 76. Explicit Non-Goals

Do not implement the following during FSG-001B:

* target file-size search;
* binary-search compression;
* 200 KB presets;
* flexible dimension step-down;
* Quick Fit final UX;
* Website Logo Pack;
* favicon generation;
* favicon `.ico`;
* web manifest;
* presets;
* ZIP packaging;
* whitespace trimming;
* background removal;
* SVG processing;
* PDF processing;
* authentication;
* accounts;
* subscriptions;
* billing;
* database processing records;
* cloud file storage;
* public API;
* Keryon integration;
* cross-promotion;
* AI editing.

---

# 77. FSG-002 Boundary

Do not accidentally implement FSG-002.

FSG-002 owns:

> **Make this file under X KB/MB while respecting hard constraints and quality guardrails.**

FSG-001B only supports direct encoding parameters such as:

```text
quality = 0.85
```

It must not repeatedly search for a target byte size.

---

# 78. FSG-004 Boundary

Do not implement preset logic.

The worker/runtime must be reusable enough for later presets, but it should not know:

```text
website-logo-pack
web-image-optimizer
church-logo
```

during this sprint.

---

# 79. Keryon Boundary

Do not add Keryon-specific code.

`@filesetgo/core` must remain host-neutral.

No references to:

* churches;
* memberships;
* tenant IDs;
* Keryon routes;
* Keryon storage;
* Keryon UI.

---

# 80. Required Commands Before Closure

Run:

```bash
npm run typecheck
```

Expected:

```text
PASS
```

Run:

```bash
npm run test:core
```

Report exact:

* test files;
* tests;
* failures.

Run:

```bash
npm run build
```

Expected:

```text
PASS
```

Run:

```bash
php artisan test --compact
```

Report exact test and assertion counts.

Run:

```bash
git diff --check
```

Expected:

```text
PASS
```

---

# 81. Network Verification Before Closure

Use the browser's Network panel while processing a real image.

Confirm:

```text
No image upload
No base64 POST
No conversion API
No Laravel file request
No third-party file processing request
```

This must appear in the completion report.

---

# 82. Sprint Report Governance

At FSG-001B completion:

> **Replace the entire contents of the root `SPRINT_REPORT.md`.**

Do not append beneath FSG-001A.

Do not create:

```text
SPRINT_REPORT_FSG-001B.md
```

Do not create:

```text
reports/FSG-001B.md
```

Git history preserves FSG-001A.

---

# 83. Required `SPRINT_REPORT.md` Sections

The FSG-001B report must contain:

```text
# FileSetGo Sprint Report

Milestone
Status
Branch
HEAD

Objective

Work Completed

Files Changed

Public Core API

Worker Architecture

Safety-Gate Integration

Runtime Capability Detection

Decode Capabilities

EXIF Normalization

Resize Capabilities

Encoding Capabilities

Cancellation & Stale Result Protection

Resource Cleanup

HEIC Evaluation

Tests & Verification

Browser / Device Verification

Network / Privacy Verification

Security Verification

Performance Observations

Known Limitations

Deferred Work

Next Sprint

Commit Reference
```

---

# 84. Report Accuracy Rule

Do not state:

```text
Safari supported
```

unless it was actually tested.

Do not state:

```text
Memory leak free
```

unless it was meaningfully verified.

Prefer accurate language:

> No obvious retained job state was observed during the tested repeated-processing scenario.

---

# 85. Suggested Implementation Commit

After:

* implementation;
* tests;
* build;
* browser verification;
* network verification;
* report overwrite;

commit using:

```bash
git add .
git diff --cached --check
git commit -m "feat(core): add worker image processing runtime"
```

Before `git add .`, confirm the working tree contains only intended sprint changes.

If unrelated changes exist, stage selectively instead.

---

# 86. Push

After commit:

```bash
git push
```

Do not merge to `main` automatically unless project governance explicitly authorizes milestone integration.

---

# 87. Definition of Done

FSG-001B is complete only when a real supported image can move through this architecture:

```text
FILE
  ↓
PREFLIGHT
  ↓
SAFE
  ↓
WORKER
  ↓
DECODE
  ↓
NORMALIZE ORIENTATION
  ↓
RESIZE
  ↓
ENCODE
  ↓
VALIDATE OUTPUT
  ↓
LOCAL BLOB
```

with:

* no server upload;
* responsive host UI;
* structured processing states;
* structured failures;
* cancellation;
* stale-result protection;
* reusable `@filesetgo/core` API;
* JPEG support;
* PNG support;
* WebP support;
* truthful verification (the strongest automated verification available in
  the environment — unit/integration tests, typecheck, build, and browser
  automation where usable; user-operated manual testing is not required, per
  the amendment above);
* passing test/build baseline.

---

# 88. FSG-001 Remaining Work After FSG-001B

FSG-001B does not necessarily close the entire FSG-001 milestone.

After this sprint, compare delivered capabilities against `docs/directives/FSG-001.md`.

Likely remaining items may include:

* completing the HEIC/HEIF V1 path;
* strengthening runtime/browser fallback behavior;
* completing the engineering proof surface;
* additional memory/resource validation;
* final FSG-001 end-to-end review.

Do not automatically proceed to FSG-002 until the entire FSG-001 definition of done is satisfied.

---

# 89. Next Milestone Decision Gate (amended)

At FSG-001B closure determine one of:

### Path A — FSG-001C required

Use if material FSG-001 commitments remain.

Example:

```text
HEIC path incomplete
```

Lack of a user-operated manual browser/device session is **not**, by itself,
a Path A trigger — comprehensive cross-browser/device certification is
FSG-006's responsibility, not a per-sprint closure requirement. If automated
verification (tests, typecheck, build, and browser automation where usable)
passed and the only gap is broad physical-device/cross-browser certification,
that gap is recorded and deferred to FSG-006, not treated as blocking.

### Path B — FSG-001 Closeout

Use if all parent FSG-001 acceptance criteria have been satisfied.

Only after FSG-001 is formally closed may development proceed to:

# FSG-002 — Target File Size Engine & Guardrails

---

# 90. Final Engineering Instruction

The goal of this sprint is not to build an image editor.

The goal is to prove this architectural statement:

> **FileSetGo can safely transform a real image entirely on the user's device, outside the main UI thread, through a reusable processing package, after first proving that the source is safe to decode.**

Prefer:

* small interfaces;
* explicit states;
* bounded work;
* predictable cleanup;
* deterministic behavior;
* testability;
* accurate errors;

over speculative architecture or unnecessary product features.

---

**END OF FSG-001B — WORKER RUNTIME & LOCAL DECODE FOUNDATION**
