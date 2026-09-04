# FSG-005B — Website Logo Pack & Favicon Suite

## Authority

Implement only FSG-005B.

Parent milestone:

FSG-005 — Packaging & Export Systems

Current state:

FSG-001  ✅ CLOSED
FSG-002  ✅ CLOSED
FSG-003  ✅ CLOSED
FSG-004  ✅ CLOSED
FSG-005A ✅ CLOSED
FSG-005  🟡 OPEN

Authoritative FSG-005A closeout commit:

cf78599c8b6ae4a6b26dba0c8df935143bfccf7b

FSG-005B is expected to close parent FSG-005 only if its full acceptance
audit passes.

Do not begin FSG-006.

Governance precedence remains:

1. docs/governance/MASTER-BLUEPRINT.md
2. docs/governance/DECISIONS.md
3. docs/governance/ROADMAP.md
4. This directive
5. Architecture / security / testing documentation
6. Code

---

# 1. Milestone Objective

Build the first complete Website Logo Pack workflow.

User journey:

Choose logo
→ FileSetGo inspects it
→ suitability guidance
→ generate website logo + favicon assets
→ review generated files
→ download individual assets or one ZIP
→ start again

All processing remains local in the browser.

No account is required.

No source image is uploaded.

---

# 2. Product Proposition

Public positioning:

Website Logo Pack

One logo in.
Website-ready logo and favicon files out.

Supporting idea:

"Prepare the logo files your website actually needs without figuring out
formats, favicon sizes or export settings yourself."

Do not describe this as a logo designer.

FileSetGo prepares existing artwork.

It does not redesign branding.

---

# 3. Scope

FSG-005B includes:

- public Website Logo Pack workflow;
- shared source-file handling with the existing workspace;
- logo suitability assessment;
- deterministic geometry warnings;
- generic fixed-canvas contain rendering where required;
- header-logo outputs;
- square PNG icon outputs;
- favicon.ico generation;
- individual asset downloads;
- ZIP package download;
- local-only processing;
- progress/cancellation;
- stale-result protection;
- responsive UX;
- accessibility;
- tests;
- governance;
- FSG-005 parent acceptance audit.

Do NOT implement:

- automatic background removal;
- AI logo detection;
- OCR;
- logo redesign;
- whitespace trimming;
- intelligent subject extraction;
- blind square crop;
- SVG input/output;
- AVIF;
- social-media brand packs;
- email-signature packs;
- WordPress-specific integration;
- Keryon integration;
- accounts;
- billing;
- analytics;
- ads;
- cloud storage.

---

# 4. Branch

Start from the clean FSG-005A checkpoint.

Run:

git status
git rev-parse HEAD

Expected HEAD:

cf78599c8b6ae4a6b26dba0c8df935143bfccf7b

Create:

fsg-005b-website-logo-pack

Do not implement on the FSG-005A branch.

---

# 5. Directive File

Create:

docs/directives/FSG-005B.md

Record this directive faithfully.

---

# 6. Product/Core Boundary

Logo-pack knowledge belongs to the FileSetGo product layer.

Product layer may know:

- Website Logo Pack;
- asset names;
- favicon;
- header logo;
- suitability guidance;
- pack composition.

`@filesetgo/core` may know only generic technical concepts needed to
execute the workflow, such as:

- fixed canvas;
- contain fit;
- transparent background;
- ICO file format;
- raster asset generation;
- multi-output jobs.

Do NOT add:

websiteLogoPack
faviconPreset
appleTouchIcon

as low-level core concepts.

---

# 7. Public Workspace Integration

Add Website Logo Pack as a third first-class product mode alongside:

Quick Fit
Guided Fit
Logo Pack

Recommended labels:

Quick Fit
"Enter the requirement yourself."

Guided Fit
"Choose what you're preparing."

Logo Pack
"Prepare your website logo files."

Do not bury Logo Pack inside a marketing section.

It belongs in the main product workspace.

---

# 8. Shared Selected File

Reuse the currently selected source file across:

Quick Fit
Guided Fit
Logo Pack

Switching modes must not unnecessarily re-preflight the source.

Do not create independent duplicate source Blobs merely because the user
changes modes.

