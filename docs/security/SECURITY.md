# FileSetGo Security Architecture

## Scope

This threat model covers the browser-first V1 processing path and identifies controls that must remain true as later server or API capabilities are considered.

Supported V1 files are untrusted input. A familiar extension, declared MIME type, or successful file selection does not establish that a file is valid or safe to decode.

## Threat Model

### Spoofed MIME type or wrong extension

An attacker or malformed source may declare a supported MIME type or extension while containing a different format.

**Controls:** bounded magic-byte and container validation; deterministic rejection when the declared and detected formats are incompatible; no decoder selection based only on extension or MIME type.

### Corrupt files

Truncated or internally inconsistent files may trigger parser, decoder, or encoder faults.

**Controls:** bounds-checked preflight parsing; structured failures; worker isolation; no partial output export; cleanup after rejection or failure.

### Malformed JPEG segments

JPEG segment lengths, markers, and EXIF structures may be invalid, truncated, recursive, or crafted to force excessive scanning.

**Controls:** bounded segment traversal; checked offsets and lengths; maximum metadata scan budget; rejection when safe dimensions or orientation cannot be established.

### Malformed PNG or WebP containers

PNG chunks and RIFF/WebP chunk sizes may be inconsistent with the available bytes or may overflow offset calculations.

**Controls:** signature validation; bounded chunk reads; checked integer arithmetic; required header/chunk validation; rejection before decode when structure is unsafe.

### Decompression bombs and oversized decoded dimensions

A small compressed file may expand into a bitmap that exhausts memory.

**Controls:** 15 MB source cap; header-level dimension preflight where possible; 24,000,000-pixel decoded limit; one active heavy job; early downsampling for smaller destinations; worker isolation.

### Worker crashes

A decoder, encoder, or transform may crash or terminate the worker.

**Controls:** job IDs; structured host-side worker failure; stale-result rejection; cleanup of partial resources; controlled worker recreation; no false success state.

### Resource exhaustion

Repeated jobs, parallel work, object URLs, canvases, image bitmaps, or retained buffers may consume excessive memory or CPU.

**Controls:** `MAX_ACTIVE_HEAVY_JOBS = 1` (shared across `processImage()`, `processImageToTarget()`, and `processImageSet()` — starting any of the three cancels whichever job, of any kind, is active); bounded stages; cancellation; deterministic terminal states; explicit resource cleanup. The FSG-002 target-size engine's repeated-encode search is itself bounded — at most `MAX_DIMENSION_TIERS + 1` dimension candidates × `MAX_QUALITY_PROBES_PER_TIER` quality probes per job, never an open-ended loop (see `docs/governance/DECISIONS.md` ADR-015). The FSG-005A multi-output engine is bounded the same way: at most `MAX_PACKAGE_ASSETS` (16) outputs per job, generated strictly sequentially (one canvas released before the next is created) rather than in parallel, with a running `MAX_PACKAGE_TOTAL_OUTPUT_BYTES` (50 MiB) check that fails the job before archiving rather than allowing unbounded package growth (see ADR-017).

### Malicious metadata

EXIF or other metadata may be malformed, oversized, privacy-sensitive, or capable of confusing orientation and dimension logic.

**Controls:** bounded metadata reads; strict orientation parsing; metadata is not trusted as executable content; source metadata and arbitrary content are not sent to analytics; only required normalized output metadata is retained.

### Unsafe archive entry names (ZIP path traversal)

A caller-supplied output filename or archive filename could attempt path traversal (`../`), an absolute path, a drive-letter path, or a null byte if placed unchecked into a ZIP entry name.

**Controls:** `archive/filename-safety.ts`'s `isSafeArchiveEntryName()` rejects any name containing `/`, `\`, or `:` outright — flat archives only, no directory trees in FSG-005A — plus empty names, `.`, `..`, and null bytes. This check runs before any processing begins (`validate-image-set-request.ts`), not only at archive-creation time. `fflate` itself is never exposed to caller-controlled filenames without passing through this check first.

### Future server or API abuse

Any future upload, conversion, or public API would introduce authentication, authorization, quota, storage, parser, denial-of-service, retention, and privacy risks.

**Controls:** no server ingestion for supported V1 paths. A future server-processing capability requires an explicit architecture change, threat-model update, privacy review, limits, retention rules, deletion rules, and abuse controls before implementation.

## Baseline Controls

Every supported V1 path includes:

- magic-byte and container validation;
- dimension preflight;
- a file-size cap;
- a decoded-pixel cap;
- worker isolation for heavy processing;
- structured failures;
- cancellation and stale-result prevention;
- resource cleanup; and
- no server ingestion.

## Failure Policy

Unsafe uncertainty fails closed. If FileSetGo cannot establish a supported format, safe dimensions, or a valid processing result within bounded work, it returns a structured error and does not export a file.
