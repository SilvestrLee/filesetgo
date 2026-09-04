import { describe, expect, it } from 'vitest';

import { isSafeArchiveEntryName, isSafeArchiveFilename } from '../../src/archive/filename-safety';

describe('isSafeArchiveEntryName', () => {
  it('accepts ordinary flat filenames', () => {
    expect(isSafeArchiveEntryName('logo.png')).toBe(true);
    expect(isSafeArchiveEntryName('icon-192x192.png')).toBe(true);
    expect(isSafeArchiveEntryName('a.b.c.webp')).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(isSafeArchiveEntryName('')).toBe(false);
  });

  it('rejects "." and ".."', () => {
    expect(isSafeArchiveEntryName('.')).toBe(false);
    expect(isSafeArchiveEntryName('..')).toBe(false);
  });

  it('rejects path traversal', () => {
    expect(isSafeArchiveEntryName('../evil.png')).toBe(false);
    expect(isSafeArchiveEntryName('..\\evil.png')).toBe(false);
    expect(isSafeArchiveEntryName('a/../../evil.png')).toBe(false);
  });

  it('rejects absolute unix and windows paths', () => {
    expect(isSafeArchiveEntryName('/etc/passwd')).toBe(false);
    expect(isSafeArchiveEntryName('\\Windows\\System32')).toBe(false);
  });

  it('rejects drive-letter paths', () => {
    expect(isSafeArchiveEntryName('C:\\evil.png')).toBe(false);
    expect(isSafeArchiveEntryName('C:/evil.png')).toBe(false);
  });

  it('rejects a null byte', () => {
    const nullByte = String.fromCharCode(0);
    expect(isSafeArchiveEntryName(`evil${nullByte}.png`)).toBe(false);
  });

  it('rejects any nested directory (flat archives only, FSG-005A)', () => {
    expect(isSafeArchiveEntryName('icons/logo.png')).toBe(false);
  });
});

describe('isSafeArchiveFilename', () => {
  it('accepts a safe name ending in .zip', () => {
    expect(isSafeArchiveFilename('package.zip')).toBe(true);
    expect(isSafeArchiveFilename('logo-pack.ZIP')).toBe(true);
  });

  it('rejects a safe name not ending in .zip', () => {
    expect(isSafeArchiveFilename('package.tar')).toBe(false);
    expect(isSafeArchiveFilename('package')).toBe(false);
  });

  it('rejects an unsafe name even if it ends in .zip', () => {
    expect(isSafeArchiveFilename('../package.zip')).toBe(false);
  });
});
