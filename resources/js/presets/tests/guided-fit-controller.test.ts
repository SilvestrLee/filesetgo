import { describe, expect, it, vi } from 'vitest';

import type {
  ImagePreflightOutcome,
  ImagePreflightResult,
  ImageProcessingTargetJob,
  ImageProcessingTargetOutcome,
  TargetSizeResult,
} from '@filesetgo/core';

import type { QuickFitCoreClient } from '../../quick-fit/workflow';
import { QuickFitWorkflow } from '../../quick-fit/workflow';
import { GuidedFitController } from '../guided-fit-controller';

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
      width: 2400,
      height: 1600,
      megapixels: 3.84,
      fileSize: 1_800_000,
      safeToDecode: true,
      ...overrides,
    },
  };
}

function targetResult(overrides: Partial<TargetSizeResult> = {}): TargetSizeResult {
  return {
    blob: new Blob(['x']),
    width: 1600,
    height: 1067,
    format: 'webp',
    mimeType: 'image/webp',
    byteSize: 238_000,
    sourceDimensions: { width: 2400, height: 1600 },
    normalizedDimensions: { width: 2400, height: 1600 },
    resized: true,
    targetBytes: 300 * 1024,
    targetMet: true,
    quality: 0.8,
    dimensionsReduced: true,
    qualityProbeCount: 3,
    dimensionTierCount: 1,
    ...overrides,
  };
}

function fakeTargetJob(outcome: ImageProcessingTargetOutcome): ImageProcessingTargetJob {
  return { jobId: 'guided-job', result: Promise.resolve(outcome), cancel: vi.fn() };
}

function pendingTargetJob(): { job: ImageProcessingTargetJob; resolve: (o: ImageProcessingTargetOutcome) => void } {
  const { promise, resolve } = deferred<ImageProcessingTargetOutcome>();
  const cancel = vi.fn(() => {
    resolve({ status: 'cancelled', error: { code: 'PROCESSING_CANCELLED', message: 'cancelled', recoverable: true } });
  });
  return { job: { jobId: 'guided-job', result: promise, cancel }, resolve };
}

function makeCore(): QuickFitCoreClient & {
  preflightImage: ReturnType<typeof vi.fn>;
  processImage: ReturnType<typeof vi.fn>;
  processImageToTarget: ReturnType<typeof vi.fn>;
  getRuntimeCapabilities: ReturnType<typeof vi.fn>;
} {
  return {
    preflightImage: vi.fn(),
    processImage: vi.fn(),
    processImageToTarget: vi.fn(),
    getRuntimeCapabilities: vi.fn(),
  } as unknown as ReturnType<typeof makeCore>;
}

function newFile(name = 'source.jpg'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/jpeg' });
}

function setUp() {
  const core = makeCore();
  const workflow = new QuickFitWorkflow({ core });
  const guided = new GuidedFitController(workflow);
  return { core, workflow, guided };
}

describe('GuidedFitController — mode switching', () => {
  it('defaults to quick-fit mode', () => {
    const { guided } = setUp();
    expect(guided.getMode()).toBe('quick-fit');
  });

  it('retains the selected file across a mode switch and does not re-preflight', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage.mockResolvedValue(preflightReady());

    await workflow.selectFile(newFile());
    expect(core.preflightImage).toHaveBeenCalledTimes(1);

    guided.setMode('guided-fit');
    guided.setMode('quick-fit');
    guided.setMode('guided-fit');

    expect(core.preflightImage).toHaveBeenCalledTimes(1);
    expect(workflow.getState().status).toBe('ready');
  });

  it('does not process merely from switching modes', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage.mockResolvedValue(preflightReady());
    await workflow.selectFile(newFile());

    guided.setMode('guided-fit');

    expect(core.processImageToTarget).not.toHaveBeenCalled();
    expect(workflow.getState().status).toBe('ready');
  });

  it('disables mode switching while a job is processing', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage.mockResolvedValue(preflightReady());
    const { job } = pendingTargetJob();
    core.processImageToTarget.mockReturnValue(job);

    await workflow.selectFile(newFile());
    guided.selectPreset('web.content');
    guided.runSelectedPreset();
    expect(workflow.getState().status).toBe('processing');

    guided.setMode('guided-fit');
    expect(guided.getMode()).toBe('quick-fit');

    workflow.cancel();
    await job.result;
    expect(workflow.getState().status).toBe('cancelled');

    guided.setMode('guided-fit');
    expect(guided.getMode()).toBe('guided-fit');
  });
});

