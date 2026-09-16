import { describe, expect, it, vi } from 'vitest';

import type {
  ImagePreflightOutcome,
  ImagePreflightResult,
  ImageProcessingSetJob,
  ImageProcessingSetOutcome,
  ImageSetResult,
  TransparentMasterJob,
  TransparentMasterOutcome,
  TransparentMasterResult,
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

function transparentMasterResult(overrides: Partial<TransparentMasterResult> = {}): TransparentMasterResult {
  return {
    blob: new Blob(['master'], { type: 'image/png' }),
    width: 40,
    height: 40,
    format: 'png',
    mimeType: 'image/png',
    byteSize: 6,
    sourceDimensions: { width: 40, height: 40 },
    normalizedDimensions: { width: 40, height: 40 },
    analysisDimensions: { width: 40, height: 40 },
    visibleBounds: { left: 5, top: 10, width: 30, height: 20 },
    safePadding: 2,
    canvasTrimmed: true,
    foregroundRescaled: false,
    alphaInspection: {
      sampledPixels: 1600,
      fullyTransparentPixels: 200,
      semiTransparentPixels: 50,
      minAlpha: 0,
      maxAlpha: 255,
      transparentRatio: 0.125,
      classification: 'transparency-present',
    },
    removalApplied: true,
    strength: 'balanced',
    status: 'verified',
    ...overrides,
  };
}

function fakeMasterJob(outcome: TransparentMasterOutcome): TransparentMasterJob {
  return { jobId: 'transparent-master-job', result: Promise.resolve(outcome), cancel: vi.fn() };
}

function pendingMasterJob(): { job: TransparentMasterJob; resolve: (o: TransparentMasterOutcome) => void } {
  const { promise, resolve } = deferred<TransparentMasterOutcome>();
  const cancel = vi.fn(() => {
    resolve({ status: 'cancelled', error: { code: 'PROCESSING_CANCELLED', message: 'cancelled', recoverable: true } });
  });
  return { job: { jobId: 'transparent-master-job', result: promise, cancel }, resolve };
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

  const logoPackCore: LogoPackCoreClient & {
    preflightImage: ReturnType<typeof vi.fn>;
    processImageSet: ReturnType<typeof vi.fn>;
    prepareTransparentMaster: ReturnType<typeof vi.fn>;
  } = {
    preflightImage: vi.fn(),
    processImageSet: vi.fn(),
    prepareTransparentMaster: vi.fn(),
  } as unknown as LogoPackCoreClient & {
    preflightImage: ReturnType<typeof vi.fn>;
    processImageSet: ReturnType<typeof vi.fn>;
    prepareTransparentMaster: ReturnType<typeof vi.fn>;
  };

  const controller = new LogoPackController(workflow, logoPackCore);

  return { quickFitCore, workflow, logoPackCore, controller };
}

function approveFullLogo(controller: LogoPackController): void {
  controller.approveFullLogoFaviconSource();
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

describe('LogoPackController — background mode selection', () => {
  it('has no mode selected until the user chooses (directive §5)', () => {
    const { controller } = setUp();
    expect(controller.getMode()).toBeUndefined();
  });

  it('never preselects a mode once a source is chosen', async () => {
    const { quickFitCore, workflow, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    await workflow.selectFile(newFile());

    expect(controller.getMode()).toBeUndefined();
  });

  it('selecting original does not start any job', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    await workflow.selectFile(newFile());

    controller.selectBackgroundMode('original');

    expect(controller.getMode()).toBe('original');
    expect(controller.getState().status).toBe('idle');
    expect(logoPackCore.prepareTransparentMaster).not.toHaveBeenCalled();
  });

  it('selecting transparent immediately starts preview preparation at the governed default strength', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    logoPackCore.prepareTransparentMaster.mockReturnValue(fakeMasterJob({ status: 'complete', result: transparentMasterResult() }));
    await workflow.selectFile(newFile());

    controller.selectBackgroundMode('transparent');

    expect(controller.getMode()).toBe('transparent');
    expect(controller.getStrength()).toBe('balanced');
    expect(logoPackCore.prepareTransparentMaster).toHaveBeenCalledTimes(1);
    const [, options] = logoPackCore.prepareTransparentMaster.mock.calls[0];
    expect(options.strength).toBe('balanced');
  });

  it('resolves to preview-ready with the real master result', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const master = transparentMasterResult();
    const job = fakeMasterJob({ status: 'complete', result: master });
    logoPackCore.prepareTransparentMaster.mockReturnValue(job);
    await workflow.selectFile(newFile());

    controller.selectBackgroundMode('transparent');
    await job.result;

    const state = controller.getState();
    expect(state.status).toBe('preview-ready');
    if (state.status === 'preview-ready') {
      expect(state.master).toBe(master);
    }
  });

  it('resolves to preview-failed on a worker-level failure', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const job = fakeMasterJob({ status: 'failed', error: { code: 'DECODE_FAILED', message: 'x', recoverable: true } });
    logoPackCore.prepareTransparentMaster.mockReturnValue(job);
    await workflow.selectFile(newFile());

    controller.selectBackgroundMode('transparent');
    await job.result;

    expect(controller.getState().status).toBe('preview-failed');
  });

  it('changing strength regenerates the transparent master and preview (directive §15)', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const firstJob = fakeMasterJob({ status: 'complete', result: transparentMasterResult({ strength: 'balanced' }) });
    logoPackCore.prepareTransparentMaster.mockReturnValueOnce(firstJob);
    await workflow.selectFile(newFile());
    controller.selectBackgroundMode('transparent');
    await firstJob.result;

    const secondJob = fakeMasterJob({ status: 'complete', result: transparentMasterResult({ strength: 'strong' }) });
    logoPackCore.prepareTransparentMaster.mockReturnValueOnce(secondJob);
    controller.setRemovalStrength('strong');
    await secondJob.result;

    expect(logoPackCore.prepareTransparentMaster).toHaveBeenCalledTimes(2);
    const [, secondOptions] = logoPackCore.prepareTransparentMaster.mock.calls[1];
    expect(secondOptions.strength).toBe('strong');
    expect(controller.getStrength()).toBe('strong');

    const state = controller.getState();
    expect(state.status).toBe('preview-ready');
    if (state.status === 'preview-ready') {
      expect(state.master.strength).toBe('strong');
    }
  });

  it('setRemovalStrength is a no-op outside transparent mode', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    await workflow.selectFile(newFile());
    controller.selectBackgroundMode('original');

    controller.setRemovalStrength('strong');

    expect(logoPackCore.prepareTransparentMaster).not.toHaveBeenCalled();
  });

  it('selecting original after a transparent preview cancels the in-flight preview job', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const { job } = pendingMasterJob();
    logoPackCore.prepareTransparentMaster.mockReturnValue(job);
    await workflow.selectFile(newFile());

    controller.selectBackgroundMode('transparent');
    controller.selectBackgroundMode('original');

    expect(job.cancel).toHaveBeenCalledTimes(1);
    expect(controller.getState().status).toBe('idle');
  });
});

