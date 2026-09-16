import { getNormalizedDimensions, type CropRegion } from '@filesetgo/core';

import { checkGeometryApproval, isCropRequired, isUpscaleRequired } from '../quick-fit/crop';
import { sourceOf, type QuickFitState } from '../quick-fit/state';
import { QuickFitWorkflow } from '../quick-fit/workflow';
import { compilePreset } from './compiler';
import type { FileSetGoPreset } from './contracts';
import { evaluateAlreadyReady } from './already-ready';
import { presetToQuickFitFormValues, type QuickFitPrefill } from './quick-fit-mapping';
import { getPresetById, tryGetPresetById } from './registry';

export type QuickFitMode = 'quick-fit' | 'guided-fit' | 'logo-pack';

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
  /**
   * The user-approved crop/upscale decision for the currently selected
   * `exactDimensions` preset (FSG-007-FIT-002) — source-and-destination
   * specific, never reused across a preset switch or a source replacement
   * (see `selectPreset`/`handleWorkflowState`).
   */
  private confirmedCrop: CropRegion | undefined;
  private upscaleApproved = false;
  private readonly listeners = new Set<() => void>();

  /**
   * Optional extra "is something else blocking a mode switch" check, so
   * this class can remain the single owner of workspace-mode state without
   * needing to import a third controller (e.g. Logo Pack) directly.
   */
  private readonly isExternallyBlocked: () => boolean;

  public constructor(workflow: QuickFitWorkflow, isExternallyBlocked: () => boolean = () => false) {
    this.workflow = workflow;
    this.isExternallyBlocked = isExternallyBlocked;
    this.workflow.subscribe((state) => this.handleWorkflowState(state));
  }

  private handleWorkflowState(state: QuickFitState): void {
    // A new file selection always passes through 'inspecting' first, and a
    // full reset returns to 'idle' — both invalidate any preset context
    // tied to a previous source/result (directive §51: replacement file
    // invalidates prior Guided Fit result; reset clears preset state). A
    // crop/upscale approval confirmed against the OLD source's pixels is
    // meaningless against a new file, so both clear it too
    // (FSG-007-FIT-002: invalidate on any source change).
    if (state.status === 'inspecting') {
      this.resultPresetId = undefined;
      this.confirmedCrop = undefined;
      this.upscaleApproved = false;
    }

    if (state.status === 'idle') {
      this.resultPresetId = undefined;
      this.selectedPresetId = undefined;
      this.confirmedCrop = undefined;
      this.upscaleApproved = false;
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
    if (this.workflow.getState().status === 'processing' || this.isExternallyBlocked()) {
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
    // Unconditional on every call, including a redundant reselect of the
    // same id — a crop/upscale approval is destination-specific and must
    // never silently carry over to a (possibly different) destination
    // (FSG-007-FIT-002 directive: invalidate on any destination change).
    this.confirmedCrop = undefined;
    this.upscaleApproved = false;
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

  /**
   * The current source's dimensions in NORMALIZED (EXIF-oriented)
   * source-pixel space — the same space the worker's `exact.crop` operates
   * in, mirroring `controller.ts`'s `currentQuickFitSourceDimensions()`.
   */
  public sourceDimensions(): { width: number; height: number } | undefined {
    const source = sourceOf(this.workflow.getState());

    if (source === undefined) {
      return undefined;
    }

    return getNormalizedDimensions(source.preflight.width, source.preflight.height, source.preflight.orientation ?? 1);
  }

  /**
   * Whether reaching the selected preset's exact frame from the current
   * source requires a user-approved crop. `undefined` when there is no
   * source/preset to evaluate, or the preset isn't an `exactDimensions`
   * preset (a bounding-box preset never requires one).
   */
  public needsCrop(): boolean | undefined {
    const preset = this.currentPreset();
    const dimensions = this.sourceDimensions();

    if (preset === undefined || dimensions === undefined) {
      return undefined;
    }

    if (!preset.requirements.exactDimensions) {
      return false;
    }

    return isCropRequired(dimensions.width, dimensions.height, preset.requirements.maxWidth!, preset.requirements.maxHeight!);
  }

  /**
   * Whether reaching the selected preset's exact frame requires enlarging
   * beyond the EFFECTIVE source's own resolution — the confirmed crop's
   * dimensions when one exists, otherwise the full source, since cropping
   * can turn a previously-fine situation into one that requires upscaling.
   */
  public needsUpscale(): boolean | undefined {
    const preset = this.currentPreset();
    const dimensions = this.sourceDimensions();

    if (preset === undefined || dimensions === undefined) {
      return undefined;
    }

    if (!preset.requirements.exactDimensions) {
      return false;
    }

    const effectiveSource = this.confirmedCrop ?? dimensions;

    return isUpscaleRequired(effectiveSource, preset.requirements.maxWidth!, preset.requirements.maxHeight!);
  }

  public getConfirmedCrop(): CropRegion | undefined {
    return this.confirmedCrop;
  }

  public confirmCrop(crop: CropRegion): void {
    this.confirmedCrop = crop;
    this.notify();
  }

  public isUpscaleApproved(): boolean {
    return this.upscaleApproved;
  }

  public setUpscaleApproved(approved: boolean): void {
    this.upscaleApproved = approved;
    this.notify();
  }

  /** Compiles the selected preset and runs it through the shared workflow — no separate processing path (directive §22). */
  public runSelectedPreset(): void {
    const source = sourceOf(this.workflow.getState());
    const preset = this.currentPreset();

    if (source === undefined || preset === undefined) {
      return;
    }

    if (preset.requirements.exactDimensions) {
      const dimensions = this.sourceDimensions()!;
      // Defense-in-depth alongside the worker's own rejection — the
      // dialog's own step-gating should make this unreachable in practice
      // (FSG-007-FIT-002, mirroring Quick Fit's identical posture).
      const approval = checkGeometryApproval(
        dimensions,
        preset.requirements.maxWidth!,
        preset.requirements.maxHeight!,
        this.confirmedCrop,
        this.upscaleApproved,
      );

      if (!approval.ok) {
        return;
      }
    }

    this.resultPresetId = preset.id;
    this.workflow.run(compilePreset(preset, source.preflight.format, {
      crop: this.confirmedCrop,
      allowUpscale: this.upscaleApproved || undefined,
    }));
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
