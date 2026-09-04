import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  FileSetGoProcessingError,
  ImagePreflightOutcome,
  ImagePreflightResult,
  ImageProcessingJob,
  ImageProcessingOutcome,
  ImageProcessingTargetJob,
  ImageProcessingTargetOutcome,
  ProcessedImageResult,
  ProcessImageOptions,
  ProcessImageToTargetOptions,
  TargetSizeResult,
} from '@filesetgo/core';

import type { QuickFitRequirements } from '../request-plan';
import type { QuickFitCoreClient } from '../workflow';
import { QuickFitWorkflow } from '../workflow';

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

function preflightReady(overrides: Partial<ImagePreflightResult> = {}): ImagePreflightOutcome {
  return {
    status: 'ready',
    result: {
      format: 'jpeg',
      width: 2000,
      height: 1000,
      megapixels: 2,
      fileSize: 1_000_000,
      safeToDecode: true,
      ...overrides,
    },
  };
}

function standardResult(overrides: Partial<ProcessedImageResult> = {}): ProcessedImageResult {
  return {
    blob: new Blob(['x']),
    width: 2000,
    height: 1000,
    format: 'jpeg',
    mimeType: 'image/jpeg',
    byteSize: 900_000,
    sourceDimensions: { width: 2000, height: 1000 },
    normalizedDimensions: { width: 2000, height: 1000 },
    resized: false,
    ...overrides,
  };
}

function targetResult(overrides: Partial<TargetSizeResult> = {}): TargetSizeResult {
  return {
    ...standardResult(),
    targetBytes: 200_000,
    targetMet: true,
    quality: 0.8,
    dimensionsReduced: false,
    qualityProbeCount: 2,
    dimensionTierCount: 0,
    ...overrides,
  };
}

function processingError(code: string): FileSetGoProcessingError {
  return { code: code as FileSetGoProcessingError['code'], message: 'x', recoverable: true };
}

function requirements(overrides: Partial<QuickFitRequirements> = {}): QuickFitRequirements {
  return {
    sourceFormat: 'jpeg',
    outputChoice: 'original',
    dimensionPolicy: 'flexible',
    ...overrides,
  };
}

interface FakeCore extends QuickFitCoreClient {
  preflightImage: ReturnType<typeof vi.fn>;
  processImage: ReturnType<typeof vi.fn>;
  processImageToTarget: ReturnType<typeof vi.fn>;
  getRuntimeCapabilities: ReturnType<typeof vi.fn>;
}

function makeCore(): FakeCore {
  return {
    preflightImage: vi.fn(),
    processImage: vi.fn(),
    processImageToTarget: vi.fn(),
    getRuntimeCapabilities: vi.fn(),
  } as unknown as FakeCore;
}

function fakeStandardJob(outcome: ImageProcessingOutcome): { job: ImageProcessingJob; resolve: (o: ImageProcessingOutcome) => void } {
  const { promise, resolve } = deferred<ImageProcessingOutcome>();
  const job: ImageProcessingJob = { jobId: 'job-standard', result: promise, cancel: vi.fn() };
  resolve(outcome);
  return { job, resolve };
}

function pendingStandardJob(): { job: ImageProcessingJob; resolve: (o: ImageProcessingOutcome) => void } {
  const { promise, resolve } = deferred<ImageProcessingOutcome>();
  const cancel = vi.fn(() => {
    resolve({ status: 'cancelled', error: { code: 'PROCESSING_CANCELLED', message: 'cancelled', recoverable: true } });
  });
  const job: ImageProcessingJob = { jobId: 'job-standard', result: promise, cancel };
  return { job, resolve };
}

function fakeTargetJob(outcome: ImageProcessingTargetOutcome): ImageProcessingTargetJob {
  return { jobId: 'job-target', result: Promise.resolve(outcome), cancel: vi.fn() };
}

function newFile(name = 'source.jpg'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' });
}

let urlCounter = 0;

function makeWorkflow(core: QuickFitCoreClient) {
  const createObjectUrl = vi.fn(() => `blob:fake-${urlCounter++}`);
  const revokeObjectUrl = vi.fn();
  const workflow = new QuickFitWorkflow({ core, createObjectUrl, revokeObjectUrl });
  return { workflow, createObjectUrl, revokeObjectUrl };
}

