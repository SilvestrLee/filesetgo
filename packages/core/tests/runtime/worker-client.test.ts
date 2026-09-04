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

function createTargetResult(): import('../../src/processing/target-size-contracts').TargetSizeResult {
  const blob = new Blob([Uint8Array.of(1, 2, 3)], { type: 'image/jpeg' });

  return {
    blob,
    width: 20,
    height: 15,
    format: 'jpeg',
    mimeType: 'image/jpeg',
    byteSize: blob.size,
    sourceDimensions: { width: 40, height: 30 },
    normalizedDimensions: { width: 40, height: 30 },
    resized: true,
    targetBytes: 100_000,
    targetMet: true,
    quality: 0.8,
    dimensionsReduced: false,
    qualityProbeCount: 1,
    dimensionTierCount: 1,
  };
}

async function waitForAnyWorker(workers: FakeImageWorker[], index = 0): Promise<FakeImageWorker> {
  await vi.waitFor(() => {
    expect(workers.length).toBeGreaterThan(index);
    expect(workers[index].messages).toHaveLength(1);
  });

  return workers[index];
}

function createSetResult(): import('../../src/processing/image-set-contracts').ImageSetResult {
  const blob = new Blob([Uint8Array.of(1, 2, 3)], { type: 'image/webp' });
  const asset = {
    kind: 'raster' as const,
    id: 'a',
    filename: 'a.webp',
    blob,
    width: 20,
    height: 15,
    format: 'webp' as const,
    mimeType: 'image/webp',
    byteSize: blob.size,
    sourceDimensions: { width: 40, height: 30 },
    normalizedDimensions: { width: 40, height: 30 },
    resized: true,
  };

  return { assets: [asset], assetCount: 1, totalOutputBytes: asset.byteSize };
}