If necessary, perform a narrow product-layer state refactor to make the
shared-source boundary explicit.

Do NOT move destination/product state into @filesetgo/core.

---

# 9. Processing Coordination

While any heavy processing job is active:

- prevent conflicting mode switches;
- prevent another run button from starting silently;
- Cancel remains available.

The runtime's existing one-heavy-job invariant remains authoritative
across:

processImage()
processImageToTarget()
processImageSet()

Do not invent a second concurrency system.

---

# 10. Accepted Inputs

Logo Pack accepts the existing V1 raster inputs:

- JPEG
- PNG
- WebP
- HEIC/HEIF

Preflight remains authoritative.

Animated inputs remain unsupported.

SVG remains outside V1.

---

# 11. Transparency Truthfulness

FileSetGo does NOT remove image backgrounds in FSG-005B.

If the source is JPEG, show concise guidance such as:

"JPEG doesn't support transparency. FileSetGo won't remove the existing
background automatically."

For PNG/WebP, do not claim the source definitely contains transparency
merely because the format can support it.

Safe wording:

"If your source already contains transparency, PNG outputs can preserve
it."

Do not add a meaningful-alpha scanner merely for this sprint.

---

# 12. No Automatic Trim

Do not automatically trim transparent or white margins.

Do not infer logo bounds through pixel scanning.

Do not modify composition.

Add concise guidance where appropriate:

"For the best icon result, use a tightly cropped logo or icon file."

The source's existing whitespace remains part of the artwork.

---

# 13. Authoritative Logo Pack Contents

The ZIP package must contain exactly these seven public assets, in this
order:

1. logo-header.png
2. logo-header@2x.png
3. favicon.ico
4. favicon-32x32.png
5. apple-touch-icon.png
6. icon-192x192.png
7. icon-512x512.png

Do not add undocumented extra files.

Do not add:

- README
- site.webmanifest
- browserconfig.xml
- HTML snippets

in this sprint.

A web manifest is deliberately deferred because complete manifest metadata
depends on the website/application context.

---

# 14. Package Filename

Generate a safe deterministic ZIP filename based on the source basename.

Conceptually:

acme-logo-filesetgo-logo-pack.zip

Requirements:

- safe basename;
- `.zip`;
- no filesystem path;
- no traversal;
- no source path disclosure.

Reuse existing filename helpers where appropriate.

---

# 15. Header Logo — Standard

`logo-header.png`

Format:

PNG

Purpose:

General website header/navigation use.

Governed bounding box:

400 × 120 px maximum

Rules:

- preserve aspect ratio;
- no crop;
- no stretching;
- transparent canvas/background where the source supports it;
- no default upscale.

The result does NOT have to be exactly 400 × 120.

It must fit inside that bounding box.

---

# 16. Header Logo — High Density

`logo-header@2x.png`

Format:

PNG

Governed bounding box:

800 × 240 px maximum

Rules:

- preserve aspect ratio;
- no crop;
- no stretching;
- no default upscale beyond available source resolution.

This is the high-density header asset.

If source resolution prevents the file from reaching an ideal 2× size,
do not manufacture extreme raster detail.

Generate the best valid output within source resolution and surface a
plain-language source-resolution warning.

Do not claim the file is literally 2× the standard asset when source
resolution makes that impossible.

---

# 17. Fixed Square Canvas Primitive

FSG-005B requires a new generic rendering primitive for icon assets.

Implement this generically in core.

Conceptually:

render:
{
    mode: 'contain',
    canvasWidth: number,
    canvasHeight: number,
    contentScale: number,
    background: 'transparent',
    allowUpscale: boolean
}

Exact contracts may improve.

This is NOT a logo-specific primitive.

It must be reusable by future workflows requiring:

source
→ contain
→ fixed canvas

Do not implement crop/fill/cover in this sprint.

Only deterministic CONTAIN is required.

---

# 18. Square Icon Safe Area

For generated square icon assets:

ICON_CONTENT_SCALE = 0.90

Meaning:

the contained source artwork may occupy at most 90% of the square canvas
in either dimension.

This leaves approximately 5% transparent safe space on each side when the
artwork fills an axis.

