import { MAX_JPEG_HEADER_BYTES } from '../preflight/bounded-reader';

interface ByteRange {
  start: number;
  end: number;
}

function isStandaloneMarker(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
}

function isExifSegment(
  bytes: Uint8Array,
  dataStart: number,
  segmentEnd: number,
): boolean {
  return (
    segmentEnd - dataStart >= 6 &&
    bytes[dataStart] === 0x45 &&
    bytes[dataStart + 1] === 0x78 &&
    bytes[dataStart + 2] === 0x69 &&
    bytes[dataStart + 3] === 0x66 &&
    bytes[dataStart + 4] === 0 &&
    bytes[dataStart + 5] === 0
  );
}

function findExifSegmentRanges(bytes: Uint8Array): ByteRange[] {
  const ranges: ByteRange[] = [];
  let offset = 2;

  while (offset + 1 < bytes.byteLength) {
    const segmentStart = offset;

    if (bytes[offset] !== 0xff) {
      break;
    }

    while (offset < bytes.byteLength && bytes[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= bytes.byteLength) {
      break;
    }

    const marker = bytes[offset];

    if (marker === 0xda || marker === 0xd9) {
      break;
    }

    if (isStandaloneMarker(marker)) {
      offset += 1;
      continue;
    }

    if (offset + 2 >= bytes.byteLength) {
      break;
    }

    const segmentLength = (bytes[offset + 1] << 8) | bytes[offset + 2];
    const dataStart = offset + 3;
    const segmentEnd = offset + 1 + segmentLength;

    if (segmentLength < 2 || segmentEnd > bytes.byteLength) {
      break;
    }

    if (
      marker === 0xe1 &&
      isExifSegment(bytes, dataStart, segmentEnd)
    ) {
      ranges.push({ start: segmentStart, end: segmentEnd });
    }

    offset = segmentEnd;
  }

  return ranges;
}

export async function createOrientationNeutralJpeg(file: Blob): Promise<Blob> {
  const header = new Uint8Array(
    await file.slice(0, Math.min(file.size, MAX_JPEG_HEADER_BYTES)).arrayBuffer(),
  );
  const ranges = findExifSegmentRanges(header);

  if (ranges.length === 0) {
    return file;
  }

  const parts: Blob[] = [];
  let offset = 0;

  for (const range of ranges) {
    if (range.start > offset) {
      parts.push(file.slice(offset, range.start));
    }

    offset = range.end;
  }

  if (offset < file.size) {
    parts.push(file.slice(offset));
  }

  return new Blob(parts, { type: 'image/jpeg' });
}
