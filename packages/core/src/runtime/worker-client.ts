import { preflightImage } from '../preflight/preflight-image';
import {
  IMAGE_PROCESSING_ERROR_CODES,
  type ImageProcessingJob,
  type ImageProcessingOutcome,
  type ImageProcessingProgress,
  type ProcessImageOptions,
} from '../processing/contracts';
import {
  createProcessingError,
  fromPreflightError,
  processingCancelled,
} from '../processing/errors';
import type {
  ImageProcessingTargetJob,
  ImageProcessingTargetOutcome,
  ProcessImageToTargetOptions,
} from '../processing/target-size-contracts';
import { validateProcessImageOptions } from '../processing/validate-request';
import {
  validateProcessImageToTargetOptions,
  type ResolvedTargetOptions,
} from '../processing/validate-target-request';
import { createImageJobId } from './job-id';
import {
  isImageWorkerEvent,
  type ImageWorkerCommand,
  type ImageWorkerEvent,
} from './protocol';

export interface ImageWorkerLike {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: ImageWorkerCommand): void;
  terminate(): void;
}

export type ImageWorkerFactory = () => ImageWorkerLike;

/**
 * The two job kinds (`processImage` and `processImageToTarget`) share this
 * single-slot runtime so `MAX_ACTIVE_HEAVY_JOBS = 1` holds across both —
 * starting either kind cancels whichever job (of either kind) is currently
 * active (FSG-002 directive §15).
 */
type JobVariant =
  | {
      kind: 'standard';
      options: ProcessImageOptions;
      resolve: (outcome: ImageProcessingOutcome) => void;
    }
  | {
      kind: 'target';
      options: ProcessImageToTargetOptions;
      resolve: (outcome: ImageProcessingTargetOutcome) => void;
    };

interface ActiveJob {
  id: string;
  file: Blob;
  variant: JobVariant;
  settled: boolean;
  worker?: ImageWorkerLike;
}

function createDefaultWorker(): ImageWorkerLike {
  return new Worker(new URL('../workers/image.worker.ts', import.meta.url), {
    type: 'module',
    name: 'filesetgo-image-worker',
  });
}

export class ImageProcessingRuntime {
  private activeJob: ActiveJob | undefined;
  private readonly createWorker: ImageWorkerFactory;
  private readonly requiresGlobalWorker: boolean;

  public constructor(createWorker?: ImageWorkerFactory) {
    this.createWorker = createWorker ?? createDefaultWorker;
    this.requiresGlobalWorker = createWorker === undefined;
  }

  public processImage(file: Blob, options: ProcessImageOptions): ImageProcessingJob {
    const job = this.beginJob<ImageProcessingOutcome>(file, {
      kind: 'standard',
      options,
      resolve: () => {},
    });

    return {
      jobId: job.id,
      result: job.result,
      cancel: () => {
        this.cancelImageJob(job.id);
      },
    };
  }

  public processImageToTarget(
    file: Blob,
    options: ProcessImageToTargetOptions,
  ): ImageProcessingTargetJob {
    const job = this.beginJob<ImageProcessingTargetOutcome>(file, {
      kind: 'target',
      options,
      resolve: () => {},
    });

    return {
      jobId: job.id,
      result: job.result,
      cancel: () => {
        this.cancelImageJob(job.id);
      },
    };
  }

