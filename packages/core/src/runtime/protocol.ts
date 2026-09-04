import type {
  FileSetGoProcessingError,
  ImageProcessingStage,
  ProcessedImageResult,
  SafeImageProcessingRequest,
} from '../processing/contracts';
import type {
  SafeImageProcessingTargetRequest,
  TargetSizeResult,
  TargetSizeUnreachable,
} from '../processing/target-size-contracts';

export interface ProcessImageCommand {
  type: 'PROCESS_IMAGE';
  jobId: string;
  request: SafeImageProcessingRequest;
}

export interface ProcessImageToTargetCommand {
  type: 'PROCESS_IMAGE_TO_TARGET';
  jobId: string;
  request: SafeImageProcessingTargetRequest;
}

export interface CancelJobCommand {
  type: 'CANCEL_JOB';
  jobId: string;
}

export type ImageWorkerCommand =
  | ProcessImageCommand
  | ProcessImageToTargetCommand
  | CancelJobCommand;

export interface JobAcceptedEvent {
  type: 'JOB_ACCEPTED';
  jobId: string;
}

export interface JobProgressEvent {
  type: 'JOB_PROGRESS';
  jobId: string;
  stage: Exclude<
    ImageProcessingStage,
    'preflighting' | 'accepted' | 'complete'
  >;
}

export interface JobCompleteEvent {
  type: 'JOB_COMPLETE';
  jobId: string;
  result: ProcessedImageResult;
}

/**
 * Terminal event for a target-size job. Both "met" (a candidate satisfied
 * targetBytes) and "unreachable" (a valid, bounded search concluded no
 * candidate could) are carried here rather than as a failure — an
 * unreachable target is a deterministic search outcome, not a runtime
 * error (FSG-002 directive §19).
 */
export interface JobCompleteTargetEvent {
  type: 'JOB_COMPLETE_TARGET';
  jobId: string;
  outcome:
    | { status: 'met'; result: TargetSizeResult }
    | { status: 'unreachable'; outcome: TargetSizeUnreachable };
}

export interface JobFailedEvent {
  type: 'JOB_FAILED';
  jobId: string;
  error: FileSetGoProcessingError;
}

export interface JobCancelledEvent {
  type: 'JOB_CANCELLED';
  jobId: string;
}

export type ImageWorkerEvent =
  | JobAcceptedEvent
  | JobProgressEvent
  | JobCompleteEvent
  | JobCompleteTargetEvent
  | JobFailedEvent
  | JobCancelledEvent;

const WORKER_PROGRESS_STAGES = new Set([
  'decoding',
  'normalizing',
  'optimizing',
  'resizing',
  'encoding',
  'finalizing',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProcessedImageResult(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.blob instanceof Blob &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    (value.format === 'jpeg' || value.format === 'png' || value.format === 'webp') &&
    typeof value.mimeType === 'string' &&
    typeof value.byteSize === 'number' &&
    typeof value.resized === 'boolean' &&
    isRecord(value.sourceDimensions) &&
    isRecord(value.normalizedDimensions)
  );
}

function isProcessingError(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.code === 'string' &&
    typeof value.message === 'string' &&
    typeof value.recoverable === 'boolean'
  );
}

function isTargetSizeResult(value: unknown): boolean {
  return (
    isProcessedImageResult(value) &&
    isRecord(value) &&
    typeof value.targetBytes === 'number' &&
    value.targetMet === true &&
    typeof value.dimensionsReduced === 'boolean' &&
    typeof value.qualityProbeCount === 'number' &&
    typeof value.dimensionTierCount === 'number'
  );
}

function isTargetSizeOutcome(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (value.status === 'met') {
    return isTargetSizeResult(value.result);
  }

  if (value.status === 'unreachable') {
    return (
      isRecord(value.outcome) &&
      typeof value.outcome.code === 'string' &&
      typeof value.outcome.message === 'string' &&
      typeof value.outcome.qualityProbeCount === 'number' &&
      typeof value.outcome.dimensionTierCount === 'number'
    );
  }

  return false;
}

export function isImageWorkerEvent(value: unknown): value is ImageWorkerEvent {
  if (!isRecord(value) || typeof value.jobId !== 'string') {
    return false;
  }

  switch (value.type) {
    case 'JOB_ACCEPTED':
    case 'JOB_CANCELLED':
      return true;
    case 'JOB_PROGRESS':
      return (
        typeof value.stage === 'string' &&
        WORKER_PROGRESS_STAGES.has(value.stage)
      );
    case 'JOB_COMPLETE':
      return isProcessedImageResult(value.result);
    case 'JOB_COMPLETE_TARGET':
      return isTargetSizeOutcome(value.outcome);
    case 'JOB_FAILED':
      return isProcessingError(value.error);
    default:
      return false;
  }
}
