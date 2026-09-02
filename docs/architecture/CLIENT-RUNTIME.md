# FileSetGo Client Runtime

## Runtime Boundary

The client runtime separates responsive interaction from heavy file processing. The main thread coordinates work; a worker owns expensive and memory-sensitive operations.

## UI/Main Thread

The UI or main thread may own:

- file selection;
- application state;
- displaying metadata;
- progress presentation;
- the cancellation command;
- result presentation; and
- download initiation.

The UI or main thread must not own:

- large pixel scans;
- expensive resizing;
- repeated compression;
- HEIC decoding; or
- full image transforms.

Short header reads and bounded preflight orchestration may occur before worker dispatch, provided they do not allocate a full decoded bitmap.

## Worker

The worker owns:

- decoding;
- image normalization;
- pixel inspection;
- resizing;
- crop primitives;
- encoding; and
- future target-size search.

Worker operations must be bounded by accepted file-size, decoded-pixel, attempt, and cancellation constraints.

## Initial Concurrency

```text
MAX_ACTIVE_HEAVY_JOBS = 1
```

The runtime queues or rejects additional heavy work according to the active product flow. It must not silently execute unbounded concurrent jobs. The limit is provisional until FSG-006 device benchmarking.

## Typed Job Protocol

Every job has a unique ID. Commands and events carry that ID so the application can correlate progress, cancellation, terminal results, and stale messages.

The worker lifecycle uses these events:

- `JOB_ACCEPTED` — the worker recognizes the job and owns its execution;
- `JOB_PROGRESS` — the worker reports a named stage and bounded progress data;
- `JOB_COMPLETE` — the worker returns a validated successful result;
- `JOB_FAILED` — the worker returns a structured failure; and
- `JOB_CANCELLED` — the worker confirms controlled cancellation and cleanup.

Terminal events are mutually exclusive. A job that has completed, failed, or been cancelled must not emit further progress or another terminal event.

## Failure Isolation

A worker crash must become a structured runtime failure for the active job. The host must discard partial results, release associated resources, and restore a usable runtime or explicitly report that processing is unavailable.
