import { calculateContainPlan } from '@filesetgo/core';

import { ICON_CANVAS_SIZES, ICON_CONTENT_SCALE, MAX_ICON_UPSCALE_FACTOR } from './spec';

export const FAVICON_COMPACT_PREVIEW_SIZE = 32;
export const MIN_PROJECTED_FAVICON_PIXELS = 12;
export const MAX_FAVICON_SOURCE_DIMENSION = 512;
export const FAVICON_ALPHA_TRIM_THRESHOLD = 2;

export interface FreeformCropSelection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaviconSourceSuitability {
  suitable: boolean;
  projectedWidth: number;
  projectedHeight: number;
  aspectRatio: number;
}

export interface PreparedFaviconSource {
  blob: Blob;
  width: number;
  height: number;
  transparentCanvasTrimmed: boolean;
}

export function assessFaviconSourceSuitability(
  dimensions: { width: number; height: number },
): FaviconSourceSuitability {
  const plan = calculateContainPlan(
    dimensions.width,
    dimensions.height,
    FAVICON_COMPACT_PREVIEW_SIZE,
    FAVICON_COMPACT_PREVIEW_SIZE,
    ICON_CONTENT_SCALE,
    true,
  );
  const shorter = Math.min(dimensions.width, dimensions.height);
  const longer = Math.max(dimensions.width, dimensions.height);

  return {
    suitable: Math.min(plan.drawWidth, plan.drawHeight) >= MIN_PROJECTED_FAVICON_PIXELS,
    projectedWidth: plan.drawWidth,
    projectedHeight: plan.drawHeight,
    aspectRatio: longer / shorter,
  };
}

export function createInitialFreeformCrop(dimensions: { width: number; height: number }): FreeformCropSelection {
  const width = dimensions.width === dimensions.height
    ? dimensions.width
    : Math.min(dimensions.width, Math.max(dimensions.height * 1.5, dimensions.width * 0.4));
  const height = Math.min(dimensions.height, Math.max(width * 0.75, dimensions.height * 0.8));

  return {
    x: Math.floor((dimensions.width - width) / 2),
    y: Math.floor((dimensions.height - height) / 2),
    width: Math.round(width),
    height: Math.round(height),
  };
}

export function constrainFreeformCrop(
  crop: FreeformCropSelection,
  dimensions: { width: number; height: number },
): FreeformCropSelection {
  const minimumWidth = Math.min(dimensions.width, Math.max(16, Math.floor(dimensions.width * 0.05)));
  const minimumHeight = Math.min(dimensions.height, Math.max(16, Math.floor(dimensions.height * 0.05)));
  const width = Math.min(dimensions.width, Math.max(minimumWidth, Math.round(crop.width)));
  const height = Math.min(dimensions.height, Math.max(minimumHeight, Math.round(crop.height)));

  return {
    x: Math.min(dimensions.width - width, Math.max(0, Math.round(crop.x))),
    y: Math.min(dimensions.height - height, Math.max(0, Math.round(crop.y))),
    width,
    height,
  };
}

export function faviconSourceCanProduceLargestIcon(dimensions: { width: number; height: number }): boolean {
  const plan = calculateContainPlan(
    dimensions.width,
    dimensions.height,
    ICON_CANVAS_SIZES.icon512,
    ICON_CANVAS_SIZES.icon512,
    ICON_CONTENT_SCALE,
    true,
  );

  return plan.scale <= MAX_ICON_UPSCALE_FACTOR;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('The favicon source could not be encoded.'));
        return;
      }

      resolve(blob);
    }, 'image/png');
  });
}

