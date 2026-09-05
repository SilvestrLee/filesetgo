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

No file exceeds ~452 KB. No fixture is downloaded from a network source.
