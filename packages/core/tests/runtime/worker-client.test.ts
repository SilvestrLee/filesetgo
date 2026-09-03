import { describe, expect, it, vi } from 'vitest';

import {
  IMAGE_PROCESSING_ERROR_CODES,
  type FileSetGoProcessingError,
  type ProcessedImageResult,
} from '../../src/processing/contracts';
import type {
  ImageWorkerCommand,
  ImageWorkerEvent,
} from '../../src/runtime/protocol';
import {
  ImageProcessingRuntime,
  type ImageWorkerLike,
} from '../../src/runtime/worker-client';
import { createImageSource, createPng } from '../preflight/fixtures';

class FakeImageWorker implements ImageWorkerLike {
  public onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  public onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  public readonly messages: ImageWorkerCommand[] = [];
  public terminateCount = 0;

  public postMessage(message: ImageWorkerCommand): void {
    this.messages.push(message);
  }

  public terminate(): void {
    this.terminateCount += 1;
  }

  public emit(event: ImageWorkerEvent): void {
    this.onmessage?.({ data: event } as MessageEvent<unknown>);
  }

  public crash(): void {
    this.onerror?.({ preventDefault() {} } as ErrorEvent);
  }
}

function createPngBlob(): Blob {
  const source = createImageSource(createPng(40, 30));
  return source.slice(0, source.size);
}

function createResult(format: 'jpeg' | 'png' | 'webp' = 'webp'): ProcessedImageResult {
  const mimeType = `image/${format}`;
  const blob = new Blob([Uint8Array.of(1, 2, 3)], { type: mimeType });

  return {
    blob,
    width: 20,
    height: 15,
    format,
    mimeType,
    byteSize: blob.size,
    sourceDimensions: { width: 40, height: 30 },
    normalizedDimensions: { width: 40, height: 30 },
    resized: true,
  };
}

function createRuntime(): {
  runtime: ImageProcessingRuntime;
  workers: FakeImageWorker[];
} {
  const workers: FakeImageWorker[] = [];
  const runtime = new ImageProcessingRuntime(() => {
    const worker = new FakeImageWorker();
    workers.push(worker);
    return worker;
  });

  return { runtime, workers };
}

async function waitForWorker(workers: FakeImageWorker[], index = 0): Promise<FakeImageWorker> {
  await vi.waitFor(() => {
    expect(workers.length).toBeGreaterThan(index);
    expect(workers[index].messages[0]?.type).toBe('PROCESS_IMAGE');
  });

  return workers[index];
}

