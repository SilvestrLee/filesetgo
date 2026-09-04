import { describe, expect, it } from 'vitest';

import { getAllPresets, getPresetById, getPresetsByCategory, tryGetPresetById } from '../registry';

describe('getAllPresets', () => {
  it('returns all three initial presets', () => {
    expect(getAllPresets().map((preset) => preset.id)).toEqual(['web.hero', 'web.content', 'web.card']);
  });
});

describe('getPresetById', () => {
  it('returns the matching preset', () => {
    expect(getPresetById('web.content').title).toBe('Website content image');
  });

  it('fails cleanly (throws) for an unknown id rather than silently falling back', () => {
    expect(() => getPresetById('web.nonexistent')).toThrow(/Unknown FileSetGo preset id/);
  });
});

describe('tryGetPresetById', () => {
  it('returns undefined for an unknown id instead of throwing', () => {
    expect(tryGetPresetById('web.nonexistent')).toBeUndefined();
  });

  it('returns the matching preset for a known id', () => {
    expect(tryGetPresetById('web.hero')?.id).toBe('web.hero');
  });
});

describe('getPresetsByCategory', () => {
  it('returns every preset in the "website" category', () => {
    expect(getPresetsByCategory('website')).toHaveLength(3);
  });

  it('returns an empty list for an unused category', () => {
    expect(getPresetsByCategory('nonexistent-category')).toEqual([]);
  });
});
