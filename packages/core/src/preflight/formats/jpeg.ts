import {
  BoundedPrefixReader,
  MAX_JPEG_HEADER_BYTES,
  MAX_JPEG_SEGMENTS,
} from '../bounded-reader';
import type {
  ExifOrientation,
  ImageSource,
  ParsedImageMetadata,
} from '../contracts';
import { corruptImage, invalidSignature } from '../errors';

const EXIF_IDENTIFIER = [0x45, 0x78, 0x69, 0x66];
const ORIENTATION_TAG = 0x0112;

function isStartOfFrame(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

function isStandaloneMarker(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
}

function hasExifIdentifier(bytes: Uint8Array): boolean {
  return EXIF_IDENTIFIER.every((value, index) => bytes[index] === value);
}

function parseExifOrientation(
  segmentData: Uint8Array,
): ExifOrientation | undefined {
  if (!hasExifIdentifier(segmentData)) {
    return undefined;
  }

  if (
    segmentData.byteLength < 14 ||
    segmentData[4] !== 0 ||
    segmentData[5] !== 0
  ) {
    throw corruptImage('The JPEG contains malformed EXIF metadata.');
  }

  const tiffData = segmentData.subarray(6);
  const view = new DataView(
    tiffData.buffer,
    tiffData.byteOffset,
    tiffData.byteLength,
  );
  const byteOrder = String.fromCharCode(tiffData[0], tiffData[1]);
  const littleEndian = byteOrder === 'II';

  if (!littleEndian && byteOrder !== 'MM') {
    throw corruptImage('The JPEG EXIF byte order is invalid.');
  }

  if (view.getUint16(2, littleEndian) !== 42) {
    throw corruptImage('The JPEG EXIF TIFF marker is invalid.');
  }

  const firstDirectoryOffset = view.getUint32(4, littleEndian);

  if (
    firstDirectoryOffset < 8 ||
    firstDirectoryOffset > tiffData.byteLength - 2
  ) {
    throw corruptImage('The JPEG EXIF directory offset is out of bounds.');
  }

  const entryCount = view.getUint16(firstDirectoryOffset, littleEndian);
  const entriesStart = firstDirectoryOffset + 2;
  const entriesEnd = entriesStart + entryCount * 12;

  if (entriesEnd + 4 > tiffData.byteLength) {
    throw corruptImage('The JPEG EXIF directory is truncated.');
  }

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = entriesStart + index * 12;
    const tag = view.getUint16(entryOffset, littleEndian);

    if (tag !== ORIENTATION_TAG) {
      continue;
    }

    const type = view.getUint16(entryOffset + 2, littleEndian);
    const valueCount = view.getUint32(entryOffset + 4, littleEndian);

    if (type !== 3 || valueCount !== 1) {
      throw corruptImage('The JPEG EXIF orientation entry is malformed.');
    }

    const orientation = view.getUint16(entryOffset + 8, littleEndian);

    if (orientation < 1 || orientation > 8) {
      throw corruptImage('The JPEG EXIF orientation value is invalid.', {
        orientation,
      });
    }

    return orientation as ExifOrientation;
  }

  return undefined;
}

function parseStartOfFrame(
  bytes: Uint8Array,
  dataStart: number,
  segmentLength: number,
): Pick<ParsedImageMetadata, 'width' | 'height'> {
  if (segmentLength < 8) {
    throw corruptImage('The JPEG start-of-frame segment is malformed.');
  }

  const height = (bytes[dataStart + 1] << 8) | bytes[dataStart + 2];
  const width = (bytes[dataStart + 3] << 8) | bytes[dataStart + 4];
  const componentCount = bytes[dataStart + 5];

  if (
    width === 0 ||
    height === 0 ||
    componentCount === 0 ||
    segmentLength !== 8 + componentCount * 3
  ) {
    throw corruptImage('The JPEG start-of-frame dimensions are invalid.');
  }

  return { width, height };
}

