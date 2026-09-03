import type {
  FileSetGoProcessingError,
  ImageProcessingStage,
  ProcessedImageResult,
  SafeImageProcessingRequest,
} from '../processing/contracts';

export interface ProcessImageCommand {
  type: 'PROCESS_IMAGE';
  jobId: string;
  request: SafeImageProcessingRequest;
}

export interface CancelJobCommand {
  type: 'CANCEL_JOB';
  jobId: string;
}

export type ImageWorkerCommand = ProcessImageCommand | CancelJobCommand;

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
  | JobFailedEvent
  | JobCancelledEvent;

const WORKER_PROGRESS_STAGES = new Set([
  'decoding',
  'normalizing',
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
    case 'JOB_FAILED':
      return isProcessingError(value.error);
    default:
      return false;
  }
}