describe('ImageProcessingRuntime', () => {
  it('preflights before posting a typed worker job and delivers stage progress', async () => {
    const { runtime, workers } = createRuntime();
    const stages: string[] = [];
    const job = runtime.processImage(createPngBlob(), {
      resize: { maxWidth: 20, maxHeight: 20 },
      output: { format: 'webp', quality: 0.85 },
      onProgress: ({ stage }) => stages.push(stage),
    });
    const worker = await waitForWorker(workers);
    const processCommand = worker.messages[0];

    expect(processCommand).toMatchObject({
      type: 'PROCESS_IMAGE',
      jobId: job.jobId,
      request: {
        preflight: {
          format: 'png',
          width: 40,
          height: 30,
          safeToDecode: true,
        },
      },
    });

    worker.emit({ type: 'JOB_ACCEPTED', jobId: job.jobId });
    worker.emit({ type: 'JOB_PROGRESS', jobId: job.jobId, stage: 'decoding' });
    worker.emit({ type: 'JOB_PROGRESS', jobId: job.jobId, stage: 'encoding' });
    worker.emit({
      type: 'JOB_COMPLETE',
      jobId: job.jobId,
      result: createResult(),
    });

    await expect(job.result).resolves.toMatchObject({
      status: 'complete',
      result: { format: 'webp', width: 20, height: 15 },
    });
    expect(stages).toEqual([
      'preflighting',
      'accepted',
      'decoding',
      'encoding',
      'complete',
    ]);
    expect(worker.terminateCount).toBe(1);
  });

  it('stops a preflight rejection before worker creation', async () => {
    const { runtime, workers } = createRuntime();
    const job = runtime.processImage(new Blob([Uint8Array.of(1, 2, 3)]), {
      output: { format: 'png' },
    });

    await expect(job.result).resolves.toMatchObject({
      status: 'failed',
      error: { code: 'UNSUPPORTED_FORMAT' },
    });
    expect(workers).toHaveLength(0);
  });

  it('returns a controlled decode failure without exposing a browser exception', async () => {
    const { runtime, workers } = createRuntime();
    const job = runtime.processImage(createPngBlob(), {
      output: { format: 'jpeg', quality: 0.8 },
    });
    const worker = await waitForWorker(workers);
    const error: FileSetGoProcessingError = {
      code: IMAGE_PROCESSING_ERROR_CODES.DecodeFailed,
      message: 'The compressed image payload could not be decoded.',
      recoverable: true,
    };

    worker.emit({ type: 'JOB_FAILED', jobId: job.jobId, error });

    await expect(job.result).resolves.toEqual({ status: 'failed', error });
    expect(worker.terminateCount).toBe(1);
  });

  it('hard-cancels a job and keeps the runtime reusable', async () => {
    const { runtime, workers } = createRuntime();
    const cancelledJob = runtime.processImage(createPngBlob(), {
      output: { format: 'png' },
    });
    const firstWorker = await waitForWorker(workers);

    expect(cancelledJob.cancel()).toBeUndefined();

    await expect(cancelledJob.result).resolves.toMatchObject({
      status: 'cancelled',
      error: { code: IMAGE_PROCESSING_ERROR_CODES.ProcessingCancelled },
    });
    expect(firstWorker.messages.at(-1)).toEqual({
      type: 'CANCEL_JOB',
      jobId: cancelledJob.jobId,
    });
    expect(firstWorker.terminateCount).toBe(1);

    const nextJob = runtime.processImage(createPngBlob(), {
      output: { format: 'png' },
    });
    const secondWorker = await waitForWorker(workers, 1);
    secondWorker.emit({
      type: 'JOB_COMPLETE',
      jobId: nextJob.jobId,
      result: createResult('png'),
    });

    await expect(nextJob.result).resolves.toMatchObject({ status: 'complete' });
  });

  it('replaces the active job and ignores its late result', async () => {
    const { runtime, workers } = createRuntime();
    const firstJob = runtime.processImage(createPngBlob(), {
      output: { format: 'webp' },
    });
    const firstWorker = await waitForWorker(workers);
    const staleHandler = firstWorker.onmessage;
    const secondJob = runtime.processImage(createPngBlob(), {
      output: { format: 'jpeg' },
    });
    const secondWorker = await waitForWorker(workers, 1);

    staleHandler?.({
      data: {
        type: 'JOB_COMPLETE',
        jobId: firstJob.jobId,
        result: createResult(),
      },
    } as MessageEvent<unknown>);
    secondWorker.emit({
      type: 'JOB_COMPLETE',
      jobId: secondJob.jobId,
      result: createResult('jpeg'),
    });

    await expect(firstJob.result).resolves.toMatchObject({ status: 'cancelled' });
    await expect(secondJob.result).resolves.toMatchObject({
      status: 'complete',
      result: { format: 'jpeg' },
    });
  });

  it('ignores a terminal event with a different job ID', async () => {
    const { runtime, workers } = createRuntime();
    const job = runtime.processImage(createPngBlob(), {
      output: { format: 'webp' },
    });
    const worker = await waitForWorker(workers);
    let didSettle = false;
    void job.result.then(() => {
      didSettle = true;
    });

    worker.emit({
      type: 'JOB_COMPLETE',
      jobId: 'fsgjob_stale',
      result: createResult(),
    });
    await Promise.resolve();

    expect(didSettle).toBe(false);

    worker.emit({
      type: 'JOB_COMPLETE',
      jobId: job.jobId,
      result: createResult(),
    });
    await expect(job.result).resolves.toMatchObject({ status: 'complete' });
  });

  it('recreates a worker after a fatal worker failure', async () => {
    const { runtime, workers } = createRuntime();
    const failedJob = runtime.processImage(createPngBlob(), {
      output: { format: 'webp' },
    });
    const failedWorker = await waitForWorker(workers);

    failedWorker.crash();

    await expect(failedJob.result).resolves.toMatchObject({
      status: 'failed',
      error: { code: IMAGE_PROCESSING_ERROR_CODES.WorkerFailed },
    });

    const recoveredJob = runtime.processImage(createPngBlob(), {
      output: { format: 'webp' },
    });
    const recoveredWorker = await waitForWorker(workers, 1);
    recoveredWorker.emit({
      type: 'JOB_COMPLETE',
      jobId: recoveredJob.jobId,
      result: createResult(),
    });

    await expect(recoveredJob.result).resolves.toMatchObject({
      status: 'complete',
    });
  });

  it('isolates consumer progress callback failures from the job lifecycle', async () => {
    const { runtime, workers } = createRuntime();
    const job = runtime.processImage(createPngBlob(), {
      output: { format: 'webp' },
      onProgress: () => {
        throw new Error('Host callback failure');
      },
    });
    const worker = await waitForWorker(workers);

    worker.emit({ type: 'JOB_ACCEPTED', jobId: job.jobId });
    worker.emit({
      type: 'JOB_COMPLETE',
      jobId: job.jobId,
      result: createResult(),
    });

    await expect(job.result).resolves.toMatchObject({ status: 'complete' });
  });
});
