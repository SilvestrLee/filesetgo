import type { FileSetGoProcessingError, ImageProcessingStage } from '@filesetgo/core';

import type { ProcessingPhase } from './processing-phase';

/**
 * The one visual truth for a given phase (FSG-007-FIT-003-R1 directive
 * §1/§15) — eyebrow, title, and supporting status text all change together,
 * so a dialog can never show a "preparing"/"building" eyebrow while the
 * status underneath already says the file is ready, failed, or cancelled.
 */
export interface ProcessingStateText {
  eyebrow: string;
  title: string;
  status: string;
}

/**
 * Per-tool, per-stage copy (FSG-007-FIT-003 directive §16/§20; extended by
 * R1 directive §15) — one small const object per controller, mirroring the
 * existing `LOGO_PACK_PREVIEW_STAGE_COPY`/`describeLogoPackPreviewStage`
 * precedent (`resources/js/quick-fit/controller.ts`). Task-specific nouns
 * vary (file / Hero image / logo pack); the phase grammar itself — one
 * `ProcessingStateText` per phase — is shared.
 */
export interface ProcessingCopy {
  preparing: (stage: ImageProcessingStage) => ProcessingStateText;
  validating: (stage: ImageProcessingStage) => ProcessingStateText;
  ready: ProcessingStateText;
  failed: (error: FileSetGoProcessingError) => ProcessingStateText;
  cancelled: ProcessingStateText;
}

export interface ProcessingSectionElements {
  /** The wrapping element carrying `data-phase` — drives the shared FILE→SET→GO CSS/SVG graphic (`.fsg-processing-glyph`). */
  root: HTMLElement;
  eyebrow: HTMLElement;
  title: HTMLElement;
  /** The `role="status"` paragraph announcing real transitions. */
  statusText: HTMLElement;
}

/** Only these three phases drive the graphic — failed/cancelled fall back to its dim, static baseline rather than implying partial success. */
const GLYPH_PHASE: Partial<Record<ProcessingPhase['kind'], string>> = {
  preparing: 'preparing',
  validating: 'validating',
  ready: 'ready',
};

/** The `data-phase` value a `ProcessingPhase` maps to on `.fsg-processing-glyph`, or `undefined` to clear it (dim, static baseline). Exported so a caller with its own bespoke text (Guided Fit — see controller.ts) can still drive the one shared glyph without duplicating this mapping. */
export function glyphPhaseAttribute(phase: ProcessingPhase): string | undefined {
  return GLYPH_PHASE[phase.kind];
}

/** Resolves one `ProcessingCopy` table + `ProcessingPhase` into the single `ProcessingStateText` that phase must show — the one place a phase-to-copy branch exists, so every caller (the shared renderer and any bespoke one, e.g. Guided Fit's) stays in agreement. */
export function resolveProcessingStateText(phase: ProcessingPhase, copy: ProcessingCopy): ProcessingStateText {
  switch (phase.kind) {
    case 'preparing':
      return copy.preparing(phase.stage);
    case 'validating':
      return copy.validating(phase.stage);
    case 'ready':
      return copy.ready;
    case 'failed':
      return copy.failed(phase.error);
    case 'cancelled':
      return copy.cancelled;
    default:
      return { eyebrow: '', title: '', status: '' };
  }
}

/**
 * Updates the shared processing section's `data-phase` attribute (pure
 * CSS/SVG, no JS animation loop — see `.fsg-processing-glyph` in
 * `app.css`), its eyebrow/title, and its `role="status"` text from one
 * `ProcessingPhase` + `ProcessingCopy` pair. Called identically by Quick
 * Fit and Logo Pack's own render passes (Guided Fit keeps its own bespoke
 * text ternary for the 'unreachable' case it must additionally cover, but
 * still resolves through `resolveProcessingStateText`/`glyphPhaseAttribute`
 * for the phases that model does represent).
 */
export function renderProcessingSection(elements: ProcessingSectionElements, phase: ProcessingPhase, copy: ProcessingCopy): void {
  const glyphPhase = glyphPhaseAttribute(phase);

  if (glyphPhase === undefined) {
    delete elements.root.dataset.phase;
  } else {
    elements.root.dataset.phase = glyphPhase;
  }

  const text = resolveProcessingStateText(phase, copy);
  elements.eyebrow.textContent = text.eyebrow;
  elements.title.textContent = text.title;
  elements.statusText.textContent = text.status;
}