  private beginJob<TOutcome extends ImageProcessingOutcome | ImageProcessingTargetOutcome>(
    file: Blob,
    variant: JobVariant,
  ): { id: string; result: Promise<TOutcome> } {
    if (this.activeJob !== undefined) {
      this.cancelImageJob(this.activeJob.id);
    }

    const jobId = createImageJobId();
    let resolveResult: (outcome: TOutcome) => void = () => {};
    const result = new Promise<TOutcome>((resolve) => {
      resolveResult = resolve;
    });
    // `variant.resolve` is a no-op placeholder passed in by the caller
    // (processImage/processImageToTarget); it is replaced here with the
    // real settle function for this specific job's result Promise. The
    // cast is safe because `beginJob`'s TOutcome is always instantiated by
    // the caller to match `variant.kind` (see the two public methods
    // above), which is also what `finish()` relies on when resolving.
    const resolvedVariant: JobVariant =
      variant.kind === 'standard'
        ? { ...variant, resolve: resolveResult as unknown as (outcome: ImageProcessingOutcome) => void }
        : { ...variant, resolve: resolveResult as unknown as (outcome: ImageProcessingTargetOutcome) => void };
    const activeJob: ActiveJob = {
      id: jobId,
      file,
      variant: resolvedVariant,
      settled: false,
    };

    this.activeJob = activeJob;
    this.reportProgress(activeJob, 'preflighting');
    void this.start(activeJob);

    return { id: jobId, result };
  }

  public cancelImageJob(jobId: string): boolean {
    const job = this.activeJob;

    if (job === undefined || job.id !== jobId || job.settled) {
      return false;
    }

    if (job.worker !== undefined) {
      try {
        job.worker.postMessage({ type: 'CANCEL_JOB', jobId });
      } catch {
        // Hard termination below is the cancellation guarantee.
      }
    }

    this.finish(job, {
      status: 'cancelled',
      error: processingCancelled(),
    });

    return true;
  }

  private async start(job: ActiveJob): Promise<void> {
    let resolvedTargetOptions: ResolvedTargetOptions | undefined;

    if (job.variant.kind === 'standard') {
      const validationError = validateProcessImageOptions(job.variant.options);

      if (validationError !== undefined) {
        this.finish(job, { status: 'failed', error: validationError });
        return;
      }
    } else {
      const validation = validateProcessImageToTargetOptions(job.variant.options);

      if (validation.error !== undefined) {
        this.finish(job, { status: 'failed', error: validation.error });
        return;
      }

      resolvedTargetOptions = validation.resolved;
    }

    let preflight;

    try {
      preflight = await preflightImage(job.file);
    } catch {
      this.finish(job, {
        status: 'failed',
        error: createProcessingError(
          IMAGE_PROCESSING_ERROR_CODES.InvalidRequest,
          'The processing safety configuration is invalid.',
        ),
      });
      return;
    }

    if (job.settled || this.activeJob?.id !== job.id) {
      return;
    }

    if (preflight.status === 'rejected') {
      this.finish(job, {
        status: 'failed',
        error: fromPreflightError(preflight.error),
      });
      return;
    }

    if (!preflight.result.safeToDecode) {
      this.finish(job, {
        status: 'failed',
        error: createProcessingError(
          IMAGE_PROCESSING_ERROR_CODES.WorkerFailed,
          'The image did not pass the mandatory safety gate.',
        ),
      });
      return;
    }

    if (this.requiresGlobalWorker && typeof Worker === 'undefined') {
      this.finish(job, {
        status: 'failed',
        error: createProcessingError(
          IMAGE_PROCESSING_ERROR_CODES.RuntimeUnsupported,
          'This browser does not provide the required Web Worker runtime.',
          { webWorker: false },
        ),
      });
      return;
    }

    let worker: ImageWorkerLike;

    try {
      worker = this.createWorker();
    } catch {
      this.finish(job, {
        status: 'failed',
        error: createProcessingError(
          IMAGE_PROCESSING_ERROR_CODES.RuntimeUnsupported,
          'The image worker could not be created in this browser.',
        ),
      });
      return;
    }

    job.worker = worker;
    worker.onmessage = (event) => {
      this.handleWorkerEvent(job, event.data);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      this.failWorker(job);
    };
    worker.onmessageerror = () => {
      this.failWorker(job);
    };

    try {
      if (job.variant.kind === 'standard') {
        worker.postMessage({
          type: 'PROCESS_IMAGE',
          jobId: job.id,
          request: {
            file: job.file,
            preflight: preflight.result,
            ...(job.variant.options.resize === undefined
              ? {}
              : { resize: job.variant.options.resize }),
            output: job.variant.options.output,
          },
        });
      } else {
        // resolvedTargetOptions is always defined on this branch: the
        // 'target' variant either returned above on validation failure or
        // reaches here with `resolvedTargetOptions` set.
        const resolved = resolvedTargetOptions!;

        worker.postMessage({
          type: 'PROCESS_IMAGE_TO_TARGET',
          jobId: job.id,
          request: {
            file: job.file,
            preflight: preflight.result,
            targetBytes: resolved.targetBytes,
            output: resolved.output,
            ...(resolved.dimensions === undefined ? {} : { dimensions: resolved.dimensions }),
            dimensionPolicy: resolved.dimensionPolicy,
            qualityRange: resolved.qualityRange,
          },
        });
      }
    } catch {
      this.failWorker(job);
    }
  }

