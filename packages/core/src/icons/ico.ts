/**
 * A small, FileSetGo-owned ICO (Windows icon container) reader/writer
 * (FSG-005B directive §28/§29). This is a generic file-format capability —
 * it has no concept of "favicon" or "Logo Pack"; the product layer decides
 * what an ICO built here is used for and what it's named.
 *
 * Entries are PNG-compressed (the modern ICO variant every current browser
 * accepts), never legacy BMP/DIB — directive §30 explicitly excludes that.
 */

const ICO_HEADER_SIZE = 6;
const ICO_DIR_ENTRY_SIZE = 16;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export interface IcoEntryInput {
  width: number;
  height: number;
  png: Uint8Array;
}

/** A dimension of 256 is stored as 0 in the one-byte ICO directory field — the format's own convention. */
function toDirectoryDimension(value: number): number {
  return value >= 256 ? 0 : value;
}

function fromDirectoryDimension(value: number): number {
  return value === 0 ? 256 : value;
}

/**
 * Builds a valid ICO container from PNG-compressed entries, in the given
 * order (directive §30). Does not validate its own output — callers that
 * need a validity guarantee should run `validateIcoContainer()` on the
 * result, exactly as `process-image-set.ts` does before accepting it.
 */
export function createIco(entries: readonly IcoEntryInput[]): Uint8Array {
  const dirSize = ICO_DIR_ENTRY_SIZE * entries.length;
  const payloadOffset = ICO_HEADER_SIZE + dirSize;
  const totalSize = payloadOffset + entries.reduce((sum, entry) => sum + entry.png.byteLength, 0);

  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);

  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type = icon
  view.setUint16(4, entries.length, true); // count

  let offset = payloadOffset;

  entries.forEach((entry, index) => {
    const entryOffset = ICO_HEADER_SIZE + index * ICO_DIR_ENTRY_SIZE;

    view.setUint8(entryOffset, toDirectoryDimension(entry.width));
    view.setUint8(entryOffset + 1, toDirectoryDimension(entry.height));
    view.setUint8(entryOffset + 2, 0); // color count (0 = no palette)
    view.setUint8(entryOffset + 3, 0); // reserved
    view.setUint16(entryOffset + 4, 1, true); // color planes
    view.setUint16(entryOffset + 6, 32, true); // bits per pixel
    view.setUint32(entryOffset + 8, entry.png.byteLength, true); // bytes in resource
    view.setUint32(entryOffset + 12, offset, true); // resource offset

    buffer.set(entry.png, offset);
    offset += entry.png.byteLength;
  });

  return buffer;
}

export interface IcoValidationIssue {
  message: string;
}

export interface IcoValidatedEntry {
  width: number;
  height: number;
  byteLength: number;
}

export type IcoValidationResult =
  | { valid: true; entries: IcoValidatedEntry[] }
  | { valid: false; issues: IcoValidationIssue[] };

function invalid(message: string): IcoValidationResult {
  return { valid: false, issues: [{ message }] };
}

function hasPngSignature(bytes: Uint8Array, offset: number): boolean {
  if (offset + PNG_SIGNATURE.length > bytes.byteLength) {
    return false;
  }

  return PNG_SIGNATURE.every((byte, index) => bytes[offset + index] === byte);
}

/** Reads the PNG IHDR chunk's width/height (big-endian, per the PNG spec), assuming a signature was already confirmed at `offset`. */
function readPngDimensions(bytes: Uint8Array, offset: number): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, bytes.byteLength - offset);
  return {
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

/**
 * Independently re-parses raw ICO bytes from scratch — it never trusts
 * `createIco()`'s own internal state (directive §31). Structural only: it
 * does not know or enforce which sizes a caller *should* have requested
 * (16/32/48 for FileSetGo's favicon.ico is a product-layer concern, not a
 * generic ICO-format concern) — see `resources/js/logo-pack/`.
 */
export function validateIcoContainer(bytes: Uint8Array): IcoValidationResult {
  if (bytes.byteLength < ICO_HEADER_SIZE) {
    return invalid('ICO data is too short for a header.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const reserved = view.getUint16(0, true);
  const type = view.getUint16(2, true);
  const count = view.getUint16(4, true);

  if (reserved !== 0) {
    return invalid('ICO reserved field must be 0.');
  }

  if (type !== 1) {
    return invalid('ICO type field must be 1 (icon).');
  }

  if (count === 0) {
    return invalid('ICO must contain at least one entry.');
  }

  const dirSize = ICO_DIR_ENTRY_SIZE * count;

  if (bytes.byteLength < ICO_HEADER_SIZE + dirSize) {
    return invalid('ICO directory is truncated.');
  }

  const entries: IcoValidatedEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    const entryOffset = ICO_HEADER_SIZE + index * ICO_DIR_ENTRY_SIZE;
    const width = fromDirectoryDimension(view.getUint8(entryOffset));
    const height = fromDirectoryDimension(view.getUint8(entryOffset + 1));
    const byteLength = view.getUint32(entryOffset + 8, true);
    const imageOffset = view.getUint32(entryOffset + 12, true);

    if (byteLength === 0) {
      return invalid(`Entry ${index}: zero-length payload.`);
    }

    if (imageOffset < ICO_HEADER_SIZE + dirSize || imageOffset + byteLength > bytes.byteLength) {
      return invalid(`Entry ${index}: payload is out of bounds.`);
    }

    if (!hasPngSignature(bytes, imageOffset)) {
      return invalid(`Entry ${index}: payload does not begin with a valid PNG signature.`);
    }

    const pngDimensions = readPngDimensions(bytes, imageOffset);

    if (pngDimensions.width !== width || pngDimensions.height !== height) {
      return invalid(
        `Entry ${index}: directory dimensions (${width}x${height}) do not match embedded PNG dimensions (${pngDimensions.width}x${pngDimensions.height}).`,
      );
    }

    entries.push({ width, height, byteLength });
  }

  return { valid: true, entries };
}
