# FSG-005C — Logo Transparency & Verification

## Product Office Directive

Milestone:

FSG-005C — Logo Transparency & Verification

Current branch:

fsg-005c-logo-transparency

Authoritative base:

81c78a7b3ed2736d2cc6ba867d1bbc296d142801

This branch was created from the governed FSG-006 pause checkpoint.

Milestone state:

FSG-001   CLOSED
FSG-002   CLOSED
FSG-003   CLOSED
FSG-004   CLOSED
FSG-005A  CLOSED
FSG-005B  CLOSED

FSG-005   REOPENED
FSG-005C  CURRENT

FSG-006   PAUSED
FSG-007   NOT STARTED

Do not resume FSG-006.
Do not begin FSG-007.

FSG-006's existing browser infrastructure and defect fixes are part of
this branch lineage and must remain intact.

---

# 1. Why FSG-005C exists

A real user tested the Website Logo Pack and expected a transparent logo.

The generated package did not provide one.

The existing FSG-005B implementation was behaving according to its old
contract: FileSetGo preserved an uploaded background and only preserved
transparency when transparency already existed.

That contract is no longer sufficient.

The product requirement is now:

When the user asks FileSetGo for a transparent logo, FileSetGo must produce
a genuine transparent logo or clearly report that it could not do so
reliably.

A PNG file is not inherently a transparent logo.

An opaque JPEG re-encoded as PNG is not a transparent logo.

Transparent padding around an opaque rectangular background is not a
transparent logo.

FSG-005C corrects this product defect.

---

# 2. Product principle

FileSetGo exists to hide file-management complexity from non-expert website
owners.

The user should express intent:

"I want a transparent logo."

The user should NOT need to understand:

- alpha channels;
- PNG colour modes;
- JPEG transparency limitations;
- masks;
- colour-distance thresholds;
- edge matting;
- favicon dimensions.

FileSetGo owns that technical knowledge.

Do not expose implementation terminology unless required for truthful
error/help text.

---

# 3. First action — inspect before implementation

Before changing product code:

1. Read:
   - AGENTS.md
   - CLAUDE.md
   - MASTER-BLUEPRINT
   - DECISIONS.md
   - PRODUCT.md
   - ARCHITECTURE.md
   - SECURITY.md
   - TESTING.md
   - FSG-005B directive/history
   - current SPRINT_REPORT.md

2. Inspect the complete current Logo Pack implementation.

3. Inspect:
   - Logo Pack controller/state;
   - suitability model;
   - pack specification;
   - processImageSet();
   - worker protocol;
   - contain transform;
   - ICO generation;
   - ZIP adapter;
   - cancellation/stale-result handling;
   - Blob URL lifecycle;
   - existing FSG-006 browser tests.

4. Record:
   docs/directives/FSG-005C.md

The directive file must accurately reflect this Product Office directive.

Do not weaken the requirements because the current implementation was built
around the old no-background-removal contract.

---

# 4. Governance supersession

Create ADR-020:

Logo Transparency Preparation & Verification

ADR-020 must explicitly supersede only the relevant part of the historical
FSG-005B/ADR-018 contract that said FileSetGo does not perform background
removal.

Do not rewrite or delete ADR-018.

History must remain truthful.

ADR-020 must record:

- explicit background choice;
- original-background preservation mode;
- transparent-background preparation mode;
- actual pixel alpha inspection;
- local browser-only processing;
- bounded working raster;
- generated-output verification;
- transparency-aware preview;
- connected-background removal principle;
- edge decontamination principle;
- ambiguous-result handling;
- dependency approval boundary;
- final packaging gate.

---

# 5. Explicit Logo Pack background choice

The Logo Pack workflow must ask:

## How should we prepare your logo?

### Transparent background

Best for website headers, navigation, overlays, footers and flexible use on
light or dark backgrounds.

### Keep existing background

Preserves the uploaded artwork/background as supplied.

The choice must be explicit.

Do not silently infer it from:

- source format;
- PNG presence;
- JPEG presence;
- source alpha capability.

Do not preselect Transparent merely because PNG supports alpha.

