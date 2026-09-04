import { describe, expect, it } from 'vitest';

import { MAX_TARGET_BYTES } from '@filesetgo/core';

import type { QuickFitFormInput } from '../validate-form';
import { readQuickFitForm } from '../validate-form';

function input(overrides: Partial<QuickFitFormInput> = {}): QuickFitFormInput {
  return {
    sourceFormat: 'jpeg',
    targetSizeValue: '',
    targetSizeUnit: 'KB',
    maxWidth: '',
    maxHeight: '',
    outputChoice: 'webp',
    allowDimensionReduction: true,
    ...overrides,
  };
}

describe('readQuickFitForm', () => {
  it('accepts a plain format-conversion request with no target or dimensions', () => {
    const result = readQuickFitForm(input());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.requirements.targetBytes).toBeUndefined();
      expect(result.requirements.outputChoice).toBe('webp');
    }
  });

  it('converts a KB target size into bytes', () => {
    const result = readQuickFitForm(input({ targetSizeValue: '200', targetSizeUnit: 'KB' }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.requirements.targetBytes).toBe(200 * 1024);
    }
  });

  it('rejects a non-numeric target size', () => {
    const result = readQuickFitForm(input({ targetSizeValue: 'abc' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.targetSize).toBeDefined();
    }
  });

  it('rejects a target size below the core minimum', () => {
    const result = readQuickFitForm(input({ targetSizeValue: '0.1', targetSizeUnit: 'KB' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.targetSize).toMatch(/at least/);
    }
  });

  it('rejects a target size above the core maximum', () => {
    const result = readQuickFitForm(input({ targetSizeValue: String(MAX_TARGET_BYTES + 1), targetSizeUnit: 'KB' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.targetSize).toMatch(/or less/);
    }
  });

  it('rejects a non-numeric max width', () => {
    const result = readQuickFitForm(input({ maxWidth: 'wide', outputChoice: 'original' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.maxWidth).toBeDefined();
    }
  });

  it('rejects a zero or negative max height', () => {
    const result = readQuickFitForm(input({ maxHeight: '0', outputChoice: 'original' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.maxHeight).toBeDefined();
    }
  });

  it('accepts a valid positive integer max width and height', () => {
    const result = readQuickFitForm(input({ maxWidth: '1200', maxHeight: '800', outputChoice: 'original' }));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.requirements.maxWidth).toBe(1200);
      expect(result.requirements.maxHeight).toBe(800);
    }
  });

  it('rejects a no-op request (keep original, no target, no dimensions)', () => {
    const result = readQuickFitForm(input({ outputChoice: 'original' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.general).toMatch(/at least one requirement/i);
    }
  });

  it('maps the dimension-reduction toggle to the flexible/hard dimension policy', () => {
    const flexible = readQuickFitForm(input({ maxWidth: '800', outputChoice: 'original', allowDimensionReduction: true }));
    const hard = readQuickFitForm(input({ maxWidth: '800', outputChoice: 'original', allowDimensionReduction: false }));

    expect(flexible.ok && flexible.requirements.dimensionPolicy).toBe('flexible');
    expect(hard.ok && hard.requirements.dimensionPolicy).toBe('hard');
  });
});