beforeEach(() => {
  urlCounter = 0;
});

describe('QuickFitWorkflow.selectFile', () => {
  it('transitions idle -> inspecting -> ready on a valid file', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady());
    const { workflow } = makeWorkflow(core);

    const promise = workflow.selectFile(newFile());
    expect(workflow.getState().status).toBe('inspecting');

    await promise;
    expect(workflow.getState().status).toBe('ready');
  });

  it('transitions to file-rejected with the preflight message on an unsupported file', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue({
      status: 'rejected',
      error: { code: 'UNSUPPORTED_FORMAT', message: 'Not a supported format.' },
    } satisfies ImagePreflightOutcome);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile('weird.bmp'));

    const state = workflow.getState();
    expect(state.status).toBe('file-rejected');
    if (state.status === 'file-rejected') {
      expect(state.message).toBe('Not a supported format.');
    }
  });

  it('transitions to file-rejected for an oversized file', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue({
      status: 'rejected',
      error: { code: 'FILE_TOO_LARGE', message: 'Too large.' },
    } satisfies ImagePreflightOutcome);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile('huge.jpg'));

    expect(workflow.getState().status).toBe('file-rejected');
  });

  it('ignores a stale preflight resolution superseded by a newer selection', async () => {
    const core = makeCore();
    const first = deferred<ImagePreflightOutcome>();
    const second = deferred<ImagePreflightOutcome>();
    core.preflightImage.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { workflow } = makeWorkflow(core);

    const firstSelection = workflow.selectFile(newFile('a.jpg'));
    const secondSelection = workflow.selectFile(newFile('b.jpg'));

    second.resolve(preflightReady());
    await secondSelection;
    expect(workflow.getState().status).toBe('ready');

    first.resolve(preflightReady());
    await firstSelection;

    const state = workflow.getState();
    expect(state.status).toBe('ready');
    if (state.status === 'ready') {
      expect(state.source.file.name).toBe('b.jpg');
    }
  });
});

