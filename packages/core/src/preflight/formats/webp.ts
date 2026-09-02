import { readSourceSlice } from '../bounded-reader';
import type { ImageSource, ParsedImageMetadata } from '../contracts';
import { corruptImage, invalidSignature } from '../errors';

const WEBP_MAX_INITIAL_HEADER_BYTES = 30;

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function parseVp8(bytes: Uint8Array, dataStart: number): ParsedImageMetadata {
  if (
    (bytes[dataStart] & 0x01) !== 0 ||
    bytes[dataStart + 3] !== 0x9d ||
    bytes[dataStart + 4] !== 0x01 ||
    bytes[dataStart + 5] !== 0x2a
  ) {
    throw corruptImage('The WebP VP8 frame header is invalid.');
  }

  const width =
    (bytes[dataStart + 6] | (bytes[dataStart + 7] << 8)) & 0x3fff;
  const height =
    (bytes[dataStart + 8] | (bytes[dataStart + 9] << 8)) & 0x3fff;

  if (width === 0 || height === 0) {
    throw corruptImage('The WebP VP8 dimensions are invalid.');
  }

  return { width, height, animated: false };
}

function parseVp8Lossless(
  bytes: Uint8Array,
  dataStart: number,
): ParsedImageMetadata {
  if (bytes[dataStart] !== 0x2f) {
    throw corruptImage('The WebP VP8L signature is invalid.');
  }

  const packedDimensions =
    bytes[dataStart + 1] |
    (bytes[dataStart + 2] << 8) |
    (bytes[dataStart + 3] << 16) |
    (bytes[dataStart + 4] << 24);

  if ((packedDimensions >>> 29) !== 0) {
    throw corruptImage('The WebP VP8L version is unsupported or malformed.');
  }

  const width = (packedDimensions & 0x3fff) + 1;
  const height = ((packedDimensions >>> 14) & 0x3fff) + 1;

  return { width, height, animated: false };
}

function parseVp8Extended(
  bytes: Uint8Array,
  dataStart: number,
): ParsedImageMetadata {
  const flags = bytes[dataStart];

  if (
    (flags & 0xc1) !== 0 ||
    bytes[dataStart + 1] !== 0 ||
    bytes[dataStart + 2] !== 0 ||
    bytes[dataStart + 3] !== 0
  ) {
    throw corruptImage('The WebP VP8X reserved fields are invalid.');
  }

  const width = readUint24LittleEndian(bytes, dataStart + 4) + 1;
  const height = readUint24LittleEndian(bytes, dataStart + 7) + 1;

  return {
    width,
    height,
    animated: (flags & 0x02) !== 0,
  };
}

export async function parseWebpMetadata(
  source: ImageSource,
): Promise<ParsedImageMetadata> {
  if (source.size < 20) {
    throw corruptImage('The WebP container is truncated.');
  }

  const bytes = await readSourceSlice(
    source,
    0,
    Math.min(source.size, WEBP_MAX_INITIAL_HEADER_BYTES),
  );

  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') {
    throw invalidSignature('The WebP RIFF signature is invalid.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const declaredContainerBytes = view.getUint32(4, true) + 8;

  if (declaredContainerBytes < 20 || declaredContainerBytes !== source.size) {
    throw corruptImage('The WebP RIFF container length is invalid.');
  }

  const chunkType = ascii(bytes, 12, 4);
  const chunkSize = view.getUint32(16, true);
  const chunkEnd = 20 + chunkSize;
  const paddedChunkEnd = chunkEnd + (chunkSize % 2);

  if (paddedChunkEnd > declaredContainerBytes || paddedChunkEnd > source.size) {
    throw corruptImage('The WebP image chunk is truncated.');
  }

  if (chunkType === 'VP8 ') {
    if (chunkSize < 10 || bytes.byteLength < 30) {
      throw corruptImage('The WebP VP8 image header is truncated.');
    }

    return parseVp8(bytes, 20);
  }

  if (chunkType === 'VP8L') {
    if (chunkSize < 5 || bytes.byteLength < 25) {
      throw corruptImage('The WebP VP8L image header is truncated.');
    }

    return parseVp8Lossless(bytes, 20);
  }

  if (chunkType === 'VP8X') {
    if (chunkSize !== 10 || bytes.byteLength < 30) {
      throw corruptImage('The WebP VP8X image header is malformed.');
    }

    return parseVp8Extended(bytes, 20);
  }

  throw corruptImage('The WebP container does not expose supported dimensions.', {
    chunkType,
  });
}
