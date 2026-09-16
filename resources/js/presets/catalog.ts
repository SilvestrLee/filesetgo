import { BYTES_PER_KB } from '../quick-fit/format-bytes';
import type { FileSetGoPreset } from './contracts';

/**
 * The single authoritative source for every preset's numeric requirements
 * (FSG-004 directive §12; geometry governed by FSG-007-FIT-002). Nothing
 * outside this file should hard-code 1600/900/500 KB/1200/800/300 KB/800/600
 * /150 KB — the UI renders from this catalog, the compiler reads from it,
 * and tests import it directly.
 *
 * All three presets describe an EXACT output frame (`exactDimensions: true`)
 * at a fixed, practical aspect ratio — not an aspect-preserving bounding box
 * — so a source whose aspect ratio doesn't already match requires an
 * explicit, user-approved crop (never automatic) before processing.
 * `dimensionPolicy: 'hard'` is required alongside `exactDimensions: true`:
 * the governed byte target is met by quality/format search only, never by
 * shrinking the frame.
 */
export const PRESET_CATALOG: readonly FileSetGoPreset[] = [
  {
    id: 'web.hero',
    revision: 2,
    category: 'website',
    title: 'Large website / hero image',
    description: 'Large visual areas such as website banners, hero sections and wide full-width imagery.',
    rationale: 'Keeps big, page-width imagery visually sharp while staying practical to load.',
    requirements: {
      targetBytes: 500 * BYTES_PER_KB,
      maxWidth: 1600,
      maxHeight: 900,
      outputFormat: 'webp',
      dimensionPolicy: 'hard',
      exactDimensions: true,
    },
    provenance: {
      kind: 'filesetgo-recommended',
    },
  },
  {
    id: 'web.content',
    revision: 2,
    category: 'website',
    title: 'Website content image',
    description: 'Images inside articles, pages, service sections and normal website content.',
    rationale: 'Balances image detail with practical page weight for normal website content.',
    requirements: {
      targetBytes: 300 * BYTES_PER_KB,
      maxWidth: 1200,
      maxHeight: 800,
      outputFormat: 'webp',
      dimensionPolicy: 'hard',
      exactDimensions: true,
    },
    provenance: {
      kind: 'filesetgo-recommended',
    },
  },
  {
    id: 'web.card',
    revision: 2,
    category: 'website',
    title: 'Card / thumbnail image',
    description: 'Cards, previews, grids, related-content images and smaller website components.',
    rationale: 'Keeps small, repeated images light so grids and lists stay fast.',
    requirements: {
      targetBytes: 150 * BYTES_PER_KB,
      maxWidth: 800,
      maxHeight: 600,
      outputFormat: 'webp',
      dimensionPolicy: 'hard',
      exactDimensions: true,
    },
    provenance: {
      kind: 'filesetgo-recommended',
    },
  },
];