describe('GuidedFitController — preset selection', () => {
  it('selects and changes the current preset', () => {
    const { guided } = setUp();

    guided.selectPreset('web.hero');
    expect(guided.currentPreset()?.id).toBe('web.hero');

    guided.selectPreset('web.card');
    expect(guided.currentPreset()?.id).toBe('web.card');
  });

  it('throws cleanly for an unknown preset id instead of silently falling back', () => {
    const { guided } = setUp();
    expect(() => guided.selectPreset('nonexistent')).toThrow(/unknown FileSetGo preset id/i);
  });

  it('has no current preset until one is selected', () => {
    const { guided } = setUp();
    expect(guided.currentPreset()).toBeUndefined();
  });
});

describe('GuidedFitController — running a preset', () => {
  it('compiles and runs the selected preset through processImageToTarget()', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage.mockResolvedValue(preflightReady());
    core.processImageToTarget.mockReturnValue(fakeTargetJob({ status: 'complete', result: targetResult() }));

    await workflow.selectFile(newFile());
    guided.selectPreset('web.content');
    guided.runSelectedPreset();

    expect(core.processImageToTarget).toHaveBeenCalledTimes(1);
    const [, options] = core.processImageToTarget.mock.calls[0];
    expect(options.targetBytes).toBe(300 * 1024);
    expect(options.dimensions).toEqual({ maxWidth: 1600, maxHeight: 1600 });
    expect(options.output).toEqual({ format: 'webp' });
  });

  it('does nothing when run without a selected preset', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage.mockResolvedValue(preflightReady());
    await workflow.selectFile(newFile());

    guided.runSelectedPreset();

    expect(core.processImageToTarget).not.toHaveBeenCalled();
  });

  it('does nothing when run without a selected file', () => {
    const { core, guided } = setUp();
    guided.selectPreset('web.content');

    guided.runSelectedPreset();

    expect(core.processImageToTarget).not.toHaveBeenCalled();
  });

  it('retains preset context through a successful result', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage.mockResolvedValue(preflightReady());
    const job = fakeTargetJob({ status: 'complete', result: targetResult() });
    core.processImageToTarget.mockReturnValue(job);

    await workflow.selectFile(newFile());
    guided.selectPreset('web.content');
    guided.runSelectedPreset();
    await job.result;

    expect(workflow.getState().status).toBe('success');
    expect(guided.getResultPresetId()).toBe('web.content');
  });

  it('retains preset context through an unreachable result', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage.mockResolvedValue(preflightReady());
    const job = fakeTargetJob({
      status: 'unreachable',
      outcome: { code: 'TARGET_UNREACHABLE_MIN_QUALITY', message: 'x', qualityProbeCount: 5, dimensionTierCount: 6 },
    });
    core.processImageToTarget.mockReturnValue(job);

    await workflow.selectFile(newFile());
    guided.selectPreset('web.hero');
    guided.runSelectedPreset();
    await job.result;

    expect(workflow.getState().status).toBe('unreachable');
    expect(guided.getResultPresetId()).toBe('web.hero');
  });

  it('reports a processing failure as a failure, not a preset success', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage.mockResolvedValue(preflightReady());
    const job = fakeTargetJob({
      status: 'failed',
      error: { code: 'ENCODE_FAILED', message: 'x', recoverable: true },
    });
    core.processImageToTarget.mockReturnValue(job);

    await workflow.selectFile(newFile());
    guided.selectPreset('web.card');
    guided.runSelectedPreset();
    await job.result;

    expect(workflow.getState().status).toBe('failed');
  });
});

