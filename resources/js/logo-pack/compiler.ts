import type { ImageSetProcessingProgress, ProcessImageSetOptions } from '@filesetgo/core';

import { buildArchiveFilename, buildLogoPackOutputSpecs, type LogoBackgroundMode } from './spec';

/** Compiles the one authoritative Logo Pack composition into a ready `processImageSet()` request (directive §33/§42, mode-aware filenames per §32/§33). */
export function compileLogoPackRequest(
  mode: LogoBackgroundMode,
  sourceFileName: string,
  onProgress?: (event: ImageSetProcessingProgress) => void,
): ProcessImageSetOptions {
  return {
    outputs: buildLogoPackOutputSpecs(mode, sourceFileName),
    archive: { filename: buildArchiveFilename(mode, sourceFileName) },
    onProgress,
  };
}
