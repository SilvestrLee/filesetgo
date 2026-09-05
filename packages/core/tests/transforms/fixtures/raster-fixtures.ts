import type { RgbaRaster } from '../../../src/transforms/alpha-inspection';

/** A flat-colour opaque raster. */
export function createOpaqueRaster(width: number, height: number, color: [number, number, number]): RgbaRaster {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < data.length; index += 4) {
    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
    data[index + 3] = 255;
  }

  return { data, width, height };
}

/** A raster with a real, deterministic alpha channel — a centered opaque square on a fully transparent field. */
export function createTransparentRaster(width: number, height: number): RgbaRaster {
  const data = new Uint8ClampedArray(width * height * 4);
  const squareStart = Math.floor(width * 0.25);
  const squareEnd = Math.floor(width * 0.75);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const inside = x >= squareStart && x < squareEnd && y >= squareStart && y < squareEnd;
      data[index] = 10;
      data[index + 1] = 20;
      data[index + 2] = 30;
      data[index + 3] = inside ? 255 : 0;
    }
  }

  return { data, width, height };
}

/** A raster with real semi-transparent pixels (a uniform 128 alpha field). */
export function createSemiTransparentRaster(width: number, height: number): RgbaRaster {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let index = 0; index < data.length; index += 4) {
    data[index] = 200;
    data[index + 1] = 100;
    data[index + 2] = 50;
    data[index + 3] = 128;
  }

  return { data, width, height };
}

export interface RectSpec {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  color: [number, number, number];
}

/** A flat background with one or more opaque foreground rectangles drawn on top — the basic connected-background-removal fixture shape. */
export function createRasterWithForegroundRects(
  width: number,
  height: number,
  background: [number, number, number],
  rects: RectSpec[],
): RgbaRaster {
  const raster = createOpaqueRaster(width, height, background);

  for (const rect of rects) {
    for (let y = rect.y0; y < rect.y1; y += 1) {
      for (let x = rect.x0; x < rect.x1; x += 1) {
        const index = (y * width + x) * 4;
        raster.data[index] = rect.color[0];
        raster.data[index + 1] = rect.color[1];
        raster.data[index + 2] = rect.color[2];
        raster.data[index + 3] = 255;
      }
    }
  }

  return raster;
}

/**
 * A flat background with a centered foreground rectangle whose edges are
 * anti-aliased (blended toward the background colour over a 2px ring) —
 * the fixture for edge-decontamination tests.
 */
export function createRasterWithAntiAliasedForeground(
  width: number,
  height: number,
  background: [number, number, number],
  foreground: [number, number, number],
  featherWidth = 8,
): RgbaRaster {
  const raster = createOpaqueRaster(width, height, background);
  const x0 = Math.floor(width * 0.3);
  const x1 = Math.floor(width * 0.7);
  const y0 = Math.floor(height * 0.3);
  const y1 = Math.floor(height * 0.7);

  for (let y = y0 - featherWidth; y < y1 + featherWidth; y += 1) {
    for (let x = x0 - featherWidth; x < x1 + featherWidth; x += 1) {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        continue;
      }

      const insideCore = x >= x0 && x < x1 && y >= y0 && y < y1;
      const distanceOutside = Math.max(x0 - x, x - (x1 - 1), y0 - y, y - (y1 - 1), 0);
      const index = (y * width + x) * 4;

      if (insideCore) {
        raster.data[index] = foreground[0];
        raster.data[index + 1] = foreground[1];
        raster.data[index + 2] = foreground[2];
      } else if (distanceOutside <= featherWidth) {
        const t = 1 - distanceOutside / (featherWidth + 1); // 1 = fully foreground, 0 = fully background
        raster.data[index] = Math.round(foreground[0] * t + background[0] * (1 - t));
        raster.data[index + 1] = Math.round(foreground[1] * t + background[1] * (1 - t));
        raster.data[index + 2] = Math.round(foreground[2] * t + background[2] * (1 - t));
      }
    }
  }

  return raster;
}

