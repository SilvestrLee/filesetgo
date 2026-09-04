import { describe, expect, it } from 'vitest';

import { calculateContainPlan } from '../../src/transforms/contain';

describe('calculateContainPlan', () => {
  it('centers a landscape source within a square canvas', () => {
    const plan = calculateContainPlan(1000, 500, 512, 512, 0.9, false);

    expect(plan.canvasWidth).toBe(512);
    expect(plan.canvasHeight).toBe(512);
    // The 512px content box is floored to 460 (floor(512 * 0.9) = floor(460.8) = 460)
    // before it drives the scale, not the fractional 460.8 itself.
    expect(plan.drawWidth).toBe(460);
    expect(plan.drawHeight).toBe(230);
    expect(plan.offsetX).toBe((512 - plan.drawWidth) / 2);
    expect(plan.offsetY).toBe((512 - plan.drawHeight) / 2);
  });

  it('centers a portrait source within a square canvas', () => {
    const plan = calculateContainPlan(500, 1000, 512, 512, 0.9, false);

    expect(plan.drawHeight).toBe(460);
    expect(plan.drawWidth).toBe(230);
    expect(plan.offsetX).toBe((512 - plan.drawWidth) / 2);
    expect(plan.offsetY).toBe((512 - 460) / 2);
  });

  it('centers a square source within a square canvas, filling both axes at the content scale', () => {
    const plan = calculateContainPlan(1000, 1000, 512, 512, 0.9, false);

    expect(plan.drawWidth).toBe(460);
    expect(plan.drawHeight).toBe(460);
    expect(plan.offsetX).toBe(plan.offsetY);
  });

  it('preserves the source aspect ratio exactly', () => {
    const plan = calculateContainPlan(1600, 900, 400, 400, 0.9, true);
    expect(plan.drawWidth / plan.drawHeight).toBeCloseTo(1600 / 900, 10);
  });

  it('never exceeds the requested canvas dimensions', () => {
    const plan = calculateContainPlan(50, 50, 192, 192, 0.9, true);
    expect(plan.drawWidth).toBeLessThanOrEqual(192);
    expect(plan.drawHeight).toBeLessThanOrEqual(192);
  });

  it('respects allowUpscale: false by clamping scale to 1 for a small source', () => {
    const plan = calculateContainPlan(20, 20, 512, 512, 0.9, false);
    expect(plan.scale).toBe(1);
    expect(plan.drawWidth).toBe(20);
    expect(plan.drawHeight).toBe(20);
  });

  it('respects allowUpscale: true by scaling a small source up to fill the floored content box', () => {
    const plan = calculateContainPlan(20, 20, 512, 512, 0.9, true);
    expect(plan.scale).toBeGreaterThan(1);
    expect(plan.drawWidth).toBe(460);
    expect(plan.drawHeight).toBe(460);
  });

  it('produces deterministic, repeatable results for identical inputs', () => {
    const a = calculateContainPlan(777, 333, 180, 180, 0.9, true);
    const b = calculateContainPlan(777, 333, 180, 180, 0.9, true);
    expect(a).toEqual(b);
  });

  it('supports a non-square canvas (rectangular contain)', () => {
    const plan = calculateContainPlan(2000, 500, 800, 240, 1, false);
    expect(plan.canvasWidth).toBe(800);
    expect(plan.canvasHeight).toBe(240);
    expect(plan.drawWidth).toBeLessThanOrEqual(800);
    expect(plan.drawHeight).toBeLessThanOrEqual(240);
  });

  describe('deterministic floor-rounded content box (Logo Pack icon canvases)', () => {
    // Required evidence: contentBoxWidth = floor(canvasWidth * 0.90), for every
    // Logo Pack icon canvas size. A source that exactly matches the canvas's
    // square aspect ratio and is large enough to allow upscaling makes
    // drawWidth/drawHeight equal to the floored content box exactly, proving
    // the box itself was floored before being used to derive scale — not
    // merely that a fractional draw dimension happened to round the same way.
    it.each([
      [32, 28],
      [180, 162],
      [192, 172],
      [512, 460],
    ])('floors a %ipx canvas content box to %ipx', (canvasSize, expectedContentBox) => {
      expect(Math.floor(canvasSize * 0.9)).toBe(expectedContentBox);

      const plan = calculateContainPlan(canvasSize, canvasSize, canvasSize, canvasSize, 0.9, true);

      expect(plan.drawWidth).toBe(expectedContentBox);
      expect(plan.drawHeight).toBe(expectedContentBox);
    });

    it('does not use the fractional (unfloored) content box as the effective scale basis', () => {
      // 512 * 0.9 = 460.8 exactly. If the implementation used this fractional
      // value directly, a source matching the canvas would draw at 460.8px,
      // not 460px. The two are not equivalent.
      const plan = calculateContainPlan(512, 512, 512, 512, 0.9, true);
      expect(plan.drawWidth).not.toBeCloseTo(460.8, 5);
      expect(plan.drawWidth).toBe(460);
    });
  });
});
