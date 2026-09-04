import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createRealHeicFixture, HEIC_FIXTURE_HEIGHT, HEIC_FIXTURE_WIDTH } from './heic-fixture';

// heic-decode.ts resolves its WASM binary via Vite's `?url` asset import,
// which only produces a fetchable URL inside a running Vite dev server or
// browser build — not in a plain Vitest/Node process. Rather than mock the
// codec away, these tests serve the actual installed @discourse/heic wasm
// binary from disk in place of the network fetch, so the rest of the
// pipeline (WebAssembly.compile, the package's manual `init()` path, and
// the real decode() call) is exercised for real, against a real,
// self-generated HEIC file (see heic-fixture.ts for provenance) — this is
// the FSG-001C "real decoder verification" evidence.
const wasmPath = path.resolve(
  process.cwd(),
  'node_modules/@discourse/heic/codec/dec/heic_dec.wasm',
);

/** The smallest possible valid WebAssembly module (magic number + version,
 * no sections) — enough for `WebAssembly.compile()` to succeed in tests
 * that only care about the adapter's own control flow, not real decoding. */
const MINIMAL_VALID_WASM = Uint8Array.of(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00);

async function withRealWasmFetch<T>(run: () => Promise<T>): Promise<T> {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    const bytes = await fs.readFile(wasmPath);
    return new Response(Uint8Array.from(bytes));
  }) as typeof fetch;

  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

describe('decodeHeic (real @discourse/heic codec)', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('decodes a real, self-generated HEIC file to the expected raster', async () => {
    await withRealWasmFetch(async () => {
      const { decodeHeic } = await import('../../src/workers/heic-decode');
      const blob = new Blob([Uint8Array.from(createRealHeicFixture())]);

      const raster = await decodeHeic(blob, () => {});

      expect(raster.width).toBe(HEIC_FIXTURE_WIDTH);
      expect(raster.height).toBe(HEIC_FIXTURE_HEIGHT);
      expect(raster.data.length).toBe(HEIC_FIXTURE_WIDTH * HEIC_FIXTURE_HEIGHT * 4);
    });
  });

  it.each([
    ['truncated', (bytes: Uint8Array) => bytes.slice(0, Math.floor(bytes.byteLength / 2))],
    ['random garbage', () => Uint8Array.from({ length: 200 }, (_, i) => (i * 37) % 256)],
    ['empty', () => new Uint8Array(0)],
  ])('returns a clean DECODE_FAILED for %s input, without crashing the runtime', async (_, corrupt) => {
    await withRealWasmFetch(async () => {
      const { decodeHeic, HeicDecodeError } = await import('../../src/workers/heic-decode');
      const blob = new Blob([Uint8Array.from(corrupt(createRealHeicFixture()))]);

      let caught: unknown;

      try {
        await decodeHeic(blob, () => {});
      } catch (error) {
        caught = error;
      }

      expect(caught).toBeInstanceOf(HeicDecodeError);
      expect((caught as InstanceType<typeof HeicDecodeError>).code).toBe('DECODE_FAILED');

      // The runtime must remain usable for a subsequent, valid job.
      const raster = await decodeHeic(
        new Blob([Uint8Array.from(createRealHeicFixture())]),
        () => {},
      );

      expect(raster.width).toBe(HEIC_FIXTURE_WIDTH);
    });
  });
});

describe('decodeHeic adapter control flow (mocked codec)', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('@discourse/heic/decode.js');
    vi.unstubAllGlobals();
  });

  it('reports HEIC_DECODER_UNAVAILABLE when the WASM asset fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network error');
    }));

    const { decodeHeic, HeicDecodeError } = await import('../../src/workers/heic-decode');
    let caught: unknown;

    try {
      await decodeHeic(new Blob([Uint8Array.of(0)]), () => {});
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(HeicDecodeError);
    expect((caught as InstanceType<typeof HeicDecodeError>).code).toBe(
      'HEIC_DECODER_UNAVAILABLE',
    );
  });

  it('reports HEIC_INITIALIZATION_FAILED when the decoder module fails to initialize', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(MINIMAL_VALID_WASM)));
    vi.doMock('@discourse/heic/decode.js', () => ({
      init: vi.fn(async () => {
        throw new Error('WASM instantiation failed');
      }),
      default: vi.fn(),
    }));

    const { decodeHeic, HeicDecodeError } = await import('../../src/workers/heic-decode');
    let caught: unknown;

    try {
      await decodeHeic(new Blob([Uint8Array.of(0)]), () => {});
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(HeicDecodeError);
    expect((caught as InstanceType<typeof HeicDecodeError>).code).toBe(
      'HEIC_INITIALIZATION_FAILED',
    );
  });

  it('retries initialization on a later job after a fetch failure, instead of caching the failure', async () => {
    let attempt = 0;
    vi.stubGlobal('fetch', vi.fn(async () => {
      attempt += 1;

      if (attempt === 1) {
        throw new Error('network error');
      }

      return new Response(MINIMAL_VALID_WASM);
    }));
    vi.doMock('@discourse/heic/decode.js', () => ({
      init: vi.fn(async () => {}),
      default: vi.fn(async () => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1,
      })),
    }));

    const { decodeHeic } = await import('../../src/workers/heic-decode');
    const blob = new Blob([Uint8Array.of(0)]);

    await expect(decodeHeic(blob, () => {})).rejects.toMatchObject({
      code: 'HEIC_DECODER_UNAVAILABLE',
    });

    const raster = await decodeHeic(blob, () => {});
    expect(raster.width).toBe(1);
    expect(attempt).toBe(2);
  });

  it('checks cancellation before importing the decoder module', async () => {
    const checkCancelled = vi.fn(() => {
      throw new Error('cancelled');
    });
    const { decodeHeic } = await import('../../src/workers/heic-decode');

    await expect(decodeHeic(new Blob([Uint8Array.of(0)]), checkCancelled)).rejects.toThrow(
      'cancelled',
    );
    expect(checkCancelled).toHaveBeenCalledTimes(1);
  });

  it('checks cancellation after initialization and before decode', async () => {
    const initSpy = vi.fn(async () => {});
    const decodeSpy = vi.fn(async () => ({
      data: new Uint8ClampedArray(4),
      width: 1,
      height: 1,
    }));

    vi.stubGlobal('fetch', vi.fn(async () => new Response(MINIMAL_VALID_WASM)));
    vi.doMock('@discourse/heic/decode.js', () => ({
      init: initSpy,
      default: decodeSpy,
    }));

    const { decodeHeic } = await import('../../src/workers/heic-decode');
    let calls = 0;
    const checkCancelled = vi.fn(() => {
      calls += 1;

      if (calls > 1) {
        throw new Error('cancelled');
      }
    });

    await expect(
      decodeHeic(new Blob([Uint8Array.of(0)]), checkCancelled),
    ).rejects.toThrow('cancelled');
    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(decodeSpy).not.toHaveBeenCalled();
  });

  it('checks cancellation after a successful decode', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(MINIMAL_VALID_WASM)));
    vi.doMock('@discourse/heic/decode.js', () => ({
      init: vi.fn(async () => {}),
      default: vi.fn(async () => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1,
      })),
    }));

    const { decodeHeic } = await import('../../src/workers/heic-decode');
    let calls = 0;
    const checkCancelled = vi.fn(() => {
      calls += 1;

      if (calls > 2) {
        throw new Error('cancelled');
      }
    });

    await expect(
      decodeHeic(new Blob([Uint8Array.of(0)]), checkCancelled),
    ).rejects.toThrow('cancelled');
    expect(calls).toBe(3);
  });
});
