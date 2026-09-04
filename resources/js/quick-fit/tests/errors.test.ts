import { describe, expect, it } from 'vitest';

import { describeProcessingError, describeUnreachable } from '../errors';

function error(code: string) {
  return { code: code as never, message: 'internal detail', recoverable: true };
}

describe('describeProcessingError', () => {
  it('maps every known processing/preflight error code to a human message', () => {
    const codes = [
      'FILE_TOO_LARGE',
      'DIMENSIONS_TOO_LARGE',
      'UNSUPPORTED_FORMAT',
      'INVALID_SIGNATURE',
      'CORRUPT_IMAGE',
      'ANIMATED_IMAGE_UNSUPPORTED',
      'HEIC_DECODER_UNAVAILABLE',
      'HEIC_INITIALIZATION_FAILED',
      'DECODE_FAILED',
      'ENCODE_FAILED',
      'RUNTIME_UNSUPPORTED',
      'OUTPUT_VALIDATION_FAILED',
      'WORKER_FAILED',
      'INVALID_PROCESSING_REQUEST',
      'PROCESSING_CANCELLED',
    ];

    for (const code of codes) {
      const message = describeProcessingError(error(code));
      expect(message).not.toBe('internal detail');
      expect(message.length).toBeGreaterThan(0);
    }
  });

  it('never exposes the raw error code as the user-facing message', () => {
    expect(describeProcessingError(error('FILE_TOO_LARGE'))).not.toContain('FILE_TOO_LARGE');
  });

  it('falls back to a generic message for an unmapped code', () => {
    expect(describeProcessingError(error('SOME_FUTURE_CODE'))).toContain('Something went wrong');
  });
});

describe('describeUnreachable', () => {
  it('explains a hard-dimension shortfall and suggests allowing dimension adjustment', () => {
    const outcome = { code: 'TARGET_UNREACHABLE_HARD_DIMENSIONS' as const, message: 'x', qualityProbeCount: 1, dimensionTierCount: 0 };
    const explanation = describeUnreachable(outcome, 'hard', 'jpeg');

    expect(explanation.message).toMatch(/dimensions/i);
    expect(explanation.suggestion).toMatch(/allow dimension adjustment/i);
  });

  it('suggests a larger target for a min-quality shortfall', () => {
    const outcome = { code: 'TARGET_UNREACHABLE_MIN_QUALITY' as const, message: 'x', qualityProbeCount: 5, dimensionTierCount: 6 };
    const explanation = describeUnreachable(outcome, 'flexible', 'jpeg');

    expect(explanation.suggestion).toMatch(/larger target/i);
  });

  it('mentions PNG being lossless when the output format is PNG', () => {
    const outcome = { code: 'TARGET_UNREACHABLE_MIN_DIMENSIONS' as const, message: 'x', qualityProbeCount: 0, dimensionTierCount: 6 };
    const explanation = describeUnreachable(outcome, 'flexible', 'png');

    expect(explanation.suggestion).toMatch(/PNG is lossless/i);
  });

  it('suggests allowing dimension adjustment only when the policy is currently hard', () => {
    const outcome = { code: 'TARGET_UNREACHABLE_MIN_QUALITY' as const, message: 'x', qualityProbeCount: 5, dimensionTierCount: 0 };

    expect(describeUnreachable(outcome, 'hard', 'jpeg').suggestion).toMatch(/allow dimension adjustment/i);
    expect(describeUnreachable(outcome, 'flexible', 'jpeg').suggestion).not.toMatch(/allow dimension adjustment/i);
  });

  it('never exposes the raw unreachable code as the primary message', () => {
    const outcome = { code: 'TARGET_UNREACHABLE_HARD_DIMENSIONS' as const, message: 'x', qualityProbeCount: 0, dimensionTierCount: 0 };
    expect(describeUnreachable(outcome, 'hard', 'jpeg').message).not.toContain('TARGET_UNREACHABLE');
  });
});
