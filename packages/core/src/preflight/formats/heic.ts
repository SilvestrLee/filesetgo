import { BoundedPrefixReader } from '../bounded-reader';
import type { ImageSource, ParsedImageMetadata } from '../contracts';
import { corruptImage, invalidSignature } from '../errors';

// HEIC/HEIF containers are ISOBMFF (the same box-based container family as
// MP4). This parser reads only the bounded box structure required to
// reliably resolve the PRIMARY image item's spatial extents:
//
//   ftyp
//   meta
//     pitm               (primary item box -> primary item ID)
//     iprp
//       ipco             (item property container -> indexed property list)
//       ipma             (item property association -> item ID -> property indices)
//
// The primary item's dimensions are the 'ispe' (image spatial extents)
// property whose index is associated with the primary item ID via ipma —
// not merely the first 'ispe' box found under ipco. If the primary item's
// 'irot' (image rotation) property indicates a 90 or 270 degree rotation,
// the reported width/height are swapped to match the visually-correct
// (post-rotation) dimensions, since @discourse/heic's decode() output is
// expected to already be orientation-normalized (see workers/heic-decode.ts
// for the corresponding worker-side documentation of this assumption).
// 'imir' (mirroring) does not affect width/height and is intentionally not
// modeled — FileSetGo does not implement a general HEIF transform-matrix
// system, only the specific dimension-affecting case FSG-001C requires.
//
// If the primary item cannot be reliably resolved (missing pitm, missing
// ipma entry for the primary item, no ispe among its associated
// properties, an out-of-range property index, or an irot+imir combination
// this parser does not model), the file is rejected as corrupt/unsupported
// rather than guessing at dimensions from an arbitrary property box.
export const MAX_HEIC_HEADER_BYTES = 256 * 1024;
const MAX_HEIC_BOXES_SCANNED = 512;

interface BoxHeader {
  type: string;
  bodyStart: number;
  end: number;
}

function fourCc(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset],
    bytes[offset + 1],
    bytes[offset + 2],
    bytes[offset + 3],
  );
}

async function readBoxHeader(
  reader: BoundedPrefixReader,
  offset: number,
  containerEnd: number,
): Promise<BoxHeader> {
  if (offset + 8 > containerEnd) {
    throw corruptImage('The HEIC container is truncated.');
  }

  let bytes = await reader.read(offset + 8);
  let view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = view.getUint32(offset);
  const type = fourCc(bytes, offset + 4);
  let bodyStart = offset + 8;
  let end: number;

  if (size === 1) {
    // A 64-bit "largesize" box (ISO/IEC 14496-12 §4.2): the real 32-bit
    // size field is 1 and an 8-byte size immediately follows the type.
    // A real macOS `sips`-encoded HEIC's trailing 'mdat' box routinely uses
    // this form (it does not know its exact size upfront), so this parser
    // must be able to skip past it correctly even though it never needs to
    // look inside 'mdat' (encoded pixel data, not container/property
    // structure).
    if (offset + 16 > containerEnd) {
      throw corruptImage('The HEIC container 64-bit box size is truncated.');
    }

    bytes = await reader.read(offset + 16);
    view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const largeSize = view.getBigUint64(offset + 8);

    if (largeSize < 16n || largeSize > BigInt(containerEnd - offset)) {
      throw corruptImage('The HEIC container 64-bit box size is invalid.');
    }

    bodyStart = offset + 16;
    end = offset + Number(largeSize);
  } else if (size === 0) {
    // size === 0 means "this box extends to the end of its enclosing
    // container" (ISO/IEC 14496-12 §4.2) — also standard for a trailing
    // 'mdat' box for the same reason as the 64-bit form above.
    end = containerEnd;
  } else {
    if (size < 8) {
      throw corruptImage('The HEIC container box size is invalid.');
    }

    end = offset + size;
  }

  if (end > containerEnd) {
    throw corruptImage('The HEIC container box size is invalid.');
  }

  return { type, bodyStart, end };
}

