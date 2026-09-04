import { preflightImage } from '../preflight/preflight-image';
import {
  OUTPUT_IMAGE_MIME_TYPES,
  type OutputImageFormat,
} from '../processing/contracts';

export interface FileSetGoRuntimeCapabilities {
  webWorker: boolean;
  offscreenCanvas: boolean;
  createImageBitmap: boolean;
  workerProcessing: boolean;
  jpegEncode: boolean;
  pngEncode: boolean;
  webpEncode: boolean;
  /**
   * True when the runtime prerequisites for lazily loading the HEIC
   * decoder (worker processing plus WebAssembly support) are present.
   * This is a feature-detected *prerequisite* check, not a guarantee: the
   * decoder module and its ~1 MB WASM payload (see ADR-014) are only
   * actually fetched, compiled, and initialized on the first HEIC job
   * (workers/heic-decode.ts), so a runtime that reports true here could
   * still fail at that point (e.g. a network failure loading the lazy
   * chunk). This deliberately avoids paying the lazy-load cost just to
   * answer a capability query.
   */
  heicDecoderAvailable: boolean;
}

async function canEncode(format: OutputImageFormat): Promise<boolean> {
  if (typeof OffscreenCanvas === 'undefined') {
    return false;
  }

  try {
    const canvas = new OffscreenCanvas(1, 1);
    const context = canvas.getContext('2d');

    if (context === null) {
      return false;
    }

    context.fillStyle = '#000';
    context.fillRect(0, 0, 1, 1);
    const blob = await canvas.convertToBlob({
      type: OUTPUT_IMAGE_MIME_TYPES[format],
      ...(format === 'png' ? {} : { quality: 0.8 }),
    });
    const outcome = await preflightImage(blob);

    canvas.width = 0;
    canvas.height = 0;

    return (
      blob.type === OUTPUT_IMAGE_MIME_TYPES[format] &&
      outcome.status === 'ready' &&
      outcome.result.format === format
    );
  } catch {
    return false;
  }
}

export async function getRuntimeCapabilities(): Promise<FileSetGoRuntimeCapabilities> {
  const webWorker = typeof Worker !== 'undefined';
  const offscreenCanvas = typeof OffscreenCanvas !== 'undefined';
  const createImageBitmap = typeof globalThis.createImageBitmap === 'function';
  const [jpegEncode, pngEncode, webpEncode] = await Promise.all([
    canEncode('jpeg'),
    canEncode('png'),
    canEncode('webp'),
  ]);

  const workerProcessing = webWorker && offscreenCanvas && createImageBitmap;
  const webAssembly =
    typeof WebAssembly !== 'undefined' && typeof WebAssembly.compile === 'function';

  return {
    webWorker,
    offscreenCanvas,
    createImageBitmap,
    workerProcessing,
    jpegEncode,
    pngEncode,
    webpEncode,
    heicDecoderAvailable: workerProcessing && webAssembly,
  };
}
