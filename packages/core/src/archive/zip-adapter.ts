import { zipSync, type Zippable } from 'fflate';

/**
 * Fixed archive-entry modification time (1980-01-01, the ZIP format's own
 * epoch) used for every entry, instead of the current time `fflate`
 * defaults to. This is what keeps `createZipArchive()` deterministic
 * (FSG-005A directive §26/§27) — the same entries/order always produce the
 * same archive bytes, with no wall-clock leakage into the output.
 */
const DETERMINISTIC_ARCHIVE_MTIME = new Date('1980-01-01T00:00:00Z');

export interface ZipEntryInput {
  filename: string;
  data: Uint8Array;
}

export class ArchiveCreationError extends Error {
  public constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ArchiveCreationError';
  }
}

/**
 * Creates a ZIP archive from flat entries (FSG-005A directive §17/§21).
 * This is the *only* module in FileSetGo that imports `fflate` directly —
 * no `fflate` type or option ever appears in a public FileSetGo contract.
 *
 * Uses ZIP STORE (`level: 0`, no DEFLATE) for every entry (directive §22):
 * package contents are already-compressed JPEG/PNG/WebP bytes, so spending
 * CPU trying to re-compress them would be wasted work and would only slow
 * packaging down without shrinking the result.
 */
export function createZipArchive(entries: readonly ZipEntryInput[]): Uint8Array {
  const zippable: Zippable = {};

  for (const entry of entries) {
    zippable[entry.filename] = [
      entry.data,
      { level: 0, mtime: DETERMINISTIC_ARCHIVE_MTIME },
    ];
  }

  try {
    return zipSync(zippable, { level: 0, mtime: DETERMINISTIC_ARCHIVE_MTIME });
  } catch (error) {
    throw new ArchiveCreationError('The archive could not be created.', error);
  }
}