/**
 * A flat background with a foreground rectangle and a soft, one-directional
 * drop shadow already flattened into the source (as a real exported logo's
 * shadow would be) — fading from a mid-grey toward the background colour
 * with distance from the shape (FSG-005C directive §41 fixture 11).
 */
export function createRasterWithDropShadow(
  width: number,
  height: number,
  background: [number, number, number],
  foreground: [number, number, number],
  shadowWidth = 8,
): RgbaRaster {
  const raster = createOpaqueRaster(width, height, background);
  const x0 = Math.floor(width * 0.25);
  const x1 = Math.floor(width * 0.55);
  const y0 = Math.floor(height * 0.25);
  const y1 = Math.floor(height * 0.55);
  const shadowGray = 120;

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const index = (y * width + x) * 4;
      raster.data[index] = foreground[0];
      raster.data[index + 1] = foreground[1];
      raster.data[index + 2] = foreground[2];
    }
  }

  for (let y = y1; y < Math.min(height, y1 + shadowWidth); y += 1) {
    for (let x = x0 + shadowWidth; x < Math.min(width, x1 + shadowWidth); x += 1) {
      const verticalDistance = y - y1;
      const horizontalDistance = Math.max(0, x - (x1 - 1 + shadowWidth));
      const distance = Math.max(verticalDistance, horizontalDistance);
      const t = Math.max(0, 1 - distance / shadowWidth); // 1 near the shape, fading to 0 at shadowWidth

      if (t <= 0) {
        continue;
      }

      const index = (y * width + x) * 4;
      raster.data[index] = Math.round(shadowGray * t + background[0] * (1 - t));
      raster.data[index + 1] = Math.round(shadowGray * t + background[1] * (1 - t));
      raster.data[index + 2] = Math.round(shadowGray * t + background[2] * (1 - t));
    }
  }

  return raster;
}

/**
 * The critical regression fixture (FSG-005C Product Office correction,
 * directive §4): a transparent outer canvas wrapping an opaque,
 * un-removed rectangular background, with genuinely different-coloured
 * artwork inside that rectangle. `inspectAlpha()` correctly reports real
 * transparency here — the point of this fixture is that transparency
 * alone must NOT be sufficient evidence to bypass background removal.
 */
export function createTransparentPaddingAroundOpaqueBackground(
  width: number,
  height: number,
  backgroundColor: [number, number, number],
  artworkColor: [number, number, number],
  rectFraction = 0.7,
  artworkFraction = 0.2,
): RgbaRaster {
  const data = new Uint8ClampedArray(width * height * 4); // fully transparent by default
  const rectPad = (1 - rectFraction) / 2;
  const rectX0 = Math.round(width * rectPad);
  const rectX1 = Math.round(width * (1 - rectPad));
  const rectY0 = Math.round(height * rectPad);
  const rectY1 = Math.round(height * (1 - rectPad));
  const artPad = (1 - artworkFraction) / 2;
  const artX0 = Math.round(width * artPad);
  const artX1 = Math.round(width * (1 - artPad));
  const artY0 = Math.round(height * artPad);
  const artY1 = Math.round(height * (1 - artPad));

  for (let y = rectY0; y < rectY1; y += 1) {
    for (let x = rectX0; x < rectX1; x += 1) {
      const index = (y * width + x) * 4;
      const insideArtwork = x >= artX0 && x < artX1 && y >= artY0 && y < artY1;
      const color = insideArtwork ? artworkColor : backgroundColor;
      data[index] = color[0];
      data[index + 1] = color[1];
      data[index + 2] = color[2];
      data[index + 3] = 255;
    }
  }

  return { data, width, height };
}

