import type { DimensionPolicy, OutputImageFormat } from '@filesetgo/core';

/**
 * `filesetgo-recommended` presets are FileSetGo's own general-purpose
 * recommendations (FSG-004 directive §4/§11) — never described as an
 * official third-party/platform requirement. `external` is reserved for a
 * future sourced-requirement preset (e.g. an actual platform's documented
 * upload limits); none ship in FSG-004, but the contract exists now so a
 * later preset can't be added without provenance.
 */
export type PresetProvenanceKind = 'filesetgo-recommended' | 'external';

export interface PresetProvenance {
  kind: PresetProvenanceKind;
  /** Required when kind is 'external'. */
  sourceUrl?: string;
  /** Required when kind is 'external'. ISO 8601 date the source was last verified. */
  verifiedAt?: string;
  /** Optional. ISO 8601 date after which the sourced value should be re-verified. */
  reviewAfter?: string;
}

export interface PresetRequirements {
  targetBytes?: number;
  maxWidth?: number;
  maxHeight?: number;
  outputFormat: OutputImageFormat;
  dimensionPolicy: DimensionPolicy;
}

export interface FileSetGoPreset {
  /** Stable machine identifier, e.g. "web.hero". Never derived from the title. */
  id: string;
  /** Explicit revision, starting at 1. Bump when a preset's requirements change. */
  revision: number;
  category: string;
  title: string;
  description: string;
  /** Short "why this recommendation" explanation (directive §35). */
  rationale: string;
  requirements: PresetRequirements;
  provenance: PresetProvenance;
}