describe('ImageProcessingRuntime shared job slot (processImageSet)', () => {
  it('posts PROCESS_IMAGE_SET and resolves a complete image-set outcome', async () => {
    const { runtime, workers } = createRuntime();
    const job = runtime.processImageSet(createPngBlob(), {
      outputs: [{ kind: 'raster', id: 'a', filename: 'a.webp', output: { format: 'webp' } }],
    });
    const worker = await waitForAnyWorker(workers);

    expect(worker.messages[0]).toMatchObject({
      type: 'PROCESS_IMAGE_SET',
      jobId: job.jobId,
      request: { outputs: [{ id: 'a', filename: 'a.webp' }] },
    });

    worker.emit({ type: 'JOB_COMPLETE_SET', jobId: job.jobId, result: createSetResult() });

    await expect(job.result).resolves.toMatchObject({
      status: 'complete',
      result: { assetCount: 1 },
    });
  });

  it('reports asset index/count through progress events', async () => {
    const { runtime, workers } = createRuntime();
    const progress: Array<{ stage: string; assetIndex?: number; assetCount?: number }> = [];
    const job = runtime.processImageSet(createPngBlob(), {
      outputs: [{ kind: 'raster', id: 'a', filename: 'a.webp', output: { format: 'webp' } }],
      onProgress: (event) => progress.push(event),
    });
    const worker = await waitForAnyWorker(workers);

    worker.emit({ type: 'JOB_PROGRESS', jobId: job.jobId, stage: 'encoding', assetIndex: 1, assetCount: 3 });
    worker.emit({ type: 'JOB_COMPLETE_SET', jobId: job.jobId, result: createSetResult() });
    await job.result;

    expect(progress).toContainEqual(
      expect.objectContaining({ stage: 'encoding', assetIndex: 1, assetCount: 3 }),
    );
  });

  it('starting a processImageSet job cancels an in-flight processImage job (shared single-job slot)', async () => {
    const { runtime, workers } = createRuntime();
    const standardJob = runtime.processImage(createPngBlob(), { output: { format: 'webp' } });
    const firstWorker = await waitForWorker(workers);

    const setJob = runtime.processImageSet(createPngBlob(), {
      outputs: [{ kind: 'raster', id: 'a', filename: 'a.webp', output: { format: 'webp' } }],
    });
    const secondWorker = await waitForAnyWorker(workers, 1);

    await expect(standardJob.result).resolves.toMatchObject({ status: 'cancelled' });
    expect(firstWorker.terminateCount).toBe(1);

    secondWorker.emit({ type: 'JOB_COMPLETE_SET', jobId: setJob.jobId, result: createSetResult() });
    await expect(setJob.result).resolves.toMatchObject({ status: 'complete' });
  });

  it('starting a processImageToTarget job cancels an in-flight processImageSet job', async () => {
    const { runtime, workers } = createRuntime();
    const setJob = runtime.processImageSet(createPngBlob(), {
      outputs: [{ kind: 'raster', id: 'a', filename: 'a.webp', output: { format: 'webp' } }],
    });
    const firstWorker = await waitForAnyWorker(workers);

    const targetJob = runtime.processImageToTarget(createPngBlob(), {
      targetBytes: 100_000,
      output: { format: 'jpeg' },
    });
    const secondWorker = await waitForAnyWorker(workers, 1);

    await expect(setJob.result).resolves.toMatchObject({ status: 'cancelled' });
    expect(firstWorker.terminateCount).toBe(1);

    secondWorker.emit({
      type: 'JOB_COMPLETE_TARGET',
      jobId: targetJob.jobId,
      outcome: { status: 'met', result: createTargetResult() },
    });
    await expect(targetJob.result).resolves.toMatchObject({ status: 'complete' });
  });

  it('ignores a stale image-set result from a replaced job', async () => {
    const { runtime, workers } = createRuntime();
    const firstJob = runtime.processImageSet(createPngBlob(), {
      outputs: [{ kind: 'raster', id: 'a', filename: 'a.webp', output: { format: 'webp' } }],
    });
    const firstWorker = await waitForAnyWorker(workers);
    const staleHandler = firstWorker.onmessage;

    const secondJob = runtime.processImageSet(createPngBlob(), {
      outputs: [{ kind: 'raster', id: 'b', filename: 'b.webp', output: { format: 'webp' } }],
    });
    const secondWorker = await waitForAnyWorker(workers, 1);

    staleHandler?.({
      data: { type: 'JOB_COMPLETE_SET', jobId: firstJob.jobId, result: createSetResult() },
    } as MessageEvent<unknown>);

    secondWorker.emit({ type: 'JOB_COMPLETE_SET', jobId: secondJob.jobId, result: createSetResult() });

    await expect(firstJob.result).resolves.toMatchObject({ status: 'cancelled' });
    await expect(secondJob.result).resolves.toMatchObject({ status: 'complete' });
  });
});

