# FileSetGo Privacy Engineering

## V1 Privacy Guarantee

For supported V1 workflows, files are processed on the user's device.

FileSetGo must not send any of the following to analytics:

- the source file;
- the generated output;
- the filename;
- EXIF metadata;
- image binary data; or
- arbitrary image content.

Supported processing must not require source or generated files to pass through FileSetGo servers.

## Data Handling

File content exists only in the browser runtime for the work the user requested. Temporary object URLs, decoded bitmaps, canvases, buffers, worker references, and generated blobs are released when they are superseded or no longer needed.

Local download is initiated by the user's browser. FileSetGo does not create a cloud copy, processing history, or account record in V1.

## Potential Non-content Telemetry

Future telemetry may include only deliberately bounded, non-content information such as:

- workflow;
- format;
- size bucket;
- megapixel bucket;
- processing result; and
- duration bucket.

Buckets must avoid values precise enough to become content fingerprints. Telemetry must not include raw dimensions, exact byte counts, names, paths, metadata, binary samples, thumbnails, or arbitrary error payloads containing file content.

The host application owns consent, disclosure, minimization, and retention policy for any approved telemetry.

## Future Server-side Processing

Any future server-side processing requires all of the following before implementation:

1. an explicit architecture change;
2. a privacy review;
3. clear UI disclosure;
4. retention rules; and
5. automatic deletion rules.

It also requires an updated security threat model and governing decision. Server-side processing must never be introduced as a silent fallback for a supported browser-side V1 path.

## Integration Boundary

An integrating host such as Keryon may upload a user-approved generated asset to its own storage or CDN after browser-side processing. That host action is governed by the host's authorization, storage, disclosure, and retention policies; it is not performed by `@filesetgo/core`.
