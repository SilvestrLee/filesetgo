import { BoundedPrefixReader } from '../bounded-reader';
import type { ImageSource, ParsedImageMetadata } from '../contracts';
import { corruptImage, invalidSignature } from '../errors';

// HEIC/HEIF containers are ISOBMFF (the same box-based container family as
// MP4). This parser reads only the bounded box structure required to reach
// the primary image's spatial-extents ('ispe') property:
//
//   ftyp
//   meta
//     iprp
//       ipco
//         ispe (image_width, image_height)
//
// It does not decode pixels and does not attempt full item-property
// association (ipma/pitm) resolution — the first 'ispe' box found under
// 'ipco' is treated as the primary image's dimensions. This is a documented
// simplification: most single-image HEIC files from cameras and phones
// expose exactly one 'ispe' box. Multi-image HEIC containers with an
// unrelated first property may report incorrect dimensions; full resolution
// is deferred until an approved HEIC decoder is integrated.
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

  const bytes = await reader.read(offset + 8);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const size = view.getUint32(offset);
  const type = fourCc(bytes, offset + 4);

  if (size === 0 || size === 1) {
    throw corruptImage(
      'The HEIC container uses an unsupported extended or till-EOF box size.',
    );
  }

  const end = offset + size;

  if (size < 8 || end > containerEnd) {
    throw corruptImage('The HEIC container box size is invalid.');
  }

  return { type, bodyStart: offset + 8, end };
}

async function findChildBox(
  reader: BoundedPrefixReader,
  containerStart: number,
  containerEnd: number,
  targetType: string,
): Promise<BoxHeader> {
  let offset = containerStart;
  let scanned = 0;

  while (offset < containerEnd) {
    scanned += 1;

    if (scanned > MAX_HEIC_BOXES_SCANNED) {
      throw corruptImage('The HEIC container has too many boxes.', {
        maximumBoxes: MAX_HEIC_BOXES_SCANNED,
      });
    }

    const box = await readBoxHeader(reader, offset, containerEnd);

    if (box.type === targetType) {
      return box;
    }

    offset = box.end;
  }

  throw corruptImage(
    `The HEIC container is missing a required '${targetType}' box.`,
  );
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
  // 'meta' is a FullBox: 4 header bytes (version + flags) precede its children.
  const iprp = await findChildBox(reader, meta.bodyStart + 4, meta.end, 'iprp');
  const ipco = await findChildBox(reader, iprp.bodyStart, iprp.end, 'ipco');
  const ispe = await findChildBox(reader, ipco.bodyStart, ipco.end, 'ispe');
  const dataStart = ispe.bodyStart + 4;

  if (dataStart + 8 > ispe.end) {
    throw corruptImage('The HEIC image spatial extents box is malformed.');
  }

  const bytes = await reader.read(dataStart + 8);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(dataStart);
  const height = view.getUint32(dataStart + 4);

  if (width === 0 || height === 0) {
    throw corruptImage('The HEIC image dimensions are invalid.');
  }

  return { width, height };
}
