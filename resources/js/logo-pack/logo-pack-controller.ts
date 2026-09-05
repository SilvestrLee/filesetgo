import type {
  BackgroundRemovalStrength,
  FileSetGoProcessingError,
  ImageProcessingSetJob,
  ImageProcessingStage,
  ImageSetResult,
  PrepareTransparentMasterOptions,
  ProcessImageSetOptions,
  TransparentMasterJob,
  TransparentMasterResult,
} from '@filesetgo/core';

import { sourceOf } from '../quick-fit/state';
import type { QuickFitWorkflow } from '../quick-fit/workflow';
import { compileLogoPackRequest } from './compiler';
import type { LogoBackgroundMode } from './spec';
import { assessLogoPackSuitability, type LogoPackSuitability } from './suitability';

/** FSG-005C directive §15: Balanced is the governed default the moment the user explicitly chooses Transparent. */
const DEFAULT_REMOVAL_STRENGTH: BackgroundRemovalStrength = 'balanced';

export type LogoPackState =
  | { status: 'idle' }
  | { status: 'preparing-preview'; jobId: string; stage?: ImageProcessingStage }
  | { status: 'preview-ready'; master: TransparentMasterResult }
  | { status: 'preview-failed'; error: FileSetGoProcessingError }
  | { status: 'processing'; jobId: string }
  | { status: 'success'; result: ImageSetResult }
  | { status: 'failed'; error: FileSetGoProcessingError }
  | { status: 'cancelled' };

export interface LogoPackCoreClient {
  processImageSet: (file: Blob, options: ProcessImageSetOptions) => ImageProcessingSetJob;
  prepareTransparentMaster: (file: Blob, options: PrepareTransparentMasterOptions) => TransparentMasterJob;
}

/**
 * Logo Pack's product-layer state, composing the *same* shared
 * `QuickFitWorkflow` instance Quick Fit/Guided Fit use (directive §8) —
 * purely to read the currently selected source, never to run a
 * `QuickFitRequirements` job through it. Logo Pack drives its own
 * `processImageSet()`/`prepareTransparentMaster()` jobs directly, since
 * neither request shape has anything to do with Quick Fit's requirement
 * contract.
 *
 * FSG-005C extends this controller with the explicit background-mode
 * choice (directive §5) and, for Transparent mode, a two-stage pipeline —
 * prepare-and-verify a transparent master, preview it, then package from
 * that verified master (directive §8/§31) — while Original mode keeps the
 * original single-stage packaging flow directive §7 always used.
 */
export class LogoPackController {
  private readonly workflow: QuickFitWorkflow;
  private readonly core: LogoPackCoreClient;
  private state: LogoPackState = { status: 'idle' };
  private mode: LogoBackgroundMode | undefined;
  private strength: BackgroundRemovalStrength = DEFAULT_REMOVAL_STRENGTH;
  private activePreviewJob: TransparentMasterJob | undefined;
  private activePackageJob: ImageProcessingSetJob | undefined;
  private readonly listeners = new Set<() => void>();

  public constructor(workflow: QuickFitWorkflow, core: LogoPackCoreClient) {
    this.workflow = workflow;
    this.core = core;

    // A new file selection always passes through 'inspecting' first, and a
    // full reset returns to 'idle' — both invalidate any Logo Pack result
    // (and background-mode choice, preview, strength — directive §6) tied
    // to a previous source, mirroring GuidedFitController's identical
    // stale-result-clearing pattern.
    this.workflow.subscribe((workflowState) => {
      if (workflowState.status === 'inspecting' || workflowState.status === 'idle') {
        this.clearOwnState();
      }
    });
  }

  public getState(): LogoPackState {
    return this.state;
  }

  /** undefined until the user explicitly chooses (directive §5 — never inferred, never preselected). */
  public getMode(): LogoBackgroundMode | undefined {
    return this.mode;
  }