export async function parseJpegMetadata(
  source: ImageSource,
): Promise<ParsedImageMetadata> {
  const reader = new BoundedPrefixReader(source, MAX_JPEG_HEADER_BYTES);
  const signature = await reader.read(3);

  if (
    signature[0] !== 0xff ||
    signature[1] !== 0xd8 ||
    signature[2] !== 0xff
  ) {
    throw invalidSignature('The JPEG signature is invalid.');
  }

  let offset = 2;
  let segmentCount = 0;
  let dimensions: Pick<ParsedImageMetadata, 'width' | 'height'> | undefined;
  let orientation: ExifOrientation | undefined;

  while (offset < source.size && offset < MAX_JPEG_HEADER_BYTES) {
    segmentCount += 1;

    if (segmentCount > MAX_JPEG_SEGMENTS) {
      throw corruptImage('The JPEG contains too many header segments.', {
        maximumSegments: MAX_JPEG_SEGMENTS,
      });
    }

    let bytes = await reader.read(offset + 2);

    if (bytes[offset] !== 0xff) {
      throw corruptImage('The JPEG marker stream is malformed.');
    }

    let markerOffset = offset;

    while (bytes[markerOffset] === 0xff) {
      markerOffset += 1;
      bytes = await reader.read(markerOffset + 1);
    }

    const marker = bytes[markerOffset];

    if (marker === 0x00 || marker === 0xd8) {
      throw corruptImage('The JPEG contains an invalid marker sequence.');
    }

    if (marker === 0xd9) {
      throw corruptImage('The JPEG ended before image scan data.');
    }

    if (marker === 0xda) {
      const lengthOffset = markerOffset + 1;
      bytes = await reader.read(lengthOffset + 2);
      const segmentLength =
        (bytes[lengthOffset] << 8) | bytes[lengthOffset + 1];
      const segmentEnd = lengthOffset + segmentLength;

      if (
        segmentLength < 8 ||
        segmentEnd > source.size ||
        segmentEnd > MAX_JPEG_HEADER_BYTES
      ) {
        throw corruptImage('The JPEG start-of-scan segment is malformed.');
      }

      bytes = await reader.read(segmentEnd);
      const componentCount = bytes[lengthOffset + 2];

      if (
        componentCount === 0 ||
        segmentLength !== 6 + componentCount * 2
      ) {
        throw corruptImage('The JPEG start-of-scan data is invalid.');
      }

      if (dimensions === undefined) {
        throw corruptImage(
          'The JPEG does not contain a valid start-of-frame marker.',
        );
      }

      return orientation === undefined
        ? dimensions
        : { ...dimensions, orientation };
    }

    if (isStandaloneMarker(marker)) {
      offset = markerOffset + 1;
      continue;
    }

    const lengthOffset = markerOffset + 1;
    bytes = await reader.read(lengthOffset + 2);
    const segmentLength =
      (bytes[lengthOffset] << 8) | bytes[lengthOffset + 1];

    if (segmentLength < 2) {
      throw corruptImage('The JPEG contains an invalid segment length.');
    }

    const segmentEnd = lengthOffset + segmentLength;

    if (segmentEnd > source.size) {
      throw corruptImage('The JPEG contains a truncated segment.');
    }

    if (segmentEnd > MAX_JPEG_HEADER_BYTES) {
      throw corruptImage('The JPEG header exceeds the bounded scan limit.', {
        maximumHeaderBytes: MAX_JPEG_HEADER_BYTES,
      });
    }

    bytes = await reader.read(segmentEnd);
    const dataStart = lengthOffset + 2;

    if (marker === 0xe1) {
      const parsedOrientation = parseExifOrientation(
        bytes.subarray(dataStart, segmentEnd),
      );

      if (
        parsedOrientation !== undefined &&
        orientation !== undefined &&
        parsedOrientation !== orientation
      ) {
        throw corruptImage('The JPEG contains conflicting EXIF orientation.');
      }

      orientation ??= parsedOrientation;
    }

    if (isStartOfFrame(marker)) {
      const parsedDimensions = parseStartOfFrame(
        bytes,
        dataStart,
        segmentLength,
      );

      if (
        dimensions !== undefined &&
        (dimensions.width !== parsedDimensions.width ||
          dimensions.height !== parsedDimensions.height)
      ) {
        throw corruptImage('The JPEG contains conflicting dimensions.');
      }

      dimensions ??= parsedDimensions;
    }

    offset = segmentEnd;
  }

  throw corruptImage('The JPEG header ended before a valid image scan.');
}
