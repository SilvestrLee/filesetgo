import { describe, expect, it } from 'vitest';

import type { ProcessImageSetOptions, RasterImageSetOutputSpec } from '../../src/processing/image-set-contracts';
import { MAX_PACKAGE_ASSETS } from '../../src/processing/image-set-limits';
import { validateProcessImageSetOptions } from '../../src/processing/validate-image-set-request';

function output(overrides: Partial<RasterImageSetOutputSpec> = {}): RasterImageSetOutputSpec {
  return {
    kind: 'raster',
    id: 'a',
    filename: 'a.webp',
    output: { format: 'webp' },
    ...overrides,
  };
}

function options(overrides: Partial<ProcessImageSetOptions> = {}): ProcessImageSetOptions {
  return {
    outputs: [output()],
    ...overrides,
  };
}

describe('validateProcessImageSetOptions', () => {
  it('accepts a single valid output', () => {
    expect(validateProcessImageSetOptions(options()).error).toBeUndefined();
  });

  it('accepts a valid request with an archive', () => {
    const result = validateProcessImageSetOptions(
      options({ archive: { filename: 'package.zip' } }),
    );
    expect(result.error).toBeUndefined();
  });

  it('rejects an empty outputs array', () => {
    const result = validateProcessImageSetOptions(options({ outputs: [] }));
    expect(result.error?.message).toMatch(/at least one output/i);
  });

  it('accepts exactly MAX_PACKAGE_ASSETS outputs', () => {
    const outputs = Array.from({ length: MAX_PACKAGE_ASSETS }, (_, index) =>
      output({ id: `a${index}`, filename: `a${index}.webp` }));
    expect(validateProcessImageSetOptions(options({ outputs })).error).toBeUndefined();
  });

  it('rejects MAX_PACKAGE_ASSETS + 1 outputs', () => {
    const outputs = Array.from({ length: MAX_PACKAGE_ASSETS + 1 }, (_, index) =>
      output({ id: `a${index}`, filename: `a${index}.webp` }));
    const result = validateProcessImageSetOptions(options({ outputs }));
    expect(result.error?.code).toBe('TOO_MANY_PACKAGE_ASSETS');
  });

  it('rejects an empty output id', () => {
    const result = validateProcessImageSetOptions(options({ outputs: [output({ id: '' })] }));
    expect(result.error?.message).toMatch(/non-empty id/i);
  });

  it('rejects an empty output filename', () => {
    const result = validateProcessImageSetOptions(options({ outputs: [output({ filename: '' })] }));
    expect(result.error?.message).toMatch(/non-empty filename/i);
  });

  it('rejects HEIC as an output format', () => {
    const result = validateProcessImageSetOptions(
      options({ outputs: [output({ output: { format: 'heic' as never } })] }),
    );
    expect(result.error).toBeDefined();
  });

  it('rejects PNG output carrying a quality value', () => {
    const result = validateProcessImageSetOptions(
      options({ outputs: [output({ output: { format: 'png', quality: 0.5 } })] }),
    );
    expect(result.error).toBeDefined();
  });

  it('rejects an out-of-range quality value', () => {
    const result = validateProcessImageSetOptions(
      options({ outputs: [output({ output: { format: 'jpeg', quality: 1.5 } })] }),
    );
    expect(result.error).toBeDefined();
  });

  it('rejects resize with neither maxWidth nor maxHeight', () => {
    const result = validateProcessImageSetOptions(
      options({ outputs: [output({ resize: {} })] }),
    );
    expect(result.error).toBeDefined();
  });

  it('rejects a zero maxWidth', () => {
    const result = validateProcessImageSetOptions(
      options({ outputs: [output({ resize: { maxWidth: 0 } })] }),
    );
    expect(result.error).toBeDefined();
  });

  it('rejects duplicate output ids', () => {
    const result = validateProcessImageSetOptions(
      options({ outputs: [output({ id: 'a', filename: 'a.webp' }), output({ id: 'a', filename: 'b.webp' })] }),
    );
    expect(result.error?.code).toBe('DUPLICATE_ASSET_ID');
  });

  it('rejects duplicate output filenames', () => {
    const result = validateProcessImageSetOptions(
      options({ outputs: [output({ id: 'a', filename: 'same.webp' }), output({ id: 'b', filename: 'same.webp' })] }),
    );
    expect(result.error?.code).toBe('DUPLICATE_FILENAME');
  });

  it('rejects an unsafe output filename', () => {
    const result = validateProcessImageSetOptions(
      options({ outputs: [output({ filename: '../evil.webp' })] }),
    );
    expect(result.error?.code).toBe('UNSAFE_ARCHIVE_ENTRY');
  });

  it('rejects an archive filename not ending in .zip', () => {
    const result = validateProcessImageSetOptions(
      options({ archive: { filename: 'package.tar' } }),
    );
    expect(result.error?.code).toBe('INVALID_ARCHIVE_FILENAME');
  });

  it('rejects an unsafe archive filename', () => {
    const result = validateProcessImageSetOptions(
      options({ archive: { filename: '../package.zip' } }),
    );
    expect(result.error?.code).toBe('INVALID_ARCHIVE_FILENAME');
  });

  it('checks duplicate ids/filenames before the archive filename', () => {
    // Cheap validation should catch the duplicate before ever considering the archive.
    const result = validateProcessImageSetOptions(
      options({
        outputs: [output({ id: 'a', filename: 'same.webp' }), output({ id: 'a', filename: 'same.webp' })],
        archive: { filename: 'package.zip' },
      }),
    );
    expect(result.error?.code).toBe('DUPLICATE_ASSET_ID');
  });
});
