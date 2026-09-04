/// <reference lib="webworker" />

import { IMAGE_PROCESSING_ERROR_CODES } from '../processing/contracts';
import { createProcessingError } from '../processing/errors';
import type {
  ImageWorkerCommand,
  ImageWorkerEvent,
} from '../runtime/protocol';
import {
  processImageInWorker,
  toWorkerProcessingError,
} from './process-image';
import { processImageSetInWorker } from './process-image-set';
import { processImageToTargetInWorker } from './process-image-to-target';

const workerScope: DedicatedWorkerGlobalScope = self;
const cancelledJobIds = new Set<string>();
let activeJobId: string | undefined;

function post(event: ImageWorkerEvent): void {
  workerScope.postMessage(event);
}

async function handleProcessImage(
  command: Extract<ImageWorkerCommand, { type: 'PROCESS_IMAGE' }>,
): Promise<void> {
  if (activeJobId !== undefined) {
    post({
      type: 'JOB_FAILED',
      jobId: command.jobId,
      error: createProcessingError(
        IMAGE_PROCESSING_ERROR_CODES.WorkerFailed,
        'The worker already owns an active image job.',
      ),
    });

    return;
  }

  activeJobId = command.jobId;
  post({ type: 'JOB_ACCEPTED', jobId: command.jobId });

  try {
    const result = await processImageInWorker(command.request, {
      isCancelled: () => cancelledJobIds.has(command.jobId),
      onProgress: (stage) => {
        post({
          type: 'JOB_PROGRESS',
          jobId: command.jobId,
          stage,
        });
      },
    });

    if (cancelledJobIds.has(command.jobId)) {
      post({ type: 'JOB_CANCELLED', jobId: command.jobId });
    } else {
      post({ type: 'JOB_COMPLETE', jobId: command.jobId, result });
    }
  } catch (error) {
    const processingError = toWorkerProcessingError(error);

    if (
      processingError.code ===
      IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled
    ) {
      post({ type: 'JOB_CANCELLED', jobId: command.jobId });
    } else {
      post({
        type: 'JOB_FAILED',
        jobId: command.jobId,
        error: processingError,
      });
    }
  } finally {
    cancelledJobIds.delete(command.jobId);
    activeJobId = undefined;
  }
}

async function handleProcessImageToTarget(
  command: Extract<ImageWorkerCommand, { type: 'PROCESS_IMAGE_TO_TARGET' }>,
): Promise<void> {
  if (activeJobId !== undefined) {
    post({
      type: 'JOB_FAILED',
      jobId: command.jobId,
      error: createProcessingError(
        IMAGE_PROCESSING_ERROR_CODES.WorkerFailed,
        'The worker already owns an active image job.',
      ),
    });

    return;
  }

  activeJobId = command.jobId;
  post({ type: 'JOB_ACCEPTED', jobId: command.jobId });

  try {
    const outcome = await processImageToTargetInWorker(command.request, {
      isCancelled: () => cancelledJobIds.has(command.jobId),
      onProgress: (stage) => {
        post({
          type: 'JOB_PROGRESS',
          jobId: command.jobId,
          stage,
        });
      },
    });

    if (cancelledJobIds.has(command.jobId)) {
      post({ type: 'JOB_CANCELLED', jobId: command.jobId });
    } else {
      post({ type: 'JOB_COMPLETE_TARGET', jobId: command.jobId, outcome });
    }
  } catch (error) {
    const processingError = toWorkerProcessingError(error);

    if (
      processingError.code ===
      IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled
    ) {
      post({ type: 'JOB_CANCELLED', jobId: command.jobId });
    } else {
      post({
        type: 'JOB_FAILED',
        jobId: command.jobId,
        error: processingError,
      });
    }
  } finally {
    cancelledJobIds.delete(command.jobId);
    activeJobId = undefined;
  }
}

async function handleProcessImageSet(
  command: Extract<ImageWorkerCommand, { type: 'PROCESS_IMAGE_SET' }>,
): Promise<void> {
  if (activeJobId !== undefined) {
    post({
      type: 'JOB_FAILED',
      jobId: command.jobId,
      error: createProcessingError(
        IMAGE_PROCESSING_ERROR_CODES.WorkerFailed,
        'The worker already owns an active image job.',
      ),
    });

    return;
  }

  activeJobId = command.jobId;
  post({ type: 'JOB_ACCEPTED', jobId: command.jobId });

  try {
    const result = await processImageSetInWorker(command.request, {
      isCancelled: () => cancelledJobIds.has(command.jobId),
      onProgress: (stage, asset) => {
        post({
          type: 'JOB_PROGRESS',
          jobId: command.jobId,
          stage,
          ...(asset === undefined ? {} : { assetIndex: asset.index, assetCount: asset.count }),
        });
      },
    });

    if (cancelledJobIds.has(command.jobId)) {
      post({ type: 'JOB_CANCELLED', jobId: command.jobId });
    } else {
      post({ type: 'JOB_COMPLETE_SET', jobId: command.jobId, result });
    }
  } catch (error) {
    const processingError = toWorkerProcessingError(error);

    if (
      processingError.code ===
      IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled
    ) {
      post({ type: 'JOB_CANCELLED', jobId: command.jobId });
    } else {
      post({
        type: 'JOB_FAILED',
        jobId: command.jobId,
        error: processingError,
      });
    }
  } finally {
    cancelledJobIds.delete(command.jobId);
    activeJobId = undefined;
  }
}

workerScope.addEventListener('message', (event: MessageEvent<ImageWorkerCommand>) => {
  if (event.data.type === 'CANCEL_JOB') {
    if (activeJobId === event.data.jobId) {
      cancelledJobIds.add(event.data.jobId);
    }

    return;
  }

  if (event.data.type === 'PROCESS_IMAGE_TO_TARGET') {
    void handleProcessImageToTarget(event.data);
    return;
  }

  if (event.data.type === 'PROCESS_IMAGE_SET') {
    void handleProcessImageSet(event.data);
    return;
  }

  void handleProcessImage(event.data);
});