Rules:

- center artwork;
- preserve aspect ratio;
- never crop;
- never stretch;
- transparent background;
- no auto trim.

Record this value in governance.

---

# 19. favicon-32x32.png

Generate:

favicon-32x32.png

Canvas:

32 × 32 px

Format:

PNG

Rendering:

contain
90% content scale
transparent background

Must be exactly 32 × 32 after encoding.

---

# 20. apple-touch-icon.png

Generate:

apple-touch-icon.png

Canvas:

180 × 180 px

Format:

PNG

Rendering:

contain
90% content scale
transparent background

Must be exactly 180 × 180.

Do not invent a background color.

Do not add rounded corners.

Do not bake iOS styling into the bitmap.

---

# 21. icon-192x192.png

Generate:

icon-192x192.png

Canvas:

192 × 192 px

Format:

PNG

Rendering:

contain
90% content scale
transparent background

Must be exactly 192 × 192.

---

# 22. icon-512x512.png

Generate:

icon-512x512.png

Canvas:

512 × 512 px

Format:

PNG

Rendering:

contain
90% content scale
transparent background

Must be exactly 512 × 512.

This is the largest governed icon output and therefore drives source
resolution suitability checks.

---

# 23. Controlled Icon Upscaling

Unlike normal Quick Fit processing, fixed-size icon generation may require
upscaling.

This is an explicitly authorized workflow exception.

Do not make `allowUpscale: true` the new general default.

For Logo Pack square icon assets only:

allow controlled upscaling.

Introduce:

MAX_ICON_UPSCALE_FACTOR = 4

If the 512 × 512 icon's required contained artwork would require more than
4× enlargement on either source axis:

do not proceed silently.

Return/source a structured product-level suitability failure equivalent to:

SOURCE_TOO_SMALL_FOR_LOGO_PACK

Plain-language message:

"This logo is too small to create a useful 512 px website icon. Try a
larger source file."

Do not let a 32px source become a badly blurred 512px icon.

---

# 24. Source Resolution Assessment

Implement a deterministic product-level suitability evaluator.

Using:

- preflight width;
- preflight height;
- 512 × 512 canvas;
- ICON_CONTENT_SCALE;
- source aspect ratio;

calculate the required draw dimensions for the largest icon.

Determine required upscale factor.

Outcomes:

GOOD
UPSCALE_WARNING
TOO_SMALL

Suggested:

factor <= 1
→ GOOD

factor > 1 and <= 4
→ UPSCALE_WARNING

factor > 4
→ TOO_SMALL

Do not use AI or visual-quality estimation.

---

# 25. Geometry Assessment

Implement deterministic logo geometry guidance.

Calculate:

aspectRatio = longerEdge / shorterEdge

If:

aspectRatio > 2.5

show a warning.

Suggested wording:

"This logo is very wide or tall. It may appear small inside square favicon
and app-icon files. A compact or square icon mark usually works better."

This is a warning, not an automatic failure.

Do not crop the logo to solve it.

Do not infer or extract an icon mark.

---

# 26. Suitability Review Before Processing

Logo Pack must show an inspection/review state before generation.

Present:

- source format;
- source dimensions;
- source size;
- geometry status;
- source-resolution status;
- background/transparency guidance where applicable.

Then explicitly:

Create logo pack

Do not automatically generate immediately after file selection.

---

# 27. Suitability Severity

Distinguish:

INFO
WARNING
BLOCKING

Examples:

JPEG transparency limitation:
INFO/WARNING

extreme aspect ratio:
WARNING

moderate icon upscale:
WARNING

>4× required upscale:
BLOCKING

Processing action must remain disabled only for genuinely blocking
conditions.

Warnings should not prevent the user from continuing.

---

# 28. ICO Support

Add generic ICO container support sufficient for favicon.ico generation.

Do not install a new dependency unless implementation evidence proves it
necessary.

Preferred implementation:

small FileSetGo-owned ICO writer.

favicon.ico must contain PNG-compressed icon entries for:

16 × 16
32 × 32
48 × 48

All three derive from the original decoded source through the same:

contain
90% scale
transparent canvas

rule.

Do not generate favicon.ico by blindly renaming PNG bytes.

