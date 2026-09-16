import type { ImageSetProcessingProgress, ProcessImageSetOptions } from '@filesetgo/core';

import {
  buildArchiveFilename,
  buildLogoPackOutputSpecs,
  FAVICON_SOURCE_ID,
  type LogoBackgroundMode,
} from './spec';

/** Compiles the one authoritative Logo Pack composition into a ready `processImageSet()` request (directive §33/§42, mode-aware filenames per §32/§33). */
export function compileLogoPackRequest(
  mode: LogoBackgroundMode,
  sourceFileName: string,
  onProgress?: (event: ImageSetProcessingProgress) => void,
  faviconSource?: Blob,
): ProcessImageSetOptions {
  return {
    outputs: buildLogoPackOutputSpecs(mode, sourceFileName, faviconSource === undefined ? undefined : FAVICON_SOURCE_ID),
    ...(faviconSource === undefined ? {} : { sources: { [FAVICON_SOURCE_ID]: faviconSource } }),
    archive: { filename: buildArchiveFilename(mode, sourceFileName) },
    onProgress,
  };
}
