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
import { validateProcessImageOptions } from '../processing/validate-request';
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

interface ActiveJob {
  id: string;
  file: Blob;
  options: ProcessImageOptions;
  resolve: (outcome: ImageProcessingOutcome) => void;
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
    if (this.activeJob !== undefined) {
      this.cancelImageJob(this.activeJob.id);
    }

    const jobId = createImageJobId();
    let resolveResult: (outcome: ImageProcessingOutcome) => void = () => {};
    const result = new Promise<ImageProcessingOutcome>((resolve) => {
      resolveResult = resolve;
    });
    const activeJob: ActiveJob = {
      id: jobId,
      file,
      options,
      resolve: resolveResult,
      settled: false,
    };

    this.activeJob = activeJob;
    this.reportProgress(activeJob, 'preflighting');
    void this.start(activeJob);

    return {
      jobId,
      result,
      cancel: () => {
        this.cancelImageJob(jobId);
      },
    };
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
    const validationError = validateProcessImageOptions(job.options);

    if (validationError !== undefined) {
      this.finish(job, { status: 'failed', error: validationError });
      return;
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
      worker.postMessage({
        type: 'PROCESS_IMAGE',
        jobId: job.id,
        request: {
          file: job.file,
          preflight: preflight.result,
          ...(job.options.resize === undefined
            ? {}
            : { resize: job.options.resize }),
          output: job.options.output,
        },
      });
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
      job.options.onProgress?.({ jobId: job.id, stage });
    } catch {
      // Consumer callbacks cannot interrupt or corrupt the processing lifecycle.
    }
  }

  private finish(job: ActiveJob, outcome: ImageProcessingOutcome): void {
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

    job.resolve(outcome);
  }
}

const defaultRuntime = new ImageProcessingRuntime();

export function processImage(
  file: Blob,
  options: ProcessImageOptions,
): ImageProcessingJob {
  return defaultRuntime.processImage(file, options);
}

export function cancelImageJob(jobId: string): boolean {
  return defaultRuntime.cancelImageJob(jobId);
}
