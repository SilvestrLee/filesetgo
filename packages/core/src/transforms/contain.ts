/**
 * The fixed-canvas CONTAIN primitive (FSG-005B directive §17). Generic and
 * reusable — this module has no concept of icons, favicons, or Logo Pack.
 * Given a source size, a fixed target canvas size, and how much of that
 * canvas the content may occupy, it deterministically computes where to
 * draw the (aspect-preserving, uncropped, unstretched) source so it's
 * centered within the canvas. Only CONTAIN is implemented — no crop/fill.
 */
export interface ContainRenderPlan {
  canvasWidth: number;
  canvasHeight: number;
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
  /** The scale factor actually applied, after the `allowUpscale` clamp (if any). */
  scale: number;
}

export function calculateContainPlan(
  sourceWidth: number,
  sourceHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  contentScale: number,
  allowUpscale: boolean,
): ContainRenderPlan {
  // The content box the source may occupy is deterministically floored to a
  // whole-pixel size before it drives the scale computation. A fractional
  // content box (e.g. 512 * 0.9 = 460.8 used directly) is not equivalent —
  // it lets the drawn content extend into a fractional 461st pixel that a
  // floored 460px box would not permit. Flooring first, then deriving scale
  // from that integer box, is what makes the plan reproducible in whole
  // pixels for any canvas size and content scale.
  const availableWidth = Math.floor(canvasWidth * contentScale);
  const availableHeight = Math.floor(canvasHeight * contentScale);
  let scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight);

  if (!allowUpscale) {
    scale = Math.min(scale, 1);
  }

  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;

  return {
    canvasWidth,
    canvasHeight,
    drawWidth,
    drawHeight,
    offsetX: (canvasWidth - drawWidth) / 2,
    offsetY: (canvasHeight - drawHeight) / 2,
    scale,
  };
}