/** Incidental alpha (FSG-005C directive §5): an otherwise fully opaque, varied-colour raster with a single transparent pixel. */
export function createOpaqueRasterWithSingleTransparentPixel(width: number, height: number): RgbaRaster {
  const raster = createOpaqueRaster(width, height, [100, 150, 200]);
  const index = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
  raster.data[index + 3] = 0;
  return raster;
}

/** Incidental alpha (FSG-005C directive §5): an otherwise fully opaque, varied-colour raster with only a tiny transparent corner. */
export function createOpaqueRasterWithTinyTransparentCorner(width: number, height: number, cornerSize = 3): RgbaRaster {
  const raster = createOpaqueRaster(width, height, [100, 150, 200]);

  for (let y = 0; y < cornerSize; y += 1) {
    for (let x = 0; x < cornerSize; x += 1) {
      const index = (y * width + x) * 4;
      raster.data[index + 3] = 0;
    }
  }

  return raster;
}

/**
 * Independent fine-icon-stroke geometry (FSG-005C directive §10) —
 * genuinely distinct from the thin-typography fixture: several separated
 * 1-2px diagonal/curved strokes on a flat, removable background, rather
 * than one straight vertical bar.
 */
export function createRasterWithFineIconStrokes(
  width: number,
  height: number,
  background: [number, number, number],
  strokeColor: [number, number, number],
): RgbaRaster {
  const raster = createOpaqueRaster(width, height, background);
  const setPixel = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }

    const index = (y * width + x) * 4;
    raster.data[index] = strokeColor[0];
    raster.data[index + 1] = strokeColor[1];
    raster.data[index + 2] = strokeColor[2];
    raster.data[index + 3] = 255;
  };

  // A diagonal stroke, 2px thick, from top-left toward centre.
  const diagonalLength = Math.floor(Math.min(width, height) * 0.4);

  for (let i = 0; i < diagonalLength; i += 1) {
    const x = Math.floor(width * 0.15) + i;
    const y = Math.floor(height * 0.15) + i;
    setPixel(x, y);
    setPixel(x + 1, y);
  }

  // A curved stroke (a quarter-circle arc), 1-2px thick, in the opposite corner.
  const arcRadius = Math.floor(Math.min(width, height) * 0.25);
  const arcCenterX = Math.floor(width * 0.75);
  const arcCenterY = Math.floor(height * 0.75);

  for (let angleDeg = 180; angleDeg <= 270; angleDeg += 1) {
    const angle = (angleDeg * Math.PI) / 180;
    const x = Math.round(arcCenterX + arcRadius * Math.cos(angle));
    const y = Math.round(arcCenterY + arcRadius * Math.sin(angle));
    setPixel(x, y);
    setPixel(x, y + 1);
  }

  // A small separated detail (a short isolated stroke), disconnected from the other two.
  const detailX0 = Math.floor(width * 0.45);
  const detailY = Math.floor(height * 0.55);

  for (let i = 0; i < Math.floor(width * 0.1); i += 1) {
    setPixel(detailX0 + i, detailY);
  }

  return raster;
}

/** A horizontal gradient background (no flat colour a border-median estimate can cleanly capture) with a foreground rectangle. */
export function createRasterWithGradientBackground(
  width: number,
  height: number,
  foreground: [number, number, number],
): RgbaRaster {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const t = x / Math.max(width - 1, 1);
      data[index] = Math.round(240 * (1 - t) + 40 * t);
      data[index + 1] = Math.round(240 * (1 - t) + 40 * t);
      data[index + 2] = Math.round(240 * (1 - t) + 40 * t);
      data[index + 3] = 255;
    }
  }

  const raster = { data, width, height };
  const x0 = Math.floor(width * 0.35);
  const x1 = Math.floor(width * 0.65);
  const y0 = Math.floor(height * 0.35);
  const y1 = Math.floor(height * 0.65);

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const index = (y * width + x) * 4;
      raster.data[index] = foreground[0];
      raster.data[index + 1] = foreground[1];
      raster.data[index + 2] = foreground[2];
    }
  }

  return raster;
}
