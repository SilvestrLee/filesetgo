import type {
  FileSetGoProcessingError,
  ImagePreflightResult,
  ImageProcessingStage,
  ProcessedImageResult,
  TargetSizeResult,
  TargetSizeUnreachable,
} from '@filesetgo/core';

export interface QuickFitSource {
  file: File;
  preflight: ImagePreflightResult;
}

export interface QuickFitResult {
  source: QuickFitSource;
  data: ProcessedImageResult | TargetSizeResult;
  downloadUrl: string;
  filename: string;
}

/**
 * The Quick Fit workflow state (FSG-003 directive §9/§42). A discriminated
 * union rather than scattered booleans: each variant only carries the
 * fields that are actually valid in that state, so e.g. a download link
 * can never be rendered without a real result, and "processing" can never
 * coexist with "success".
 */
export type QuickFitState =
  | { status: 'idle' }
  | { status: 'inspecting'; file: File }
  | { status: 'file-rejected'; file: File; message: string }
  | { status: 'ready'; source: QuickFitSource }
  | { status: 'processing'; source: QuickFitSource; jobId: string; stage: ImageProcessingStage }
  | { status: 'success'; result: QuickFitResult }
  | { status: 'unreachable'; source: QuickFitSource; outcome: TargetSizeUnreachable }
  | { status: 'failed'; source: QuickFitSource; error: FileSetGoProcessingError }
  | { status: 'cancelled'; source: QuickFitSource };

export const IDLE_STATE: QuickFitState = { status: 'idle' };

/** The source a given state was built from, if it has one. */
export function sourceOf(state: QuickFitState): QuickFitSource | undefined {
  switch (state.status) {
    case 'ready':
    case 'processing':
    case 'unreachable':
    case 'failed':
    case 'cancelled':
      return state.source;
    case 'success':
      return state.result.source;
    default:
      return undefined;
  }
}

/** States from which starting a new processing run is meaningful. */
const RUNNABLE_STATUSES: ReadonlySet<QuickFitState['status']> = new Set([
  'ready',
  'success',
  'unreachable',
  'failed',
  'cancelled',
]);

export function isRunnable(state: QuickFitState): boolean {
  return RUNNABLE_STATUSES.has(state.status) && sourceOf(state) !== undefined;
}

export function isProcessing(state: QuickFitState): boolean {
  return state.status === 'processing';
}

export function canDownload(state: QuickFitState): state is Extract<QuickFitState, { status: 'success' }> {
  return state.status === 'success';
}
