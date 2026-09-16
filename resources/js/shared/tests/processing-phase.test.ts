import { describe, expect, it } from 'vitest';

import type { FileSetGoProcessingError } from '@filesetgo/core';

import type { LogoPackState } from '../../logo-pack/logo-pack-controller';
import type { QuickFitSource, QuickFitState } from '../../quick-fit/state';
import { isActiveProcessingPhase, logoPackProcessingPhase, quickFitProcessingPhase } from '../processing-phase';

/**
 * `RevealGate` itself touches `window` (matchMedia/setTimeout), so — like
 * `locked-crop-stage.ts`'s DOM-wiring engine — it has no unit test file of
 * its own; it's exercised for real via Playwright
 * (`tests/browser/specs/processing-transition.spec.ts`). These adapter
 * functions only ever call `gate.isRevealed()`, so a plain structural stub
 * is enough to unit-test them in isolation.
 */
function gate(revealed: boolean): { isRevealed(): boolean } {
  return { isRevealed: () => revealed };
}

function source(): QuickFitSource {
  return {
    file: new File([new Uint8Array([1])], 'x.jpg'),
    preflight: { format: 'jpeg', width: 100, height: 100, megapixels: 0.01, fileSize: 1000, safeToDecode: true },
  };
}

const error: FileSetGoProcessingError = { code: 'OUTPUT_VALIDATION_FAILED', message: 'x', recoverable: true };

describe('quickFitProcessingPhase', () => {
  it('buckets every worker-sent stage into preparing, except finalizing which is validating', () => {
    const src = source();
    const preparingStages = ['preflighting', 'accepted', 'decoding', 'normalizing', 'optimizing', 'resizing', 'encoding', 'packaging'] as const;

    for (const stage of preparingStages) {
      const state: QuickFitState = { status: 'processing', source: src, jobId: 'j1', stage };
      expect(quickFitProcessingPhase(state, gate(false))).toEqual({ kind: 'preparing', stage });
    }

    const validating: QuickFitState = { status: 'processing', source: src, jobId: 'j1', stage: 'finalizing' };
    expect(quickFitProcessingPhase(validating, gate(false))).toEqual({ kind: 'validating', stage: 'finalizing' });
  });

  it('is "ready" once success is reached but not yet revealed, and collapses to "idle" once revealed', () => {
    const state: QuickFitState = {
      status: 'success',
      result: {
        source: source(),
        data: { blob: new Blob(['x']), width: 1, height: 1, format: 'jpeg', mimeType: 'image/jpeg', byteSize: 1, sourceDimensions: { width: 1, height: 1 }, normalizedDimensions: { width: 1, height: 1 }, resized: false },
        downloadUrl: 'blob:x',
        filename: 'x',
      },
    };

    expect(quickFitProcessingPhase(state, gate(false))).toEqual({ kind: 'ready' });
    expect(quickFitProcessingPhase(state, gate(true))).toEqual({ kind: 'idle' });
  });

  it('surfaces the real error on failed, and a distinct cancelled phase — never confusable with success', () => {
    const src = source();
    expect(quickFitProcessingPhase({ status: 'failed', source: src, error }, gate(false))).toEqual({ kind: 'failed', error });
    expect(quickFitProcessingPhase({ status: 'cancelled', source: src }, gate(false))).toEqual({ kind: 'cancelled' });
  });

  it('is idle for every state this milestone does not represent as a processing phase (idle/ready/unreachable)', () => {
    const src = source();
    expect(quickFitProcessingPhase({ status: 'idle' }, gate(false))).toEqual({ kind: 'idle' });
    expect(quickFitProcessingPhase({ status: 'ready', source: src }, gate(false))).toEqual({ kind: 'idle' });
    expect(quickFitProcessingPhase({ status: 'unreachable', source: src, outcome: { code: 'TARGET_UNREACHABLE_MIN_QUALITY', message: 'x', qualityProbeCount: 1, dimensionTierCount: 0 } }, gate(false))).toEqual({ kind: 'idle' });
  });
});

describe('logoPackProcessingPhase', () => {
  it('never reaches "validating" — every stage, including finalizing, is "preparing" (real validation already happens inside encoding for image-set jobs)', () => {
    const stages = ['decoding', 'normalizing', 'resizing', 'encoding', 'packaging', 'finalizing'] as const;

    for (const stage of stages) {
      const state: LogoPackState = { status: 'processing', jobId: 'j1', stage };
      expect(logoPackProcessingPhase(state, gate(false))).toEqual({ kind: 'preparing', stage });
    }
  });

  it('defaults to the "accepted" stage before the first real progress event has landed', () => {
    const state: LogoPackState = { status: 'processing', jobId: 'j1' };
    expect(logoPackProcessingPhase(state, gate(false))).toEqual({ kind: 'preparing', stage: 'accepted' });
  });

  it('mirrors Quick Fit\'s ready/idle-once-revealed and failed/cancelled behavior', () => {
    const successState: LogoPackState = { status: 'success', result: { assets: [], assetCount: 0, totalOutputBytes: 0 }, faviconSourceKind: 'full-logo' };
    expect(logoPackProcessingPhase(successState, gate(false))).toEqual({ kind: 'ready' });
    expect(logoPackProcessingPhase(successState, gate(true))).toEqual({ kind: 'idle' });
    expect(logoPackProcessingPhase({ status: 'failed', error }, gate(false))).toEqual({ kind: 'failed', error });
    expect(logoPackProcessingPhase({ status: 'cancelled' }, gate(false))).toEqual({ kind: 'cancelled' });
  });

  it('is idle for the preview-preparation states, which are a distinct, unrelated pipeline', () => {
    expect(logoPackProcessingPhase({ status: 'idle' }, gate(false))).toEqual({ kind: 'idle' });
    expect(logoPackProcessingPhase({ status: 'preparing-preview', jobId: 'j1' }, gate(false))).toEqual({ kind: 'idle' });
  });
});

describe('isActiveProcessingPhase', () => {
  it('is true only for preparing/validating — never ready, failed, cancelled or idle', () => {
    expect(isActiveProcessingPhase({ kind: 'preparing', stage: 'decoding' })).toBe(true);
    expect(isActiveProcessingPhase({ kind: 'validating', stage: 'finalizing' })).toBe(true);
    expect(isActiveProcessingPhase({ kind: 'ready' })).toBe(false);
    expect(isActiveProcessingPhase({ kind: 'failed', error })).toBe(false);
    expect(isActiveProcessingPhase({ kind: 'cancelled' })).toBe(false);
    expect(isActiveProcessingPhase({ kind: 'idle' })).toBe(false);
  });
});