describe('LogoPackController — creating a pack (original mode)', () => {
  it('requires an explicit favicon source approval before generation', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    await workflow.selectFile(newFile());
    controller.selectBackgroundMode('original');

    controller.createLogoPack();

    expect(logoPackCore.processImageSet).not.toHaveBeenCalled();
  });

  it('compiles and runs the logo pack through processImageSet() using the original file', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    logoPackCore.processImageSet.mockReturnValue(fakeJob({ status: 'complete', result: setResult() }));
    const file = newFile('acme-logo.png');
    await workflow.selectFile(file);
    controller.selectBackgroundMode('original');
    approveFullLogo(controller);

    controller.createLogoPack();

    expect(logoPackCore.processImageSet).toHaveBeenCalledTimes(1);
    const [source, options] = logoPackCore.processImageSet.mock.calls[0];
    expect(source).toBe(file);
    expect(options.outputs).toHaveLength(7);
    expect(options.archive.filename).toBe('acme-logo-filesetgo-original-logo-pack.zip');
  });

  it('does nothing without a selected source', () => {
    const { logoPackCore, controller } = setUp();
    controller.createLogoPack();
    expect(logoPackCore.processImageSet).not.toHaveBeenCalled();
  });

  it('does nothing without a chosen background mode', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    await workflow.selectFile(newFile());

    controller.createLogoPack();

    expect(logoPackCore.processImageSet).not.toHaveBeenCalled();
    expect(controller.getState().status).toBe('idle');
  });

  it('does not start generation when suitability is blocking', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady({ width: 50, height: 50 }));
    await workflow.selectFile(newFile());
    controller.selectBackgroundMode('original');
    approveFullLogo(controller);

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
    controller.selectBackgroundMode('original');
    approveFullLogo(controller);

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
    controller.selectBackgroundMode('original');
    approveFullLogo(controller);

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
    controller.selectBackgroundMode('original');
    approveFullLogo(controller);

    controller.createLogoPack();
    controller.createLogoPack();

    expect(logoPackCore.processImageSet).toHaveBeenCalledTimes(1);
  });
});