describe('QuickFitWorkflow.run — routing', () => {
  it('routes a resize-only JPEG request to processImage', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady());
    const { job } = fakeStandardJob({ status: 'complete', result: standardResult({ width: 1000, height: 500 }) });
    core.processImage.mockReturnValue(job);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile());
    workflow.run(requirements({ maxWidth: 1000 }));

    expect(core.processImage).toHaveBeenCalledTimes(1);
    expect(core.processImageToTarget).not.toHaveBeenCalled();
    const options = core.processImage.mock.calls[0][1] as ProcessImageOptions;
    expect(options.resize).toEqual({ maxWidth: 1000, maxHeight: undefined, allowUpscale: false });

    await job.result;
    expect(workflow.getState().status).toBe('success');
  });

  it('routes a format-only JPEG request to processImage', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady());
    const { job } = fakeStandardJob({ status: 'complete', result: standardResult({ format: 'webp' }) });
    core.processImage.mockReturnValue(job);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile());
    workflow.run(requirements({ outputChoice: 'webp' }));

    expect(core.processImage).toHaveBeenCalledTimes(1);
    const options = core.processImage.mock.calls[0][1] as ProcessImageOptions;
    expect(options.output).toEqual({ format: 'webp' });
  });

  it('routes a target-size JPEG request to processImageToTarget', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady());
    core.processImageToTarget.mockReturnValue(fakeTargetJob({ status: 'complete', result: targetResult() }));
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile());
    workflow.run(requirements({ targetBytes: 200_000 }));

    expect(core.processImageToTarget).toHaveBeenCalledTimes(1);
    expect(core.processImage).not.toHaveBeenCalled();
  });

  it('routes a target-size + dimensions JPEG request to processImageToTarget with dimensions included', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady());
    core.processImageToTarget.mockReturnValue(fakeTargetJob({ status: 'complete', result: targetResult() }));
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile());
    workflow.run(requirements({ targetBytes: 200_000, maxWidth: 1200 }));

    const options = core.processImageToTarget.mock.calls[0][1] as ProcessImageToTargetOptions;
    expect(options.dimensions).toEqual({ maxWidth: 1200, maxHeight: undefined });
  });

  it('does not call any core processing API for a no-op request (keep-original PNG, no target, no dimensions)', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady({ format: 'png' }));
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile('logo.png'));
    workflow.run(requirements({ sourceFormat: 'png', outputChoice: 'original' }));

    expect(core.processImage).not.toHaveBeenCalled();
    expect(core.processImageToTarget).not.toHaveBeenCalled();
    expect(workflow.getState().status).toBe('ready');
  });

  it('converts a PNG source to WebP via processImage', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady({ format: 'png' }));
    const { job } = fakeStandardJob({ status: 'complete', result: standardResult({ format: 'webp' }) });
    core.processImage.mockReturnValue(job);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile('logo.png'));
    workflow.run(requirements({ sourceFormat: 'png', outputChoice: 'webp' }));

    expect(core.processImage).toHaveBeenCalledTimes(1);
  });

  it('presents a PNG target-unreachable outcome as the unreachable state', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady({ format: 'png' }));
    core.processImageToTarget.mockReturnValue(fakeTargetJob({
      status: 'unreachable',
      outcome: { code: 'TARGET_UNREACHABLE_MIN_QUALITY', message: 'x', qualityProbeCount: 0, dimensionTierCount: 6 },
    }));
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile('logo.png'));
    workflow.run(requirements({ sourceFormat: 'png', outputChoice: 'png', targetBytes: 5000 }));
    await Promise.resolve();

    const state = workflow.getState();
    expect(state.status).toBe('unreachable');
    if (state.status === 'unreachable') {
      expect(state.outcome.code).toBe('TARGET_UNREACHABLE_MIN_QUALITY');
    }
  });

  it('succeeds for a standard WebP source', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady({ format: 'webp' }));
    const { job } = fakeStandardJob({ status: 'complete', result: standardResult({ format: 'webp' }) });
    core.processImage.mockReturnValue(job);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile('photo.webp'));
    workflow.run(requirements({ sourceFormat: 'webp', maxWidth: 500 }));
    await job.result;

    expect(workflow.getState().status).toBe('success');
  });

  it('resolves a HEIC "keep original" choice to WebP output for a standard job', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady({ format: 'heic' }));
    const { job } = fakeStandardJob({ status: 'complete', result: standardResult({ format: 'webp' }) });
    core.processImage.mockReturnValue(job);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile('photo.heic'));
    workflow.run(requirements({ sourceFormat: 'heic', outputChoice: 'original', maxWidth: 800 }));

    const options = core.processImage.mock.calls[0][1] as ProcessImageOptions;
    expect(options.output).toEqual({ format: 'webp' });
  });

  it('routes a HEIC target-size request to processImageToTarget with WebP output', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady({ format: 'heic' }));
    core.processImageToTarget.mockReturnValue(fakeTargetJob({ status: 'complete', result: targetResult({ format: 'webp' }) }));
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile('photo.heic'));
    workflow.run(requirements({ sourceFormat: 'heic', outputChoice: 'original', targetBytes: 150_000 }));

    expect(core.processImageToTarget).toHaveBeenCalledTimes(1);
    const options = core.processImageToTarget.mock.calls[0][1] as ProcessImageToTargetOptions;
    expect(options.output).toEqual({ format: 'webp' });
  });
});

describe('QuickFitWorkflow — cancellation', () => {
  it('moves from processing to cancelled when cancel() is called', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady());
    const { job } = pendingStandardJob();
    core.processImage.mockReturnValue(job);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile());
    workflow.run(requirements({ maxWidth: 800 }));
    expect(workflow.getState().status).toBe('processing');

    workflow.cancel();
    expect(job.cancel).toHaveBeenCalledTimes(1);

    await job.result;
    expect(workflow.getState().status).toBe('cancelled');
  });

  it('invalidates the old job/result when a replacement file is selected mid-processing', async () => {
    const core = makeCore();
    core.preflightImage
      .mockResolvedValueOnce(preflightReady())
      .mockResolvedValueOnce(preflightReady({ width: 500, height: 500 }));
    const { job, resolve } = pendingStandardJob();
    core.processImage.mockReturnValue(job);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile('a.jpg'));
    workflow.run(requirements({ maxWidth: 800 }));
    expect(workflow.getState().status).toBe('processing');

    await workflow.selectFile(newFile('b.jpg'));
    expect(job.cancel).toHaveBeenCalledTimes(1);
    expect(workflow.getState().status).toBe('ready');

    // A late resolution of the superseded job must not clobber the new file's state.
    resolve({ status: 'complete', result: standardResult() });
    await Promise.resolve();
    await Promise.resolve();

    const state = workflow.getState();
    expect(state.status).toBe('ready');
    if (state.status === 'ready') {
      expect(state.source.file.name).toBe('b.jpg');
    }
  });
});

