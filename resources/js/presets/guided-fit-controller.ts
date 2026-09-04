import { sourceOf, type QuickFitState } from '../quick-fit/state';
import { QuickFitWorkflow } from '../quick-fit/workflow';
import { compilePreset } from './compiler';
import type { FileSetGoPreset } from './contracts';
import { evaluateAlreadyReady } from './already-ready';
import { presetToQuickFitFormValues, type QuickFitPrefill } from './quick-fit-mapping';
import { getPresetById, tryGetPresetById } from './registry';

export type QuickFitMode = 'quick-fit' | 'guided-fit';

/**
 * Guided Fit's product-layer state, layered on top of the shared, unmodified
 * `QuickFitWorkflow` (FSG-004 directive §22/§23). This class owns only
 * mode/preset selection — it never duplicates processing, decoding, or
 * target-size search, and it never adds preset concepts to the generic
 * `QuickFitState` core-processing contracts. It composes the workflow via
 * its existing public API (`selectFile`, `run`, `cancel`, `reset`,
 * `subscribe`, `getState`) exactly as `controller.ts`'s Quick Fit form does.
 */
export class GuidedFitController {
  private readonly workflow: QuickFitWorkflow;
  private mode: QuickFitMode = 'quick-fit';
  private selectedPresetId: string | undefined;
  /** The preset that produced the workflow's *current* result, if any (directive §23/§28). */
  private resultPresetId: string | undefined;
  private readonly listeners = new Set<() => void>();

  public constructor(workflow: QuickFitWorkflow) {
    this.workflow = workflow;
    this.workflow.subscribe((state) => this.handleWorkflowState(state));
  }

  private handleWorkflowState(state: QuickFitState): void {
    // A new file selection always passes through 'inspecting' first, and a
    // full reset returns to 'idle' — both invalidate any preset context
    // tied to a previous source/result (directive §51: replacement file
    // invalidates prior Guided Fit result; reset clears preset state).
    if (state.status === 'inspecting') {
      this.resultPresetId = undefined;
    }

    if (state.status === 'idle') {
      this.resultPresetId = undefined;
      this.selectedPresetId = undefined;
    }

    this.notify();
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

  public getMode(): QuickFitMode {
    return this.mode;
  }

  /** A normal mode toggle never processes and never touches manual Quick Fit values (directive §26/§27). */
  public setMode(mode: QuickFitMode): void {
    if (this.workflow.getState().status === 'processing') {
      return;
    }

    this.mode = mode;
    this.notify();
  }

  public getSelectedPresetId(): string | undefined {
    return this.selectedPresetId;
  }

  public selectPreset(id: string): void {
    if (this.workflow.getState().status === 'processing') {
      return;
    }

    if (tryGetPresetById(id) === undefined) {
      throw new Error(`Cannot select unknown FileSetGo preset id: ${id}`);
    }

    this.selectedPresetId = id;
    this.notify();
  }

  public currentPreset(): FileSetGoPreset | undefined {
    return this.selectedPresetId === undefined ? undefined : getPresetById(this.selectedPresetId);
  }

  /** The preset the *current* workflow result (success/unreachable) was actually prepared for, if any. */
  public getResultPresetId(): string | undefined {
    return this.resultPresetId;
  }

  /** undefined when there is no source and/or no preset selected yet to evaluate against. */
  public alreadyReady(): boolean | undefined {
    const source = sourceOf(this.workflow.getState());
    const preset = this.currentPreset();

    if (source === undefined || preset === undefined) {
      return undefined;
    }

    return evaluateAlreadyReady(source.preflight, preset);
  }

  /** Compiles the selected preset and runs it through the shared workflow — no separate processing path (directive §22). */
  public runSelectedPreset(): void {
    const source = sourceOf(this.workflow.getState());
    const preset = this.currentPreset();

    if (source === undefined || preset === undefined) {
      return;
    }

    this.resultPresetId = preset.id;
    this.workflow.run(compilePreset(preset, source.preflight.format));
  }

  /**
   * Switches to Quick Fit and returns the selected preset's prefill values
   * for the manual form (directive §24/§25). This is the *only* thing that
   * ever overwrites manual Quick Fit values — a plain `setMode()` never
   * does. Returns undefined (and does nothing) if no preset is selected.
   */
  public adjustSettings(): QuickFitPrefill | undefined {
    const preset = this.currentPreset();

    if (preset === undefined) {
      return undefined;
    }

    this.mode = 'quick-fit';
    this.notify();

    return presetToQuickFitFormValues(preset);
  }
}
