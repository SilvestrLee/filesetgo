/**
 * Ensures a phase that's about to advance to 'ready' has genuinely been
 * visible (painted) for at least a minimum duration first — so a fast job
 * cannot jump Preparing → Ready → closed before a real user can perceive
 * any of it (FSG-007-FIT-003-R2). This governs *display* timing only: the
 * real job is never slowed down, never faked, and never delayed from
 * starting — see `armIfNeeded`'s "wait only the positive remainder" logic,
 * which adds nothing on top of a job that was already visibly preparing
 * for at least the minimum.
 *
 * The visibility clock only starts once a real paint has actually
 * occurred after the preparing UI first rendered — a double
 * `requestAnimationFrame` (the standard "wait for the next paint" idiom),
 * never the instant processing was merely requested.
 */
export class MinimumDwellGate {
  private visibleSince: number | undefined;
  private satisfied = false;
  private timer: number | undefined;

  /** Call on every render while the phase being dwelt on (e.g. 'preparing'/'validating') is showing. Idempotent — arms the paint-confirmation at most once per run. */
  public markVisible(): void {
    if (this.visibleSince !== undefined || this.satisfied) {
      return;
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.visibleSince = performance.now();
      });
    });
  }

  public isSatisfied(): boolean {
    return this.satisfied;
  }

  /**
   * Call once the real underlying work has finished. Arms a timer for
   * whatever remains of the minimum (zero if the job was already visible
   * that long or longer — never adds the full minimum on top of an
   * already-long-enough dwell), then calls `onSatisfied` exactly once.
   */
  public armIfNeeded(onSatisfied: () => void, minimumMs: number): void {
    if (this.satisfied || this.timer !== undefined) {
      return;
    }

    const elapsed = this.visibleSince !== undefined ? performance.now() - this.visibleSince : 0;
    const remaining = Math.max(0, minimumMs - elapsed);

    this.timer = window.setTimeout(() => {
      this.timer = undefined;
      this.satisfied = true;
      onSatisfied();
    }, remaining);
  }

  public reset(): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }

    this.visibleSince = undefined;
    this.satisfied = false;
  }
}
