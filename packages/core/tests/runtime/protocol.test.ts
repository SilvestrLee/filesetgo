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
  ])('rejects a malformed event envelope', (value) => {
    expect(isImageWorkerEvent(value)).toBe(false);
  });
});