---

# 29. ICO Architectural Boundary

ICO is a file-format capability, not a "favicon engine."

Core may implement generic technical concepts such as:

createIco(...)
IcoEntry
ICO container validation

Core must not name the implementation:

createWebsiteFavicon

or otherwise embed product terminology.

The Logo Pack product layer decides that the ICO output is called:

favicon.ico

---

# 30. ICO Structure

Implement a valid ICO container:

ICONDIR
→ 3 ICONDIRENTRY records
→ PNG payload for 16×16
→ PNG payload for 32×32
→ PNG payload for 48×48

Requirements:

- reserved = 0;
- type = 1;
- count = 3;
- offsets valid;
- lengths valid;
- directory dimensions match embedded PNG dimensions;
- PNG signatures valid;
- deterministic entry order: 16, 32, 48.

Use little-endian ICO fields as required by the format.

Do not add BMP/DIB encoding merely for legacy completeness.

---

# 31. ICO Validation

Create independent structural ICO validation.

Do not consider:

Blob.type === image/x-icon

sufficient.

Validate:

- header;
- type;
- count;
- directory bounds;
- entry offsets;
- entry lengths;
- expected dimensions;
- PNG signatures;
- PNG dimensions.

Logo Pack's favicon.ico must fail the whole package if ICO validation
fails.

---

# 32. ICO MIME

Use:

image/x-icon

for favicon.ico.

If an existing governed MIME vocabulary requires another established ICO
MIME alias internally, document it, but public download should use an
appropriate icon MIME.

Do not use application/octet-stream by default.

---

# 33. Multi-Output Extension

Extend the FSG-005A generic image-set architecture rather than create a
Logo Pack-specific worker.

The image-set specification may need to become a typed union supporting:

- raster output;
- ICO output.

For example conceptually:

ImageSetOutputSpec =
    RasterImageSetOutputSpec
  | IcoImageSetOutputSpec

Improve naming as required.

Do not change `processImage()` or `processImageToTarget()` merely to add
ICO.

---

# 34. One Decode Still Required

The complete Logo Pack must retain the FSG-005A invariant:

one source
→ one preflight
→ one decode

All:

header assets
square PNG assets
ICO PNG entries

must reuse the same decoded source.

Do not decode once for Logo Pack PNGs and again for ICO.

---

# 35. Sequential Rendering

Retain sequential generation.

Do not create seven canvases simultaneously.

Conceptually:

decode once
→ header
→ header@2x
→ favicon ICO render entries
→ favicon PNG
→ touch icon
→ 192
→ 512
→ ZIP

Only one active render canvas should exist at a time where practical.

---

# 36. Package Contents and Order

The final image-set/package result must expose the seven public assets in
the exact governed order.

ZIP ordering must match.

Do not expose internal temporary 16×16 or 48×48 favicon PNGs as separate
public ZIP entries.

Those may exist transiently only while creating the ICO.

---

# 37. Package Bounds

The existing FSG-005A limits remain authoritative:

MAX_PACKAGE_ASSETS = 16
MAX_PACKAGE_TOTAL_OUTPUT_BYTES = 50 MiB

The Logo Pack uses only seven public assets and must remain within these
bounds.

Do not create Logo Pack-specific larger limits.

---

# 38. Progress

User-facing processing copy may include:

Preparing logo...
Creating website icons...
Building favicon...
Packaging files...

Do not expose:

ICO directory offset 42
render pass 6
ZIP STORE entry 4

The underlying progress event may contain asset index/count.

Do not fake percentage precision.

---

# 39. Cancellation

Logo Pack generation must remain cancellable.

Check/carry existing cancellation through:

- preflight;
- decode;
- each asset;
- each ICO embedded size;
- ICO assembly;
- ZIP creation;
- final publication.

A cancelled pack must never surface later as complete.

Stale results must remain impossible after:

- source replacement;
- reset;
- another processing job.

---

# 40. Result UX

On success show:

Your logo pack is ready.

Primary CTA:

Download logo pack

Also show individual files.

For each public asset show at least:

- filename;
- format;
- dimensions or ICO size set;
- file size;
- individual Download action.

