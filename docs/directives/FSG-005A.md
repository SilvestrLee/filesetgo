# FSG-005A — Multi-Output Packaging Foundation

## Authority

Implement only FSG-005A.

Parent milestone:

FSG-005 — Packaging & Export Systems

Parent FSG-005 remains OPEN until FSG-005B is completed.

Governance precedence remains:

1. docs/governance/MASTER-BLUEPRINT.md
2. docs/governance/DECISIONS.md
3. docs/governance/ROADMAP.md
4. This directive
5. Architecture / security / testing documentation
6. Code

Closed milestones:

FSG-001 ✅
FSG-002 ✅
FSG-003 ✅
FSG-004 ✅

Authoritative FSG-004 closeout commit:

8cddc182535a83720c6d969a556bb37b633b54bd

Do not begin FSG-005B.

Do not build the Website Logo Pack yet.

---

# 1. Objective

Create the reusable browser-side multi-output and packaging foundation that
FSG-005B will use for Website Logo Pack generation.

The foundation must support:

one source image
→ one decode
→ multiple deterministic output specifications
→ multiple validated local image assets
→ optional ZIP archive
→ local result only

The source image and generated assets must never be uploaded.

---

# 2. FSG-005 Parent Structure

Record the parent structure in governance:

FSG-005 — Packaging & Export Systems
├── FSG-005A — Multi-Output Packaging Foundation
└── FSG-005B — Website Logo Pack & Favicon Suite

FSG-005A closes only the generic foundation.

FSG-005 itself remains OPEN after FSG-005A.

FSG-005B will close the parent milestone if its acceptance criteria pass.

---

# 3. Branch

Start from the clean FSG-004 closeout.

Run:

git status
git rev-parse HEAD

Expected HEAD:

8cddc182535a83720c6d969a556bb37b633b54bd

Create:

fsg-005a-packaging-foundation

Do not continue feature development on the FSG-004 branch.

---

# 4. Directive File

Create:

docs/directives/FSG-005A.md

Record this directive faithfully.

---

# 5. Architectural Principle

FSG-005A must introduce generic capabilities, not logo knowledge.

Core may understand:

- multiple output specifications;
- filenames;
- image formats;
- dimensions;
- archive entries;
- ZIP creation;
- output validation;
- cancellation;
- resource limits.

Core must NOT understand:

- Website Logo Pack;
- favicon;
- Apple touch icon;
- Android icon;
- header logo;
- WordPress;
- Keryon;
- preset names.

FSG-005B will supply those product-specific specifications.

---

# 6. One Decode, Multiple Outputs

Do NOT implement multi-output generation by repeatedly calling:

processImage()

for the same source.

That would repeatedly:

preflight
decode
normalize

the same file.

Introduce a genuine multi-output worker capability.

Conceptually:

processImageSet(file, {
    outputs: [...]
})

The source should:

preflight once
decode once
normalize once

then generate multiple outputs sequentially from the normalized source.

Do not create parallel full-resolution image pipelines.

---

# 7. Public Core Contract

Create a generic reusable contract.

Conceptually:

processImageSet(file, {
    outputs: [
        {
            id: 'asset-a',
            filename: 'asset-a.webp',
            output: { format: 'webp' },
            dimensions: {...}
        },
        ...
    ],
    archive?: {
        filename: 'package.zip'
    }
})

Exact naming may improve after inspecting existing contracts.

Required characteristics:

- typed;
- destination-neutral;
- deterministic;
- cancellable;
- worker-first;
- reusable by FSG-005B.

Do not leak ZIP-library-specific types into the public API.

---

# 8. Output Specification

Each requested asset needs at minimum:

- stable request ID;
- filename;
- output format;
- dimension specification.

Reuse existing image-processing contracts wherever appropriate.

Do not duplicate definitions for:

- JPEG;
- PNG;
- WebP;
- dimension policy;
- resize behavior.

FSG-005A is orchestration over existing primitives.

---

# 9. Supported Outputs

FSG-005A multi-output generation supports the existing output formats:

- JPEG
- PNG
- WebP

