import { describe, expect, it } from 'vitest';

import { compileLogoPackRequest } from '../compiler';
import { buildLogoPackOutputSpecs } from '../spec';

describe('compileLogoPackRequest', () => {
  it('includes the exact governed output specs for the requested mode', () => {
    const request = compileLogoPackRequest('transparent', 'acme-logo.png');
    expect(request.outputs).toEqual(buildLogoPackOutputSpecs('transparent', 'acme-logo.png'));
  });

  it('derives the mode-aware archive filename from the source filename', () => {
    expect(compileLogoPackRequest('transparent', 'acme-logo.png').archive?.filename).toBe(
      'acme-logo-filesetgo-transparent-logo-pack.zip',
    );
    expect(compileLogoPackRequest('original', 'acme-logo.png').archive?.filename).toBe(
      'acme-logo-filesetgo-original-logo-pack.zip',
    );
  });

  it('forwards the onProgress callback', () => {
    const onProgress = () => {};
    const request = compileLogoPackRequest('transparent', 'acme-logo.png', onProgress);
    expect(request.onProgress).toBe(onProgress);
  });
});