Prefer no mode selected until the user chooses.

Internal product state should conceptually contain:

type LogoBackgroundMode =
    | 'transparent'
    | 'original';

Exact naming may improve.

---

# 6. Source-specific state

The background preference belongs to the currently selected source.

Replacing the source must invalidate:

- selected background mode;
- transparent preview;
- alpha inspection;
- removal strength;
- removal confidence;
- generated transparent master;
- generated Logo Pack;
- any previous result acceptance.

File A state must never authorize File B packaging.

Retain existing stale-result sequence protection.

---

# 7. Original mode

`original` means:

FileSetGo performs no background removal.

It does NOT mean:

the output is necessarily opaque.

For example, an already-transparent PNG selected under Original mode may
still remain transparent because FileSetGo is preserving the supplied
artwork.

Use truthful UI wording.

Do not call this mode:

Opaque
Solid background

The correct concept is:

Keep existing background.

---

# 8. Transparent mode — high-level pipeline

Transparent mode becomes a two-stage workflow:

SOURCE
→ preflight/decode
→ alpha inspection
→ transparency preparation if necessary
→ encoded transparent master
→ post-encode alpha verification
→ real preview
→ Create transparent logo pack
→ existing multi-output package pipeline
→ ZIP

The verified transparent master becomes the authoritative source for
transparent-mode package generation.

Do not generate seven assets directly from an opaque original and assume
the PNG encoders solved transparency.

---

# 9. Existing transparency detection

Add a generic core capability for inspecting actual decoded pixel alpha.

Do not determine transparency from:

- extension;
- MIME;
- PNG format;
- WebP format;
- encoder capability.

Inspect pixels.

The generic result should expose enough evidence to distinguish at least:

OPAQUE
TRANSPARENCY_PRESENT

Useful metrics may include:

- total sampled/inspected pixels;
- fully transparent pixel count;
- semi-transparent pixel count;
- minimum alpha;
- maximum alpha;
- transparent ratio.

Exact interface may improve.

Keep this generic.

No Logo Pack terminology in core alpha-inspection primitives.

---

# 10. Already-transparent artwork

If meaningful transparency already exists:

- preserve it;
- do not run automatic background removal unnecessarily;
- preserve fully transparent pixels;
- preserve semi-transparent pixels;
- preserve anti-aliased edges;
- preserve shadows and fades where possible;
- do not flatten onto white;
- do not turn soft alpha into a binary mask.

Transparent mode still requires post-encode verification and preview.

The workflow may truthfully indicate:

Transparency already present — preserved.

Do not imply background removal occurred when it did not.

---

# 11. Opaque artwork

If:

backgroundMode === 'transparent'

AND

actual decoded pixels are opaque,

FileSetGo must attempt deterministic browser-side background removal.

No server.

No remote API.

No source upload.

No new ML/model dependency is approved by this directive.

---

# 12. Do NOT build a naive colour deleter

The final implementation must not be:

"delete all white pixels"

or:

"delete all pixels similar to the top-left pixel"

or:

"turn all near-black pixels transparent"

or an equivalent global threshold.

That would destroy legitimate:

- white logo elements;
- black logo elements;
- interior counters;
- typography;
- details similar to background colour.

Background removal must be connectivity-aware.

---

# 13. Deterministic removal principle

The initial approved implementation direction is:

boundary-informed, connected-background removal.

Conceptually:

1. Estimate likely background evidence from image boundaries.
2. Identify pixels sufficiently consistent with that background evidence.
3. Propagate removal only through regions connected to the exterior
   background.
4. Preserve disconnected foreground regions even when their colour is
   similar to the background.
5. Produce soft edge alpha rather than only hard 0/255 clipping.
6. Protect foreground detail.

The exact algorithm belongs to engineering and may improve based on
fixture evidence.

Do not hard-code this as a simplistic four-corner equality test.

---

# 14. Edge quality and halo prevention

JPEG logos frequently contain anti-aliased edge pixels already blended
against their old background.

Simply reducing their alpha can leave:

- white halos;
- black halos;
- coloured fringes.