describe('GuidedFitController — reset and file replacement', () => {
  it('clears preset selection and result context on workflow reset', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage.mockResolvedValue(preflightReady());
    const job = fakeTargetJob({ status: 'complete', result: targetResult() });
    core.processImageToTarget.mockReturnValue(job);

    await workflow.selectFile(newFile());
    guided.selectPreset('web.content');
    guided.runSelectedPreset();
    await job.result;

    workflow.reset();

    expect(guided.currentPreset()).toBeUndefined();
    expect(guided.getResultPresetId()).toBeUndefined();
    expect(workflow.getState().status).toBe('idle');
  });

  it('invalidates the prior result context when a replacement file is selected, but keeps the preset choice', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage.mockResolvedValue(preflightReady());
    const job = fakeTargetJob({ status: 'complete', result: targetResult() });
    core.processImageToTarget.mockReturnValue(job);

    await workflow.selectFile(newFile('a.jpg'));
    guided.selectPreset('web.content');
    guided.runSelectedPreset();
    await job.result;
    expect(guided.getResultPresetId()).toBe('web.content');

    await workflow.selectFile(newFile('b.jpg'));

    expect(guided.getResultPresetId()).toBeUndefined();
    expect(guided.currentPreset()?.id).toBe('web.content');
    expect(workflow.getState().status).toBe('ready');
  });

  it('still benefits from stale-result protection for a preset-driven job', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage
      .mockResolvedValueOnce(preflightReady())
      .mockResolvedValueOnce(preflightReady({ width: 500, height: 500 }));
    const { job, resolve } = pendingTargetJob();
    core.processImageToTarget.mockReturnValue(job);

    await workflow.selectFile(newFile('a.jpg'));
    guided.selectPreset('web.hero');
    guided.runSelectedPreset();
    expect(workflow.getState().status).toBe('processing');

    await workflow.selectFile(newFile('b.jpg'));
    expect(workflow.getState().status).toBe('ready');

    resolve({ status: 'complete', result: targetResult() });
    await Promise.resolve();
    await Promise.resolve();

    expect(workflow.getState().status).toBe('ready');
  });
});

describe('GuidedFitController — already-ready evaluation', () => {
  it('is undefined without both a source and a selected preset', () => {
    const { guided } = setUp();
    expect(guided.alreadyReady()).toBeUndefined();
  });

  it('reflects the current source against the selected preset', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage.mockResolvedValue(preflightReady({ format: 'webp', width: 700, height: 700, fileSize: 100_000 }));
    await workflow.selectFile(newFile('already.webp'));

    guided.selectPreset('web.card');

    expect(guided.alreadyReady()).toBe(true);
  });

  it('is false when the source does not yet satisfy the preset', async () => {
    const { core, workflow, guided } = setUp();
    core.preflightImage.mockResolvedValue(preflightReady());
    await workflow.selectFile(newFile());

    guided.selectPreset('web.hero');

    expect(guided.alreadyReady()).toBe(false);
  });
});

describe('GuidedFitController — adjust settings', () => {
  it('switches to quick-fit and returns the selected preset\'s prefill values', () => {
    const { guided } = setUp();
    guided.selectPreset('web.card');
    guided.setMode('guided-fit');

    const prefill = guided.adjustSettings();

    expect(guided.getMode()).toBe('quick-fit');
    expect(prefill).toEqual({
      targetSizeValue: '150',
      targetSizeUnit: 'KB',
      maxWidth: '800',
      maxHeight: '800',
      outputChoice: 'webp',
      allowDimensionReduction: true,
    });
  });

  it('does nothing and returns undefined without a selected preset', () => {
    const { guided } = setUp();
    expect(guided.adjustSettings()).toBeUndefined();
    expect(guided.getMode()).toBe('quick-fit');
  });
});