Do not require the user to unzip merely to understand what was generated.

---

# 41. Individual Downloads

Generate local Blob URLs for each asset.

No server round-trip.

Use the exact governed filenames.

Object URLs must be revoked on:

- source replacement;
- new result;
- reset;
- pagehide/unload.

Do not leak seven new Blob URLs on every rerun.

---

# 42. ZIP Download

Primary package CTA downloads:

<safe-source-basename>-filesetgo-logo-pack.zip

using the local archive Blob returned from `processImageSet()`.

No server involvement.

Do not reconstruct the ZIP again in the UI.

---

# 43. Result Explanation

Add concise explanation for each file, e.g.:

logo-header.png
Standard website header logo

logo-header@2x.png
Higher-resolution header logo

favicon.ico
Browser favicon containing 16, 32 and 48 px sizes

favicon-32x32.png
Standalone PNG favicon

apple-touch-icon.png
180 px touch icon

icon-192x192.png
192 px website/app icon

icon-512x512.png
512 px website/app icon

Keep explanations short.

---

# 44. No Manifest Yet

Do NOT generate:

site.webmanifest
manifest.webmanifest

in FSG-005B.

Reason:

a complete manifest may require site/application-specific metadata outside
the information FileSetGo currently has.

The 192 and 512 icon assets may still be useful for users who already have
or later create a manifest.

Document this decision.

---

# 45. No Installation Snippet Yet

Do not generate HTML snippets or README files in the ZIP.

FSG-007 or a later documentation/product-polish milestone may teach users
where to place the assets.

FSG-005B's purpose is correct asset production/export.

---

# 46. Public Copy — Truthfulness

Do not say:

"Works on every website."
"Guaranteed perfect favicon."
"Automatically fixes your logo."
"Removes backgrounds."
"Optimizes your branding."

Prefer:

"Creates practical website logo and icon files from your existing logo."

---

# 47. Header Resolution Warning

After planning the two header outputs, detect whether source resolution
prevented the high-density output from reaching the intended higher-density
relationship.

If materially constrained, show:

"Your source logo is smaller than ideal for a high-resolution header
asset."

This warning does not necessarily block the pack.

Do not upscale header assets simply to make the warning disappear.

---

# 48. Source Replacement

Selecting another source must:

- cancel active Logo Pack processing;
- clear generated pack result;
- revoke all asset URLs;
- revoke ZIP URL;
- clear suitability state;
- preflight the new source;
- evaluate suitability for the new source only.

No File A pack may appear for File B.

---

# 49. Reset

Start again must:

- cancel active work;
- revoke all URLs;
- clear selected source;
- clear suitability result;
- clear package result;
- return the workspace to its initial state.

No page reload required.

---

# 50. Mode Switching

Quick Fit / Guided Fit / Logo Pack should behave predictably.

With no active job:

mode switching retains the selected source.

With an active job:

disable mode switching or require cancellation.

Do not silently cancel simply because the user accidentally clicked
another tab unless that behavior is explicitly and clearly represented.

Preferred:
disable while processing.

---

# 51. Accessibility — Mode

If the workspace uses tabs:

Quick Fit
Guided Fit
Logo Pack

extend the existing accessible tablist correctly.

Update:

- aria-selected;
- aria-controls;
- roving tabindex;
- ArrowLeft/ArrowRight behavior;
- keyboard order.

Do not create a third clickable div outside the existing tab semantics.

---

# 52. Accessibility — Pack Review

Suitability warnings must:

- contain text;
- not rely on color alone;
- be associated with the Logo Pack panel;
- announce blocking issues appropriately.

Do not overuse role=alert for non-blocking guidance.

Use polite announcements where appropriate.

---

# 53. Accessibility — Downloads

Every individual download must have a meaningful accessible name.

Good:

Download favicon.ico

Avoid seven generic links all named:

Download

unless contextual accessible labels distinguish them.

---

# 54. Responsive UX

On mobile:

- mode controls remain usable;
- suitability review stacks;
- asset list stacks;
- filenames wrap safely;
- download actions remain reachable;
- no horizontal scrolling.

Do not display seven tiny cards in a forced multi-column grid.