Where the background colour can be estimated reliably, edge preparation
must account for background-colour contamination.

Use a defensible decontamination/matting calculation for partially removed
edge pixels where appropriate.

Do not globally recolour the logo.

Tests must inspect the resulting edge behaviour against both light and dark
preview backgrounds.

---

# 15. Removal strength

For opaque sources in Transparent mode, expose a non-expert adjustment:

Background removal

- Gentle
- Balanced
- Strong

Balanced is the default AFTER the user explicitly chooses Transparent.

Do not expose:

- RGB threshold;
- alpha threshold;
- Lab distance;
- flood-fill tolerance;
- matting coefficient;
- numerical colour radius.

Those are implementation details.

Changing strength regenerates the transparent master and preview.

For an already-transparent source, do not show a meaningless removal
strength selector.

---

# 16. Confidence / ambiguity

Background removal is not always uniquely solvable from a flattened raster.

Examples include:

- logo foreground nearly identical to the background;
- gradient backgrounds;
- complex shadows;
- foreground touching the image boundary;
- photographic/texture backgrounds.

The processing result must support truthful states conceptually equivalent
to:

verified
needs-review
failed

Exact naming may improve.

`verified` must never mean:

"perfect visual quality mathematically guaranteed."

It means the technical transparency requirements passed and the algorithm
has no known strong ambiguity signal.

`needs-review` means:

a genuine transparent result exists, but the automatic removal should be
visually inspected carefully.

`failed` means:

FileSetGo could not produce a technically acceptable transparent master.

---

# 17. Common-case quality expectation

FSG-005C is NOT complete merely because difficult cases are labelled
"needs review."

The automatic remover must perform well for ordinary website-logo cases,
including at minimum:

- flat white backgrounds;
- flat black backgrounds;
- flat coloured backgrounds;
- anti-aliased marks;
- normal thin typography;
- normal curved icon edges.

If these common cases look destructive, stop.

Do not lower the tests.

---

# 18. Difficult-case quality gate

The following cases are intentional stress cases:

- gradients;
- drop shadows;
- semi-transparent elements;
- foreground colours close to background colours.

If the deterministic implementation cannot produce reliable results for
one of these cases, it is acceptable for the product to classify the case
as NEEDS REVIEW or FAILED rather than silently destroy the logo.

However:

- it must not masquerade as a clean automatic success;
- the preview must expose the result;
- packaging must obey the verification/acceptance rules;
- the limitation must be documented.

If normal real-world logo cases cannot be handled without an external
matting/segmentation library or model:

STOP.

Report to Product Office:

- failing fixtures;
- failure characteristics;
- candidate browser-local approaches;
- dependency/model sizes;
- licenses;
- runtime cost;
- memory cost;
- privacy implications.

Do not install anything without approval.

---

# 19. Bounded working raster

Do not perform unrestricted 24 MP pixel iteration for background removal.

Logo Pack output requirements are materially smaller than the global input
safety ceiling.

Build the transparency-preparation stage around a bounded worker-side
working raster derived from the maximum dimensions needed by the current
Logo Pack outputs.

The current Logo Pack's largest meaningful raster requirements are in the
approximately 800px header / 512px icon range.

Engineering may select a modest bounded working dimension that preserves
sufficient output quality.

Document:

- exact bound;
- why it is sufficient;
- worst-case RGBA memory;
- temporary-buffer count.

Do not pass giant RGBA buffers to the main UI thread.

---

# 20. Worker-first requirement

Pixel inspection and removal must occur inside the existing worker
architecture.

Main thread responsibilities remain:

- user interaction;
- state;
- preview Blob URL;
- progress display;
- cancellation command;
- download.

Do not move heavy image iteration into the controller.

---

# 21. Heavy-job policy

Transparency preparation is a heavy job.

It must obey the existing one-heavy-job-at-a-time architecture.

The user must not be able to accidentally run:

Quick Fit processing
+
transparent preparation
+
Logo Pack generation

simultaneously against the same runtime.

Reuse the existing governed runtime/job patterns where practical.

---

# 22. Cancellation

Transparent preparation must be cancellable.

