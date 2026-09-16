import type { RgbaRaster } from './alpha-inspection';
import {
  BACKGROUND_REMOVAL_THRESHOLDS,
  resolveBackgroundEdgePixel,
  type BackgroundRemovalStrength,
  type RgbColor,
} from './background-removal';

export interface SourceResolutionMaskOptions {
  targetWidth: number;
  targetHeight: number;
  targetOffsetY: number;
  strength: BackgroundRemovalStrength;
  backgroundColor: RgbColor;
}

type AnalysisMask = RgbaRaster & { readonly enclosedRegionMask?: Uint8Array };

const SOURCE_CONFIRMATION_BACKGROUND_DISTANCE = 1;
const SOURCE_CONFIRMATION_EDGE_RADIUS = 3;

/**
 * Applies the bounded analysis mask to a strip of the original-resolution
 * raster. RGB detail comes from the source strip; the analysis mask only
 * decides where background/edge refinement is needed. Existing source
 * alpha is never increased.
 */
export function applyAnalysisMaskAtSourceResolution(
  sourceStrip: RgbaRaster,
  analysisMask: AnalysisMask,
  options: SourceResolutionMaskOptions,
): Uint8ClampedArray {
  const output = Uint8ClampedArray.from(sourceStrip.data);
  const threshold = BACKGROUND_REMOVAL_THRESHOLDS[options.strength];

  for (let localY = 0; localY < sourceStrip.height; localY += 1) {
    const targetY = options.targetOffsetY + localY;

    for (let x = 0; x < sourceStrip.width; x += 1) {
      const offset = (localY * sourceStrip.width + x) * 4;
      const sourceAlpha = output[offset + 3];
      const analysisX = (x + 0.5) * analysisMask.width / options.targetWidth - 0.5;
      const analysisY = (targetY + 0.5) * analysisMask.height / options.targetHeight - 0.5;
      const x0 = Math.max(0, Math.min(analysisMask.width - 1, Math.floor(analysisX)));
      const y0 = Math.max(0, Math.min(analysisMask.height - 1, Math.floor(analysisY)));
      const x1 = Math.min(analysisMask.width - 1, x0 + 1);
      const y1 = Math.min(analysisMask.height - 1, y0 + 1);
      const topLeftIndex = y0 * analysisMask.width + x0;
      const topRightIndex = y0 * analysisMask.width + x1;
      const bottomLeftIndex = y1 * analysisMask.width + x0;
      const bottomRightIndex = y1 * analysisMask.width + x1;
      const protectedMask = analysisMask.enclosedRegionMask;
      const topLeftAlpha = analysisMask.data[topLeftIndex * 4 + 3];
      const topRightAlpha = analysisMask.data[topRightIndex * 4 + 3];
      const bottomLeftAlpha = analysisMask.data[bottomLeftIndex * 4 + 3];
      const bottomRightAlpha = analysisMask.data[bottomRightIndex * 4 + 3];
      const tx = Math.max(0, Math.min(1, analysisX - x0));
      const ty = Math.max(0, Math.min(1, analysisY - y0));
      const top = topLeftAlpha * (1 - tx) + topRightAlpha * tx;
      const bottom = bottomLeftAlpha * (1 - tx) + bottomRightAlpha * tx;
      let analysisAlpha = Math.round(top * (1 - ty) + bottom * ty);
      let protectedAmbiguityNearby = false;
      let acceptedEnclosedBackgroundNearby = false;
      let sourceConfirmationNearby = false;
      let nearbyAnalysisAlpha = Math.min(topLeftAlpha, topRightAlpha, bottomLeftAlpha, bottomRightAlpha);

      if (protectedMask !== undefined) {
        const topLeftMask = protectedMask[topLeftIndex];
        const topRightMask = protectedMask[topRightIndex];
        const bottomLeftMask = protectedMask[bottomLeftIndex];
        const bottomRightMask = protectedMask[bottomRightIndex];
        protectedAmbiguityNearby = topLeftMask === 2 || topRightMask === 2 || bottomLeftMask === 2 || bottomRightMask === 2;
        acceptedEnclosedBackgroundNearby = topLeftMask === 1 || topRightMask === 1 || bottomLeftMask === 1 || bottomRightMask === 1;
        sourceConfirmationNearby = topLeftMask === 3 || topRightMask === 3 || bottomLeftMask === 3 || bottomRightMask === 3;
      }

      if (protectedAmbiguityNearby) {
        continue;
      }

      if (analysisAlpha >= 255 || acceptedEnclosedBackgroundNearby || sourceConfirmationNearby) {
        const dr = output[offset] - options.backgroundColor.r;
        const dg = output[offset + 1] - options.backgroundColor.g;
        const db = output[offset + 2] - options.backgroundColor.b;
        const maximumRelevantDistance = BACKGROUND_REMOVAL_THRESHOLDS.strong;

        // An extended search is only needed to discover a small counter's
        // background-coloured core. Pixels outside Strong's direct
        // similarity threshold cannot supply that evidence; their normal
        // four-sample interpolation remains unchanged. This keeps
        // high-resolution photographic/foreground areas at O(1) work per
        // pixel.
        if (
          analysisAlpha >= 255 &&
          !acceptedEnclosedBackgroundNearby &&
          !sourceConfirmationNearby &&
          dr * dr + dg * dg + db * db > maximumRelevantDistance * maximumRelevantDistance
        ) {
          continue;
        }

        const neighborhoodLeft = Math.max(0, x0 - 1);
        const neighborhoodRight = Math.min(analysisMask.width - 1, x1 + 1);
        const neighborhoodTop = Math.max(0, y0 - 1);
        const neighborhoodBottom = Math.min(analysisMask.height - 1, y1 + 1);

        for (let maskY = neighborhoodTop; maskY <= neighborhoodBottom; maskY += 1) {
          for (let maskX = neighborhoodLeft; maskX <= neighborhoodRight; maskX += 1) {
            const maskIndex = maskY * analysisMask.width + maskX;
            nearbyAnalysisAlpha = Math.min(nearbyAnalysisAlpha, analysisMask.data[maskIndex * 4 + 3]);

            if (protectedMask !== undefined) {
              if (protectedMask[maskIndex] === 2) {
                protectedAmbiguityNearby = true;
              } else if (protectedMask[maskIndex] === 1) {
                acceptedEnclosedBackgroundNearby = true;
              } else if (protectedMask[maskIndex] === 3) {
                sourceConfirmationNearby = true;
                nearbyAnalysisAlpha = 0;
              }
            }
          }
        }

        if (protectedAmbiguityNearby) {
          continue;
        }
      }

      if (analysisAlpha >= 255) {
        analysisAlpha = nearbyAnalysisAlpha;

        // A source-resolution pixel can sit just beyond the four bilinear
        // samples of a small counter or narrow opening even though its
        // source colour is still part of that region's antialiased
        // background rim. Look one analysis pixel farther;
        // `resolveBackgroundEdgePixel()` below remains the source-resolution
        // foreground guard, while ambiguity masks return early above.
        if (analysisAlpha >= 255) {
          analysisAlpha = nearbyAnalysisAlpha;
        }

        if (analysisAlpha >= 255) {
          continue;
        }
      }

      let exactSourceBackgroundNearby = false;

      if (sourceConfirmationNearby) {
        const sourceLeft = Math.max(0, x - SOURCE_CONFIRMATION_EDGE_RADIUS);
        const sourceRight = Math.min(sourceStrip.width - 1, x + SOURCE_CONFIRMATION_EDGE_RADIUS);
        const sourceTop = Math.max(0, localY - SOURCE_CONFIRMATION_EDGE_RADIUS);
        const sourceBottom = Math.min(sourceStrip.height - 1, localY + SOURCE_CONFIRMATION_EDGE_RADIUS);

        for (let sourceY = sourceTop; sourceY <= sourceBottom && !exactSourceBackgroundNearby; sourceY += 1) {
          for (let sourceX = sourceLeft; sourceX <= sourceRight; sourceX += 1) {
            const sourceOffset = (sourceY * sourceStrip.width + sourceX) * 4;
            const dr = output[sourceOffset] - options.backgroundColor.r;
            const dg = output[sourceOffset + 1] - options.backgroundColor.g;
            const db = output[sourceOffset + 2] - options.backgroundColor.b;

            if (Math.sqrt(dr * dr + dg * dg + db * db) <= SOURCE_CONFIRMATION_BACKGROUND_DISTANCE) {
              exactSourceBackgroundNearby = true;
              break;
            }
          }
        }
      }

      const sourceConfirmedCounterEdge = sourceConfirmationNearby && exactSourceBackgroundNearby;

      const edge = resolveBackgroundEdgePixel(
        { r: output[offset], g: output[offset + 1], b: output[offset + 2] },
        options.backgroundColor,
        sourceConfirmedCounterEdge
          ? Math.max(threshold, BACKGROUND_REMOVAL_THRESHOLDS.strong)
          : sourceConfirmationNearby && !acceptedEnclosedBackgroundNearby
            ? SOURCE_CONFIRMATION_BACKGROUND_DISTANCE
            : threshold,
      );

      // The bounded mask identifies the connected region. Re-evaluating
      // edge colour at source resolution keeps the transition crisp instead
      // of scaling a three-analysis-pixel soft edge into a broad blur.
      const resolvedAlpha = sourceConfirmedCounterEdge || sourceConfirmationNearby || analysisAlpha === 0
        ? edge.alpha
        : Math.max(analysisAlpha, edge.alpha);
      output[offset] = edge.r;
      output[offset + 1] = edge.g;
      output[offset + 2] = edge.b;
      output[offset + 3] = Math.min(sourceAlpha, resolvedAlpha);
    }
  }

  return output;
}
