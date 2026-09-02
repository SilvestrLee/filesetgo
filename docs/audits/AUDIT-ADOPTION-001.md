# Audit Adoption Record 001

## Status

The external audit verdict, **READY WITH REVISIONS**, is adopted through the following accepted recommendations and project amendments.

## Accepted

- worker-first processing;
- a thin Laravel backend;
- provisional 15 MB source and 24 MP decoded-pixel safety limits;
- a TypeScript shared core package;
- HEIC/HEIF input support in V1;
- SVG deferral;
- EXIF orientation normalization;
- an eight-milestone roadmap; and
- a shared browser package for Keryon integration.

## Amendments and Clarifications

### Preflight

`createImageBitmap()` must not be treated as the cheap header probe. It may trigger decoding or full bitmap allocation.

Safety metadata should be read from bounded format headers or container structures before expensive bitmap allocation wherever possible. JPEG segments, PNG IHDR data, WebP chunks, and applicable HEIC container metadata require format-aware inspection with checked offsets and lengths.

### HEIC library

HEIC/HEIF V1 input support is locked as a product requirement. `heic2any` is not locked as the implementation.

The selected browser-side decoder must be worker-compatible and lazy-loaded. Selection depends on maintenance, security history, license compatibility, supported HEIC/HEIF variants, bundle impact, malformed-input behavior, cancellation constraints, and memory performance.

### Favicon source suitability

Do not blindly square-crop an unsuitable horizontal logo. The guided workflow should prefer requesting a square or icon source and should issue deterministic suitability guidance when the supplied asset is a poor fit.

### ICO

ICO is a useful compatibility output, not the only valid modern favicon approach. A favicon package may also contain appropriately sized PNG icons and other destination-specific assets.

### Web manifest

A web manifest belongs to extended web-app icon packaging. It is optional and must not be generated for every basic favicon use case.

## Governance Effect

The adopted items are normalized in the master blueprint, decision register, eight-milestone roadmap, FSG-001 directive, architecture documents, security limits, and format policy. Where this adoption record clarifies the external report, the normalized governing documents express the implementation requirement.