Cancellation must be observed during appropriate boundaries including:

- inspection;
- removal passes;
- encoding;
- post-encode verification.

A cancelled result must never later replace current state.

After cancellation, the user must be able to retry without refreshing the
page.

---

# 23. Transparent master

Transparency preparation returns a browser-local PNG Blob plus metadata.

Conceptually:

{
    blob,
    width,
    height,
    alphaInspection,
    removalApplied,
    strength,
    status
}

Exact schema may improve.

PNG is mandatory for the transparent master.

Do not use JPEG as a transparent master.

---

# 24. Post-encode verification is mandatory

Do not verify only the pre-encode canvas.

The actual encoded transparent master Blob must be inspected after
generation.

The product must confirm that the actual generated file contains genuine
alpha transparency.

This catches situations where:

- an encoder flattened alpha;
- the wrong Blob was passed;
- a code path returned an opaque file;
- output state was mismatched.

A completed processing function is not itself proof of transparency.

---

# 25. Verification terminology

Keep two concepts distinct.

Mechanical verification:

The generated output genuinely contains alpha transparency.

Visual quality:

The logo still looks correct after background removal.

A success indicator may say:

✓ Transparent background verified

Only when actual encoded alpha verification passed.

Do not say:

Perfect transparency
Perfect cutout
Flawless edges

or equivalent guarantees.

---

# 26. Sanity checks

A transparent master must fail or require review when the output indicates
obvious destruction.

Guard against cases such as:

- zero meaningful foreground remaining;
- almost the entire artwork erased;
- background removal requested but no meaningful background change occurred;
- invalid/corrupt output;
- alpha verification fails;
- dimensions invalid.

Derive thresholds from deterministic fixture evidence.

Document them.

Do not invent thresholds only to satisfy tests.

---

# 27. Transparency preview

Transparent mode requires a preview of the ACTUAL generated transparent
master before package creation.

Provide three views:

Checkerboard
Light
Dark

All three must display the same generated Blob.

Do not create three different images.

Checkerboard must be a real UI/CSS background visible through the actual
transparent image pixels.

Do not fake transparency by baking a checkerboard into an opaque preview
image.

---

# 28. Preview workflow

Transparent mode should conceptually flow:

Choose Transparent background
→ Preparing preview
→ Preview ready
→ inspect checkerboard/light/dark
→ Create transparent logo pack

Do not add a separate mandatory "Approve preview" screen for a normal
verified result.

The user's click on:

Create transparent logo pack

after seeing the preview serves as acceptance.

If status is NEEDS REVIEW:

make that status visually clear.

The CTA may remain available only if mechanical transparency verification
passed, with wording/copy that makes the review requirement clear.

If status is FAILED:

package creation must remain blocked.

---

# 29. Progress states

Use understandable progress copy.

Examples:

Checking your logo...
Preparing transparent background...
Cleaning up the edges...
Verifying transparency...
Preview ready...
Creating your logo pack...

Do not expose worker/protocol terminology.

Progress does not need fake precision percentages if the underlying work
cannot support accurate percentages.

---

# 30. Preview lifecycle

Preview Blob URLs must be revoked on:

- regeneration;
- strength change;
- background-mode change;
- source replacement;
- reset;
- replacement by a newer result;
- pagehide.

No repeated-edit Blob URL leak.

FSG-006 already created lifecycle stress infrastructure. Extend it where
appropriate.

---

# 31. Package source

Once the user proceeds from the transparent preview:

the verified transparent master is the source for the Logo Pack package.

The packaging job may decode that master once and generate the governed
multi-output set sequentially using the existing FSG-005A/FSG-005B
foundation.

The old "one source → one decode → multiple outputs" invariant applies to
the packaging job itself.

It does NOT require keeping the initial full-resolution source decoded
while the user studies a preview.

Do not retain a giant decoded bitmap across UI think-time.

---

# 32. Transparent-mode file contract

Use a safe source basename.

Example source:

brand-logo.jpg

Transparent mode produces exactly seven public package assets:

1. brand-logo-transparent.png
2. brand-logo-transparent@2x.png
3. favicon.ico
4. favicon-32x32.png
5. apple-touch-icon.png
6. icon-192x192.png
7. icon-512x512.png

ZIP:

brand-logo-filesetgo-transparent-logo-pack.zip

Use the actual safe basename rather than literal "brand-logo".

All transparent-mode raster/icon outputs must derive from the verified
transparent master.

---

# 33. Original-mode file contract

Example source:

brand-logo.jpg

Original mode produces exactly seven public package assets:

1. brand-logo-original.png
2. brand-logo-original@2x.png
3. favicon.ico
4. favicon-32x32.png
5. apple-touch-icon.png
6. icon-192x192.png
7. icon-512x512.png

ZIP:

brand-logo-filesetgo-original-logo-pack.zip

"Original" refers to background treatment.

Existing governed resizing/contain/re-encoding still occurs where required
for package dimensions.

Do not secretly generate both modes.

A future "Give me both" option is outside FSG-005C.

---

# 34. Filename safety

Continue existing archive/path safety rules.

The basename must not permit:

- path traversal;
- slashes;
- nulls;
- unsafe archive paths.

Provide a sensible fallback such as:

logo

if no safe basename remains.

Do not change conventional favicon/icon filenames.

---

# 35. ZIP blocking rule

Transparent-mode ZIP must not finalize unless:

- transparent master exists;
- PNG is valid;
- actual encoded alpha verification passes;
- preview exists;
- user has reached the preview state;
- transparency status is package-eligible;
- all seven package assets succeed;
- ZIP contains the correct transparent primary files.

If not:

do not display:

Your logo pack is ready.

---

# 36. Do not reintroduce blind crop

All existing FSG-005B geometry rules remain authoritative unless directly
superseded here.

Still:

- no blind square crop;
- no automatic whitespace trim;
- preserve aspect ratio;
- use governed contain behavior;
- preserve existing geometry warning;
- preserve too-small source protection.

Transparency work does not grant permission to redesign the logo.

---

# 37. Existing FSG-006 P0 fix is protected

The FSG-006 protocol correction for mixed raster + ICO image-set results is
now part of the authoritative lineage.

Do not regress it.

Logo Pack completion must continue to correctly resolve:

raster assets
+
favicon.ico

through the real worker/runtime.

---

# 38. Core boundary

Core may gain generic capabilities such as:

inspectAlpha(...)
prepareTransparentRaster(...)
verifyAlphaTransparency(...)

Exact API names may improve.

Generic background-removal primitives may also live in core.

Core must not know:

- Website Logo Pack;
- navigation;
- header;
- footer;
- "Transparent background" marketing copy;
- FileSetGo product workflow.

The product layer composes generic processing into the Logo Pack intent.

---

# 39. Security/privacy boundary

Do not introduce:

- server image uploads;
- Laravel image-processing endpoints;
- temporary server files;
- remote background-removal services;
- CDN model calls;
- telemetry containing image pixels.

User image bytes remain local.

HEIC WASM and other already-governed local application assets remain the
only permitted processing-resource pattern.

Update SECURITY.md to record FSG-005C.

---

# 40. Dependency boundary

No new background-removal, segmentation, matting, ONNX, WASM or ML package
is approved by this directive.

If a new dependency becomes necessary:

STOP.

Report:

- name;
- exact version;
- license;
- maintainer/provenance;
- package/model size;
- runtime strategy;
- lazy-loading strategy;
- browser support;
- memory implications;
- why the internal deterministic approach is insufficient.

Await Product Office approval.

---

# 41. Required fixture matrix

Create small, deterministic, locally generated fixtures covering at least:

1. White-background JPEG logo.
2. Black-background JPEG logo.
3. Flat coloured-background logo.
4. Already-transparent PNG.
5. Logo containing white interior elements.
6. Logo containing black interior elements.
7. Thin typography.
8. Fine icon strokes.
9. Curved/anti-aliased edges.
10. Gradient background.
11. Drop shadow.
12. Semi-transparent elements.
13. Foreground similar in colour to background.
14. High-resolution source.
15. Small/low-resolution source.