/** Walks every direct child box in a container, in document order, bounded. */
async function walkChildBoxes(
  reader: BoundedPrefixReader,
  containerStart: number,
  containerEnd: number,
): Promise<BoxHeader[]> {
  const boxes: BoxHeader[] = [];
  let offset = containerStart;

  while (offset < containerEnd) {
    if (boxes.length >= MAX_HEIC_BOXES_SCANNED) {
      throw corruptImage('The HEIC container has too many boxes.', {
        maximumBoxes: MAX_HEIC_BOXES_SCANNED,
      });
    }

    const box = await readBoxHeader(reader, offset, containerEnd);
    boxes.push(box);
    offset = box.end;
  }

  return boxes;
}

async function findChildBox(
  reader: BoundedPrefixReader,
  containerStart: number,
  containerEnd: number,
  targetType: string,
): Promise<BoxHeader | undefined> {
  const boxes = await walkChildBoxes(reader, containerStart, containerEnd);

  return boxes.find((box) => box.type === targetType);
}

/** Reads a FullBox's 4-byte (version, flags) header at `offset`. */
async function readFullBoxHeader(
  reader: BoundedPrefixReader,
  offset: number,
): Promise<{ version: number; flags: number }> {
  const bytes = await reader.read(offset + 4);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const versionAndFlags = view.getUint32(offset);

  return {
    version: versionAndFlags >>> 24,
    flags: versionAndFlags & 0x00ffffff,
  };
}

async function readPrimaryItemId(
  reader: BoundedPrefixReader,
  pitm: BoxHeader,
): Promise<number> {
  const { version } = await readFullBoxHeader(reader, pitm.bodyStart);
  const idWidth = version === 0 ? 2 : 4;
  const dataStart = pitm.bodyStart + 4;

  if (dataStart + idWidth > pitm.end) {
    throw corruptImage('The HEIC primary item box (pitm) is malformed.');
  }

  const bytes = await reader.read(dataStart + idWidth);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return idWidth === 2 ? view.getUint16(dataStart) : view.getUint32(dataStart);
}

/** Maps item ID -> ordered list of 1-based property indices (into ipco's children). */
async function readItemPropertyAssociations(
  reader: BoundedPrefixReader,
  ipma: BoxHeader,
): Promise<Map<number, number[]>> {
  const { version, flags } = await readFullBoxHeader(reader, ipma.bodyStart);
  const itemIdWidth = version < 1 ? 2 : 4;
  const indexWidth = (flags & 1) !== 0 ? 2 : 1;
  let offset = ipma.bodyStart + 4;

  if (offset + 4 > ipma.end) {
    throw corruptImage('The HEIC item property association box (ipma) is malformed.');
  }

  let bytes = await reader.read(offset + 4);
  let view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entryCount = view.getUint32(offset);
  offset += 4;

  const associations = new Map<number, number[]>();

  for (let entry = 0; entry < entryCount; entry += 1) {
    if (offset + itemIdWidth + 1 > ipma.end) {
      throw corruptImage('The HEIC item property association entry is truncated.');
    }

    bytes = await reader.read(offset + itemIdWidth + 1);
    view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const itemId = itemIdWidth === 2 ? view.getUint16(offset) : view.getUint32(offset);
    const associationCount = bytes[offset + itemIdWidth];
    offset += itemIdWidth + 1;

    const indices: number[] = [];

    for (let association = 0; association < associationCount; association += 1) {
      if (offset + indexWidth > ipma.end) {
        throw corruptImage('The HEIC item property association entry is truncated.');
      }

      bytes = await reader.read(offset + indexWidth);
      view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const propertyIndex =
        indexWidth === 2 ? view.getUint16(offset) & 0x7fff : bytes[offset] & 0x7f;
      indices.push(propertyIndex);
      offset += indexWidth;
    }

    associations.set(itemId, indices);
  }

  return associations;
}