  private handleWorkerEvent(job: ActiveJob, value: unknown): void {
    if (
      job.settled ||
      this.activeJob?.id !== job.id ||
      !isImageWorkerEvent(value) ||
      value.jobId !== job.id
    ) {
      return;
    }

    const event: ImageWorkerEvent = value;

    switch (event.type) {
      case 'JOB_ACCEPTED':
        this.reportProgress(job, 'accepted');
        break;
      case 'JOB_PROGRESS':
        this.reportProgress(job, event.stage);
        break;
      case 'JOB_COMPLETE':
        this.reportProgress(job, 'complete');
        this.finish(job, { status: 'complete', result: event.result });
        break;
      case 'JOB_COMPLETE_TARGET':
        this.reportProgress(job, 'complete');

        if (event.outcome.status === 'met') {
          this.finish(job, { status: 'complete', result: event.outcome.result });
        } else {
          this.finish(job, { status: 'unreachable', outcome: event.outcome.outcome });
        }

        break;
      case 'JOB_FAILED':
        this.finish(job, { status: 'failed', error: event.error });
        break;
      case 'JOB_CANCELLED':
        this.finish(job, {
          status: 'cancelled',
          error: processingCancelled(),
        });
        break;
    }
  }

  private failWorker(job: ActiveJob): void {
    this.finish(job, {
      status: 'failed',
      error: createProcessingError(
        IMAGE_PROCESSING_ERROR_CODES.WorkerFailed,
        'The image worker stopped before completing the job.',
      ),
    });
  }

  private reportProgress(
    job: ActiveJob,
    stage: ImageProcessingProgress['stage'],
  ): void {
    try {
      job.variant.options.onProgress?.({ jobId: job.id, stage });
    } catch {
      // Consumer callbacks cannot interrupt or corrupt the processing lifecycle.
    }
  }

  private finish(
    job: ActiveJob,
    outcome: ImageProcessingOutcome | ImageProcessingTargetOutcome,
  ): void {
    if (job.settled) {
      return;
    }

    job.settled = true;

    if (job.worker !== undefined) {
      job.worker.onmessage = null;
      job.worker.onerror = null;
      job.worker.onmessageerror = null;
      job.worker.terminate();
      job.worker = undefined;
    }

    if (this.activeJob?.id === job.id) {
      this.activeJob = undefined;
    }

    if (job.variant.kind === 'standard') {
      job.variant.resolve(outcome as ImageProcessingOutcome);
    } else {
      job.variant.resolve(outcome as ImageProcessingTargetOutcome);
    }
  }
}

const defaultRuntime = new ImageProcessingRuntime();

export function processImage(
  file: Blob,
  options: ProcessImageOptions,
): ImageProcessingJob {
  return defaultRuntime.processImage(file, options);
}

export function processImageToTarget(
  file: Blob,
  options: ProcessImageToTargetOptions,
): ImageProcessingTargetJob {
  return defaultRuntime.processImageToTarget(file, options);
}

export function cancelImageJob(jobId: string): boolean {
  return defaultRuntime.cancelImageJob(jobId);
}