HEIC remains input-only.

Do not add:

- HEIC output;
- AVIF;
- SVG;
- ICO.

ICO generation belongs to FSG-005B because it requires favicon-specific
container behavior.

---

# 10. Worker Protocol

Extend the typed worker protocol with a distinct multi-output operation.

Conceptually:

PROCESS_IMAGE_SET

and suitable completion/failure/cancellation responses.

Do not disguise multiple-output processing as several unrelated
single-image jobs.

The entire set is ONE FileSetGo heavy job.

---

# 11. One-Heavy-Job Invariant

Existing:

MAX_ACTIVE_HEAVY_JOBS = 1

remains authoritative.

The runtime must treat:

processImage()
processImageToTarget()
processImageSet()

as competing for the same active heavy-job slot.

Starting any new heavy job cancels the previous one regardless of type.

Test cross-kind cancellation.

---

# 12. Sequential Asset Generation

Generate output assets sequentially.

Do NOT encode all outputs concurrently.

Reason:

- decoded source may already consume substantial memory;
- canvases consume additional decoded memory;
- package outputs must remain bounded;
- browser memory is finite.

Preferred model:

decode once
→ output A
→ release A canvas
→ output B
→ release B canvas
→ ...
→ package

Keep only the resulting compressed Blobs/byte arrays required for final
delivery.

---

# 13. Cancellation

Check cancellation:

- before decode;
- after decode;
- before each output asset;
- after each resize/render;
- after each encode;
- before archive creation;
- after archive creation;
- before final result publication.

Hard worker termination remains the final backstop.

A cancelled image-set job must never later surface a completed package.

---

# 14. Output Validation

Every generated asset must pass the existing output validation before being
included in the completed result.

Validate:

- non-empty;
- correct binary format;
- correct MIME;
- expected dimensions;
- valid preflight.

Do not package an asset merely because encode returned a Blob.

If one required asset fails validation:

the entire image-set operation fails.

Do not silently omit failed required files.

---

# 15. Image-Set Result

A successful result should contain structured metadata for every asset.

At minimum:

- id;
- filename;
- Blob;
- bytes;
- format;
- width;
- height.

Also return:

- number of assets;
- total unarchived bytes;
- archive Blob if requested;
- archive bytes if requested.

FSG-005B must be able to present individual files as well as a package
without reverse-engineering ZIP contents.

---

# 16. Deterministic Ordering

Output ordering must be deterministic.

Preserve the caller's requested asset order unless there is a compelling
technical reason not to.

ZIP entry ordering must also be deterministic.

Do not depend on object-property iteration quirks.

---

# 17. Filename Safety

Core receives requested filenames from the product layer but must validate
them.

Reject unsafe archive entry names.

At minimum prevent:

