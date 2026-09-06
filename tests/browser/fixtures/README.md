# FSG-006 Browser Test Fixtures

All files in `files/` are self-generated, deterministic, and free of any
third-party or copyrighted imagery — no photograph, stock asset, or
downloaded file is used anywhere in this directory (directive §25).

## Generation

`sample.png`, `sample-alpha.png`, `wide-logo.png`, `small-logo.png`, and
`good-logo.png` are produced by a short Python script using only the
standard library (`struct` + `zlib`) — a real, valid, hand-built PNG
container with a deterministic procedural color ramp
(`r = x * 255 / width`, `g = y * 255 / height`, `b = 128`, plus a
deterministic alpha ramp for `sample-alpha.png`). This is the same
technique already used and documented for
`packages/core/tests/workers/heic-fixture.ts`.

`sample.jpg` and `sample.webp` are produced from `sample.png` using
macOS's built-in `sips` and `cwebp` — format conversion only, not a source
of external image content.

`flat-logo.png` (FSG-005C) is produced by the same struct+zlib technique,
deliberately with a **flat** (not gradient) white background — the
existing gradient-ramp fixtures are unsuitable for demonstrating a clean
`verified` Transparent Logo Pack outcome, since a gradient background is
itself one of the intentional `needs-review` ambiguity signals (directive
§16). It draws a solid navy square mark with a white "counter" cut from its
centre — an interior element that must survive background removal
unmodified. `flat-logo.jpg` is the same image converted to JPEG via macOS's
built-in `sips` (format conversion only) — used to exercise Transparent
Logo Pack background removal from a JPEG source, the exact scenario
FSG-005C's motivating defect report ([directive §1](../../../docs/directives/FSG-005C.md)) was about.

`flat-logo-black.png`/`.jpg` (FSG-005C Product Office correction) is the
same technique with a flat **black** background and a gold mark, so the
JPEG-source background-removal evidence covers both a white-background and
a black-background real encoded JPEG (directive §11 of the correction),
not only white.

`transparent-padding-regression.png` (FSG-005C Product Office correction)
is a real, valid RGBA PNG (colour type 6, a genuine alpha channel) built
with the same struct+zlib technique: a fully transparent margin wrapping
an opaque white rectangle, with a small differently-coloured artwork block
inside that rectangle. This is the exact regression geometry the
correction directive describes — real alpha exists, but the artwork's
actual background (the white rectangle) has not been removed — used to
prove the browser-level product correctly continues through background
preparation rather than treating the source as already transparent.

`flat-color-only.png` (FSG-006 delta recertification) is a uniform,
single-colour 400×400 PNG with no distinguishable foreground at all —
used to exercise Transparent mode's genuine `FAILED` path (no removable
background/foreground distinction exists to prepare), never a false
`verified`/`needs-review` success.

`gradient-logo.png` (FSG-006 delta recertification) is a 600×600 PNG with
a genuine horizontal colour-ramp background (the same gradient formula as
`sample.png`) and a real solid dark foreground block drawn on top — used
to exercise Transparent mode's genuine `NEEDS REVIEW` path with a source
that also passes Logo Pack's geometry/resolution suitability checks. The
existing gradient-ramp fixtures (`good-logo.png` etc.) have no drawn
foreground at all, so they exercise the unrelated `FAILED` path
(no remaining foreground) rather than `NEEDS REVIEW`.

`genuine-transparent-logo.png` (FSG-006 delta recertification) is a real,
valid RGBA PNG: a fully transparent exterior with a single opaque navy
mark — already a correctly-prepared transparent logo, no un-removed
background — used to browser-certify that Transparent mode genuinely
bypasses background removal and preserves existing alpha for a source
that needs no preparation at all, closing the one core/worker-only gap
in the FSG-005C browser-certification matrix.

`flat-logo.heic` (FSG-006 delta recertification) is `flat-logo.png`
converted to HEIC via macOS's built-in `sips -s format heic` — the same
technique already used and documented for `sample.heic`, at a larger,
Logo-Pack-suitable resolution (`sample.heic`'s 64×48 requires a >4×
icon upscale and is correctly blocked by Logo Pack's own suitability
check, unrelated to HEIC support itself).

`sample.heic` is the exact same real, valid, self-generated HEIC fixture
already committed and documented at
`packages/core/tests/workers/heic-fixture.ts` (a 64×48 PNG color ramp
converted with macOS's built-in `sips -s format heic`) — reused here rather
than duplicated with new provenance.

`corrupted.jpg` is 31 bytes of plain text with a `.jpg` extension — not a
JPEG at all, for invalid-file rejection tests.

`truncated.jpg` is the first 100 bytes of `sample.jpg` — a valid JPEG
signature with no image data, for truncated/malformed-file rejection tests.

## Files

| File | Purpose |
|---|---|
| `sample.png` | 640×480 real, decodable PNG — general Quick Fit / Guided Fit flows |
| `sample-alpha.png` | 200×200 real PNG with an actual alpha channel |
| `sample.jpg` | 640×480 real, decodable JPEG (converted from `sample.png`) |
| `sample.webp` | 640×480 real, decodable WebP (converted from `sample.png`) |
| `sample.heic` | 64×48 real, decodable HEIC (reused from the core package's own fixture) |
| `wide-logo.png` | 1200×150 (8:1 aspect ratio, > 2.5) — Logo Pack geometry-warning fixture |
| `small-logo.png` | 60×60 — Logo Pack required-icon-upscale-blocking fixture (> 4×) |
| `good-logo.png` | 600×600 — Logo Pack success-path fixture, no warnings |
| `corrupted.jpg` | Not an image at all — invalid-file rejection fixture |
| `truncated.jpg` | Valid JPEG signature, no data — truncated-file rejection fixture |
| `large.jpg` | 4800×3200 (15.36 MP) real, decodable JPEG — directive §51's "large representative image" stress case, and gives cancellation tests a real processing window a tiny fixture completes too fast to reliably interrupt |
| `flat-logo.png` | 400×400 — flat white background, solid navy mark, white interior counter — FSG-005C Transparent Logo Pack success-path fixture |
| `flat-logo.jpg` | Same image as `flat-logo.png`, converted to JPEG — FSG-005C white-background JPEG-source background-removal fixture |
| `flat-logo-black.png` | 400×400 — flat black background, gold mark, black interior counter — FSG-005C black-background counterpart to `flat-logo.png` |
| `flat-logo-black.jpg` | Same image as `flat-logo-black.png`, converted to JPEG — FSG-005C black-background JPEG-source background-removal fixture |
| `transparent-padding-regression.png` | 400×400, real RGBA (has alpha) — transparent margin wrapping an opaque white rectangle with coloured artwork inside — FSG-005C Product Office correction regression fixture |
| `flat-color-only.png` | 400×400 — uniform single colour, no foreground at all — FSG-006 delta recertification FAILED-transparency fixture |
| `gradient-logo.png` | 600×600 — real gradient background + solid foreground block — FSG-006 delta recertification NEEDS-REVIEW-transparency fixture |
| `flat-logo.heic` | `flat-logo.png` converted to HEIC — FSG-006 delta recertification Logo-Pack-suitable HEIC fixture |
| `genuine-transparent-logo.png` | 400×400, real RGBA — transparent exterior + opaque mark, already prepared — FSG-006 delta recertification existing-transparent-PNG-bypass fixture |

No file exceeds ~452 KB. No fixture is downloaded from a network source.
