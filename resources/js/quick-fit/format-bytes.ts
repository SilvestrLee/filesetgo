export const BYTES_PER_KB = 1024;
export const BYTES_PER_MB = 1024 * 1024;

export type SizeUnit = 'KB' | 'MB';

/** Converts a user-entered KB/MB requirement into the exact byte value the core API expects. */
export function unitValueToBytes(value: number, unit: SizeUnit): number {
  return Math.round(value * (unit === 'KB' ? BYTES_PER_KB : BYTES_PER_MB));
}

/** Formats a byte count for display, e.g. "843 B", "12.4 KB", "1.8 MB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }

  if (bytes < BYTES_PER_KB) {
    return `${Math.round(bytes)} B`;
  }

  if (bytes < BYTES_PER_MB) {
    return `${(bytes / BYTES_PER_KB).toFixed(1)} KB`;
  }

  return `${(bytes / BYTES_PER_MB).toFixed(2)} MB`;
}

/**
 * Rounded percentage by which `outputBytes` is smaller than `sourceBytes`.
 * Returns undefined when the output isn't actually smaller — FileSetGo
 * never presents a misleading "reduction" for a file that grew or stayed
 * the same size because the user requested a format or dimension change.
 */
export function reductionPercentage(sourceBytes: number, outputBytes: number): number | undefined {
  if (sourceBytes <= 0 || outputBytes >= sourceBytes) {
    return undefined;
  }

  return Math.round(((sourceBytes - outputBytes) / sourceBytes) * 100);
}
