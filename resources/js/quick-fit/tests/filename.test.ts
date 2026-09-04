import { describe, expect, it } from 'vitest';

import { buildOutputFilename } from '../filename';

describe('buildOutputFilename', () => {
  it('replaces the extension and appends -filesetgo', () => {
    expect(buildOutputFilename('holiday-photo.jpeg', 'webp')).toBe('holiday-photo-filesetgo.webp');
  });

  it('maps jpeg output to a .jpg extension', () => {
    expect(buildOutputFilename('logo.png', 'jpeg')).toBe('logo-filesetgo.jpg');
  });

  it('preserves multi-dot basenames, only stripping the final extension', () => {
    expect(buildOutputFilename('archive.v2.final.png', 'webp')).toBe('archive.v2.final-filesetgo.webp');
  });

  it('falls back to "file" for a name with no usable basename', () => {
    expect(buildOutputFilename('.jpg', 'png')).toBe('file-filesetgo.png');
    expect(buildOutputFilename('', 'png')).toBe('file-filesetgo.png');
  });

  it('trims surrounding whitespace from odd filenames', () => {
    expect(buildOutputFilename('  spaced-name.png  ', 'webp')).toBe('spaced-name-filesetgo.webp');
  });

  it('handles a name with no extension at all', () => {
    expect(buildOutputFilename('IMG_1234', 'jpeg')).toBe('IMG_1234-filesetgo.jpg');
  });
});