describe('ImageProcessingRuntime shared job slot (processImage / processImageToTarget)', () => {
  it('posts PROCESS_IMAGE_TO_TARGET and resolves a met target-size outcome', async () => {
    const { runtime, workers } = createRuntime();
    const job = runtime.processImageToTarget(createPngBlob(), {
      targetBytes: 100_000,
      output: { format: 'jpeg' },
    });
    const worker = await waitForAnyWorker(workers);

    expect(worker.messages[0]).toMatchObject({
      type: 'PROCESS_IMAGE_TO_TARGET',
      jobId: job.jobId,
      request: { targetBytes: 100_000, dimensionPolicy: 'flexible' },
    });

    worker.emit({
      type: 'JOB_COMPLETE_TARGET',
      jobId: job.jobId,
      outcome: { status: 'met', result: createTargetResult() },
    });

    await expect(job.result).resolves.toMatchObject({
      status: 'complete',
      result: { targetMet: true },
    });
  });

  it('resolves a structured unreachable outcome without treating it as a failure', async () => {
    const { runtime, workers } = createRuntime();
    const job = runtime.processImageToTarget(createPngBlob(), {
      targetBytes: 1024,
      output: { format: 'jpeg' },
      dimensionPolicy: 'hard',
    });
    const worker = await waitForAnyWorker(workers);

    worker.emit({
      type: 'JOB_COMPLETE_TARGET',
      jobId: job.jobId,
      outcome: {
        status: 'unreachable',
        outcome: {
          code: 'TARGET_UNREACHABLE_HARD_DIMENSIONS',
          message: 'unreachable',
          qualityProbeCount: 5,
          dimensionTierCount: 1,
        },
      },
    });

    await expect(job.result).resolves.toMatchObject({
      status: 'unreachable',
      outcome: { code: 'TARGET_UNREACHABLE_HARD_DIMENSIONS' },
    });
  });

  it('starting a processImageToTarget job cancels an in-flight processImage job (shared single-job slot)', async () => {
    const { runtime, workers } = createRuntime();
    const standardJob = runtime.processImage(createPngBlob(), { output: { format: 'webp' } });
    const firstWorker = await waitForWorker(workers);

    const targetJob = runtime.processImageToTarget(createPngBlob(), {
      targetBytes: 100_000,
      output: { format: 'jpeg' },
    });
    const secondWorker = await waitForAnyWorker(workers, 1);

    await expect(standardJob.result).resolves.toMatchObject({ status: 'cancelled' });
    expect(firstWorker.terminateCount).toBe(1);

    secondWorker.emit({
      type: 'JOB_COMPLETE_TARGET',
      jobId: targetJob.jobId,
      outcome: { status: 'met', result: createTargetResult() },
    });

    await expect(targetJob.result).resolves.toMatchObject({ status: 'complete' });
  });

  it('starting a processImage job cancels an in-flight processImageToTarget job', async () => {
    const { runtime, workers } = createRuntime();
    const targetJob = runtime.processImageToTarget(createPngBlob(), {
      targetBytes: 100_000,
      output: { format: 'jpeg' },
    });
    const firstWorker = await waitForAnyWorker(workers);

    const standardJob = runtime.processImage(createPngBlob(), { output: { format: 'webp' } });
    const secondWorker = await waitForWorker(workers, 1);

    await expect(targetJob.result).resolves.toMatchObject({ status: 'cancelled' });
    expect(firstWorker.terminateCount).toBe(1);

    secondWorker.emit({ type: 'JOB_COMPLETE', jobId: standardJob.jobId, result: createResult() });

    await expect(standardJob.result).resolves.toMatchObject({ status: 'complete' });
  });

  it('ignores a stale target-size result from a replaced job', async () => {
    const { runtime, workers } = createRuntime();
    const firstJob = runtime.processImageToTarget(createPngBlob(), {
      targetBytes: 100_000,
      output: { format: 'jpeg' },
    });
    const firstWorker = await waitForAnyWorker(workers);
    const staleHandler = firstWorker.onmessage;

    const secondJob = runtime.processImageToTarget(createPngBlob(), {
      targetBytes: 200_000,
      output: { format: 'webp' },
    });
    const secondWorker = await waitForAnyWorker(workers, 1);

    // The first worker's late result must not resolve firstJob (already
    // cancelled) even if it arrives after replacement.
    staleHandler?.({
      data: {
        type: 'JOB_COMPLETE_TARGET',
        jobId: firstJob.jobId,
        outcome: { status: 'met', result: createTargetResult() },
      },
    } as MessageEvent<unknown>);

    secondWorker.emit({
      type: 'JOB_COMPLETE_TARGET',
      jobId: secondJob.jobId,
      outcome: { status: 'met', result: { ...createTargetResult(), targetBytes: 200_000 } },
    });

    await expect(firstJob.result).resolves.toMatchObject({ status: 'cancelled' });
    await expect(secondJob.result).resolves.toMatchObject({
      status: 'complete',
      result: { targetBytes: 200_000 },
    });
  });
});
