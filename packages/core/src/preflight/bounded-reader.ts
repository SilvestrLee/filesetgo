import type { ImageSource } from './contracts';
import { corruptImage } from './errors';

const DEFAULT_READ_CHUNK_BYTES = 64 * 1024;

export const MAX_JPEG_HEADER_BYTES = 1024 * 1024;
export const MAX_JPEG_SEGMENTS = 1024;

export async function readSourceSlice(
  source: ImageSource,
  start: number,
  end: number,
): Promise<Uint8Array> {
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    end < start ||
    end > source.size
  ) {
    throw corruptImage('The image header is truncated or has invalid bounds.');
  }

  let buffer: ArrayBuffer;

  try {
    buffer = await source.slice(start, end).arrayBuffer();
  } catch {
    throw corruptImage('The image header could not be read.');
  }

  if (buffer.byteLength !== end - start) {
    throw corruptImage('The image header is truncated.');
  }

  return new Uint8Array(buffer);
}

export class BoundedPrefixReader {
  private bytes = new Uint8Array(0);

  public constructor(
    private readonly source: ImageSource,
    private readonly maximumBytes: number,
  ) {}

  public async read(requiredLength: number): Promise<Uint8Array> {
    if (!Number.isSafeInteger(requiredLength) || requiredLength < 0) {
      throw corruptImage('The image parser requested invalid header bounds.');
    }

    if (requiredLength > this.maximumBytes) {
      throw corruptImage('The image header exceeds the bounded scan limit.', {
        maximumHeaderBytes: this.maximumBytes,
      });
    }

    if (requiredLength > this.source.size) {
      throw corruptImage('The image header is truncated.');
    }

    if (requiredLength <= this.bytes.byteLength) {
      return this.bytes;
    }

    const targetLength = Math.min(
      this.source.size,
      this.maximumBytes,
      Math.max(requiredLength, this.bytes.byteLength + DEFAULT_READ_CHUNK_BYTES),
    );
    const nextChunk = await readSourceSlice(
      this.source,
      this.bytes.byteLength,
      targetLength,
    );
    const extendedBytes = new Uint8Array(targetLength);
    extendedBytes.set(this.bytes);
    extendedBytes.set(nextChunk, this.bytes.byteLength);
    this.bytes = extendedBytes;

    return this.bytes;
  }
}
