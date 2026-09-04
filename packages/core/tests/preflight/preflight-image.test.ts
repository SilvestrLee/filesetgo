import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SAFETY_LIMITS,
  IMAGE_PREFLIGHT_ERROR_CODES,
  preflightImage,
  type ExifOrientation,
  type ImagePreflightOutcome,
  type ImageSource,
} from '../../src';
import {
  createHeic,
  createHeicMalformedIpma,
  createHeicMissingItemAssociation,
  createHeicMissingPitm,
  createHeicOutOfRangePropertyIndex,
  createHeicRotated,
  createHeicTooManyProperties,
  createHeicWithoutIspe,
  createHeicWithReorderedProperties,
  createImageSource,
  createJpeg,
  createJpegTruncatedAfterDimensions,
  createJpegWithMalformedExif,
  createJpegWithoutDimensions,
  createJpegWithTooManySegments,
  createPng,
  createVp8ExtendedWebp,
  createVp8LosslessWebp,
  createVp8Webp,
} from './fixtures';

function expectReady(outcome: ImagePreflightOutcome) {
  expect(outcome.status).toBe('ready');

  if (outcome.status !== 'ready') {
    throw new Error(`Expected a ready result, received ${outcome.error.code}.`);
  }

  return outcome.result;
}

function expectRejected(
  outcome: ImagePreflightOutcome,
  code: (typeof IMAGE_PREFLIGHT_ERROR_CODES)[keyof typeof IMAGE_PREFLIGHT_ERROR_CODES],
) {
  expect(outcome.status).toBe('rejected');

  if (outcome.status !== 'rejected') {
    throw new Error('Expected a rejected result.');
  }

  expect(outcome.error.code).toBe(code);
  return outcome;
}

describe('preflightImage format detection', () => {
  it('identifies a valid JPEG and reads its dimensions', async () => {
    const source = createImageSource(createJpeg(1200, 800));

    const result = expectReady(await preflightImage(source));

    expect(result).toEqual({
      format: 'jpeg',
      width: 1200,
      height: 800,
      megapixels: 0.96,
      fileSize: source.size,
      safeToDecode: true,
    });
  });

  it('identifies a valid PNG and reads its dimensions', async () => {
    const source = createImageSource(createPng(1024, 768));

    const result = expectReady(await preflightImage(source));

    expect(result.format).toBe('png');
    expect(result.width).toBe(1024);
    expect(result.height).toBe(768);
  });

  it.each([
    ['VP8', createVp8Webp(320, 240), 320, 240],
    ['VP8L', createVp8LosslessWebp(640, 360), 640, 360],
    ['VP8X', createVp8ExtendedWebp(1920, 1080), 1920, 1080],
  ])(
    'identifies a valid %s WebP and reads its dimensions',
    async (_, bytes, width, height) => {
      const result = expectReady(await preflightImage(createImageSource(bytes)));

      expect(result.format).toBe('webp');
      expect(result.width).toBe(width);
      expect(result.height).toBe(height);
      expect(result.animated).toBe(false);
    },
  );

  it('uses binary content instead of a misleading extension or MIME hint', async () => {
    const source = createImageSource(createJpeg(640, 480), undefined, 'logo.png');

    const result = expectReady(await preflightImage(source));

    expect(result.format).toBe('jpeg');
  });

  it('rejects random bytes as an unsupported format', async () => {
    const outcome = await preflightImage(
      createImageSource(Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.UnsupportedFormat);
  });

  it('rejects a recognizable PNG prefix with an invalid signature', async () => {
    const bytes = createPng(32, 32);
    bytes[7] = 0;

    const outcome = await preflightImage(createImageSource(bytes));

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.InvalidSignature);
  });
});

describe('preflightImage source file-size limits', () => {
  it('centralizes the default source and decoded-pixel limits', () => {
    expect(DEFAULT_SAFETY_LIMITS).toEqual({
      maxInputBytes: 15 * 1024 * 1024,
      maxDecodedPixels: 24_000_000,
    });
  });

  it('accepts a source below 15 MB without reading the full source', async () => {
    const source = createImageSource(
      createPng(100, 100),
      DEFAULT_SAFETY_LIMITS.maxInputBytes - 1,
    );

    expectReady(await preflightImage(source));
    expect(Math.max(...source.sliceEnds)).toBe(33);
  });

  it('accepts a source exactly at 15 MB', async () => {
    const source = createImageSource(
      createPng(100, 100),
      DEFAULT_SAFETY_LIMITS.maxInputBytes,
    );

    const result = expectReady(await preflightImage(source));

    expect(result.fileSize).toBe(15 * 1024 * 1024);
  });

  it('rejects a source above 15 MB before reading bytes', async () => {
    let didRead = false;
    const source: ImageSource = {
      size: DEFAULT_SAFETY_LIMITS.maxInputBytes + 1,
      slice(): Blob {
        didRead = true;
        throw new Error('The oversized source must not be read.');
      },
    };

    const outcome = await preflightImage(source);

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.FileTooLarge);
    expect(didRead).toBe(false);
  });
});

