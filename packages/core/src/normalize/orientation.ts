import type { ExifOrientation } from '../preflight/contracts';
import type { ImageDimensions } from '../processing/contracts';

export type OrientationTransform = readonly [
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
];

export function getNormalizedDimensions(
  width: number,
  height: number,
  orientation: ExifOrientation = 1,
): ImageDimensions {
  return orientation >= 5
    ? { width: height, height: width }
    : { width, height };
}

export function getOrientationTransform(
  width: number,
  height: number,
  orientation: ExifOrientation = 1,
): OrientationTransform {
  switch (orientation) {
    case 2:
      return [-1, 0, 0, 1, width, 0];
    case 3:
      return [-1, 0, 0, -1, width, height];
    case 4:
      return [1, 0, 0, -1, 0, height];
    case 5:
      return [0, 1, 1, 0, 0, 0];
    case 6:
      return [0, 1, -1, 0, height, 0];
    case 7:
      return [0, -1, -1, 0, height, width];
    case 8:
      return [0, -1, 1, 0, 0, width];
    default:
      return [1, 0, 0, 1, 0, 0];
  }
}
