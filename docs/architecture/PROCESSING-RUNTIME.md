# FileSetGo Processing Runtime

## User-visible Lifecycle

```text
Selected
→ Preflight
→ Ready/Rejected
→ Processing
→ Complete/Error/Cancelled
```

Preflight establishes trusted format and dimension metadata before processing begins. A rejected file must not proceed to expensive decoding.

## Recommended Application States

- `idle`
- `selected`
- `preflighting`
- `rejected`
- `ready`
- `processing`
- `complete`
- `cancelled`
- `error`

State transitions must be explicit. Terminal output from an earlier job must not move a newer selection into `complete`, `cancelled`, or `error`.

## Worker Lifecycle

1. The main thread assigns a unique job ID and sends a typed request.
2. The worker responds with `JOB_ACCEPTED`.
3. The worker emits `JOB_PROGRESS` as it crosses meaningful processing stages.
4. The worker emits exactly one of `JOB_COMPLETE`, `JOB_FAILED`, or `JOB_CANCELLED`.
5. The main thread accepts the terminal event only if its job ID is still current.
6. Both sides release resources that are no longer required.

The initial runtime permits one active heavy job.

## Stale-result Prevention

The application tracks the current selection and active job ID. Progress and terminal events are ignored when their job ID no longer matches the current job. Replacing a source file or starting a superseding job invalidates earlier results even if an earlier worker task finishes later.

Stale outputs must never become downloadable results.

## Cancellation

Cancellation is a protocol operation, not only a UI state change.

- The main thread sends a cancellation command containing the job ID.
- The worker checks cancellation between bounded processing stages and within iterative work where practical.
- The worker stops producing output, releases job resources, and emits `JOB_CANCELLED`.
- The host ignores late progress or success events for the cancelled job.

If an underlying decoder cannot be interrupted safely, the runtime may terminate and recreate the worker, provided the job is reported as cancelled and all reachable resources are released.

## Resource Cleanup

Cleanup applies after completion, failure, cancellation, selection replacement, and worker crash. It includes, where applicable:

- revoking object URLs;
- closing `ImageBitmap` instances;
- resetting or releasing canvases;
- releasing encoded blobs and array buffers no longer needed;
- dropping decoded pixel buffers and metadata references;
- removing message listeners; and
- terminating superseded workers.

## Progress Stages

Progress is stage-based and truthful. Initial stages may include:

- `preflight`;
- `decode`;
- `normalize`;
- `inspect`;
- `transform`;
- `encode`;
- `validate`; and
- `export`.

The UI must not present synthetic precision when an underlying operation provides no measurable fractional progress.

## Output Validation

Before export, the runtime validates the generated output against the applicable hard requirements. Validation may include:

- output signature and format;
- encoded byte size;
- pixel dimensions;
- aspect-ratio or maximum-dimension requirements; and
- required output presence.

Validation failure produces a structured error rather than a “ready” file.
