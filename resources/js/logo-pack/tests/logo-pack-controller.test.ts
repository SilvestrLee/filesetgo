import { describe, expect, it, vi } from 'vitest';

import type {
  ImagePreflightOutcome,
  ImagePreflightResult,
  ImageProcessingSetJob,
  ImageProcessingSetOutcome,
  ImageSetResult,
} from '@filesetgo/core';

import type { QuickFitCoreClient } from '../../quick-fit/workflow';
import { QuickFitWorkflow } from '../../quick-fit/workflow';
import type { LogoPackCoreClient } from '../logo-pack-controller';
import { LogoPackController } from '../logo-pack-controller';

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
      format: 'png',
      width: 1000,
      height: 1000,
      megapixels: 1,
      fileSize: 500_000,
      safeToDecode: true,
      ...overrides,
    },
  };
}

function setResult(): ImageSetResult {
  return { assets: [], assetCount: 7, totalOutputBytes: 100_000, archive: { blob: new Blob(['x']), filename: 'x.zip', byteSize: 100 } };
}

function fakeJob(outcome: ImageProcessingSetOutcome): ImageProcessingSetJob {
  return { jobId: 'logo-pack-job', result: Promise.resolve(outcome), cancel: vi.fn() };
}

function pendingJob(): { job: ImageProcessingSetJob; resolve: (o: ImageProcessingSetOutcome) => void } {
  const { promise, resolve } = deferred<ImageProcessingSetOutcome>();
  const cancel = vi.fn(() => {
    resolve({ status: 'cancelled', error: { code: 'PROCESSING_CANCELLED', message: 'cancelled', recoverable: true } });
  });
  return { job: { jobId: 'logo-pack-job', result: promise, cancel }, resolve };
}

function newFile(name = 'logo.png'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });
}

function setUp() {
  const quickFitCore = {
    preflightImage: vi.fn(),
    processImage: vi.fn(),
    processImageToTarget: vi.fn(),
    getRuntimeCapabilities: vi.fn(),
  } as unknown as QuickFitCoreClient & { preflightImage: ReturnType<typeof vi.fn> };
  const workflow = new QuickFitWorkflow({ core: quickFitCore });

  const logoPackCore: LogoPackCoreClient & { processImageSet: ReturnType<typeof vi.fn> } = {
    processImageSet: vi.fn(),
  } as unknown as LogoPackCoreClient & { processImageSet: ReturnType<typeof vi.fn> };

  const controller = new LogoPackController(workflow, logoPackCore);

  return { quickFitCore, workflow, logoPackCore, controller };
}

describe('LogoPackController — suitability', () => {
  it('is undefined without a selected source', () => {
    const { controller } = setUp();
    expect(controller.suitability()).toBeUndefined();
  });

  it('reflects the current source once selected', async () => {
    const { quickFitCore, workflow, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    await workflow.selectFile(newFile());

    expect(controller.suitability()?.blocked).toBe(false);
  });
});

describe('LogoPackController — creating a pack', () => {
  it('compiles and runs the logo pack through processImageSet()', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    logoPackCore.processImageSet.mockReturnValue(fakeJob({ status: 'complete', result: setResult() }));
    await workflow.selectFile(newFile('acme-logo.png'));

    controller.createLogoPack();

    expect(logoPackCore.processImageSet).toHaveBeenCalledTimes(1);
    const [, options] = logoPackCore.processImageSet.mock.calls[0];
    expect(options.outputs).toHaveLength(7);
    expect(options.archive.filename).toBe('acme-logo-filesetgo-logo-pack.zip');
  });

  it('does nothing without a selected source', () => {
    const { logoPackCore, controller } = setUp();
    controller.createLogoPack();
    expect(logoPackCore.processImageSet).not.toHaveBeenCalled();
  });

  it('does not start generation when suitability is blocking', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady({ width: 50, height: 50 }));
    await workflow.selectFile(newFile());

    controller.createLogoPack();

    expect(logoPackCore.processImageSet).not.toHaveBeenCalled();
    expect(controller.getState().status).toBe('idle');
  });

  it('resolves to a success state with the real result', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const result = setResult();
    const job = fakeJob({ status: 'complete', result });
    logoPackCore.processImageSet.mockReturnValue(job);
    await workflow.selectFile(newFile());

    controller.createLogoPack();
    await job.result;

    const state = controller.getState();
    expect(state.status).toBe('success');

    // The controller must surface processImageSet()'s own resolved result —
    // including its archive Blob — untouched. No copy, no reconstruction:
    // this is the object identity the primary "Download logo pack" CTA relies
    // on for its Blob URL (directive §5 / Primary ZIP Experience).
    if (state.status === 'success') {
      expect(state.result).toBe(result);
      expect(state.result.archive).toBe(result.archive);
      expect(state.result.archive?.blob).toBe(result.archive?.blob);
    }
  });

  it('resolves to a failed state on processing failure', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const job = fakeJob({ status: 'failed', error: { code: 'ENCODE_FAILED', message: 'x', recoverable: true } });
    logoPackCore.processImageSet.mockReturnValue(job);
    await workflow.selectFile(newFile());

    controller.createLogoPack();
    await job.result;

    expect(controller.getState().status).toBe('failed');
  });

  it('does not start a second job while one is already processing', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const { job } = pendingJob();
    logoPackCore.processImageSet.mockReturnValue(job);
    await workflow.selectFile(newFile());

    controller.createLogoPack();
    controller.createLogoPack();

    expect(logoPackCore.processImageSet).toHaveBeenCalledTimes(1);
  });
});

describe('LogoPackController — cancellation', () => {
  it('moves to cancelled when cancel() is called', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const { job } = pendingJob();
    logoPackCore.processImageSet.mockReturnValue(job);
    await workflow.selectFile(newFile());

    controller.createLogoPack();
    controller.cancel();
    await job.result;

    expect(controller.getState().status).toBe('cancelled');
  });
});

describe('LogoPackController — stale-result protection and reset', () => {
  it('clears its own result when a replacement file is selected', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const job = fakeJob({ status: 'complete', result: setResult() });
    logoPackCore.processImageSet.mockReturnValue(job);
    await workflow.selectFile(newFile('a.png'));

    controller.createLogoPack();
    await job.result;
    expect(controller.getState().status).toBe('success');

    await workflow.selectFile(newFile('b.png'));

    expect(controller.getState().status).toBe('idle');
  });

  it('does not touch Quick Fit workflow state (no re-preflight, no run())', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    logoPackCore.processImageSet.mockReturnValue(fakeJob({ status: 'complete', result: setResult() }));
    await workflow.selectFile(newFile());
    expect(quickFitCore.preflightImage).toHaveBeenCalledTimes(1);

    controller.createLogoPack();

    expect(quickFitCore.preflightImage).toHaveBeenCalledTimes(1);
    expect(workflow.getState().status).toBe('ready');
  });

  it('clears state on reset()', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const job = fakeJob({ status: 'complete', result: setResult() });
    logoPackCore.processImageSet.mockReturnValue(job);
    await workflow.selectFile(newFile());
    controller.createLogoPack();
    await job.result;

    controller.reset();

    expect(controller.getState().status).toBe('idle');
  });
});
