# FileSetGo Safety Limits

## Initial Engineering Defaults

```text
MAX_INPUT_FILE_SIZE = 15 MB
MAX_DECODED_PIXELS = 24,000,000
MAX_ACTIVE_HEAVY_JOBS = 1
```

These are engineering defaults pending FSG-006 device benchmarking. They are not permanent claims about every browser or device. Changes require measured evidence and an update to the governing decision.

## Source File-size Limit

The 15 MB limit is a hard initial source safety limit. A larger source is rejected before decoding. The limit controls input transfer into the client runtime but does not by itself bound decoded memory.

## Decoded-pixel Limit

Decoded pixel count is calculated as:

```text
width × height
```

The initial maximum is 24,000,000 pixels.

Exactly:

```text
6000 × 4000 = 24,000,000 pixels = 24 MP
```

Therefore, a 6000 × 4000 image is accepted at the current boundary. Any image with a calculated pixel count greater than 24,000,000 is rejected.

A larger image must be rejected before full pixel allocation wherever its format permits header-level dimension inspection. `createImageBitmap()` is a decode or bitmap-allocation path and must not be treated as the cheap header probe.

Pixel-count calculations must avoid unsafe numeric assumptions and malformed dimensions. Zero, negative, missing, non-finite, or structurally invalid dimensions are rejected with a structured preflight error.

## Concurrency Limit

Only one heavy processing job is active initially. This limits simultaneous decoded buffers, canvases, encoders, and decoder runtimes. A later increase requires FSG-006 device and memory evidence.

## Hard Source Safety Limit vs Preferred Working Resolution

The hard source safety limit decides whether FileSetGo may safely admit a source into the processing path.

Preferred working resolution is an operation-specific choice made after admission. It controls the dimensions actually needed for the destination or output.

A 24 MP source may pass safety but still be downsampled early when the destination requires much smaller dimensions. Passing the safety gate does not require the runtime to retain full source resolution throughout processing.

## Preflight Order

Where supported by the format, preflight should:

1. enforce the source file-size cap;
2. identify the format from signatures or container structure;
3. read dimensions from bounded header or container data;
4. enforce the decoded-pixel cap; and
5. dispatch accepted work to the worker runtime.

Corrupt, truncated, unsupported, or internally inconsistent files are rejected before expensive allocation whenever possible.
