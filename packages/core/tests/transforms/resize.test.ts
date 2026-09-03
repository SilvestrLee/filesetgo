import { describe, expect, it } from 'vitest';

import { calculateResizePlan } from '../../src/transforms/resize';

describe('calculateResizePlan', () => {
  it.each([
    ['landscape', 4000, 3000, 1200, 1200, 1200, 900],
    ['portrait', 3000, 4000, 1200, 1200, 900, 1200],
  ])(
    'preserves the aspect ratio for a %s source',
    (_, sourceWidth, sourceHeight, maxWidth, maxHeight, width, height) => {
      const result = calculateResizePlan(sourceWidth, sourceHeight, {
        maxWidth,
        maxHeight,
      });

      expect(result).toEqual({
        width,
        height,
        resized: true,
        scale: 0.3,
      });
    },
  );

  it('does not upscale by default', () => {
    const result = calculateResizePlan(800, 600, {
      maxWidth: 1200,
      maxHeight: 1200,
    });

    expect(result).toEqual({
      width: 800,
      height: 600,
      resized: false,
      scale: 1,
    });
  });

  it('allows an explicit proportional upscale', () => {
    const result = calculateResizePlan(800, 600, {
      maxWidth: 1200,
      maxHeight: 1200,
      allowUpscale: true,
    });

    expect(result).toEqual({
      width: 1200,
      height: 900,
      resized: true,
      scale: 1.5,
    });
  });

  it.each([
    ['width', { maxWidth: 1000 }, 1000, 750],
    ['height', { maxHeight: 600 }, 800, 600],
  ] as const)(
    'supports a max-%s-only constraint',
    (_, resize, width, height) => {
      const result = calculateResizePlan(4000, 3000, resize);

      expect(result).toMatchObject({ width, height, resized: true });
    },
  );

  it('keeps the original dimensions when no resize is requested', () => {
    const result = calculateResizePlan(640, 480, undefined);

    expect(result).toEqual({
      width: 640,
      height: 480,
      resized: false,
      scale: 1,
    });
  });
});