describe('QuickFitWorkflow — errors', () => {
  it('reports a decode failure as the failed state', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady());
    const { job } = fakeStandardJob({ status: 'failed', error: processingError('DECODE_FAILED') });
    core.processImage.mockReturnValue(job);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile());
    workflow.run(requirements({ maxWidth: 800 }));
    await job.result;

    const state = workflow.getState();
    expect(state.status).toBe('failed');
    if (state.status === 'failed') {
      expect(state.error.code).toBe('DECODE_FAILED');
    }
  });

  it('reports a runtime-unsupported failure as the failed state', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady());
    const { job } = fakeStandardJob({ status: 'failed', error: processingError('RUNTIME_UNSUPPORTED') });
    core.processImage.mockReturnValue(job);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile());
    workflow.run(requirements({ maxWidth: 800 }));
    await job.result;

    const state = workflow.getState();
    expect(state.status).toBe('failed');
    if (state.status === 'failed') {
      expect(state.error.code).toBe('RUNTIME_UNSUPPORTED');
    }
  });

  it('allows retrying after a failure without re-selecting the file', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady());
    const failingJob = fakeStandardJob({ status: 'failed', error: processingError('WORKER_FAILED') }).job;
    const succeedingJob = fakeStandardJob({ status: 'complete', result: standardResult() }).job;
    core.processImage.mockReturnValueOnce(failingJob).mockReturnValueOnce(succeedingJob);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile());
    workflow.run(requirements({ maxWidth: 800 }));
    await failingJob.result;
    expect(workflow.getState().status).toBe('failed');

    workflow.run(requirements({ maxWidth: 800 }));
    await succeedingJob.result;
    expect(workflow.getState().status).toBe('success');
  });
});

describe('QuickFitWorkflow — object URL lifecycle', () => {
  it('creates a download URL on success and revokes it on reset', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady());
    const { job } = fakeStandardJob({ status: 'complete', result: standardResult() });
    core.processImage.mockReturnValue(job);
    const { workflow, createObjectUrl, revokeObjectUrl } = makeWorkflow(core);

    await workflow.selectFile(newFile());
    workflow.run(requirements({ maxWidth: 800 }));
    await job.result;

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    const state = workflow.getState();
    expect(state.status).toBe('success');

    workflow.reset();
    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(workflow.getState().status).toBe('idle');
  });

  it('revokes the previous result URL before creating a new one when running again', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady());
    const firstJob = fakeStandardJob({ status: 'complete', result: standardResult() }).job;
    const secondJob = fakeStandardJob({ status: 'complete', result: standardResult({ format: 'webp' }) }).job;
    core.processImage.mockReturnValueOnce(firstJob).mockReturnValueOnce(secondJob);
    const { workflow, createObjectUrl, revokeObjectUrl } = makeWorkflow(core);

    await workflow.selectFile(newFile());
    workflow.run(requirements({ maxWidth: 800 }));
    await firstJob.result;
    expect(createObjectUrl).toHaveBeenCalledTimes(1);

    workflow.run(requirements({ outputChoice: 'webp' }));
    await secondJob.result;

    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(createObjectUrl).toHaveBeenCalledTimes(2);
  });
});

describe('QuickFitWorkflow.reset', () => {
  it('cancels any active job and returns to idle', async () => {
    const core = makeCore();
    core.preflightImage.mockResolvedValue(preflightReady());
    const { job } = pendingStandardJob();
    core.processImage.mockReturnValue(job);
    const { workflow } = makeWorkflow(core);

    await workflow.selectFile(newFile());
    workflow.run(requirements({ maxWidth: 800 }));

    workflow.reset();

    expect(job.cancel).toHaveBeenCalled();
    expect(workflow.getState().status).toBe('idle');
  });
});
