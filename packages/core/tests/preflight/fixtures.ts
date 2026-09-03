import type { ExifOrientation, ImageSource } from '../../src';

function concatenate(...parts: readonly Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.byteLength, 0);
  const bytes = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }

  return bytes;
}

function ascii(value: string): Uint8Array {
  return Uint8Array.from([...value].map((character) => character.charCodeAt(0)));
}

function uint16BigEndian(value: number): Uint8Array {
  return Uint8Array.of((value >>> 8) & 0xff, value & 0xff);
}

function uint32BigEndian(value: number): Uint8Array {
  return Uint8Array.of(
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  );
}

function uint32LittleEndian(value: number): Uint8Array {
  return Uint8Array.of(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function uint24LittleEndian(value: number): Uint8Array {
  return Uint8Array.of(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
  );
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc ^= byte;

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function jpegSegment(marker: number, data: Uint8Array): Uint8Array {
  return concatenate(
    Uint8Array.of(0xff, marker),
    uint16BigEndian(data.byteLength + 2),
    data,
  );
}

function createExifData(orientation: ExifOrientation): Uint8Array {
  return concatenate(
    ascii('Exif'),
    Uint8Array.of(0, 0),
    ascii('II'),
    Uint8Array.of(0x2a, 0x00),
    uint32LittleEndian(8),
    Uint8Array.of(0x01, 0x00),
    Uint8Array.of(0x12, 0x01),
    Uint8Array.of(0x03, 0x00),
    uint32LittleEndian(1),
    Uint8Array.of(orientation, 0, 0, 0),
    uint32LittleEndian(0),
  );
}

export function createJpeg(
  width: number,
  height: number,
  orientation?: ExifOrientation,
): Uint8Array {
  const startOfFrame = jpegSegment(
    0xc0,
    Uint8Array.of(
      8,
      (height >>> 8) & 0xff,
      height & 0xff,
      (width >>> 8) & 0xff,
      width & 0xff,
      1,
      1,
      0x11,
      0,
    ),
  );
  const exif =
    orientation === undefined
      ? new Uint8Array(0)
      : jpegSegment(0xe1, createExifData(orientation));
  const startOfScan = jpegSegment(
    0xda,
    Uint8Array.of(1, 1, 0, 0, 63, 0),
  );

  return concatenate(
    Uint8Array.of(0xff, 0xd8),
    exif,
    startOfFrame,
    startOfScan,
    Uint8Array.of(0xff, 0xd9),
  );
}

export function createJpegWithMalformedExif(): Uint8Array {
  const invalidExif = concatenate(
    ascii('Exif'),
    Uint8Array.of(0, 0),
    ascii('ZZ'),
    new Uint8Array(12),
  );

  return concatenate(
    Uint8Array.of(0xff, 0xd8),
    jpegSegment(0xe1, invalidExif),
    createJpeg(640, 480).subarray(2),
  );
}

export function createJpegWithoutDimensions(): Uint8Array {
  return Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0xff, 0xd9);
}

export function createJpegTruncatedAfterDimensions(): Uint8Array {
  return createJpeg(640, 480).subarray(0, 15);
}

export function createJpegWithTooManySegments(): Uint8Array {
  const segments = Array.from(
    { length: 1025 },
    () => Uint8Array.of(0xff, 0xe0, 0x00, 0x02),
  );

  return concatenate(
    Uint8Array.of(0xff, 0xd8),
    ...segments,
    createJpeg(640, 480).subarray(2),
  );
}

export function createPng(width: number, height: number): Uint8Array {
  const ihdrData = concatenate(
    uint32BigEndian(width),
    uint32BigEndian(height),
    Uint8Array.of(8, 6, 0, 0, 0),
  );
  const crcInput = concatenate(ascii('IHDR'), ihdrData);

  return concatenate(
    Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    uint32BigEndian(13),
    ascii('IHDR'),
    ihdrData,
    uint32BigEndian(crc32(crcInput)),
  );
}

function createWebpChunk(type: string, data: Uint8Array): Uint8Array {
  const padding = data.byteLength % 2 === 0 ? new Uint8Array(0) : Uint8Array.of(0);

  return concatenate(
    ascii(type),
    uint32LittleEndian(data.byteLength),
    data,
    padding,
  );
}

function createWebpContainer(type: string, data: Uint8Array): Uint8Array {
  const chunk = createWebpChunk(type, data);

  return concatenate(
    ascii('RIFF'),
    uint32LittleEndian(4 + chunk.byteLength),
    ascii('WEBP'),
    chunk,
  );
}

export function createVp8Webp(width: number, height: number): Uint8Array {
  return createWebpContainer(
    'VP8 ',
    Uint8Array.of(
      0,
      0,
      0,
      0x9d,
      0x01,
      0x2a,
      width & 0xff,
      (width >>> 8) & 0x3f,
      height & 0xff,
      (height >>> 8) & 0x3f,
    ),
  );
}

export function createVp8LosslessWebp(
  width: number,
  height: number,
): Uint8Array {
  const packedDimensions = (width - 1) | ((height - 1) << 14);

  return createWebpContainer(
    'VP8L',
    concatenate(Uint8Array.of(0x2f), uint32LittleEndian(packedDimensions)),
  );
}

export function createVp8ExtendedWebp(
  width: number,
  height: number,
  animated = false,
): Uint8Array {
  return createWebpContainer(
    'VP8X',
    concatenate(
      Uint8Array.of(animated ? 0x02 : 0, 0, 0, 0),
      uint24LittleEndian(width - 1),
      uint24LittleEndian(height - 1),
    ),
  );
}

function isoBox(type: string, ...body: readonly Uint8Array[]): Uint8Array {
  const content = concatenate(...body);
  const size = 8 + content.byteLength;

  return concatenate(uint32BigEndian(size), ascii(type), content);
}

function fullBoxHeader(): Uint8Array {
  return Uint8Array.of(0, 0, 0, 0);
}

export function createHeic(
  width: number,
  height: number,
  majorBrand = 'heic',
): Uint8Array {
  const ftyp = isoBox(
    'ftyp',
    ascii(majorBrand),
    uint32BigEndian(0),
    ascii(majorBrand),
    ascii('mif1'),
  );
  const ispe = isoBox(
    'ispe',
    fullBoxHeader(),
    uint32BigEndian(width),
    uint32BigEndian(height),
  );
  const ipco = isoBox('ipco', ispe);
  const iprp = isoBox('iprp', ipco);
  const meta = isoBox('meta', fullBoxHeader(), iprp);

  return concatenate(ftyp, meta);
}

export function createHeicWithoutIspe(): Uint8Array {
  const ftyp = isoBox(
    'ftyp',
    ascii('heic'),
    uint32BigEndian(0),
    ascii('heic'),
    ascii('mif1'),
  );
  const ipco = isoBox('ipco');
  const iprp = isoBox('iprp', ipco);
  const meta = isoBox('meta', fullBoxHeader(), iprp);

  return concatenate(ftyp, meta);
}

export function createImageSource(
  bytes: Uint8Array,
  reportedSize = bytes.byteLength,
  name?: string,
): ImageSource & { readonly name?: string; readonly sliceEnds: number[] } {
  const sliceEnds: number[] = [];

  return {
    size: reportedSize,
    ...(name === undefined ? {} : { name }),
    sliceEnds,
    slice(start = 0, end = reportedSize): Blob {
      sliceEnds.push(end);
      return new Blob([bytes.slice(start, Math.min(end, bytes.byteLength))]);
    },
  };
}
