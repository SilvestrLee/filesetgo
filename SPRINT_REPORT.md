# FileSetGo Sprint Report

- **Milestone:** FSG-001A — Preflight & Safety Gate
- **Status:** Complete
- **Branch:** `fsg-001-core-runtime`
- **HEAD at report generation:** `ee2d8fe3bff7cd4ed2bb7cfdd730e2c6347410c4`

## Objective

Build the `@filesetgo/core` preflight path that examines an untrusted JPEG, PNG, or WebP before full decode and reports its actual format, dimensions, megapixels, source size, relevant orientation or animation metadata, and whether it is safe to decode.

The completed path is:

```text
Selected File
    ↓
Read bounded header bytes
    ↓
Detect actual format
    ↓
Parse dimensions
    ↓
Calculate megapixels
    ↓
Apply 15 MB / 24 MP safety policy
    ↓
READY or REJECTED
```

No resizing, decoding, encoding, worker runtime, UI, upload, or Laravel file handling was introduced.

## Files Changed

- `packages/core/src/index.ts`
- `packages/core/src/preflight/bounded-reader.ts`
- `packages/core/src/preflight/contracts.ts`
- `packages/core/src/preflight/detect-format.ts`
- `packages/core/src/preflight/errors.ts`
- `packages/core/src/preflight/formats/jpeg.ts`
- `packages/core/src/preflight/formats/png.ts`
- `packages/core/src/preflight/formats/webp.ts`
- `packages/core/src/preflight/preflight-image.ts`
- `packages/core/src/preflight/safety.ts`
- `packages/core/tests/preflight/fixtures.ts`
- `packages/core/tests/preflight/preflight-image.test.ts`
- `SPRINT_REPORT.md`

## Public API and Result Contract

`@filesetgo/core` now publicly exports:

- `preflightImage()`;
- `ImagePreflightResult` and the ready/rejected outcome types;
- `IMAGE_PREFLIGHT_ERROR_CODES` and typed error contracts;
- `DEFAULT_SAFETY_LIMITS`;
- image format, orientation, source, options, and safety-limit types; and
- `calculateMegapixels()`.

The canonical result records format, width, height, megapixels, file size, optional EXIF orientation, optional animation state, and `safeToDecode`. Rejections return a typed error and preserve inspected metadata when it is safe and useful to do so.

## JPEG Capabilities

- Binary JPEG identification independent of extension or declared MIME type.
- Defensive marker and segment traversal.
- Width and height extraction from supported SOF markers.
- EXIF TIFF byte-order, directory-bound, and orientation parsing.
- Orientations 1, 3, 6, and 8 covered explicitly by tests; the result type accepts all EXIF orientation values 1 through 8.
- SOS validation before a JPEG header is accepted as ready.
- Structured rejection for truncated segments, invalid lengths, missing SOF, conflicting metadata, malformed EXIF, excessive segments, and excessive header scanning.
- JPEG header reads capped at 1 MiB and 1,024 segments.

## PNG Capabilities

- Exact eight-byte PNG signature validation.
- First-chunk IHDR validation.
- Width and height extraction using big-endian fields.
- Validation of dimensions, bit-depth/color-type combinations, compression, filtering, and interlace fields.
- IHDR CRC-32 verification before trusting dimensions.
- Structured rejection for truncated, malformed, or checksum-invalid headers.

## WebP Capabilities

- RIFF and WEBP signature validation.
- RIFF length and first image-chunk boundary validation.
- Dimension extraction for VP8, VP8L, and VP8X still-image headers.
- VP8 key-frame signature validation.
- VP8L version validation.
- VP8X reserved-field validation.
- VP8X animation-flag detection.
- Animated WebP rejection through `ANIMATED_IMAGE_UNSUPPORTED`, with inspected dimensions retained in the rejected result.

## Safety-limit Behavior

The centralized defaults are:

```text
maxInputBytes: 15 * 1024 * 1024
maxDecodedPixels: 24,000,000
```

- A source below 15 MB passes the byte-size gate.
- A source exactly 15 MB passes the byte-size gate.
- A source above 15 MB is rejected before any source bytes are read.
- Dimensions below 24 MP pass.
- Exactly 6000 × 4000 = 24,000,000 pixels passes.
- Any decoded pixel count above 24,000,000 is rejected with `DIMENSIONS_TOO_LARGE` and `safeToDecode: false`.
- Format detection uses binary content, so a JPEG named `logo.png` is reported as JPEG.

## Structured Error Vocabulary

Delivered error codes:

- `UNSUPPORTED_FORMAT`
- `INVALID_SIGNATURE`
- `CORRUPT_IMAGE`
- `FILE_TOO_LARGE`
- `DIMENSIONS_TOO_LARGE`
- `ANIMATED_IMAGE_UNSUPPORTED`

## Verification

```text
npm run typecheck
PASS

npm run test:core
PASS — 32 tests across 2 test files
       31 preflight tests
       1 core package export test

npm run build
PASS

php artisan test --compact
PASS — 2 tests, 2 assertions

git diff --check
PASS
```

The production build continues to emit the existing optional Fontaine optimization notice; it does not fail the build.

## Privacy and Security Verification

- No source file or generated content is uploaded.
- No network, API, Laravel file-handling, or persistence path was introduced.
- `createImageBitmap()` is not used for dimension discovery.
- Header access uses bounded `Blob.slice()` reads.
- PNG and WebP preflight read only the fixed metadata required for their headers.
- JPEG scanning is bounded by both bytes and segment count.
- Source size is checked before any header read.
- Decoded-pixel safety is checked before any full image decode or bitmap allocation.
- All hostile-input failures use the structured preflight error vocabulary.

No real-browser or device verification was performed in this sprint because FSG-001A implements bounded header parsing without a browser UI, decode path, or worker. Browser and device proof remains required when those runtime layers are introduced.

## Known Limitations

- Preflight validates bounded headers and container metadata; it does not prove that the complete compressed pixel payload will decode successfully.
- JPEG metadata beyond the 1 MiB or 1,024-segment scan bounds is rejected, even if a decoder might otherwise accept it.
- WebP animation detection uses the VP8X animation flag; full animation chunk validation is deferred.
- APNG animation detection is not included in FSG-001A.
- HEIC/HEIF identification and decoding are not included in this sprint.
- No worker, decode, normalization, resize, encode, or local-download proof exists yet.

## Deferred Work

- typed Web Worker processing;
- full raster decode;
- EXIF orientation application during normalization;
- proportional resize;
- JPEG, PNG, and WebP output encoding;
- cancellation across worker jobs;
- resource cleanup across decoded and encoded assets;
- HEIC/HEIF technical path;
- target-size compression;
- Guided Fit presets and packaging; and
- product workflow UI.

## Next Sprint

Continue FSG-001 with the typed worker runtime and bounded local decode/normalization proof, using the FSG-001A preflight result as the mandatory safety gate before decode.

## Commit Reference

The implementation commit is created after this report and all final verification complete. The commit hash is available in Git history.
