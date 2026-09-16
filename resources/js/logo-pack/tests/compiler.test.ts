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

  it('registers an approved favicon Blob once and routes only square outputs to it', () => {
    const faviconSource = new Blob(['compact-mark'], { type: 'image/png' });
    const request = compileLogoPackRequest('transparent', 'acme-logo.png', undefined, faviconSource);

    expect(request.sources).toEqual({ 'favicon-source': faviconSource });
    expect(request.outputs).toHaveLength(7);
    expect(request.outputs.slice(0, 2).every((output) => output.source === undefined)).toBe(true);
    expect(request.outputs.slice(2).every((output) => output.source === 'favicon-source')).toBe(true);
  });
});