- `../`
- `..\`
- absolute paths;
- drive-letter paths;
- null bytes;
- empty filename;
- `"."`;
- `".."`.

Normalize or reject path separators consistently.

For FSG-005A, flat ZIP archives are sufficient.

Do not support arbitrary directory trees yet.

---

# 18. Duplicate Filenames

Duplicate output filenames must be rejected before expensive processing.

Do not silently produce:

logo.png
logo (1).png

or overwrite an earlier ZIP entry.

The caller must intentionally provide unique names.

Also reject duplicate output IDs.

---

# 19. Initial Package Bounds

Introduce explicit V1 package bounds.

Use:

MAX_PACKAGE_ASSETS = 16

MAX_PACKAGE_TOTAL_OUTPUT_BYTES = 50 MiB

These are initial safety limits, not marketing promises.

The limit applies to the sum of completed uncompressed asset Blob sizes
before ZIP packaging.

If output generation would exceed the package byte limit:

stop with a structured package-limit error.

Do not allow arbitrary multi-output jobs to consume unlimited memory.

Record these limits in governance.

---

# 20. ZIP Dependency Approval

The project owner approves exactly:

fflate@0.8.3

for FSG-005A.

Before installation verify:

- package name: fflate
- version: 0.8.3
- license: MIT
- browser ZIP support remains present
- no runtime dependencies have appeared

If any fact differs, STOP and report.

Pin exactly:

0.8.3

Do not use a caret range.

Install it where the generic packaging implementation actually belongs,
preferably the core workspace if core owns the archive implementation.

Do not install JSZip in addition.

---

# 21. Dependency Boundary

Hide fflate behind a FileSetGo-owned archive adapter.

Conceptually:

createZipArchive(entries)
→ Uint8Array / Blob

No public FileSetGo API should expose:

- fflate types;
- fflate callbacks;
- fflate-specific configuration.

A future archive implementation replacement should be contained.

---

# 22. ZIP Compression Strategy

The primary package contents will already be compressed image formats.

Do not waste significant CPU trying to heavily DEFLATE:

- JPEG;
- PNG;
- WebP.

Use ZIP STORE / effectively level-0 behavior for image assets unless
measured evidence demonstrates another choice is worthwhile.

The product goal is packaging, not recompressing already-compressed files.

This also keeps packaging deterministic and fast.

Document the exact fflate configuration.

---

# 23. ZIP Execution Location

Archive creation must not perform heavy synchronous work on the main UI
thread.

Preferred:

create the archive inside the existing worker-side image-set operation.

A synchronous ZIP operation is acceptable inside the worker under the
governed package limits.

Do not call a large synchronous `zipSync()` operation directly from the
browser main thread.

---

# 24. ZIP MIME

Return the archive as:

application/zip

Do not use:

application/octet-stream

unless browser behavior forces it and the reason is documented.

Archive filename must end in:

.zip

Validate this before processing or normalize through one deterministic
helper.

---

# 25. ZIP Integrity Verification

Tests must not only check that an archive Blob exists.

Round-trip generated ZIPs using an unzip reader/test path and verify:

- expected entry count;
- exact filenames;
- exact entry bytes;
- deterministic ordering where supported by inspection;
- no missing asset;
- no unexpected asset.

The production application does not need unzip functionality exposed
publicly.

Test-only decoding may use fflate's unzip capability.

---

# 26. Archive Metadata Privacy

Do not place any unnecessary source metadata inside ZIP entries.

Do not include:

- original filesystem path;
- EXIF;
- browser information;
- user identifiers;
- timestamps derived from local file metadata;
- absolute paths.

Avoid non-deterministic ZIP timestamps where the library/API allows.

If ZIP timestamps cannot be fully normalized with the chosen API, document
the behavior.

Do not add a manifest file merely to describe internal processing.

---

# 27. Deterministic Archive

To the practical extent allowed by the ZIP library, the same entry bytes,
filenames and order should produce the same archive bytes.

Control sources of variation such as timestamps if supported.

Add a deterministic-archive test if feasible.

If fflate necessarily injects varying metadata, document the exact
limitation rather than claiming byte-for-byte determinism.

---

# 28. Lazy Packaging Code

Quick Fit and Guided Fit users must not pay the ZIP-library cost merely by
visiting the site.

The packaging/archive implementation should be lazy-loaded only when an
image-set/archive operation is actually requested.

Normal:

Quick Fit
Guided Fit

must not eagerly include the fflate archive implementation.

Verify via actual production build inspection.

---

# 29. No Public Logo Pack UI Yet

FSG-005A is infrastructure.

Do NOT add:

Website Logo Pack

to the public workflow yet.

Do not add fake/demo package cards to the homepage.

A narrow non-public engineering harness may be used only if technically
necessary for automated verification.

FSG-005B owns the actual public Logo Pack experience.

---

# 30. No Favicon Work Yet

Do not implement:

favicon.ico
favicon-32x32.png
apple-touch-icon.png
icon-192x192.png
icon-512x512.png
manifest.webmanifest

in FSG-005A.

These are FSG-005B.

Do not let knowledge of those names leak into the generic package API.

---

# 31. No New Resize Semantics

FSG-005A should use existing image resize behavior.

Do not implement:

- square padding;
- favicon geometry correction;
- contain-on-square-canvas;
- cropping;
- background fill;
- logo whitespace trimming.

Those transformations belong to the Website Logo Pack workflow and must be
governed separately in FSG-005B.

---

# 32. Progress

Extend progress semantics only enough to support multi-output processing.

Product-level stages may conceptually include:

processing
packaging
complete

Internal progress may know:

asset index
asset count

Do not expose noisy technical details through the public API unless useful.

FSG-005B should be able to say:

Preparing file 3 of 7...

without knowing worker internals.

---

# 33. Structured Errors

Add package-specific structured errors where necessary.

Examples:

TOO_MANY_PACKAGE_ASSETS
PACKAGE_OUTPUT_TOO_LARGE
DUPLICATE_ASSET_ID
DUPLICATE_FILENAME
INVALID_ARCHIVE_FILENAME
UNSAFE_ARCHIVE_ENTRY
ARCHIVE_CREATION_FAILED

Names may improve.

Do not convert packaging failures into generic `ENCODE_FAILED` if the
encoding itself succeeded.

---

# 34. Cleanup

On completion/cancellation/failure:

- decoded bitmap closed;
- canvases zeroed/released;
- worker terminated according to existing lifecycle;
- temporary byte arrays made unreachable;
- superseded blobs not retained;
- no object URLs created inside core.

Object URLs remain host/UI responsibility.

---

# 35. No Server Boundary Change

Do not create:

- ZIP endpoint;
- upload endpoint;
- package endpoint;
- temporary server storage;
- cloud archive storage.

Laravel remains uninvolved in binary package generation.

The complete package must be created locally.

---

# 36. Privacy Audit

After implementation inspect for:

fetch(
XMLHttpRequest
sendBeacon
axios
FormData
multipart

Expected processing network behavior remains:

the existing same-origin HEIC WASM asset fetch only.

fflate must be bundled locally.

Do not load compression code from a CDN.

---

# 37. Required Multi-Output Tests

At minimum test:

- one input → two outputs;
- one input → multiple JPEG/PNG/WebP outputs;
- output order preserved;
- source decoded once;
- normalized source reused;
- every output validated;
- one failing output fails whole operation;
- HEIC source decoded once for multiple outputs;
- no HEIC output;
- cancellation between assets;
- cancellation during asset creation;
- stale completion suppression;
- cross-kind active-job cancellation.

---

# 38. Limits Tests

Test:

- exactly 16 assets accepted;
- 17 assets rejected before expensive processing;
- exact 50 MiB total boundary accepted where practical via controlled
  mocks/fixtures;
- >50 MiB rejected;
- duplicate IDs rejected;
- duplicate filenames rejected;
- unsafe filenames rejected.

Do not allocate enormous real test images solely to test byte limits.

Use controlled encoder mocks where appropriate.

---

# 39. ZIP Tests

Test:

- valid ZIP returned;
- MIME = application/zip;
- requested archive filename preserved;
- all entries present;
- filenames exact;
- bytes exact after unzip;
- no hidden unexpected entries;
- duplicate filenames rejected;
- path traversal rejected;
- empty package rejected;
- archive creation failure maps correctly;
- deterministic behavior where library permits.

---

# 40. Dependency Tests / Build Evidence

After installation record:

- exact fflate version;
- license;
- resolved dependency graph;
- production asset/chunk size;
- whether it is emitted separately;
- whether Quick Fit/Guided Fit initial bundles remain independent of it.

Run:

npm ls fflate

Record the result in SPRINT_REPORT.md.

---

# 41. Existing Baseline

The following baseline must remain green:

Core:
202 / 202

UI:
171 / 171

Laravel:
8 / 8, 17 assertions

FSG-005A will add core/export tests.

Do not change existing tests merely to make new architecture pass unless a
real intentional semantic change is documented.

---

# 42. TypeScript Governance

Preserve the current project boundaries.

Do not:

- upgrade Vitest;
- remove the governed @types/chai override;
- reintroduce root skipLibCheck;
- add Node types to production browser configuration.

The fflate browser implementation must typecheck under the worker/core
environment.

---

# 43. Documentation

Update only relevant documents.

Likely:

docs/governance/ROADMAP.md
docs/governance/DECISIONS.md
docs/architecture/ARCHITECTURE.md
docs/security/SECURITY.md
docs/testing/TESTING.md
docs/product/PRODUCT.md
docs/directives/FSG-005A.md

Record the packaging architecture and package safety limits.

Create ADR-017 because this sprint introduces material architecture:

- one-decode multi-output processing;
- package bounds;
- ZIP library choice;
- worker-side ZIP;
- lazy archive dependency;
- flat archive namespace.

---

# 44. Production Verification

Run:

npm ci
npm run typecheck
npm run test:core
npm run test:ui
npm run build
php artisan test --compact
vendor/bin/pint --dirty --format agent
git diff --check

Also:

npm ls fflate

Inspect built assets for lazy archive loading.

Confirm HEIC remains lazy.

---

# 45. Browser Automation

Use browser automation if available and useful.

Do not ask the project owner to perform manual verification.

ADR-013 remains authoritative.

FSG-005A has no required public UI, so browser automation availability
should not block closure.

FSG-006 remains comprehensive compatibility certification.

---

# 46. FSG-005A Acceptance Criteria

FSG-005A may close only when:

1. Generic typed image-set contract exists.
2. Image-set processing occurs as one heavy job.
3. Source is preflighted once.
4. Source is decoded once.
5. Multiple outputs reuse the decoded source.
6. Outputs are processed sequentially.
7. JPEG/PNG/WebP outputs work.
8. HEIC input works without duplicate decode.
9. Every output is validated.
10. One failed required output fails the set.
11. Cancellation works between outputs.
12. Stale-result protection works.
13. Existing heavy-job concurrency invariant remains intact.
14. Generic archive adapter exists.
15. fflate@0.8.3 is exact-pinned and isolated.
16. ZIP creation occurs off the main thread.
17. ZIP contains exact expected entries.
18. Entry filenames are validated.
19. Duplicate filenames/IDs are rejected.
20. Path traversal is rejected.
21. Asset-count limit is enforced.
22. Total-output-byte limit is enforced.
23. Archive result is application/zip.
24. Archive code is lazy-loaded.
25. Quick Fit/Guided Fit do not eagerly load archive code.
26. No server packaging/upload endpoint exists.
27. No Website Logo Pack UI exists.
28. No favicon/ICO generation exists.
29. Existing core/UI/Laravel baselines remain green.
30. New image-set/archive tests pass.
31. Typecheck passes.
32. Production build passes.
33. HEIC remains lazy.
34. Privacy invariants remain intact.
35. FSG-005 remains OPEN.
36. FSG-005B becomes NEXT.

If any genuine criterion fails, keep FSG-005A open.

---

# 47. Sprint Report

At completion, COMPLETELY OVERWRITE:

SPRINT_REPORT.md

Required sections:

- Milestone
- Parent Milestone
- Status
- Base Commit
- Branch
- Objective
- Architecture
- Public Core API
- Image-Set Processing
- One-Decode Reuse
- Worker Protocol
- Concurrency
- Asset Validation
- Package Bounds
- Filename Safety
- Archive Architecture
- fflate Dependency
- ZIP Strategy
- Lazy-Load Evidence
- Cancellation
- Resource Cleanup
- Privacy
- Automated Tests
- Regression Baseline
- Production Build
- Bundle Observation
- HEIC Regression
- Known Limitations
- FSG-005A Acceptance Audit
- FSG-005 Parent Status
- Next Milestone
- Commit Reference

Do not claim FSG-005 itself is closed.

---

# 48. Commit Boundary

Do NOT commit automatically.

When implementation is complete:

1. overwrite SPRINT_REPORT.md;
2. run the full automated baseline;
3. return exact test counts;
4. return npm ls fflate result;
5. return build/lazy-loading evidence;
6. return working-tree status;
7. identify unresolved issues.

Await project-owner approval.

Suggested eventual commit:

feat(core): add multi-output packaging foundation

Do not begin FSG-005B.