function parseImageSpatialExtents(
  bytes: Uint8Array,
  ispe: BoxHeader,
): { width: number; height: number } {
  const dataStart = ispe.bodyStart + 4;

  if (dataStart + 8 > ispe.end) {
    throw corruptImage('The HEIC image spatial extents (ispe) box is malformed.');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(dataStart);
  const height = view.getUint32(dataStart + 4);

  if (width === 0 || height === 0) {
    throw corruptImage('The HEIC image dimensions are invalid.');
  }

  return { width, height };
}

/** Returns the rotation angle in quarter-turns (0-3, counter-clockwise), per the 'irot' box. */
function parseImageRotation(bytes: Uint8Array, irot: BoxHeader): number {
  if (irot.bodyStart >= irot.end) {
    throw corruptImage('The HEIC image rotation (irot) box is malformed.');
  }

  const transformData = bytes[irot.bodyStart];

  if ((transformData & 0xfc) !== 0) {
    throw corruptImage('The HEIC image rotation (irot) reserved bits are invalid.');
  }

  return transformData & 0x03;
}

export async function parseHeicMetadata(
  source: ImageSource,
): Promise<ParsedImageMetadata> {
  const boundEnd = Math.min(source.size, MAX_HEIC_HEADER_BYTES);
  const reader = new BoundedPrefixReader(source, MAX_HEIC_HEADER_BYTES);
  const ftyp = await readBoxHeader(reader, 0, boundEnd);

  if (ftyp.type !== 'ftyp') {
    throw invalidSignature('The HEIC file does not start with an ftyp box.');
  }

  const meta = await findChildBox(reader, ftyp.end, boundEnd, 'meta');

  if (meta === undefined) {
    throw corruptImage("The HEIC container is missing a required 'meta' box.");
  }

  // 'meta' is a FullBox: 4 header bytes (version + flags) precede its children.
  const metaChildrenStart = meta.bodyStart + 4;
  const pitm = await findChildBox(reader, metaChildrenStart, meta.end, 'pitm');

  if (pitm === undefined) {
    throw corruptImage(
      "The HEIC container has no primary item box (pitm); this file's structure is outside the supported subset.",
    );
  }

  const iprp = await findChildBox(reader, metaChildrenStart, meta.end, 'iprp');

  if (iprp === undefined) {
    throw corruptImage("The HEIC container is missing a required 'iprp' box.");
  }

  const ipco = await findChildBox(reader, iprp.bodyStart, iprp.end, 'ipco');
  const ipma = await findChildBox(reader, iprp.bodyStart, iprp.end, 'ipma');

  if (ipco === undefined || ipma === undefined) {
    throw corruptImage("The HEIC container is missing required 'ipco'/'ipma' boxes.");
  }

  const primaryItemId = await readPrimaryItemId(reader, pitm);
  const associations = await readItemPropertyAssociations(reader, ipma);
  const primaryIndices = associations.get(primaryItemId);

  if (primaryIndices === undefined || primaryIndices.length === 0) {
    throw corruptImage(
      'The HEIC container has no item property association for the primary item.',
    );
  }

  const properties = await walkChildBoxes(reader, ipco.bodyStart, ipco.end);
  let ispe: BoxHeader | undefined;
  let irot: BoxHeader | undefined;

  for (const propertyIndex of primaryIndices) {
    // ipma indices are 1-based; 0 means "no property".
    if (propertyIndex === 0) {
      continue;
    }

    if (propertyIndex > properties.length) {
      throw corruptImage('The HEIC item property association index is out of range.', {
        propertyIndex,
        propertyCount: properties.length,
      });
    }

    const property = properties[propertyIndex - 1];

    if (property.type === 'ispe') {
      ispe = property;
    } else if (property.type === 'irot') {
      irot = property;
    }
  }

  if (ispe === undefined) {
    throw corruptImage(
      "The primary HEIC item has no associated 'ispe' (spatial extents) property.",
    );
  }

  const maxEnd = Math.max(ispe.end, irot?.end ?? 0);
  const bytes = await reader.read(maxEnd);
  const dimensions = parseImageSpatialExtents(bytes, ispe);
  const rotationQuarterTurns = irot === undefined ? 0 : parseImageRotation(bytes, irot);

  return rotationQuarterTurns === 1 || rotationQuarterTurns === 3
    ? { width: dimensions.height, height: dimensions.width }
    : dimensions;
}
