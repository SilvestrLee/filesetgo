import type {
  getRuntimeCapabilities as GetRuntimeCapabilities,
  ImageProcessingJob,
  ImageProcessingTargetJob,
  preflightImage as PreflightImage,
  processImage as ProcessImage,
  processImageToTarget as ProcessImageToTarget,
  ProcessedImageResult,
  TargetSizeResult,
} from '@filesetgo/core';

import { buildOutputFilename } from './filename';
import { planProcessing, type QuickFitRequirements } from './request-plan';
import type { QuickFitSource, QuickFitState } from './state';
import { isRunnable, sourceOf } from './state';

/**
 * The exact slice of `@filesetgo/core` the workflow needs, injected rather
 * than imported directly — this is what lets orchestration tests (FSG-003
 * directive §52) exercise every routing/cancellation/error path with a
 * plain fake object instead of a module mock.
 */
export interface QuickFitCoreClient {
  preflightImage: typeof PreflightImage;
  processImage: typeof ProcessImage;
  processImageToTarget: typeof ProcessImageToTarget;
  getRuntimeCapabilities: typeof GetRuntimeCapabilities;
}

export interface QuickFitWorkflowOptions {
  core: QuickFitCoreClient;
  /** Defaults to the global `URL.createObjectURL`. */
  createObjectUrl?: (blob: Blob) => string;
  /** Defaults to the global `URL.revokeObjectURL`. */
  revokeObjectUrl?: (url: string) => void;
}

type ActiveJob = ImageProcessingJob | ImageProcessingTargetJob;

function defaultCreateObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

function defaultRevokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Orchestrates the Quick Fit workflow: file selection/preflight, routing a
 * requirement set to the correct core API, tracking the active job, and
 * producing the typed `QuickFitState` the public shell renders. Contains
 * no DOM access — `resources/js/quick-fit/controller.ts` is the only layer
 * that touches `document`.
 */
export class QuickFitWorkflow {
  private readonly core: QuickFitCoreClient;
  private readonly createObjectUrl: (blob: Blob) => string;
  private readonly revokeObjectUrl: (url: string) => void;
  private state: QuickFitState = { status: 'idle' };
  private readonly listeners = new Set<(state: QuickFitState) => void>();
  private selectionSequence = 0;
  private activeJob: ActiveJob | undefined;
  private activeResultUrl: string | undefined;

  public constructor(options: QuickFitWorkflowOptions) {
    this.core = options.core;
    this.createObjectUrl = options.createObjectUrl ?? defaultCreateObjectUrl;
    this.revokeObjectUrl = options.revokeObjectUrl ?? defaultRevokeObjectUrl;
  }

  public getState(): QuickFitState {
    return this.state;
  }

  public subscribe(listener: (state: QuickFitState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(state: QuickFitState): void {
    this.state = state;

    for (const listener of this.listeners) {
      listener(state);
    }
  }

  private releaseResultUrl(): void {
    if (this.activeResultUrl !== undefined) {
      this.revokeObjectUrl(this.activeResultUrl);
      this.activeResultUrl = undefined;
    }
  }

  /**
   * Requests cancellation of the active job, if any, without clearing
   * `this.activeJob` itself — the job's own `result` settlement (handled
   * in `run()`'s `.then` callback) is what actually clears it and
   * transitions state to 'cancelled'. Callers that need the workflow to
   * move on immediately (reset, a replacement file selection) rely on the
   * selection-sequence guard in that same callback to ignore the job's
   * eventual settlement instead.
   */
  private cancelActiveJob(): void {
    this.activeJob?.cancel();
  }

  /**
   * Inspects a newly chosen file. Cancels any active job and invalidates
   * any prior result first (FSG-003 directive §43) so a result belonging
   * to a previous file can never be shown against the new one, and a
   * superseded selection's own preflight result is discarded even if it
   * resolves after an even-newer selection has already started.
   */
  public async selectFile(file: File): Promise<void> {
    this.selectionSequence += 1;
    const selection = this.selectionSequence;

    this.cancelActiveJob();
    this.releaseResultUrl();
    this.setState({ status: 'inspecting', file });

    const outcome = await this.core.preflightImage(file);

    if (selection !== this.selectionSequence) {
      return;
    }

    if (outcome.status === 'rejected') {
      this.setState({ status: 'file-rejected', file, message: outcome.error.message });
      return;
    }

    this.setState({ status: 'ready', source: { file, preflight: outcome.result } });
  }

  /**
   * Starts processing for the current source using the given requirements.
   * A no-op when there is no current source, a job is already active, or
   * the requirements describe no meaningful transformation.
   */
  public run(requirements: QuickFitRequirements): void {
    if (!isRunnable(this.state)) {
      return;
    }

    const source = sourceOf(this.state);

    if (source === undefined) {
      return;
    }

    const selection = this.selectionSequence;
    const plan = planProcessing(requirements, (event) => {
      if (selection === this.selectionSequence && this.state.status === 'processing') {
        this.setState({ ...this.state, stage: event.stage });
      }
    });

    if (plan.kind === 'none') {
      return;
    }

    if (plan.kind === 'standard') {
      const job = this.core.processImage(source.file, plan.options);
      this.activeJob = job;
      this.setState({ status: 'processing', source, jobId: job.jobId, stage: 'preflighting' });

      void job.result.then((outcome) => {
        if (selection !== this.selectionSequence || this.activeJob !== job) {
          return;
        }

        this.activeJob = undefined;

        if (outcome.status === 'cancelled') {
          this.setState({ status: 'cancelled', source });
        } else if (outcome.status === 'failed') {
          this.setState({ status: 'failed', source, error: outcome.error });
        } else {
          this.settleSuccess(source, outcome.result);
        }
      });

      return;
    }

    const job = this.core.processImageToTarget(source.file, plan.options);
    this.activeJob = job;
    this.setState({ status: 'processing', source, jobId: job.jobId, stage: 'preflighting' });

    void job.result.then((outcome) => {
      if (selection !== this.selectionSequence || this.activeJob !== job) {
        return;
      }

      this.activeJob = undefined;

      if (outcome.status === 'cancelled') {
        this.setState({ status: 'cancelled', source });
      } else if (outcome.status === 'failed') {
        this.setState({ status: 'failed', source, error: outcome.error });
      } else if (outcome.status === 'unreachable') {
        this.setState({ status: 'unreachable', source, outcome: outcome.outcome });
      } else {
        this.settleSuccess(source, outcome.result);
      }
    });
  }

  private settleSuccess(source: QuickFitSource, data: ProcessedImageResult | TargetSizeResult): void {
    this.releaseResultUrl();

    const downloadUrl = this.createObjectUrl(data.blob);
    this.activeResultUrl = downloadUrl;
    const filename = buildOutputFilename(source.file.name, data.format);

    this.setState({ status: 'success', result: { source, data, downloadUrl, filename } });
  }

  /** Cancels the active job, if any. Distinct from `reset()` — the source and any prior result remain intact (FSG-003 directive §65). */
  public cancel(): void {
    this.cancelActiveJob();
  }

  /** Cancels any active job, releases the current result URL, and returns to idle (FSG-003 directive §26). */
  public reset(): void {
    this.selectionSequence += 1;
    this.cancelActiveJob();
    this.releaseResultUrl();
    this.setState({ status: 'idle' });
  }
}
