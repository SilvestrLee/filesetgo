import { describe, expect, it } from 'vitest';

import { createImageJobId } from '../../src/runtime/job-id';

describe('createImageJobId', () => {
  it('creates opaque session-unique FileSetGo job IDs', () => {
    const first = createImageJobId();
    const second = createImageJobId();

    expect(first).toMatch(/^fsgjob_/);
    expect(second).toMatch(/^fsgjob_/);
    expect(second).not.toBe(first);
  });
});
