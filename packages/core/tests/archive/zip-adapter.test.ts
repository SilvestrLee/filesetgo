import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { createZipArchive } from '../../src/archive/zip-adapter';

function textEntry(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

describe('createZipArchive', () => {
  it('produces a ZIP that unzips to the exact original entries', () => {
    const entries = [
      { filename: 'a.txt', data: textEntry('hello a') },
      { filename: 'b.txt', data: textEntry('hello b') },
    ];

    const zipped = createZipArchive(entries);
    const unzipped = unzipSync(zipped);

    expect(Object.keys(unzipped).sort()).toEqual(['a.txt', 'b.txt']);
    expect(new TextDecoder().decode(unzipped['a.txt'])).toBe('hello a');
    expect(new TextDecoder().decode(unzipped['b.txt'])).toBe('hello b');
  });

  it('preserves exact binary bytes for a non-text entry', () => {
    const bytes = Uint8Array.from([0, 1, 2, 253, 254, 255, 0, 128]);
    const zipped = createZipArchive([{ filename: 'binary.bin', data: bytes }]);
    const unzipped = unzipSync(zipped);

    expect(Array.from(unzipped['binary.bin'])).toEqual(Array.from(bytes));
  });

  it('preserves the requested entry order and produces no unexpected entries', () => {
    const entries = [
      { filename: 'first.png', data: textEntry('1') },
      { filename: 'second.png', data: textEntry('2') },
      { filename: 'third.png', data: textEntry('3') },
    ];

    const zipped = createZipArchive(entries);
    const unzipped = unzipSync(zipped);

    expect(Object.keys(unzipped)).toEqual(['first.png', 'second.png', 'third.png']);
  });

  it('produces an empty-but-valid archive for zero entries', () => {
    const zipped = createZipArchive([]);
    const unzipped = unzipSync(zipped);

    expect(Object.keys(unzipped)).toEqual([]);
  });

  it('is deterministic: identical entries/order produce identical archive bytes', () => {
    const entries = [
      { filename: 'a.txt', data: textEntry('hello a') },
      { filename: 'b.txt', data: textEntry('hello b') },
    ];

    const first = createZipArchive(entries);
    const second = createZipArchive(entries);

    expect(Array.from(first)).toEqual(Array.from(second));
  });

  it('does not compress entries beyond STORE (uses level 0)', () => {
    // A large, highly-compressible run of a single byte: if DEFLATE (level > 0)
    // were used, the archive would be dramatically smaller than the input.
    const repetitive = new Uint8Array(50_000).fill(65);
    const zipped = createZipArchive([{ filename: 'repetitive.bin', data: repetitive }]);

    // STORE keeps entries essentially raw (plus fixed ZIP header/footer overhead);
    // heavy DEFLATE on this input would shrink it to a few hundred bytes.
    expect(zipped.byteLength).toBeGreaterThan(repetitive.byteLength);
  });
});
