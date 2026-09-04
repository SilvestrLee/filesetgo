import { describe, expect, it } from 'vitest';

import { compileLogoPackRequest } from '../compiler';
import { buildLogoPackOutputSpecs } from '../spec';

describe('compileLogoPackRequest', () => {
  it('includes the exact governed output specs', () => {
    const request = compileLogoPackRequest('acme-logo.png');
    expect(request.outputs).toEqual(buildLogoPackOutputSpecs());
  });

  it('derives the archive filename from the source filename', () => {
    const request = compileLogoPackRequest('acme-logo.png');
    expect(request.archive?.filename).toBe('acme-logo-filesetgo-logo-pack.zip');
  });

  it('forwards the onProgress callback', () => {
    const onProgress = () => {};
    const request = compileLogoPackRequest('acme-logo.png', onProgress);
    expect(request.onProgress).toBe(onProgress);
  });
});
