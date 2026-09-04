/**
 * Maximum number of output assets a single `processImageSet()` request may
 * request (FSG-005A directive §19). An initial safety limit, not a
 * marketing promise — keeps a single heavy job's total work bounded.
 */
export const MAX_PACKAGE_ASSETS = 16;

/**
 * Maximum sum of completed, uncompressed asset `byteSize` values a single
 * `processImageSet()` request may produce, checked before archiving
 * (FSG-005A directive §19). 50 MiB, expressed in bytes.
 */
export const MAX_PACKAGE_TOTAL_OUTPUT_BYTES = 50 * 1024 * 1024;