Prefer synthetic fixtures with known expected pixel structure.

Do not introduce copyrighted third-party brand logos merely for tests.

Document fixture provenance.

---

# 42. Alpha tests

Automated core tests must cover at minimum:

- opaque JPEG → opaque inspection;
- opaque PNG → opaque inspection;
- genuine transparent PNG → transparency detected;
- semi-transparent PNG → transparency detected;
- alpha-capable format is not assumed transparent;
- existing alpha values preserved where removal is bypassed;
- encoded transparent master re-inspected successfully;
- encoded opaque output fails transparent verification.

Test actual pixels.

---

# 43. Removal tests

Tests must prove actual pixel behavior, not merely return status.

At minimum:

- exterior white background becomes transparent;
- exterior black background becomes transparent;
- exterior coloured background becomes transparent;
- disconnected white foreground survives;
- disconnected black foreground survives;
- thin strokes survive;
- curved edge survives;
- anti-aliased edge has useful soft alpha;
- background-contaminated edge is not left with an obvious crude halo;
- already-transparent source bypasses removal;
- existing semi-transparent alpha is preserved;
- destructive result is not silently accepted.

Use deterministic tolerances.

Do not use screenshots as the only proof.

---

# 44. Difficult-case tests

Explicitly test:

- gradient background;
- drop shadow;
- foreground/background colour similarity.

A valid test outcome may be:

VERIFIED

or:

NEEDS REVIEW

or:

FAILED

depending on what the algorithm can legitimately establish.

What is NOT acceptable:

destructive output labelled as a clean verified automatic success.

Do not weaken fixtures to make the algorithm look better.

---

# 45. Product/UI tests

Add/update tests proving:

- background choice is explicit;
- neither intent is silently inferred;
- Transparent choice enters transparency-preparation flow;
- Original choice bypasses removal;
- already-transparent source does not undergo unnecessary removal;
- removal strength appears only when relevant;
- changing strength invalidates/replaces old preview;
- checkerboard/light/dark use the same Blob;
- failed mechanical verification blocks package;
- source replacement clears transparency state;
- reset clears transparency state;
- stale result cannot replace a newer preview;
- transparent naming is exact;
- original naming is exact;
- mode-specific ZIP naming is exact.

---

# 46. Packaging regression tests

Transparent mode:

- exactly seven public assets;
- correct transparent primary filename;
- correct @2x transparent filename;
- favicon.ico exactly once;
- icons derived from transparent master;
- actual transparent primary PNG inside package contains alpha;
- no `*-original.png` primary file leaks into transparent ZIP.

Original mode:

- exactly seven public assets;
- correct original primary filename;
- correct @2x filename;
- favicon.ico exactly once;
- no falsely labelled `*-transparent.png` primary file.

Round-trip ZIP contents using the existing test-side archive tooling.

---

# 47. Browser tests during FSG-005C

Use the existing Playwright infrastructure.

Do NOT run the full remote FSG-006 certification matrix yet.

FSG-006 owns final cross-engine recertification after FSG-005C closes.

Locally exercise the supported browser projects available in this coding
environment.

At minimum browser-test:

- white-background JPEG → Transparent;
- transparent preview appears;
- checkerboard/light/dark view switching;
- actual verification status;
- Create transparent logo pack succeeds;
- correct transparent ZIP filename;
- already-transparent PNG path;
- Keep existing background path;
- failed/ambiguous preparation behavior;
- source replacement;
- cancellation/retry;
- reset;
- narrow mobile viewport for the new selection/preview UI.

Do not claim Safari certification.

---

# 48. Supersede the old JPEG browser assertion

The old FSG-006 browser test asserting that JPEG Logo Pack tells the user
FileSetGo will not remove the existing background represents the
pre-FSG-005C product contract.

On this branch, update that test.

JPEG should now be able to enter:

Transparent background

or:

Keep existing background

according to the user's explicit choice.

Do not delete historical FSG-006 report evidence on its paused branch.

The product branch is now intentionally superseding that behavior.

---

# 49. Accessibility

The new workflow must support:

