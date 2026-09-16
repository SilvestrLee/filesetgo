/**
 * The one shared "reveal-then-close" state machine behind the atomic
 * Ready → close-modal + populate-GO handoff (FSG-007-FIT-003 directive
 * §10/§16/§26). A real result already exists the instant the underlying
 * job settles to 'success' — this gate exists purely to hold the dialog
 * open for one truthful, perceptible "Ready" beat before closing it, and
 * to guarantee that closing the dialog and populating GO always happen
 * together, in the same synchronous callback, with no code path where one
 * happens without the other.
 *
 * This generalizes the one-shot `guidedFitAutoClosedForSuccess` boolean
 * Guided Fit already used (FSG-007-FIT-002) into a single mechanism shared
 * by Quick Fit, Guided Fit, and Logo Pack, rather than three copies of the
 * same one-shot idiom.
 */
export type RevealGateState = 'idle' | 'awaiting-reveal' | 'revealed';

/** The narrow surface `processing-phase.ts`'s adapters actually need — lets them be unit-tested against a plain stub instead of a real `RevealGate` (which touches `window`, so it has no unit test file of its own; see `shared/tests/processing-phase.test.ts`). */
export interface RevealGateReader {
  isRevealed(): boolean;
}

export class RevealGate implements RevealGateReader {
  private state: RevealGateState = 'idle';
  private timer: number | undefined;

  /**
   * Call on every render while the underlying job is in a terminal
   * 'success'-shaped state. Idempotent — a `render()` re-entrancy while
   * still awaiting reveal is a no-op, so `onReveal` can never double-fire.
   *
   * The real result already exists before this is ever called; the timer
   * here governs only when the modal closes and GO is populated, never
   * what text is shown or whether the job is actually done. Under
   * `prefers-reduced-motion`, the delay collapses to the next microtask
   * (never truly synchronous-in-place, to avoid a screen-reader race on
   * the status region) rather than the full tolerance.
   */
  public armIfNeeded(onReveal: () => void, minVisibleMs: number): void {
    if (this.state !== 'idle') {
      return;
    }

    this.state = 'awaiting-reveal';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.timer = window.setTimeout(() => {
      this.state = 'revealed';
      onReveal();
    }, reducedMotion ? 0 : minVisibleMs);
  }

  /** Call on any transition away from a success-shaped state (new source selected, workflow reset, dialog reopened for a fresh run). */
  public reset(): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }

    this.state = 'idle';
  }

  public isRevealed(): boolean {
    return this.state === 'revealed';
  }

  public isAwaitingReveal(): boolean {
    return this.state === 'awaiting-reveal';
  }
}
