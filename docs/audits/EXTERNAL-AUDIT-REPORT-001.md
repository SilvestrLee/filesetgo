# External Audit Report 001

## Audit Verdict

**READY WITH REVISIONS**

The external architecture audit found the browser-first product direction viable, provided the critical runtime and memory revisions below are adopted before the processing architecture is treated as proven.

## Findings

### ARC-01 — Critical: Heavy processing on the UI thread

Heavy image processing must not execute on the UI thread. Decoding, full pixel inspection, resizing, repeated compression work, HEIC decoding, and encoding require a worker-first runtime so the interface remains responsive and failures are isolated.

### ARC-02 — Critical: Mobile-memory safeguards

Mobile-memory limits require safeguards for both compressed input size and decoded dimensions. A source byte cap alone does not prevent decompression bombs or excessive bitmap allocation.

The initial proposal is:

```text
MAX_INPUT_FILE_SIZE = 15 MB
MAX_DECODED_PIXELS = 24,000,000
MAX_ACTIVE_HEAVY_JOBS = 1
```

The values require later real-device benchmarking and must be enforced before expensive allocation wherever format metadata permits.

### ARC-03 — High: Avoid premature PHP transformation abstractions

The Laravel layer should remain thin while supported processing is browser-side. Backend transformation services, upload pipelines, or PHP image abstractions would create the wrong authority boundary before a server-processing use case is approved.

### ARC-04 — High: Bound target-size processing

Target KB/MB processing must use a bounded number of attempts, a quality floor, controlled dimension step-down, and explicit handling when a hard target cannot be achieved. Unbounded compression loops are unacceptable.

### ARC-05 — Medium: Defer arbitrary SVG

SVG should be excluded from V1 unless a dedicated sanitization and rasterization architecture addresses embedded content, external references, fonts, scriptable or active content, and environment-dependent rendering.

## Additional Recommendations

### EXIF

Normalize EXIF orientation before dimension-dependent transforms and output validation so previews, resize calculations, and encoded results share one visual orientation.

### HEIC/HEIF

Retain HEIC/HEIF as a V1 input requirement, but evaluate the decoder implementation for worker compatibility, lazy loading, maintenance, security, license, bundle size, supported variants, and mobile-memory behavior. Do not rely on a server conversion API.

### Favicon packaging

Treat favicon output as a compatibility package rather than a single cropped ICO. Prefer an appropriate square or icon source; do not blindly crop unsuitable horizontal logos. Modern outputs may include PNG-based icons, Apple touch icons, and optional web-app icons alongside compatibility ICO output.

### Shared Keryon client core

Use one TypeScript browser package for FileSetGo and Keryon rather than duplicating processing algorithms or moving them into Keryon-specific backend code. Keep Keryon domain, storage, authorization, and pricing concepts outside the shared package.

### Roadmap

Replace the earlier fourteen-milestone concept with an eight-milestone sequence that establishes safety and the real client runtime before target-size optimization, public workflows, presets, packaging, hardening, launch, and ecosystem integration.

## Required Revisions Before Architecture Proof

- establish the worker-first typed job protocol;
- enforce source-byte and decoded-pixel safeguards;
- inspect dimensions before full allocation where formats permit;
- prove bounded cancellation and cleanup;
- validate the HEIC technical path;
- keep the Laravel processing layer thin; and
- report real browser and device evidence truthfully.
