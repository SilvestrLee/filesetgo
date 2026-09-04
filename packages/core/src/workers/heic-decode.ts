// @discourse/heic (jSquash's HEIC decoder; see docs/governance/DECISIONS.md
// ADR-014) is loaded lazily — this module must only ever be reached via a
// dynamic `import('./heic-decode')` from the worker, never a static import
// anywhere else, so JPEG/PNG/WebP users never pay its ~1 MB WASM payload.
//
// The package's own environment auto-detection (ENVIRONMENT_IS_WEB /
// ENVIRONMENT_IS_WORKER / ENVIRONMENT_IS_NODE, in its Emscripten glue) is
// written for classic `importScripts`-style workers. Inside FileSetGo's
// `{ type: 'module' }` worker neither `window` nor `importScripts` exists,
// so none of those branches match reliably. Rather than depend on that
// detection, this adapter bypasses it entirely: it fetches and compiles the
// .wasm binary itself (a plain same-origin fetch of a bundled asset — see
// the network audit in SPRINT_REPORT.md) and hands the compiled
// `WebAssembly.Module` to the package's documented "manual WASM
// initialization" path (`init(wasmModule)`). This exact strategy was
// verified against the actual installed package in Node (see ADR-014)
// before being wired in here.
import { default as decodeHeicBuffer, init as initHeicDecoder } from '@discourse/heic/decode.js';
import wasmAssetUrl from './heic-wasm-url';

export type HeicDecodeErrorCode =
  | 'HEIC_DECODER_UNAVAILABLE'
  | 'HEIC_INITIALIZATION_FAILED'
  | 'DECODE_FAILED';

export class HeicDecodeError extends Error {
  public constructor(
    public readonly code: HeicDecodeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HeicDecodeError';
  }
}

export interface HeicRaster {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

let initialization: Promise<void> | undefined;

async function ensureInitialized(): Promise<void> {
  initialization ??= (async () => {
    let wasmBytes: ArrayBuffer;

    try {
      const response = await fetch(wasmAssetUrl);
      wasmBytes = await response.arrayBuffer();
    } catch {
      throw new HeicDecodeError(
        'HEIC_DECODER_UNAVAILABLE',
        'The HEIC decoder module could not be loaded.',
      );
    }

    try {
      const wasmModule = await WebAssembly.compile(wasmBytes);
      await initHeicDecoder(wasmModule);
    } catch {
      throw new HeicDecodeError(
        'HEIC_INITIALIZATION_FAILED',
        'The HEIC decoder failed to initialize.',
      );
    }
  })();

  try {
    await initialization;
  } catch (error) {
    // Allow a later job in the same worker to retry initialization instead
    // of permanently caching a failure.
    initialization = undefined;
    throw error;
  }
}

/**
 * Decodes a HEIC/HEIF Blob to raw RGBA raster data.
 *
 * `checkCancelled` is called at each of the three checkpoints FSG-001C
 * requires (before the lazy import's effects begin, after decoder
 * initialization, and after decode) and is expected to throw the caller's
 * own cancellation error type — this adapter does not define its own
 * cancellation error so that cancellation propagates through the same path
 * as every other processing stage.
 */
export async function decodeHeic(
  file: Blob,
  checkCancelled: () => void,
): Promise<HeicRaster> {
  checkCancelled();

  await ensureInitialized();

  checkCancelled();

  const buffer = await file.arrayBuffer();
  let raster: ImageData;

  try {
    raster = await decodeHeicBuffer(buffer);
  } catch {
    throw new HeicDecodeError('DECODE_FAILED', 'The HEIC image could not be decoded.');
  }

  checkCancelled();

  return { data: raster.data, width: raster.width, height: raster.height };
}
