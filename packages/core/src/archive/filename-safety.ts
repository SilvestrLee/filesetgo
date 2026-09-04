const NULL_BYTE = String.fromCharCode(0);

/**
 * FSG-005A archives are flat (directive §17) — no directory trees yet — so
 * any path separator is rejected outright rather than merely normalized.
 * This single check covers traversal (`../`, `..\`), absolute paths
 * (`/...`, `\...`), and drive-letter paths (`C:\...`, `C:/...`) all at
 * once, since every one of those requires a `/`, `\`, or `:` character.
 */
export function isSafeArchiveEntryName(name: string): boolean {
  if (name.length === 0) {
    return false;
  }

  if (name === '.' || name === '..') {
    return false;
  }

  if (name.includes(NULL_BYTE)) {
    return false;
  }

  if (name.includes('/') || name.includes('\\') || name.includes(':')) {
    return false;
  }

  return true;
}

/** The archive's own filename must end in `.zip`. */
export function isSafeArchiveFilename(filename: string): boolean {
  return isSafeArchiveEntryName(filename) && filename.toLowerCase().endsWith('.zip');
}