  public getStrength(): BackgroundRemovalStrength {
    return this.strength;
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

  /**
   * Records the user's explicit background choice (directive §5). Choosing
   * Transparent immediately starts preparing (and verifying) a transparent
   * master at the governed default strength (directive §15/§28); choosing
   * Original cancels any in-flight preview preparation and returns to a
   * plain idle state, since Original mode has no preview stage.
   */
  public selectBackgroundMode(mode: LogoBackgroundMode): void {
    this.mode = mode;

    if (mode === 'original') {
      this.activePreviewJob?.cancel();
      this.activePreviewJob = undefined;
      this.setState({ status: 'idle' });
      return;
    }

    this.strength = DEFAULT_REMOVAL_STRENGTH;
    this.runPreviewPreparation();
  }

  /**
   * Changing strength regenerates the transparent master and preview
   * (directive §15). A no-op outside Transparent mode.
   */
  public setRemovalStrength(strength: BackgroundRemovalStrength): void {
    if (this.mode !== 'transparent') {
      return;
    }

    this.strength = strength;
    this.runPreviewPreparation();
  }

  /** Re-runs transparent-master preparation after a worker-level failure or cancellation (directive §22 — retry without a page refresh). */
  public retryTransparentPreview(): void {
    if (this.mode !== 'transparent') {
      return;
    }

    this.runPreviewPreparation();
  }

  private runPreviewPreparation(): void {
    const source = sourceOf(this.workflow.getState());

    if (source === undefined) {
      return;
    }

    // Starting a transparent-master job shares the same single active-job
    // slot as the packaging job (directive §21) — the runtime cancels
    // whichever job (of either kind) is currently active. Clearing this
    // reference first prevents that job's eventual 'cancelled' resolution
    // from later stomping on the new preview state (mirrors the same
    // stale-job protection `createLogoPack()` uses for the reverse case).
    this.activePackageJob = undefined;

    const job = this.core.prepareTransparentMaster(source.file, {
      strength: this.strength,
      // Referencing `this.state.jobId` rather than `job` here is
      // deliberate: `beginJob()` reports the first progress stage
      // synchronously, before this call even returns and `job` is
      // assigned — capturing `job` in this closure would be a genuine
      // temporal-dead-zone hazard, not just a style preference.
      onProgress: (event) => {
        if (this.state.status === 'preparing-preview') {
          this.setState({ status: 'preparing-preview', jobId: this.state.jobId, stage: event.stage });
        }
      },
    });
    this.activePreviewJob = job;
    this.setState({ status: 'preparing-preview', jobId: job.jobId });

    void job.result.then((outcome) => {
      if (this.activePreviewJob !== job) {
        return;
      }

      this.activePreviewJob = undefined;

      if (outcome.status === 'cancelled') {
        this.setState({ status: 'cancelled' });
      } else if (outcome.status === 'failed') {
        this.setState({ status: 'preview-failed', error: outcome.error });
      } else {
        this.setState({ status: 'preview-ready', master: outcome.result });
      }
    });
  }

  /**
   * A no-op without a source or a chosen mode, while already processing, or
   * when suitability is blocking (directive §26/§27 of FSG-005B). In
   * Transparent mode, also a no-op until a verified/needs-review preview is
   * ready — a FAILED transparent master must never be packaged (directive
   * §28).
   */
  public createLogoPack(): void {
    if (this.state.status === 'processing') {
      return;
    }

    if (this.mode === undefined) {
      return;
    }

    const source = sourceOf(this.workflow.getState());

    if (source === undefined) {
      return;
    }

    if (assessLogoPackSuitability(source.preflight).blocked) {
      return;
    }

    let packageSource: Blob;

    if (this.mode === 'transparent') {
      if (this.state.status !== 'preview-ready' || this.state.master.status === 'failed') {
        return;
      }

      // The verified transparent master — never the original file — is the
      // authoritative source for transparent-mode packaging (directive §31).
      packageSource = this.state.master.blob;
    } else {
      packageSource = source.file;
    }

    // See runPreviewPreparation()'s identical comment for why this stale
    // reference must be cleared before starting a job of the other kind.
    this.activePreviewJob = undefined;

    const request = compileLogoPackRequest(this.mode, source.file.name);
    const job = this.core.processImageSet(packageSource, request);
    this.activePackageJob = job;
    this.setState({ status: 'processing', jobId: job.jobId });

    void job.result.then((outcome) => {
      if (this.activePackageJob !== job) {
        return;
      }

      this.activePackageJob = undefined;

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
    this.activePreviewJob?.cancel();
    this.activePackageJob?.cancel();
  }

  private clearOwnState(): void {
    this.activePreviewJob?.cancel();
    this.activePreviewJob = undefined;
    this.activePackageJob?.cancel();
    this.activePackageJob = undefined;
    this.mode = undefined;
    this.strength = DEFAULT_REMOVAL_STRENGTH;
    this.setState({ status: 'idle' });
  }

  public reset(): void {
    this.clearOwnState();
  }
}
