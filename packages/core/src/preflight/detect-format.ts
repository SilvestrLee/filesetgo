import type { ImageFormat } from './contracts';
import { invalidSignature } from './errors';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// ISOBMFF major brands that identify a HEIC/HEIF still image container.
// AVIF ('avif', 'avis') and other ISOBMFF brands (e.g. plain MP4) are
// deliberately excluded: AVIF is a separate, conditional V1 format
// (docs/architecture/FORMAT-SUPPORT.md) and must not be misreported as HEIC.
const HEIC_MAJOR_BRANDS = new Set([
  'heic',
  'heix',
  'heim',
  'heis',
  'hevc',
  'hevx',
  'hevm',
  'hevs',
  'mif1',
  'msf1',
]);

function matches(bytes: Uint8Array, expected: readonly number[]): boolean {
  return (
    bytes.byteLength >= expected.length &&
    expected.every((value, index) => bytes[index] === value)
  );
}

function matchesAscii(
  bytes: Uint8Array,
  offset: number,
  expected: string,
): boolean {
  if (bytes.byteLength < offset + expected.length) {
    return false;
  }

  return [...expected].every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  );
}

export function detectImageFormat(bytes: Uint8Array): ImageFormat | undefined {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    if (bytes.byteLength < 3 || bytes[2] !== 0xff) {
      throw invalidSignature('The JPEG signature is invalid or truncated.');
    }

    return 'jpeg';
  }

  if (matches(bytes, PNG_SIGNATURE)) {
    return 'png';
  }

  if (matches(bytes, PNG_SIGNATURE.slice(0, 4))) {
    throw invalidSignature('The PNG signature is invalid or truncated.');
  }

  if (matchesAscii(bytes, 0, 'RIFF')) {
    if (!matchesAscii(bytes, 8, 'WEBP')) {
      throw invalidSignature('The WebP RIFF signature is invalid or truncated.');
    }

    return 'webp';
  }

  if (matchesAscii(bytes, 4, 'ftyp')) {
    if (bytes.byteLength < 12) {
      throw invalidSignature('The HEIC ftyp box is truncated.');
    }

    const majorBrand = String.fromCharCode(
      bytes[8],
      bytes[9],
      bytes[10],
      bytes[11],
    );

    return HEIC_MAJOR_BRANDS.has(majorBrand) ? 'heic' : undefined;
  }

  return undefined;
}