describe('preflightImage decoded-pixel limits', () => {
  it.each([
    ['below', 5999, 4000, 'ready'],
    ['exactly at', 6000, 4000, 'ready'],
    ['above', 6001, 4000, 'rejected'],
  ] as const)(
    '%s the 24 MP boundary produces a %s outcome',
    async (_, width, height, expectedStatus) => {
      const outcome = await preflightImage(
        createImageSource(createPng(width, height)),
      );

      expect(outcome.status).toBe(expectedStatus);

      if (expectedStatus === 'ready') {
        const result = expectReady(outcome);
        expect(result.safeToDecode).toBe(true);

        if (width === 6000) {
          expect(result.megapixels).toBe(24);
        }
      } else {
        const rejection = expectRejected(
          outcome,
          IMAGE_PREFLIGHT_ERROR_CODES.DimensionsTooLarge,
        );
        expect(rejection.result?.safeToDecode).toBe(false);
      }
    },
  );
});

describe('preflightImage corruption handling', () => {
  it('rejects a truncated JPEG segment', async () => {
    const outcome = await preflightImage(
      createImageSource(Uint8Array.of(0xff, 0xd8, 0xff, 0xe1, 0x00, 0x20, 1, 2)),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects a JPEG truncated after its dimensions', async () => {
    const outcome = await preflightImage(
      createImageSource(createJpegTruncatedAfterDimensions()),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects a zero-length JPEG segment without looping', async () => {
    const outcome = await preflightImage(
      createImageSource(Uint8Array.of(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00)),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects JPEG headers that exceed the segment-count bound', async () => {
    const outcome = await preflightImage(
      createImageSource(createJpegWithTooManySegments()),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects malformed JPEG EXIF metadata', async () => {
    const outcome = await preflightImage(
      createImageSource(createJpegWithMalformedExif()),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects a PNG with an invalid IHDR checksum', async () => {
    const bytes = createPng(64, 64);
    bytes[32] ^= 0xff;

    const outcome = await preflightImage(createImageSource(bytes));

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects a PNG with a malformed IHDR declaration', async () => {
    const bytes = createPng(64, 64);
    bytes[11] = 12;

    const outcome = await preflightImage(createImageSource(bytes));

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects a malformed WebP container length', async () => {
    const bytes = createVp8ExtendedWebp(64, 64);
    bytes[4] = 0xff;
    bytes[5] = 0xff;

    const outcome = await preflightImage(createImageSource(bytes));

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects non-zero WebP VP8X reserved fields', async () => {
    const bytes = createVp8ExtendedWebp(64, 64);
    bytes[21] = 1;

    const outcome = await preflightImage(createImageSource(bytes));

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects a WebP VP8L header with a non-zero version', async () => {
    const bytes = createVp8LosslessWebp(64, 64);
    bytes[24] |= 0x20;

    const outcome = await preflightImage(createImageSource(bytes));

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects an image with no dimensions', async () => {
    const outcome = await preflightImage(
      createImageSource(createJpegWithoutDimensions()),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });
});

describe('preflightImage JPEG orientation', () => {
  it.each([1, 3, 6, 8] satisfies ExifOrientation[])(
    'returns EXIF orientation %i',
    async (orientation) => {
      const result = expectReady(
        await preflightImage(createImageSource(createJpeg(800, 600, orientation))),
      );

      expect(result.orientation).toBe(orientation);
    },
  );
});

describe('preflightImage HEIC/HEIF identification', () => {
  it('identifies a HEIC container, resolves the primary item, and passes preflight as ready', async () => {
    const outcome = await preflightImage(
      createImageSource(createHeic(4032, 3024)),
    );
    const result = expectReady(outcome);

    expect(result).toMatchObject({
      format: 'heic',
      width: 4032,
      height: 3024,
      safeToDecode: true,
    });
  });

  it.each(['heix', 'mif1', 'msf1', 'hevc'])(
    "identifies the '%s' HEIC-family major brand as ready",
    async (majorBrand) => {
      const outcome = await preflightImage(
        createImageSource(createHeic(320, 240, majorBrand)),
      );

      expectReady(outcome);
    },
  );

  it('does not misreport an AVIF ftyp brand as HEIC', async () => {
    const outcome = await preflightImage(
      createImageSource(createHeic(320, 240, 'avif')),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.UnsupportedFormat);
  });

  it('accepts a HEIC image exactly at the 24 MP boundary', async () => {
    const outcome = await preflightImage(createImageSource(createHeic(6000, 4000)));
    const result = expectReady(outcome);

    expect(result.megapixels).toBe(24);
  });

  it('rejects a HEIC image above the 24 MP boundary before any decoder concern', async () => {
    const outcome = await preflightImage(createImageSource(createHeic(6001, 4000)));

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.DimensionsTooLarge);
  });

  it('rejects an oversized HEIC source by byte size before reading any bytes', async () => {
    const source = createImageSource(
      createHeic(320, 240),
      DEFAULT_SAFETY_LIMITS.maxInputBytes + 1,
    );

    expectRejected(await preflightImage(source), IMAGE_PREFLIGHT_ERROR_CODES.FileTooLarge);
  });

  it('rejects a truncated HEIC ftyp box', async () => {
    const outcome = await preflightImage(
      createImageSource(Uint8Array.of(0, 0, 0, 0x0c, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65)),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.InvalidSignature);
  });

  it('rejects a HEIC container missing an ispe property on the primary item', async () => {
    const outcome = await preflightImage(
      createImageSource(createHeicWithoutIspe()),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects a HEIC container with no primary item box (pitm)', async () => {
    const outcome = await preflightImage(
      createImageSource(createHeicMissingPitm(320, 240)),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects a HEIC container whose ipma has no association for the primary item', async () => {
    const outcome = await preflightImage(
      createImageSource(createHeicMissingItemAssociation(320, 240)),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects a HEIC container whose ipma references an out-of-range property index', async () => {
    const outcome = await preflightImage(
      createImageSource(createHeicOutOfRangePropertyIndex(320, 240)),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects a HEIC container with a malformed (truncated) ipma association', async () => {
    const outcome = await preflightImage(
      createImageSource(createHeicMalformedIpma(320, 240)),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('rejects a HEIC container whose ipco has more properties than the bounded scan limit', async () => {
    const outcome = await preflightImage(
      createImageSource(createHeicTooManyProperties(320, 240)),
    );

    expectRejected(outcome, IMAGE_PREFLIGHT_ERROR_CODES.CorruptImage);
  });

  it('resolves the primary item correctly when ispe is not the first ipco property', async () => {
    const outcome = await preflightImage(
      createImageSource(createHeicWithReorderedProperties(500, 400)),
    );
    const result = expectReady(outcome);

    expect(result).toMatchObject({ width: 500, height: 400 });
  });

  it.each([
    [0, 800, 600],
    [2, 800, 600],
  ])(
    'reports unswapped dimensions for a %i-quarter-turn rotation',
    async (quarterTurns, width, height) => {
      const outcome = await preflightImage(
        createImageSource(createHeicRotated(width, height, quarterTurns)),
      );
      const result = expectReady(outcome);

      expect(result).toMatchObject({ width, height });
    },
  );

  it.each([
    [1, 800, 600, 600, 800],
    [3, 800, 600, 600, 800],
  ])(
    'swaps reported dimensions for a %i-quarter-turn (90/270) rotation',
    async (quarterTurns, width, height, expectedWidth, expectedHeight) => {
      const outcome = await preflightImage(
        createImageSource(createHeicRotated(width, height, quarterTurns)),
      );
      const result = expectReady(outcome);

      expect(result).toMatchObject({ width: expectedWidth, height: expectedHeight });
    },
  );
});

describe('preflightImage animation handling', () => {
  it('rejects animated WebP while preserving inspected metadata', async () => {
    const outcome = await preflightImage(
      createImageSource(createVp8ExtendedWebp(320, 240, true)),
    );
    const rejection = expectRejected(
      outcome,
      IMAGE_PREFLIGHT_ERROR_CODES.AnimatedImageUnsupported,
    );

    expect(rejection.result).toMatchObject({
      format: 'webp',
      width: 320,
      height: 240,
      animated: true,
      safeToDecode: false,
    });
  });
});