describe('LogoPackController — favicon source ownership', () => {
  it('assesses the accepted full prepared logo without claiming semantic icon detection', async () => {
    const { quickFitCore, workflow, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady({ width: 1600, height: 240 }));
    await workflow.selectFile(newFile());
    controller.selectBackgroundMode('original');

    const base = controller.getFaviconSourceBase();

    expect(base?.width).toBe(1600);
    expect(base?.height).toBe(240);
    expect(base?.suitability.suitable).toBe(false);
  });

  it('keeps header outputs on the full master and assigns only square outputs to the approved selected region', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady({ width: 1600, height: 240 }));
    logoPackCore.processImageSet.mockReturnValue(fakeJob({ status: 'complete', result: setResult() }));
    const source = newFile('wide-brand.png');
    const selectedRegion = new Blob(['compact-mark'], { type: 'image/png' });
    await workflow.selectFile(source);
    controller.selectBackgroundMode('original');
    controller.approvePreparedFaviconSource('selected-region', {
      blob: selectedRegion,
      width: 240,
      height: 240,
      transparentCanvasTrimmed: true,
    });

    controller.createLogoPack();

    const [packageSource, request] = logoPackCore.processImageSet.mock.calls[0];
    expect(packageSource).toBe(source);
    expect(request.sources).toEqual({ 'favicon-source': selectedRegion });
    expect(request.outputs.slice(0, 2).every((output: { source?: string }) => output.source === undefined)).toBe(true);
    expect(request.outputs.slice(2).every((output: { source?: string }) => output.source === 'favicon-source')).toBe(true);
  });

  it('preflights an alternate icon without replacing the full logo source', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    logoPackCore.preflightImage.mockResolvedValue(preflightReady({ width: 256, height: 256 }));
    await workflow.selectFile(newFile('wide-brand.png'));
    controller.selectBackgroundMode('original');
    const alternate = newFile('brand-mark.png');

    const outcome = await controller.inspectAlternateFaviconSource(alternate);

    expect(outcome.status).toBe('ready');
    expect(logoPackCore.preflightImage).toHaveBeenCalledWith(alternate);
  });

  it('records the user-approved source kind in the completed result', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const job = fakeJob({ status: 'complete', result: setResult() });
    logoPackCore.processImageSet.mockReturnValue(job);
    await workflow.selectFile(newFile());
    controller.selectBackgroundMode('original');
    controller.approvePreparedFaviconSource('alternate-icon', {
      blob: new Blob(['alternate'], { type: 'image/png' }),
      width: 256,
      height: 256,
      transparentCanvasTrimmed: false,
    });

    controller.createLogoPack();
    await job.result;

    const state = controller.getState();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.faviconSourceKind).toBe('alternate-icon');
    }
  });

  it('invalidates approval when the background mode changes', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    logoPackCore.prepareTransparentMaster.mockReturnValue(
      fakeMasterJob({ status: 'complete', result: transparentMasterResult() }),
    );
    await workflow.selectFile(newFile());
    controller.selectBackgroundMode('original');
    approveFullLogo(controller);
    expect(controller.getApprovedFaviconSource()?.kind).toBe('full-logo');

    controller.selectBackgroundMode('transparent');

    expect(controller.getApprovedFaviconSource()).toBeUndefined();
  });
});

describe('LogoPackController — creating a pack (transparent mode)', () => {
  it('packages from the verified transparent master, not the original file', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const master = transparentMasterResult({ status: 'verified' });
    const masterJob = fakeMasterJob({ status: 'complete', result: master });
    const packageJob = fakeJob({ status: 'complete', result: setResult() });
    logoPackCore.prepareTransparentMaster.mockReturnValue(masterJob);
    logoPackCore.processImageSet.mockReturnValue(packageJob);
    const file = newFile('acme-logo.png');
    await workflow.selectFile(file);

    controller.selectBackgroundMode('transparent');
    await masterJob.result;
    approveFullLogo(controller);
    controller.createLogoPack();
    await packageJob.result;

    expect(logoPackCore.processImageSet).toHaveBeenCalledTimes(1);
    const [source, options] = logoPackCore.processImageSet.mock.calls[0];
    expect(source).toBe(master.blob);
    expect(source).not.toBe(file);
    expect(options.archive.filename).toBe('acme-logo-filesetgo-transparent-logo-pack.zip');

    const state = controller.getState();
    expect(state.status).toBe('success');

    if (state.status === 'success') {
      expect(state.preparation).toEqual({
        sourceDimensions: { width: 40, height: 40 },
        preparedDimensions: { width: 40, height: 40 },
        analysisDimensions: { width: 40, height: 40 },
        visibleDimensions: { width: 30, height: 20 },
        safePadding: 2,
        canvasTrimmed: true,
        foregroundRescaled: false,
        transparencyStatus: 'verified',
        resolutionStatus: 'too-small',
      });
      expect(state.preparation).not.toHaveProperty('blob');
    }
  });

  it('proceeds when the master is needs-review, not only verified', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const master = transparentMasterResult({ status: 'needs-review', reason: 'non-flat-background' });
    const masterJob = fakeMasterJob({ status: 'complete', result: master });
    logoPackCore.prepareTransparentMaster.mockReturnValue(masterJob);
    logoPackCore.processImageSet.mockReturnValue(fakeJob({ status: 'complete', result: setResult() }));
    await workflow.selectFile(newFile());

    controller.selectBackgroundMode('transparent');
    await masterJob.result;
    approveFullLogo(controller);
    controller.createLogoPack();

    expect(logoPackCore.processImageSet).toHaveBeenCalledTimes(1);
  });

  it('blocks packaging when the master is failed (directive §28)', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const master = transparentMasterResult({ status: 'failed', reason: 'insufficient-remaining-foreground' });
    const masterJob = fakeMasterJob({ status: 'complete', result: master });
    logoPackCore.prepareTransparentMaster.mockReturnValue(masterJob);
    await workflow.selectFile(newFile());

    controller.selectBackgroundMode('transparent');
    await masterJob.result;
    controller.createLogoPack();

    expect(logoPackCore.processImageSet).not.toHaveBeenCalled();
    expect(controller.getState().status).toBe('preview-ready');
  });

  it('blocks packaging while the preview is still preparing', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const { job } = pendingMasterJob();
    logoPackCore.prepareTransparentMaster.mockReturnValue(job);
    await workflow.selectFile(newFile());

    controller.selectBackgroundMode('transparent');
    controller.createLogoPack();

    expect(logoPackCore.processImageSet).not.toHaveBeenCalled();
  });
});

