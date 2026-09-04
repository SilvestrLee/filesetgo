import type {
  FileSetGoProcessingError,
  ImageProcessingSetJob,
  ImageSetResult,
  ProcessImageSetOptions,
} from '@filesetgo/core';

import { sourceOf } from '../quick-fit/state';
import type { QuickFitWorkflow } from '../quick-fit/workflow';
import { compileLogoPackRequest } from './compiler';
import { assessLogoPackSuitability, type LogoPackSuitability } from './suitability';

export type LogoPackState =
  | { status: 'idle' }
  | { status: 'processing'; jobId: string }
  | { status: 'success'; result: ImageSetResult }
  | { status: 'failed'; error: FileSetGoProcessingError }
  | { status: 'cancelled' };

export interface LogoPackCoreClient {
  processImageSet: (file: Blob, options: ProcessImageSetOptions) => ImageProcessingSetJob;
}

/**
 * Logo Pack's product-layer state, composing the *same* shared
 * `QuickFitWorkflow` instance Quick Fit/Guided Fit use (directive §8) —
 * purely to read the currently selected source, never to run a
 * `QuickFitRequirements` job through it. Logo Pack drives its own
 * `processImageSet()` job directly, since its request shape has nothing to
 * do with Quick Fit's requirement contract.
 */
export class LogoPackController {
  private readonly workflow: QuickFitWorkflow;
  private readonly core: LogoPackCoreClient;
  private state: LogoPackState = { status: 'idle' };
  private activeJob: ImageProcessingSetJob | undefined;
  private readonly listeners = new Set<() => void>();

  public constructor(workflow: QuickFitWorkflow, core: LogoPackCoreClient) {
    this.workflow = workflow;
    this.core = core;

    // A new file selection always passes through 'inspecting' first, and a
    // full reset returns to 'idle' — both invalidate any Logo Pack result
    // tied to a previous source (directive §48/§49), mirroring
    // GuidedFitController's identical stale-result-clearing pattern.
    this.workflow.subscribe((workflowState) => {
      if (workflowState.status === 'inspecting' || workflowState.status === 'idle') {
        this.clearOwnState();
      }
    });
  }

  public getState(): LogoPackState {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private setState(state: LogoPackState): void {
    this.state = state;
    this.notify();
  }

  /** undefined when there is no currently selected source to assess. */
  public suitability(): LogoPackSuitability | undefined {
    const source = sourceOf(this.workflow.getState());

    if (source === undefined) {
      return undefined;
    }

    return assessLogoPackSuitability(source.preflight);
  }

  /** A no-op without a source, while already processing, or when suitability is blocking (directive §26/§27). */
  public createLogoPack(): void {
    if (this.state.status === 'processing') {
      return;
    }

    const source = sourceOf(this.workflow.getState());

    if (source === undefined) {
      return;
    }

    if (assessLogoPackSuitability(source.preflight).blocked) {
      return;
    }

    const request = compileLogoPackRequest(source.file.name);
    const job = this.core.processImageSet(source.file, request);
    this.activeJob = job;
    this.setState({ status: 'processing', jobId: job.jobId });

    void job.result.then((outcome) => {
      if (this.activeJob !== job) {
        return;
      }

      this.activeJob = undefined;

      if (outcome.status === 'cancelled') {
        this.setState({ status: 'cancelled' });
      } else if (outcome.status === 'failed') {
        this.setState({ status: 'failed', error: outcome.error });
      } else {
        this.setState({ status: 'success', result: outcome.result });
      }
    });
  }

  public cancel(): void {
    this.activeJob?.cancel();
  }

  private clearOwnState(): void {
    this.activeJob?.cancel();
    this.activeJob = undefined;
    this.setState({ status: 'idle' });
  }

  public reset(): void {
    this.clearOwnState();
  }
}
