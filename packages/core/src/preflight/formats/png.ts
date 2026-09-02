import { readSourceSlice } from '../bounded-reader';
import type { ImageSource, ParsedImageMetadata } from '../contracts';
import { corruptImage, invalidSignature } from '../errors';

const PNG_HEADER_BYTES = 33;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const VALID_BIT_DEPTHS: Readonly<Record<number, readonly number[]>> = {
  0: [1, 2, 4, 8, 16],
  2: [8, 16],
  3: [1, 2, 4, 8],
  4: [8, 16],
  6: [8, 16],
};

function calculateCrc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

export async function parsePngMetadata(
  source: ImageSource,
): Promise<ParsedImageMetadata> {
  if (source.size < PNG_HEADER_BYTES) {
    throw corruptImage('The PNG header is truncated.');
  }

  const bytes = await readSourceSlice(source, 0, PNG_HEADER_BYTES);

  if (!PNG_SIGNATURE.every((value, index) => bytes[index] === value)) {
    throw invalidSignature('The PNG signature is invalid.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunkLength = view.getUint32(8, false);
  const chunkType = String.fromCharCode(...bytes.subarray(12, 16));

  if (chunkLength !== 13 || chunkType !== 'IHDR') {
    throw corruptImage('The PNG does not begin with a valid IHDR chunk.');
  }

  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  const bitDepth = bytes[24];
  const colorType = bytes[25];
  const compressionMethod = bytes[26];
  const filterMethod = bytes[27];
  const interlaceMethod = bytes[28];
  const validBitDepths = VALID_BIT_DEPTHS[colorType];

  if (
    width === 0 ||
    height === 0 ||
    validBitDepths === undefined ||
    !validBitDepths.includes(bitDepth) ||
    compressionMethod !== 0 ||
    filterMethod !== 0 ||
    (interlaceMethod !== 0 && interlaceMethod !== 1)
  ) {
    throw corruptImage('The PNG IHDR data is invalid.');
  }

  const expectedCrc = view.getUint32(29, false);
  const actualCrc = calculateCrc32(bytes.subarray(12, 29));

  if (expectedCrc !== actualCrc) {
    throw corruptImage('The PNG IHDR checksum is invalid.');
  }

  return { width, height };
}
