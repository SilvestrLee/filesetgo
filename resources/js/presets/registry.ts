import { PRESET_CATALOG } from './catalog';
import type { FileSetGoPreset } from './contracts';
import { validateCatalog } from './validate-preset';

const catalogIssues = validateCatalog(PRESET_CATALOG);

if (catalogIssues.length > 0) {
  const details = catalogIssues.map((issue) => `${issue.presetId}: ${issue.message}`).join('; ');

  throw new Error(`Invalid FileSetGo preset catalog: ${details}`);
}

/** The one authoritative preset registry (FSG-004 directive §14). Do not scatter preset arrays elsewhere. */
export function getAllPresets(): readonly FileSetGoPreset[] {
  return PRESET_CATALOG;
}

export function getPresetsByCategory(category: string): readonly FileSetGoPreset[] {
  return PRESET_CATALOG.filter((preset) => preset.category === category);
}

/** Returns undefined for an unknown id rather than throwing — for call sites that need to check first. */
export function tryGetPresetById(id: string): FileSetGoPreset | undefined {
  return PRESET_CATALOG.find((preset) => preset.id === id);
}

/** Throws for an unknown id — fails cleanly rather than silently falling back to another preset (directive §14). */
export function getPresetById(id: string): FileSetGoPreset {
  const preset = tryGetPresetById(id);

  if (preset === undefined) {
    throw new Error(`Unknown FileSetGo preset id: ${id}`);
  }

  return preset;
}
