import { describe, expect, it } from 'vitest';

import { getRuntimeCapabilities } from '../../src/runtime/capabilities';

describe('getRuntimeCapabilities', () => {
  it('reports unavailable browser APIs truthfully outside a browser', async () => {
    const capabilities = await getRuntimeCapabilities();

    expect(capabilities).toEqual({
      webWorker: false,
      offscreenCanvas: false,
      createImageBitmap: false,
      workerProcessing: false,
      jpegEncode: false,
      pngEncode: false,
      webpEncode: false,
      heicDecoderAvailable: false,
    });
  });
});
