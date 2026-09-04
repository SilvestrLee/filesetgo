import { describe, expect, it } from 'vitest';

import type { FileSetGoPreset } from '../contracts';
import { validateCatalog, validatePreset } from '../validate-preset';

function validPreset(overrides: Partial<FileSetGoPreset> = {}): FileSetGoPreset {
  return {
    id: 'test.preset',
    revision: 1,
    category: 'website',
    title: 'Test preset',
    description: 'A preset used only in tests.',
    rationale: 'Because tests need one.',
    requirements: {
      targetBytes: 200_000,
      maxWidth: 1000,
      maxHeight: 1000,
      outputFormat: 'webp',
      dimensionPolicy: 'flexible',
    },
    provenance: { kind: 'filesetgo-recommended' },
    ...overrides,
  };
}

describe('validatePreset', () => {
  it('accepts a well-formed preset', () => {
    expect(validatePreset(validPreset())).toEqual([]);
  });

  it('rejects an empty id', () => {
    const issues = validatePreset(validPreset({ id: '' }));
    expect(issues.some((issue) => issue.message.includes('id must not be empty'))).toBe(true);
  });

  it('rejects revision < 1', () => {
    const issues = validatePreset(validPreset({ revision: 0 }));
    expect(issues.some((issue) => issue.message.includes('revision'))).toBe(true);
  });

  it('rejects a non-integer revision', () => {
    const issues = validatePreset(validPreset({ revision: 1.5 }));
    expect(issues.some((issue) => issue.message.includes('revision'))).toBe(true);
  });

  it('rejects a missing title', () => {
    const issues = validatePreset(validPreset({ title: '' }));
    expect(issues.some((issue) => issue.message.includes('title'))).toBe(true);
  });

  it('rejects a missing description', () => {
    const issues = validatePreset(validPreset({ description: '' }));
    expect(issues.some((issue) => issue.message.includes('description'))).toBe(true);
  });

  it('rejects HEIC as an output format', () => {
    const preset = validPreset();
    // @ts-expect-error deliberately invalid for this test
    preset.requirements.outputFormat = 'heic';
    const issues = validatePreset(preset);
    expect(issues.some((issue) => issue.message.includes('outputFormat'))).toBe(true);
  });

  it('rejects an unsupported output format', () => {
    const preset = validPreset();
    // @ts-expect-error deliberately invalid for this test
    preset.requirements.outputFormat = 'gif';
    const issues = validatePreset(preset);
    expect(issues.some((issue) => issue.message.includes('outputFormat'))).toBe(true);
  });

  it('rejects an out-of-range targetBytes', () => {
    const issues = validatePreset(validPreset({
      requirements: { ...validPreset().requirements, targetBytes: 1 },
    }));
    expect(issues.some((issue) => issue.message.includes('targetBytes'))).toBe(true);
  });

  it('rejects a zero maxWidth', () => {
    const issues = validatePreset(validPreset({
      requirements: { ...validPreset().requirements, maxWidth: 0 },
    }));
    expect(issues.some((issue) => issue.message.includes('maxWidth'))).toBe(true);
  });

  it('rejects a negative maxHeight', () => {
    const issues = validatePreset(validPreset({
      requirements: { ...validPreset().requirements, maxHeight: -10 },
    }));
    expect(issues.some((issue) => issue.message.includes('maxHeight'))).toBe(true);
  });

  it('rejects dimensions that exceed the core decoded-pixel safety limit', () => {
    const issues = validatePreset(validPreset({
      requirements: { ...validPreset().requirements, maxWidth: 10_000, maxHeight: 10_000 },
    }));
    expect(issues.some((issue) => issue.message.includes('safety limit'))).toBe(true);
  });

  it('rejects an invalid dimensionPolicy', () => {
    const preset = validPreset();
    // @ts-expect-error deliberately invalid for this test
    preset.requirements.dimensionPolicy = 'sometimes';
    const issues = validatePreset(preset);
    expect(issues.some((issue) => issue.message.includes('dimensionPolicy'))).toBe(true);
  });

  it('rejects an invalid provenance.kind', () => {
    const preset = validPreset();
    // @ts-expect-error deliberately invalid for this test
    preset.provenance.kind = 'made-up';
    const issues = validatePreset(preset);
    expect(issues.some((issue) => issue.message.includes('provenance.kind'))).toBe(true);
  });

  it('requires sourceUrl for external provenance', () => {
    const issues = validatePreset(validPreset({
      provenance: { kind: 'external', verifiedAt: '2026-01-01' },
    }));
    expect(issues.some((issue) => issue.message.includes('sourceUrl'))).toBe(true);
  });

  it('requires verifiedAt for external provenance', () => {
    const issues = validatePreset(validPreset({
      provenance: { kind: 'external', sourceUrl: 'https://example.com/specs' },
    }));
    expect(issues.some((issue) => issue.message.includes('verifiedAt'))).toBe(true);
  });

  it('accepts a well-formed external provenance', () => {
    const issues = validatePreset(validPreset({
      provenance: {
        kind: 'external',
        sourceUrl: 'https://example.com/specs',
        verifiedAt: '2026-01-01',
        reviewAfter: '2026-07-01',
      },
    }));
    expect(issues).toEqual([]);
  });
});

describe('validateCatalog', () => {
  it('flags a duplicate id across the catalog', () => {
    const issues = validateCatalog([validPreset(), validPreset()]);
    expect(issues.some((issue) => issue.message.includes('duplicate preset id'))).toBe(true);
  });

  it('accepts a catalog of distinct, well-formed presets', () => {
    const issues = validateCatalog([
      validPreset({ id: 'a' }),
      validPreset({ id: 'b' }),
    ]);
    expect(issues).toEqual([]);
  });
});