Desktop may use a denser asset result layout.

---

# 55. Core Generic Contain Tests

Add tests for the new fixed-canvas contain primitive.

At minimum:

- landscape source centered;
- portrait source centered;
- square source centered;
- 90% content scale;
- exact canvas dimensions;
- aspect ratio preserved;
- no crop;
- no distortion;
- transparent clear performed;
- allowUpscale false respected;
- allowUpscale true respected;
- controlled requested dimensions deterministic.

Test geometry numerically.

Do not depend only on screenshots.

---

# 56. ICO Writer Tests

At minimum:

- exactly 3 entries;
- entry order 16/32/48;
- reserved = 0;
- type = 1;
- offsets valid;
- lengths valid;
- each embedded payload begins with PNG signature;
- embedded PNG dimensions correct;
- output deterministic for identical inputs;
- malformed entry rejected;
- duplicate size rejected if contract forbids it;
- unsupported/zero size rejected.

Use an independent test parser/helper rather than validating only through
the writer itself.

---

# 57. ICO Validation Tests

Test corruption cases:

- bad reserved field;
- wrong type;
- zero count;
- truncated directory;
- out-of-bounds payload;
- invalid PNG signature;
- PNG dimension mismatch;
- duplicate/missing required Logo Pack sizes.

Generic ICO validator may accept other valid sets if intentionally
designed, but Logo Pack validation must require its governed 16/32/48 set.

---

# 58. Logo Pack Specification Tests

Product-layer tests must assert EXACT public pack definition:

1 logo-header.png
2 logo-header@2x.png
3 favicon.ico
4 favicon-32x32.png
5 apple-touch-icon.png
6 icon-192x192.png
7 icon-512x512.png

Test:

- order;
- unique IDs;
- unique filenames;
- correct formats;
- header bounds;
- square dimensions;
- content scale;
- archive filename generation.

Do not duplicate these values across unrelated test fixtures.

---

# 59. Suitability Tests

At minimum:

- square high-resolution source → GOOD;
- landscape adequate source → GOOD or geometry warning as appropriate;
- ratio exactly 2.5 → no extreme-ratio warning;
- ratio >2.5 → warning;
- required icon upscale exactly 1× → GOOD;
- >1× and <=4× → warning;
- exactly 4× → allowed warning;
- >4× → blocking;
- JPEG → transparency/background guidance;
- PNG/WebP do not falsely claim actual transparency.

---

# 60. Header Tests

Test:

- standard fits 400×120;
- high-density fits 800×240;
- aspect ratio preserved;
- no upscale;
- small source stays within source resolution;
- resolution warning generated where appropriate;
- no crop/stretch.

---

# 61. Logo Pack Worker Tests

Test:

- single source decode for full pack;
- seven public assets returned;
- correct order;
- fixed dimensions correct;
- ICO sizes correct;
- each raster output validated;
- ICO validated;
- archive includes seven public files only;
- internal 16/48 PNG intermediates not exposed;
- cancellation during pack;
- cancellation during ICO generation;
- cancellation before ZIP;
- one asset failure fails pack;
- ICO failure fails pack;
- stale completion suppressed.

---

# 62. Archive Round-Trip

Use the existing real unzip test capability.

For the real Logo Pack ZIP assert:

- exactly 7 entries;
- exact filenames;
- exact order where inspection permits;
- exact raster bytes;
- exact favicon.ico bytes;
- no hidden internal assets;
- no manifest;
- no README.

---

# 63. Product Workflow Tests

Extend UI tests to cover:

- Logo Pack mode exists;
- shared source survives switching among all 3 modes;
- mode switch does not re-preflight;
- suitability shown before processing;
- warnings don't block;
- blocking source size disables generation;
- Create logo pack calls processImageSet();
- processing cancellation;
- success result metadata;
- seven individual assets;
- ZIP result;
- source replacement cleanup;
- reset cleanup;
- stale-result suppression;
- URL cleanup.

Keep orchestration DOM-free where practical.

Do not add jsdom simply for this sprint.

---

# 64. Laravel Tests

Extend feature tests to confirm:

- GET / still returns 200;
- Logo Pack entry point renders;
- public output names/copy exist where server-rendered;
- no Logo Pack upload POST route exists;
- no ZIP endpoint exists;
- no favicon-generation endpoint exists.

Server does not test client image processing.

---

# 65. Existing Baseline

Current baseline:

Core:
265 / 265

UI:
171 / 171

Laravel:
8 / 8, 17 assertions

All must remain green.

New tests increase these counts.

Do not weaken existing tests to accommodate FSG-005B.

---

# 66. HEIC

HEIC remains supported as source input.

Logo Pack generation from HEIC must reuse the existing lazy decoder.

The full pack still decodes source once.

HEIC output remains unsupported.

Reconfirm lazy HEIC build separation.

---

# 67. Archive Lazy Loading

Reconfirm:

fflate archive implementation remains lazy.

Visiting:

Quick Fit
Guided Fit
Logo Pack before pressing Create logo pack

must not itself require archive code to execute/fetch merely because the
tab exists.

ZIP adapter should load only when archive creation is actually requested
inside the worker.

---

# 68. ICO Bundle Cost

The FileSetGo-owned ICO writer should be small.

Do not add another large dependency.

Record production bundle delta attributable to:

- fixed-canvas support;
- ICO support;
- Logo Pack product layer.

If a new third-party ICO dependency becomes necessary:

STOP and request project-owner approval before installation.

---

# 69. Privacy Audit

Audit:

