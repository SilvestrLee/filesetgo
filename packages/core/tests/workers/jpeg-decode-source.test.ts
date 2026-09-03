import { describe, expect, it } from 'vitest';

import { preflightImage } from '../../src/preflight/preflight-image';
import { createOrientationNeutralJpeg } from '../../src/workers/jpeg-decode-source';
import { createJpeg } from '../preflight/fixtures';

describe('createOrientationNeutralJpeg', () => {
  it.each([1, 3, 6, 8] as const)(
    'removes EXIF orientation %i before browser decode',
    async (orientation) => {
      const bytes = Uint8Array.from(createJpeg(120, 80, orientation));
      const source = new Blob([bytes], {
        type: 'image/jpeg',
      });

      const neutral = await createOrientationNeutralJpeg(source);
      const outcome = await preflightImage(neutral);

      expect(neutral.size).toBeLessThan(source.size);
      expect(outcome).toMatchObject({
        status: 'ready',
        result: {
          format: 'jpeg',
          width: 120,
          height: 80,
        },
      });

      if (outcome.status === 'ready') {
        expect('orientation' in outcome.result).toBe(false);
      }
    },
  );

  it('reuses a JPEG without EXIF rather than creating another blob', async () => {
    const source = new Blob([Uint8Array.from(createJpeg(120, 80))], {
      type: 'image/jpeg',
    });

    const neutral = await createOrientationNeutralJpeg(source);

    expect(neutral).toBe(source);
  });
});
