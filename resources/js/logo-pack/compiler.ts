import type { ImageSetProcessingProgress, ProcessImageSetOptions } from '@filesetgo/core';

import { buildArchiveFilename, buildLogoPackOutputSpecs } from './spec';

/** Compiles the one authoritative Logo Pack composition into a ready `processImageSet()` request (directive §33/§42). */
export function compileLogoPackRequest(
  sourceFileName: string,
  onProgress?: (event: ImageSetProcessingProgress) => void,
): ProcessImageSetOptions {
  return {
    outputs: buildLogoPackOutputSpecs(),
    archive: { filename: buildArchiveFilename(sourceFileName) },
    onProgress,
  };
}