function scaledOutputDimensions(width: number, height: number): { width: number; height: number } {
  const scale = Math.min(1, MAX_FAVICON_SOURCE_DIMENSION / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function renderBitmapRegion(
  source: Blob,
  crop: FreeformCropSelection | undefined,
): Promise<PreparedFaviconSource> {
  const bitmap = crop === undefined
    ? await createImageBitmap(source)
    : await createImageBitmap(source, crop.x, crop.y, crop.width, crop.height);

  try {
    const output = scaledOutputDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = output.width;
    canvas.height = output.height;
    const context = canvas.getContext('2d', { alpha: true });

    if (context === null) {
      throw new Error('The favicon source canvas is unavailable.');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, output.width, output.height);

    return {
      blob: await canvasToPng(canvas),
      width: output.width,
      height: output.height,
      transparentCanvasTrimmed: crop !== undefined,
    };
  } finally {
    bitmap.close();
  }
}

export async function prepareSelectedFaviconSource(
  source: Blob,
  crop: FreeformCropSelection,
): Promise<PreparedFaviconSource> {
  const selected = await renderBitmapRegion(source, crop);
  const tightlyPrepared = await prepareAlternateFaviconSource(selected.blob);

  return {
    ...tightlyPrepared,
    transparentCanvasTrimmed: true,
  };
}

/**
 * Normalizes an alternate icon to PNG and removes only genuinely transparent
 * exterior pixels. Opaque pixels are never classified or removed here.
 */
export async function prepareAlternateFaviconSource(source: Blob): Promise<PreparedFaviconSource> {
  const bitmap = await createImageBitmap(source);

  try {
    const analysis = scaledOutputDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = analysis.width;
    canvas.height = analysis.height;
    const context = canvas.getContext('2d', { alpha: true, willReadFrequently: true });

    if (context === null) {
      throw new Error('The alternate icon canvas is unavailable.');
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, analysis.width, analysis.height);
    const pixels = context.getImageData(0, 0, analysis.width, analysis.height).data;
    let left = analysis.width;
    let top = analysis.height;
    let right = -1;
    let bottom = -1;
    let transparentPixelSeen = false;

    for (let y = 0; y < analysis.height; y += 1) {
      for (let x = 0; x < analysis.width; x += 1) {
        const alpha = pixels[(y * analysis.width + x) * 4 + 3];

        if (alpha < 255) {
          transparentPixelSeen = true;
        }

        if (alpha < FAVICON_ALPHA_TRIM_THRESHOLD) {
          continue;
        }

        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }

    const hasVisiblePixels = right >= left && bottom >= top;
    const shouldTrim = transparentPixelSeen && hasVisiblePixels && (
      left > 0 || top > 0 || right < analysis.width - 1 || bottom < analysis.height - 1
    );

    if (!shouldTrim) {
      return {
        blob: await canvasToPng(canvas),
        width: analysis.width,
        height: analysis.height,
        transparentCanvasTrimmed: false,
      };
    }

    const sourceScaleX = bitmap.width / analysis.width;
    const sourceScaleY = bitmap.height / analysis.height;
    const sourceLeft = Math.max(0, Math.floor(left * sourceScaleX) - 1);
    const sourceTop = Math.max(0, Math.floor(top * sourceScaleY) - 1);
    const sourceRight = Math.min(bitmap.width, Math.ceil((right + 1) * sourceScaleX) + 1);
    const sourceBottom = Math.min(bitmap.height, Math.ceil((bottom + 1) * sourceScaleY) + 1);
    const cropWidth = sourceRight - sourceLeft;
    const cropHeight = sourceBottom - sourceTop;
    const cropBitmap = await createImageBitmap(source, sourceLeft, sourceTop, cropWidth, cropHeight);

    try {
      const output = scaledOutputDimensions(cropBitmap.width, cropBitmap.height);
      const outputCanvas = document.createElement('canvas');
      outputCanvas.width = output.width;
      outputCanvas.height = output.height;
      const outputContext = outputCanvas.getContext('2d', { alpha: true });

      if (outputContext === null) {
        throw new Error('The alternate icon output canvas is unavailable.');
      }

      outputContext.imageSmoothingEnabled = true;
      outputContext.imageSmoothingQuality = 'high';
      outputContext.drawImage(cropBitmap, 0, 0, output.width, output.height);

      return {
        blob: await canvasToPng(outputCanvas),
        width: output.width,
        height: output.height,
        transparentCanvasTrimmed: true,
      };
    } finally {
      cropBitmap.close();
    }
  } finally {
    bitmap.close();
  }
}
