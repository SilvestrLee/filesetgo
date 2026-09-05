import { describe, expect, it } from 'vitest';

import { isImageWorkerEvent } from '../../src/runtime/protocol';

describe('image worker protocol validation', () => {
  it.each([
    ['accepted', { type: 'JOB_ACCEPTED', jobId: 'fsgjob_test' }],
    [
      'progress',
      { type: 'JOB_PROGRESS', jobId: 'fsgjob_test', stage: 'decoding' },
    ],
    [
      'completion',
      {
        type: 'JOB_COMPLETE',
        jobId: 'fsgjob_test',
        result: {
          blob: new Blob([Uint8Array.of(1)]),
          width: 1,
          height: 1,
          format: 'png',
          mimeType: 'image/png',
          byteSize: 1,
          sourceDimensions: { width: 1, height: 1 },
          normalizedDimensions: { width: 1, height: 1 },
          resized: false,
        },
      },
    ],
    [
      'failure',
      {
        type: 'JOB_FAILED',
        jobId: 'fsgjob_test',
        error: {
          code: 'DECODE_FAILED',
          message: 'Decode failed.',
          recoverable: true,
        },
      },
    ],
    ['cancellation', { type: 'JOB_CANCELLED', jobId: 'fsgjob_test' }],
    [
      'image-set progress with asset index/count',
      { type: 'JOB_PROGRESS', jobId: 'fsgjob_test', stage: 'encoding', assetIndex: 2, assetCount: 5 },
    ],
    [
      'image-set completion',
      {
        type: 'JOB_COMPLETE_SET',
        jobId: 'fsgjob_test',
        result: {
          assets: [
            {
              id: 'a',
              filename: 'a.webp',
              blob: new Blob([Uint8Array.of(1)]),
              width: 1,
              height: 1,
              format: 'webp',
              mimeType: 'image/webp',
              byteSize: 1,
              sourceDimensions: { width: 1, height: 1 },
              normalizedDimensions: { width: 1, height: 1 },
              resized: false,
            },
          ],
          assetCount: 1,
          totalOutputBytes: 1,
        },
      },
    ],
    [
      'image-set completion with an archive',
      {
        type: 'JOB_COMPLETE_SET',
        jobId: 'fsgjob_test',
        result: {
          assets: [],
          assetCount: 0,
          totalOutputBytes: 0,
          archive: { blob: new Blob([Uint8Array.of(1)]), filename: 'package.zip', byteSize: 1 },
        },
      },
    ],
    [
      // Regression case: every real Logo Pack result includes an ICO asset
      // (favicon.ico) alongside raster assets. isImageSetAssetResult() once
      // validated every asset against the raster-only shape unconditionally,
      // which made this exact, entirely realistic event fail validation and
      // get silently dropped — see docs/governance/DECISIONS.md ADR-019.
      'image-set completion with a raster asset AND an ICO asset (real Logo Pack shape)',
      {
        type: 'JOB_COMPLETE_SET',
        jobId: 'fsgjob_test',
        result: {
          assets: [
            {
              kind: 'raster',
              id: 'header',
              filename: 'logo-header.png',
              blob: new Blob([Uint8Array.of(1)]),
              width: 400,
              height: 120,
              format: 'png',
              mimeType: 'image/png',
              byteSize: 1,
              sourceDimensions: { width: 400, height: 120 },
              normalizedDimensions: { width: 400, height: 120 },
              resized: false,
            },
            {
              kind: 'ico',
              id: 'favicon-ico',
              filename: 'favicon.ico',
              blob: new Blob([Uint8Array.of(2)]),
              mimeType: 'image/x-icon',
              byteSize: 1,
              sizes: [16, 32, 48],
            },
          ],
          assetCount: 2,
          totalOutputBytes: 2,
        },
      },
    ],
  ])('recognizes a valid %s event', (_, event) => {
    expect(isImageWorkerEvent(event)).toBe(true);
  });

  it.each([
    undefined,
    null,
    {},
    { type: 'JOB_COMPLETE' },
    { type: 'JOB_COMPLETE', jobId: 'fsgjob_test' },
    { type: 'JOB_PROGRESS', jobId: 'fsgjob_test', stage: 'invented' },
    { type: 'JOB_FAILED', jobId: 'fsgjob_test' },
    { type: 'UNKNOWN', jobId: 'fsgjob_test' },
    { type: 'JOB_FAILED', jobId: 42 },
    { type: 'JOB_COMPLETE_SET', jobId: 'fsgjob_test' },
    { type: 'JOB_COMPLETE_SET', jobId: 'fsgjob_test', result: { assets: [], assetCount: 0 } },
    {
      type: 'JOB_COMPLETE_SET',
      jobId: 'fsgjob_test',
      result: { assets: [{ id: 'a' }], assetCount: 1, totalOutputBytes: 1 },
    },
    {
      // A malformed ICO asset (missing `sizes`) must still be rejected —
      // the ICO branch is a real, checked shape, not a bypass.
      type: 'JOB_COMPLETE_SET',
      jobId: 'fsgjob_test',
      result: {
        assets: [
          { kind: 'ico', id: 'favicon-ico', filename: 'favicon.ico', blob: new Blob([Uint8Array.of(1)]), mimeType: 'image/x-icon', byteSize: 1 },
        ],
        assetCount: 1,
        totalOutputBytes: 1,
      },
    },
  ])('rejects a malformed event envelope', (value) => {
    expect(isImageWorkerEvent(value)).toBe(false);
  });
});