- keyboard selection of background mode;
- visible focus;
- correct labels;
- accessible grouping of the two choices;
- status changes through the existing live region;
- accessible checkerboard/light/dark controls;
- at least the existing approximately 44px touch-target convention;
- no focus stranded in removed preview state;
- no hidden control remaining tabbable;
- clear failure/review messaging.

Do not rely on colour alone for:

verified
needs-review
failed.

---

# 50. Mobile

The transparency workflow must work at the existing 320px governed floor.

At 320px:

- choices remain readable;
- controls do not horizontally overflow;
- preview fits the viewport;
- checkerboard/light/dark controls remain usable;
- strength selection remains usable;
- primary CTA is reachable;
- status messaging remains readable.

Do not create a desktop-only image editor layout.

---

# 51. Design skill governance

This is a significant UI workflow change.

Use the governed routing:

ui-ux-pro-max
→ workflow, hierarchy, accessibility

design-taste-frontend
→ visual clarity and preview composition

appropriate 21st.dev skill
→ only where a component pattern materially helps

impeccable
→ final UI quality review

Do not activate every design tool mechanically.

Reuse the current FileSetGo visual system.

Do not redesign the entire public page.

---

# 52. Product copy

Avoid teaching the user about alpha channels unless in optional explanatory
help.

Prefer:

Transparent background verified

Needs a quick review

We couldn't remove this background cleanly

Try Gentle / Balanced / Strong

Keep existing background

Upload a transparent version instead

Avoid:

Alpha threshold failed

Matting confidence below 0.63

Flood-fill tolerance exceeded

---

# 53. Failure recovery

If FileSetGo cannot reliably prepare a transparent version, provide useful
next actions:

- Try another removal strength.
- Keep the existing background.
- Upload a transparent version of the logo.

Do not dead-end the workflow.

Do not package an opaque result under a transparent filename.

---

# 54. PRODUCT.md

Update the canonical product specification.

The Website Logo Pack promise must now include:

- explicit transparent/original background choice;
- automatic preservation of existing transparency;
- browser-local background removal when requested;
- transparency-aware preview;
- genuine alpha verification;
- truthful handling of ambiguous/failed removal;
- correct mode-specific package naming.

Remove/supersede copy that says Logo Pack never removes an existing
background.

---

# 55. Architecture documentation

ARCHITECTURE.md must record:

- transparency-preparation stage;
- bounded working raster;
- worker placement;
- two-job preview/package lifecycle;
- verified transparent master;
- one-heavy-job policy;
- no full-resolution bitmap retention across user think-time.

Do not create a second independent processing architecture.

---

# 56. Testing documentation

TESTING.md must record:

- alpha inspection;
- post-encode verification;
- background-removal fixture matrix;
- difficult-case quality gate;
- UI/packaging/browser coverage;
- eventual FSG-006 recertification requirement.

---

# 57. Security documentation

SECURITY.md must reconfirm:

- source remains local;
- transparent master remains local;
- no background-removal server/API;
- no user-image persistence;
- bounded worker memory;
- archive safety unchanged.

---

# 58. FSG-006 remains paused

Do not mark FSG-006 closed from this branch.

Do not modify its historical certification result into FSG-005C evidence.

After FSG-005C closes, Product Office will issue a separate:

FSG-006 Resume & Delta Recertification Directive

That later pass will cover the affected Logo Pack paths plus the unresolved
CI reproducibility issue.

---

# 59. FSG-005C quality gate

Do not consider the implementation complete merely because all unit tests
are green.

Before recommending closure, evaluate the complete 15-case fixture matrix.

Record each fixture as:

PASS
NEEDS REVIEW
FAIL

with the reason.

Common flat-background logo cases must achieve normal website-ready visual
quality.

If the algorithm visibly damages common logos:

STOP.

Do not continue to closeout.

---

# 60. Automated baseline before review

At minimum run:

npm ci
npm ls @playwright/test
npm run test:core
npm run test:ui
php artisan test --compact
npm run typecheck
npm run typecheck:browser
npm run build
vendor/bin/pint --test
git diff --check

Run the relevant local Playwright FSG-005C coverage as well.

