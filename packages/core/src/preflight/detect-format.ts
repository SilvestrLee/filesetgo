import type { ImageFormat } from './contracts';
import { invalidSignature } from './errors';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

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

  return undefined;
}
