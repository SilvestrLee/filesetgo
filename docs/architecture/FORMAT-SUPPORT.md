# FileSetGo Format Support

## V1 Matrix

| Format | V1 Input | V1 Output | Status |
| --- | --- | --- | --- |
| JPEG | Yes | Yes | Required |
| PNG | Yes | Yes | Required |
| WebP | Yes | Yes | Required |
| HEIC/HEIF | Yes | No | Required V1 input |
| AVIF | Conditional | No | Feature detection / later decision |
| SVG | No | No | Deferred |
| GIF | No | No | Deferred |

Declared MIME types and filename extensions are hints. Format support decisions rely on validated signatures and container structures.

## JPEG

V1 requires bounded signature and segment inspection, dimension extraction, EXIF orientation normalization, decoding, proportional resize, encoding, and output validation.

## PNG

V1 requires PNG signature and IHDR validation, dimension extraction, decoding, proportional resize, encoding, and output validation.

## WebP

V1 requires RIFF/WEBP container validation, supported chunk inspection for dimensions, decoding, proportional resize, encoding, and output validation.

## HEIC/HEIF

HEIC/HEIF input support is required in V1. The technical path must be:

- browser-side;
- worker-compatible;
- lazy-loaded;
- independent of any conversion API; and
- selected based on maintenance, security, license, and memory behavior.

The implementation must not hard-lock `heic2any` without evaluation. A dependency evaluation must include malformed-input behavior, worker loading, cancellation limitations, bundle cost, decoded-memory behavior, supported brands and variants, maintenance health, security history, and license compatibility.

HEIC/HEIF output is not a V1 requirement.

## AVIF

AVIF input remains conditional on runtime feature detection and later evidence. Lack of support must produce a deterministic unsupported-capability result rather than an uncontrolled decode failure.

## SVG

Arbitrary SVG processing is deferred because SVG can contain or depend on:

- embedded content;
- content requiring sanitization;
- external references;
- font behavior; and
- rasterization behavior that varies by environment.

SVG requires a dedicated sanitization and rasterization architecture before inclusion.

## GIF

GIF is deferred. Animated-image semantics, frame handling, timing, memory, and output expectations require a separate governed decision.
