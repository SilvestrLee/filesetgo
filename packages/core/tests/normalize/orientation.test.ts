import { describe, expect, it } from 'vitest';

import {
  getNormalizedDimensions,
  getOrientationTransform,
} from '../../src/normalize/orientation';
import type { ExifOrientation } from '../../src/preflight/contracts';

describe('EXIF orientation planning', () => {
  it.each([
    [1, [1, 0, 0, 1, 0, 0], { width: 4000, height: 3000 }],
    [2, [-1, 0, 0, 1, 4000, 0], { width: 4000, height: 3000 }],
    [3, [-1, 0, 0, -1, 4000, 3000], { width: 4000, height: 3000 }],
    [4, [1, 0, 0, -1, 0, 3000], { width: 4000, height: 3000 }],
    [5, [0, 1, 1, 0, 0, 0], { width: 3000, height: 4000 }],
    [6, [0, 1, -1, 0, 3000, 0], { width: 3000, height: 4000 }],
    [7, [0, -1, -1, 0, 3000, 4000], { width: 3000, height: 4000 }],
    [8, [0, -1, 1, 0, 0, 4000], { width: 3000, height: 4000 }],
  ] satisfies readonly [
    ExifOrientation,
    readonly number[],
    { width: number; height: number },
  ][])(
    'maps orientation %i to the complete orientation model',
    (orientation, transform, dimensions) => {
      expect(getOrientationTransform(4000, 3000, orientation)).toEqual(
        transform,
      );
      expect(getNormalizedDimensions(4000, 3000, orientation)).toEqual(
        dimensions,
      );
    },
  );
});
