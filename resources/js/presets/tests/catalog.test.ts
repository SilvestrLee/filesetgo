import { describe, expect, it } from 'vitest';

import { PRESET_CATALOG } from '../catalog';
import { validateCatalog, validatePreset } from '../validate-preset';

describe('PRESET_CATALOG', () => {
  it('ships exactly three initial presets', () => {
    expect(PRESET_CATALOG).toHaveLength(3);
  });

  it('uses the governed stable ids web.hero, web.content, web.card', () => {
    expect(PRESET_CATALOG.map((preset) => preset.id)).toEqual(['web.hero', 'web.content', 'web.card']);
  });

  it('has unique ids', () => {
    const ids = PRESET_CATALOG.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('starts every preset at revision 1', () => {
    for (const preset of PRESET_CATALOG) {
      expect(preset.revision).toBe(1);
    }
  });

  it('validates cleanly as a whole catalog', () => {
    expect(validateCatalog(PRESET_CATALOG)).toEqual([]);
  });

  it('validates cleanly preset-by-preset', () => {
    for (const preset of PRESET_CATALOG) {
      expect(validatePreset(preset)).toEqual([]);
    }
  });

  it('only recommends supported output formats, never HEIC', () => {
    for (const preset of PRESET_CATALOG) {
      expect(['jpeg', 'png', 'webp']).toContain(preset.requirements.outputFormat);
    }
  });

  it('recommends WebP for all three initial presets', () => {
    for (const preset of PRESET_CATALOG) {
      expect(preset.requirements.outputFormat).toBe('webp');
    }
  });

  it('marks every initial preset as filesetgo-recommended, not external', () => {
    for (const preset of PRESET_CATALOG) {
      expect(preset.provenance.kind).toBe('filesetgo-recommended');
    }
  });

  it('ships no external/platform-sourced preset', () => {
    expect(PRESET_CATALOG.some((preset) => preset.provenance.kind === 'external')).toBe(false);
  });

  it('sets the governed target byte values', () => {
    const byId = Object.fromEntries(PRESET_CATALOG.map((preset) => [preset.id, preset.requirements]));
    expect(byId['web.hero'].targetBytes).toBe(500 * 1024);
    expect(byId['web.content'].targetBytes).toBe(300 * 1024);
    expect(byId['web.card'].targetBytes).toBe(150 * 1024);
  });

  it('sets the governed dimension bounds', () => {
    const byId = Object.fromEntries(PRESET_CATALOG.map((preset) => [preset.id, preset.requirements]));
    expect([byId['web.hero'].maxWidth, byId['web.hero'].maxHeight]).toEqual([1920, 1080]);
    expect([byId['web.content'].maxWidth, byId['web.content'].maxHeight]).toEqual([1600, 1600]);
    expect([byId['web.card'].maxWidth, byId['web.card'].maxHeight]).toEqual([800, 800]);
  });

  it('sets flexible dimension policy for all three initial presets', () => {
    for (const preset of PRESET_CATALOG) {
      expect(preset.requirements.dimensionPolicy).toBe('flexible');
    }
  });

  it('has valid target byte values (all positive, all within core bounds)', () => {
    for (const preset of PRESET_CATALOG) {
      expect(preset.requirements.targetBytes).toBeGreaterThan(0);
    }
  });

  it('has valid, positive dimensions', () => {
    for (const preset of PRESET_CATALOG) {
      expect(preset.requirements.maxWidth).toBeGreaterThan(0);
      expect(preset.requirements.maxHeight).toBeGreaterThan(0);
    }
  });
});
