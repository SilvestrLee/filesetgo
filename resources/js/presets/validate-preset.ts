import {
  DEFAULT_SAFETY_LIMITS,
  MAX_TARGET_BYTES,
  MIN_TARGET_BYTES,
  OUTPUT_IMAGE_MIME_TYPES,
} from '@filesetgo/core';

import type { FileSetGoPreset } from './contracts';

export interface PresetValidationIssue {
  presetId: string;
  message: string;
}

/**
 * Validates one preset in isolation (FSG-004 directive §13). Deterministic
 * and side-effect-free — the registry runs this against the whole catalog
 * at module load and fails fast rather than silently accepting malformed
 * data.
 */
export function validatePreset(preset: FileSetGoPreset): PresetValidationIssue[] {
  const presetId = preset.id ?? '(missing id)';
  const messages: string[] = [];

  if (preset.id === undefined || preset.id.trim().length === 0) {
    messages.push('id must not be empty.');
  }

  if (!Number.isInteger(preset.revision) || preset.revision < 1) {
    messages.push('revision must be an integer of at least 1.');
  }

  if (preset.title === undefined || preset.title.trim().length === 0) {
    messages.push('title must not be empty.');
  }

  if (preset.description === undefined || preset.description.trim().length === 0) {
    messages.push('description must not be empty.');
  }

  const req = preset.requirements;

  if ((req.outputFormat as string) === 'heic' || !(req.outputFormat in OUTPUT_IMAGE_MIME_TYPES)) {
    messages.push('requirements.outputFormat must be jpeg, png, or webp (never heic).');
  }

  if (req.targetBytes !== undefined) {
    if (
      !Number.isFinite(req.targetBytes) ||
      req.targetBytes < MIN_TARGET_BYTES ||
      req.targetBytes > MAX_TARGET_BYTES
    ) {
      messages.push(`requirements.targetBytes must be between ${MIN_TARGET_BYTES} and ${MAX_TARGET_BYTES}.`);
    }
  }

  for (const [name, value] of [
    ['maxWidth', req.maxWidth],
    ['maxHeight', req.maxHeight],
  ] as const) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
      messages.push(`requirements.${name} must be a positive integer.`);
    }
  }

  if (
    req.maxWidth !== undefined &&
    req.maxHeight !== undefined &&
    req.maxWidth * req.maxHeight > DEFAULT_SAFETY_LIMITS.maxDecodedPixels
  ) {
    messages.push('requirements.maxWidth × requirements.maxHeight exceeds the core decoded-pixel safety limit.');
  }

  if (req.dimensionPolicy !== 'hard' && req.dimensionPolicy !== 'flexible') {
    messages.push('requirements.dimensionPolicy must be "hard" or "flexible".');
  }

  const provenance = preset.provenance;

  if (provenance.kind !== 'filesetgo-recommended' && provenance.kind !== 'external') {
    messages.push('provenance.kind must be "filesetgo-recommended" or "external".');
  }

  if (provenance.kind === 'external') {
    if (provenance.sourceUrl === undefined || provenance.sourceUrl.trim().length === 0) {
      messages.push('external provenance requires sourceUrl.');
    }

    if (provenance.verifiedAt === undefined || provenance.verifiedAt.trim().length === 0) {
      messages.push('external provenance requires verifiedAt.');
    }
  }

  return messages.map((message) => ({ presetId, message }));
}

/** Validates a whole catalog: every preset individually, plus catalog-wide uniqueness. */
export function validateCatalog(presets: readonly FileSetGoPreset[]): PresetValidationIssue[] {
  const issues: PresetValidationIssue[] = [];
  const seenIds = new Set<string>();

  for (const preset of presets) {
    issues.push(...validatePreset(preset));

    if (preset.id !== undefined && seenIds.has(preset.id)) {
      issues.push({ presetId: preset.id, message: 'duplicate preset id.' });
    }

    seenIds.add(preset.id);
  }

  return issues;
}
