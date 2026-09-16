import type { ImagePreflightResult } from '@filesetgo/core';

import type { FileSetGoPreset } from './contracts';

/**
 * Deterministically evaluates whether a source already satisfies a preset
 * without any processing (FSG-004 directive §31). Uses only bounded facts
 * already established by preflight — never filename/MIME-type guesses.
 *
 * For a bounding-box preset, boundary values (source exactly at the target
 * size or exact max dimension) count as already ready (`<=`, not `<`). For
 * an `exactDimensions` preset (FSG-007-FIT-002), the frame is fixed rather
 * than an upper bound, so "ready" requires EXACT equality on both axes —
 * larger *or* smaller on either axis means the source isn't ready.
 */
export function evaluateAlreadyReady(preflight: ImagePreflightResult, preset: FileSetGoPreset): boolean {
  const { requirements } = preset;

  if (preflight.format !== requirements.outputFormat) {
    return false;
  }

  if (requirements.targetBytes !== undefined && preflight.fileSize > requirements.targetBytes) {
    return false;
  }

  if (requirements.exactDimensions) {
    if (requirements.maxWidth !== undefined && preflight.width !== requirements.maxWidth) {
      return false;
    }

    if (requirements.maxHeight !== undefined && preflight.height !== requirements.maxHeight) {
      return false;
    }

    return true;
  }

  if (requirements.maxWidth !== undefined && preflight.width > requirements.maxWidth) {
    return false;
  }

  if (requirements.maxHeight !== undefined && preflight.height > requirements.maxHeight) {
    return false;
  }

  return true;
}
