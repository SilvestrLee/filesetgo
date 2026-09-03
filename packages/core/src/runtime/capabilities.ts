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
   * HEIC/HEIF preflight identification is available (see preflight/formats/heic.ts),
   * but no approved browser-side HEIC decoder is wired into the worker yet
   * (FSG-001B §45-50). This is always false until that follow-up lands.
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

  return {
    webWorker,
    offscreenCanvas,
    createImageBitmap,
    workerProcessing: webWorker && offscreenCanvas && createImageBitmap,
    jpegEncode,
    pngEncode,
    webpEncode,
    heicDecoderAvailable: false,
  };
}
