import type { FileSetGoRuntimeCapabilities } from '@filesetgo/core';

/**
 * Translates the raw capability matrix into the single plain-language
 * outcome the public shell shows (FSG-003 directive §61) — the technical
 * detail (worker/canvas/bitmap support) stays out of the public UI.
 */
export function describeRuntimeSupport(capabilities: FileSetGoRuntimeCapabilities): {
  supported: boolean;
  message: string;
} {
  if (capabilities.workerProcessing) {
    return { supported: true, message: 'FileSetGo is ready in this browser.' };
  }

  return {
    supported: false,
    message: "This browser doesn't support the processing features FileSetGo needs.",
  };
}