Do not require the project owner to perform manual browser QA.

---

# 61. SPRINT_REPORT.md

Overwrite the canonical root:

SPRINT_REPORT.md

Do not create:

SPRINT_REPORT_FSG005C.md
FSG005C_REPORT.md
reports/fsg-005c.md

Git history remains the report archive.

The report must include:

- base commit;
- branch;
- implementation status;
- transparent-mode architecture;
- original-mode behavior;
- working raster bound;
- memory estimate;
- actual alpha-inspection contract;
- removal algorithm;
- edge decontamination method;
- strength mapping;
- verification logic;
- ambiguity logic;
- preview architecture;
- Blob lifecycle;
- cancellation;
- filename contracts;
- ZIP contracts;
- fixture matrix with PASS/NEEDS REVIEW/FAIL;
- core test totals;
- UI test totals;
- Laravel totals;
- browser results;
- typecheck/build/Pint results;
- bundle delta;
- dependencies;
- privacy/security audit;
- known limitations;
- Product Office closure recommendation.

---

# 62. Report before commit

When implementation reaches the FSG-005C quality gate:

STOP.

Do not stage.
Do not commit.
Do not push.

Return the completed SPRINT_REPORT.md findings to Product Office.

Product Office will review:

- removal quality;
- ambiguity handling;
- test evidence;
- UX;
- naming;
- packaging;
- regression state.

Only after explicit Product Office approval may FSG-005C be committed and
pushed.

---

# 63. FSG-005C acceptance criteria

FSG-005C may be recommended for closure only if ALL applicable requirements
below are met:

- background choice is explicit;
- Transparent and Original intents are distinct;
- existing transparency is detected from actual pixels;
- existing transparency is preserved;
- opaque-source background removal exists;
- common flat-background cases produce website-ready quality;
- thin typography and ordinary edges survive;
- edge alpha is not crudely binary where softness is needed;
- obvious halo behavior is addressed;
- actual generated transparent master is PNG;
- actual encoded output is re-inspected;
- genuine alpha is verified;
- opaque result cannot masquerade as transparent;
- destructive output cannot silently succeed;
- ambiguous result is surfaced truthfully;
- preview uses the actual generated Blob;
- checkerboard/light/dark views work;
- Create transparent logo pack is available only for package-eligible
  transparency state;
- transparent package derives from verified master;
- transparent filename contract is exact;
- original filename contract is exact;
- ZIP contract is exact;
- favicon.ico remains correct;
- no blind crop exists;
- no trim was introduced;
- aspect ratio preserved;
- cancellation works;
- stale-result protection works;
- source replacement clears transparency state;
- reset works;
- Blob lifecycle remains bounded;
- processing stays worker-side;
- processing stays browser-local;
- memory is bounded;
- no unapproved dependency exists;
- required deterministic fixture matrix is complete;
- common quality cases pass;
- difficult cases do not falsely report clean success;
- automated tests remain green;
- relevant browser tests pass;
- Quick Fit regressions remain green;
- Guided Fit regressions remain green;
- existing FSG-006 P0 protocol fix remains green;
- FSG-006 remains PAUSED;
- FSG-007 remains NOT STARTED.

If any mandatory common-case quality criterion fails:

do not recommend closure.

---

# 64. Stop conditions

Stop and return to Product Office immediately if:

1. A new image-processing dependency/model appears necessary.
2. Common flat-background logos cannot be cleaned without obvious damage.
3. White/black legitimate logo elements cannot be protected reliably.
4. Normal thin typography is materially destroyed.
5. Halo correction requires a substantially different architecture.
6. Memory cannot remain safely bounded.
7. A required change would upload images.
8. A governance conflict is discovered.
9. Current FSG-006 fixes would need to be discarded.
10. The difficult-case quality gate exposes a limitation that should be a
    Product Office decision.

Do not route around a stop condition.

---

# 65. Begin

Proceed with FSG-005C discovery and implementation now.

Do not stage, commit or push the FSG-005C implementation until Product
Office has reviewed the completed quality-gate report.

Do not resume FSG-006.

Do not begin FSG-007.
