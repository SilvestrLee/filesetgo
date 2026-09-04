import { describe, expect, it } from 'vitest';

import { createIco, validateIcoContainer, type IcoEntryInput } from '../../src/icons/ico';
import { createPng } from '../preflight/fixtures';

function pngEntry(size: number): IcoEntryInput {
  return { width: size, height: size, png: Uint8Array.from(createPng(size, size)) };
}

describe('createIco', () => {
  it('produces exactly 3 entries in the requested order (16, 32, 48)', () => {
    const bytes = createIco([pngEntry(16), pngEntry(32), pngEntry(48)]);
    const result = validateIcoContainer(bytes);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.entries.map((e) => e.width)).toEqual([16, 32, 48]);
    }
  });

  it('sets reserved = 0 and type = 1', () => {
    const bytes = createIco([pngEntry(16)]);
    const view = new DataView(bytes.buffer);
    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
  });

  it('produces valid offsets and lengths for every entry', () => {
    const bytes = createIco([pngEntry(16), pngEntry(32)]);
    const result = validateIcoContainer(bytes);
    expect(result.valid).toBe(true);
  });

  it('embeds payloads that begin with a valid PNG signature', () => {
    const bytes = createIco([pngEntry(16)]);
    const payloadStart = 6 + 16; // header + 1 directory entry
    expect(Array.from(bytes.subarray(payloadStart, payloadStart + 8))).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });

  it('embeds PNGs whose IHDR dimensions match the requested entry size', () => {
    const bytes = createIco([pngEntry(32)]);
    const result = validateIcoContainer(bytes);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.entries[0]).toMatchObject({ width: 32, height: 32 });
    }
  });

  it('is deterministic for identical inputs', () => {
    const a = createIco([pngEntry(16), pngEntry(32), pngEntry(48)]);
    const b = createIco([pngEntry(16), pngEntry(32), pngEntry(48)]);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('stores a 256px dimension as 0 (the ICO format convention)', () => {
    const bytes = createIco([{ width: 256, height: 256, png: Uint8Array.from(createPng(256, 256)) }]);
    const view = new DataView(bytes.buffer);
    const entryOffset = 6;
    expect(view.getUint8(entryOffset)).toBe(0);
    expect(view.getUint8(entryOffset + 1)).toBe(0);

    const result = validateIcoContainer(bytes);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.entries[0]).toMatchObject({ width: 256, height: 256 });
    }
  });
});

describe('validateIcoContainer', () => {
  it('rejects data too short for a header', () => {
    const result = validateIcoContainer(new Uint8Array(4));
    expect(result.valid).toBe(false);
  });

  it('rejects a non-zero reserved field', () => {
    const bytes = createIco([pngEntry(16)]);
    const view = new DataView(bytes.buffer);
    view.setUint16(0, 1, true);
    expect(validateIcoContainer(bytes).valid).toBe(false);
  });

  it('rejects a wrong type field', () => {
    const bytes = createIco([pngEntry(16)]);
    const view = new DataView(bytes.buffer);
    view.setUint16(2, 2, true);
    expect(validateIcoContainer(bytes).valid).toBe(false);
  });

  it('rejects a zero count', () => {
    const bytes = createIco([pngEntry(16)]);
    const view = new DataView(bytes.buffer);
    view.setUint16(4, 0, true);
    expect(validateIcoContainer(bytes).valid).toBe(false);
  });

  it('rejects a truncated directory', () => {
    const bytes = createIco([pngEntry(16), pngEntry(32)]);
    const truncated = bytes.subarray(0, 10); // header + partial first entry only
    expect(validateIcoContainer(truncated).valid).toBe(false);
  });

  it('rejects an out-of-bounds payload offset/length', () => {
    const bytes = createIco([pngEntry(16)]);
    const view = new DataView(bytes.buffer);
    view.setUint32(6 + 8, 999_999, true); // byte length far beyond actual data
    expect(validateIcoContainer(bytes).valid).toBe(false);
  });

  it('rejects a payload with an invalid PNG signature', () => {
    const entry = pngEntry(16);
    entry.png[0] = 0x00; // corrupt the signature
    const bytes = createIco([entry]);
    expect(validateIcoContainer(bytes).valid).toBe(false);
  });

  it('rejects a directory/PNG dimension mismatch', () => {
    const bytes = createIco([{ width: 16, height: 16, png: Uint8Array.from(createPng(32, 32)) }]);
    expect(validateIcoContainer(bytes).valid).toBe(false);
  });

  it('rejects a zero-length entry', () => {
    const bytes = createIco([pngEntry(16)]);
    const view = new DataView(bytes.buffer);
    view.setUint32(6 + 8, 0, true);
    expect(validateIcoContainer(bytes).valid).toBe(false);
  });

  it('accepts other valid entry sets — the generic validator does not enforce 16/32/48', () => {
    const bytes = createIco([pngEntry(24), pngEntry(64)]);
    const result = validateIcoContainer(bytes);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.entries.map((e) => e.width)).toEqual([24, 64]);
    }
  });
});
