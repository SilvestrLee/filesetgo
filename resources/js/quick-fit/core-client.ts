/**
 * The real `@filesetgo/core` bindings used to construct the production
 * `QuickFitWorkflow` (see controller.ts). Kept as a single small module so
 * it's obvious, in one place, exactly which core capabilities the public
 * shell depends on.
 */
export {
  getRuntimeCapabilities,
  preflightImage,
  processImage,
  processImageSet,
  processImageToTarget,
} from '@filesetgo/core';
