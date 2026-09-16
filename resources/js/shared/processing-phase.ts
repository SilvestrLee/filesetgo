import type { FileSetGoProcessingError, ImageProcessingStage } from '@filesetgo/core';

import type { LogoPackState } from '../logo-pack/logo-pack-controller';
import type { QuickFitState } from '../quick-fit/state';
import type { RevealGateReader } from './reveal-gate';

/**
 * The one shared processing-transition model behind Quick Fit, Guided Fit,
 * and Logo Pack's task dialogs (FSG-007-FIT-003). This is a derived,
 * UI-layer view computed from each tool's own existing, unmodified state
 * union — it does not replace or restructure `QuickFitState`/`LogoPackState`.
 *
 * `'validating'` is only ever reached for single-image jobs (Quick Fit,
 * Guided Fit): the worker's `'finalizing'` stage is exactly the window in
 * which `validateOutput()` genuinely re-decodes and re-checks the produced
 * Blob before the job resolves (`packages/core/src/workers/process-image.ts`).
 * Logo Pack's own real validation already happens per-asset, interleaved
 * inside `'encoding'` — so Logo Pack never reaches `'validating'` at all;
 * see `logoPackProcessingPhase` below.
 */
export type ProcessingPhase =
  | { kind: 'idle' }
  | { kind: 'preparing'; stage: ImageProcessingStage }
  | { kind: 'validating'; stage: ImageProcessingStage }
  | { kind: 'ready' }
  | { kind: 'failed'; error: FileSetGoProcessingError }
  | { kind: 'cancelled' };

/** True while a real job is active and un-cancelled — used to guard dismissal (header close/Escape/backdrop) so a running job is never silently abandoned. */
export function isActiveProcessingPhase(phase: ProcessingPhase): boolean {
  return phase.kind === 'preparing' || phase.kind === 'validating';
}

/**
 * Quick Fit and Guided Fit both read the same `QuickFitState` — one
 * adapter serves both dialogs. Once the reveal gate has actually fired,
 * the phase collapses back to 'idle': the dialog is closing/closed and GO
 * already holds the real result, so there is nothing left for the
 * processing section to show.
 */
export function quickFitProcessingPhase(state: QuickFitState, gate: RevealGateReader): ProcessingPhase {
  switch (state.status) {
    case 'processing':
      return state.stage === 'finalizing'
        ? { kind: 'validating', stage: state.stage }
        : { kind: 'preparing', stage: state.stage };
    case 'success':
      return gate.isRevealed() ? { kind: 'idle' } : { kind: 'ready' };
    case 'failed':
      return { kind: 'failed', error: state.error };
    case 'cancelled':
      return { kind: 'cancelled' };
    default:
      return { kind: 'idle' };
  }
}

/**
 * Logo Pack's own adapter — a second pure function with the same output
 * type, not a forced merge of `LogoPackState` into `QuickFitState`. Every
 * stage (including `'finalizing'`) maps to `'preparing'`: Logo Pack's real
 * per-asset validation already happens inside `'encoding'`, so there is no
 * separate truthful "validating" moment to claim here (see the module
 * doc comment above).
 */
export function logoPackProcessingPhase(state: LogoPackState, gate: RevealGateReader): ProcessingPhase {
  switch (state.status) {
    case 'processing':
      return { kind: 'preparing', stage: state.stage ?? 'accepted' };
    case 'success':
      return gate.isRevealed() ? { kind: 'idle' } : { kind: 'ready' };
    case 'failed':
      return { kind: 'failed', error: state.error };
    case 'cancelled':
      return { kind: 'cancelled' };
    default:
      return { kind: 'idle' };
  }
}
