import type {
  ImageDimensions,
  ResizeOptions,
} from '../processing/contracts';

export interface ResizePlan extends ImageDimensions {
  resized: boolean;
  scale: number;
}

export function calculateResizePlan(
  sourceWidth: number,
  sourceHeight: number,
  options: ResizeOptions | undefined,
): ResizePlan {
  if (options === undefined) {
    return {
      width: sourceWidth,
      height: sourceHeight,
      resized: false,
      scale: 1,
    };
  }

  const widthScale =
    options.maxWidth === undefined
      ? Number.POSITIVE_INFINITY
      : options.maxWidth / sourceWidth;
  const heightScale =
    options.maxHeight === undefined
      ? Number.POSITIVE_INFINITY
      : options.maxHeight / sourceHeight;
  const requestedScale = Math.min(widthScale, heightScale);
  const scale = options.allowUpscale === true
    ? requestedScale
    : Math.min(1, requestedScale);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  return {
    width,
    height,
    resized: width !== sourceWidth || height !== sourceHeight,
    scale,
  };
}
