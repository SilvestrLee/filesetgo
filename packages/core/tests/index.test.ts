import { describe, expect, it } from 'vitest';

import { FILESETGO_CORE_VERSION } from '../src';

describe('@filesetgo/core', () => {
  it('exports its current version', () => {
    expect(FILESETGO_CORE_VERSION).toBe('0.1.0');
  });
});