describe('LogoPackController — cancellation', () => {
  it('moves to cancelled when cancel() is called during packaging', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const { job } = pendingJob();
    logoPackCore.processImageSet.mockReturnValue(job);
    await workflow.selectFile(newFile());
    controller.selectBackgroundMode('original');
    approveFullLogo(controller);

    controller.createLogoPack();
    controller.cancel();
    await job.result;

    expect(controller.getState().status).toBe('cancelled');
  });

  it('moves to cancelled when cancel() is called during preview preparation', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const { job } = pendingMasterJob();
    logoPackCore.prepareTransparentMaster.mockReturnValue(job);
    await workflow.selectFile(newFile());

    controller.selectBackgroundMode('transparent');
    controller.cancel();
    await job.result;

    expect(controller.getState().status).toBe('cancelled');
  });

  it('allows retrying preview preparation after cancellation without a page refresh (directive §22)', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const { job } = pendingMasterJob();
    logoPackCore.prepareTransparentMaster.mockReturnValue(job);
    await workflow.selectFile(newFile());
    controller.selectBackgroundMode('transparent');
    controller.cancel();
    await job.result;
    expect(controller.getState().status).toBe('cancelled');

    const retryJob = fakeMasterJob({ status: 'complete', result: transparentMasterResult() });
    logoPackCore.prepareTransparentMaster.mockReturnValue(retryJob);
    controller.retryTransparentPreview();
    await retryJob.result;

    expect(controller.getState().status).toBe('preview-ready');
  });
});

describe('LogoPackController — stale-result protection and reset', () => {
  it('clears its own result and mode when a replacement file is selected', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const job = fakeJob({ status: 'complete', result: setResult() });
    logoPackCore.processImageSet.mockReturnValue(job);
    await workflow.selectFile(newFile('a.png'));
    controller.selectBackgroundMode('original');
    approveFullLogo(controller);

    controller.createLogoPack();
    await job.result;
    expect(controller.getState().status).toBe('success');

    await workflow.selectFile(newFile('b.png'));

    expect(controller.getState().status).toBe('idle');
    expect(controller.getMode()).toBeUndefined();
  });

  it('does not touch Quick Fit workflow state (no re-preflight, no run())', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    logoPackCore.processImageSet.mockReturnValue(fakeJob({ status: 'complete', result: setResult() }));
    await workflow.selectFile(newFile());
    expect(quickFitCore.preflightImage).toHaveBeenCalledTimes(1);

    controller.selectBackgroundMode('original');
    approveFullLogo(controller);
    controller.createLogoPack();

    expect(quickFitCore.preflightImage).toHaveBeenCalledTimes(1);
    expect(workflow.getState().status).toBe('ready');
  });

  it('clears state and mode on reset()', async () => {
    const { quickFitCore, workflow, logoPackCore, controller } = setUp();
    quickFitCore.preflightImage.mockResolvedValue(preflightReady());
    const job = fakeJob({ status: 'complete', result: setResult() });
    logoPackCore.processImageSet.mockReturnValue(job);
    await workflow.selectFile(newFile());
    controller.selectBackgroundMode('original');
    approveFullLogo(controller);
    controller.createLogoPack();
    await job.result;

    controller.reset();

    expect(controller.getState().status).toBe('idle');
    expect(controller.getMode()).toBeUndefined();
  });
});
