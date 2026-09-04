# FileSetGo Format Support

## V1 Matrix

| Format | V1 Input | V1 Output | Status |
| --- | --- | --- | --- |
| JPEG | Yes | Yes | Required |
| PNG | Yes | Yes | Required |
| WebP | Yes | Yes | Required |
| HEIC/HEIF | Yes | No | Required V1 input — implemented (FSG-001C) |
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

HEIC/HEIF input support is required in V1 and is implemented as of FSG-001C. The technical path is:

- browser-side (a lazily-imported worker adapter, `packages/core/src/workers/heic-decode.ts`);
- worker-compatible (verified against the actual worker's `{ type: 'module' }` constraints — see the adapter's own documentation of the environment-detection workaround it uses);
- lazy-loaded (the decoder's ~1 MB WASM payload is only fetched, compiled, and initialized on the first HEIC job; JPEG/PNG/WebP users never load it — verified by inspecting actual production build output, not estimated); and
- independent of any conversion API (no server or third-party HEIC conversion is used).

The selected decoder is `@discourse/heic` (jSquash's HEIC decoder, Apache-2.0). `heic2any` was not used. Selection followed a comparative evaluation of `heic2any`, `libheif-js`, and `@discourse/heic` covering maintenance health, license, worker compatibility, bundle size, and — critically — real, executed decode behavior against both valid and malformed input. See `docs/governance/DECISIONS.md` ADR-014 for the full evaluation, including the accepted maintenance/provenance risk (a single-organization fork of an unmerged upstream pull request) and the mitigation strategy (a narrow, replaceable adapter boundary).

Preflight identifies HEIC/HEIF via ISOBMFF `ftyp` major-brand detection and resolves the primary image's true dimensions through `pitm`/`ipma`/`ipco`/`ispe` item-property association (not merely "the first `ispe` box found") — see `packages/core/src/preflight/formats/heic.ts`. A structurally valid, in-limits HEIC file passes preflight the same as any other supported format; decoder availability is a processing-time concern (`HEIC_DECODER_UNAVAILABLE` / `HEIC_INITIALIZATION_FAILED`), not a preflight-time rejection.

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