fetch(
XMLHttpRequest
sendBeacon
axios
FormData
multipart

Expected processing network behavior remains:

same-origin HEIC WASM fetch only.

Logo Pack must not transmit:

- source image;
- generated files;
- source filename;
- selected mode;
- suitability assessment.

No analytics yet.

---

# 70. Server Boundary Audit

Confirm Laravel still does not:

- receive source images;
- generate logos;
- generate favicons;
- create ZIPs;
- temporarily store pack files.

All generated assets remain browser-local.

---

# 71. Performance / Memory

Record:

- number of public outputs;
- number of transient ICO renders;
- one-decode verification;
- sequential canvas use;
- approximate final ZIP size in representative test fixture;
- any obvious memory issue found.

Do not claim physical-device memory certification.

FSG-006 owns comprehensive performance/device hardening.

---

# 72. Browser Automation

Use browser automation if available.

Useful scenarios:

- switch to Logo Pack;
- selected-source sharing;
- suitability rendering;
- warning/blocking behavior;
- create pack;
- result asset list;
- reset.

Do not ask the project owner to perform routine manual verification.

ADR-013 remains authoritative.

If automation remains unavailable, report it honestly.

---

# 73. FSG-005 Parent Acceptance Audit

At FSG-005B completion, audit the entire FSG-005 parent.

Confirm Packaging & Export Systems now provide:

- generic image-set processing;
- one-decode multi-output architecture;
- JPEG/PNG/WebP raster assets;
- generic fixed-canvas contain;
- ICO output capability;
- worker-side ZIP creation;
- safe archive filenames;
- deterministic package ordering;
- package limits;
- individual output metadata;
- local ZIP result;
- Website Logo Pack public workflow;
- favicon suite;
- individual local downloads;
- package local download;
- cancellation;
- stale-result protection;
- local-only processing.

If all parent requirements are satisfied:

recommend FSG-005 closure.

If a genuine packaging/export requirement is missing:

keep parent FSG-005 open.

---

# 74. FSG-005B Acceptance Criteria

FSG-005B may close only when:

1. Logo Pack is a real public product mode.
2. It shares selected source with Quick/Guided Fit.
3. Source is not unnecessarily re-preflighted on mode changes.
4. Suitability review occurs before processing.
5. >2.5 aspect-ratio guidance works.
6. Controlled icon upscaling is assessed.
7. >4× required icon upscale blocks generation.
8. No automatic crop exists.
9. No automatic trim exists.
10. No background removal exists.
11. Generic fixed-canvas contain exists.
12. 90% icon content scale is enforced.
13. Header standard output is correct.
14. Header high-density output is correct.
15. favicon-32x32.png is exactly 32×32.
16. apple-touch-icon.png is exactly 180×180.
17. icon-192x192.png is exact.
18. icon-512x512.png is exact.
19. favicon.ico is valid.
20. favicon.ico contains 16/32/48 PNG entries.
21. ICO validation exists.
22. Full source decodes only once.
23. Rendering remains sequential.
24. Exactly seven public assets are returned.
25. ZIP contains exactly those seven assets.
26. No transient ICO PNGs leak into ZIP.
27. Individual files can be downloaded locally.
28. ZIP can be downloaded locally.
29. Blob URLs are cleaned up.
30. Cancellation works.
31. Stale result protection works.
32. HEIC input works.
33. HEIC remains lazy-loaded.
34. fflate remains lazy-loaded.
35. No server upload/package endpoint exists.
36. Privacy boundary remains intact.
37. No manifest is generated.
38. No FSG-006 work begins.
39. Existing core tests remain green.
40. Existing UI tests remain green.
41. New core/Logo Pack tests pass.
42. Laravel tests pass.
43. Typecheck passes.
44. Production build passes.
45. FSG-005 parent acceptance audit is completed.
46. No project-owner manual QA is required under ADR-013.

If any genuine criterion fails, keep FSG-005B open.

---

# 75. Governance

Update relevant documentation only.

Likely:

docs/governance/ROADMAP.md
docs/governance/DECISIONS.md
docs/product/PRODUCT.md
docs/architecture/ARCHITECTURE.md
docs/security/SECURITY.md
docs/testing/TESTING.md
docs/directives/FSG-005B.md

Create ADR-018 because FSG-005B introduces material governed decisions:

- exact Logo Pack composition;
- header bounds;
- square contain behavior;
- ICON_CONTENT_SCALE = 0.90;
- geometry warning threshold = 2.5;
- controlled icon upscaling;
- MAX_ICON_UPSCALE_FACTOR = 4;
- ICO PNG-entry architecture;
- no automatic crop/trim/background removal;
- no web manifest in this milestone.

Do not create multiple ADRs for individual file sizes.

---

# 76. Full Verification

Run:

npm ci
npm run typecheck
npm run test:core
npm run test:ui
npm run build
php artisan test --compact
vendor/bin/pint --dirty --format agent
git diff --check

Also run:

npm ls fflate

Expected:

fflate@0.8.3 exact-pinned.

No new dependency should exist unless separately approved.

Inspect production build for:

- HEIC lazy chunk;
- HEIC WASM;
- ZIP adapter lazy chunk;
- app bundle;
- worker bundle;
- ICO-related delta.

---

# 77. Sprint Report

At completion, COMPLETELY OVERWRITE:

SPRINT_REPORT.md

Required sections:

- Milestone
- Parent Milestone
- Status
- Base Commit
- Branch
- Objective
- Product Surface
- Logo Pack Architecture
- Core/Product Boundary
- Shared Source State
- Suitability Assessment
- Geometry Guidance
- Resolution/Upscale Rules
- Transparency/Background Behavior
- Header Outputs
- Fixed-Canvas Contain
- Square Icon Outputs
- ICO Architecture
- ICO Validation
- Exact Package Contents
- One-Decode Reuse
- Sequential Rendering
- ZIP Packaging
- Individual Downloads
- Cancellation / Stale Protection
- Accessibility
- Responsive Behavior
- Privacy
- Server Boundary
- Automated Tests
- Laravel Tests
- Regression Baseline
- Production Build
- Bundle Observation
- HEIC Lazy-Load Regression
- Archive Lazy-Load Regression
- Known Limitations
- FSG-005B Acceptance Audit
- FSG-005 Parent Acceptance Audit
- FSG-005 Closure Recommendation
- Next Milestone
- Commit Reference

Do not claim browser/device verification that was not performed.

---

# 78. Commit Boundary

Do NOT commit automatically.

When implementation is complete:

1. overwrite SPRINT_REPORT.md;
2. run the complete automated baseline;
3. return exact core/UI/Laravel test totals;
4. return build/lazy-load evidence;
5. return FSG-005 parent acceptance decision;
6. return working-tree status;
7. identify unresolved issues.

Await explicit project-owner approval.

Suggested eventual commit:

feat(web): add Website Logo Pack

Do not begin FSG-006.
