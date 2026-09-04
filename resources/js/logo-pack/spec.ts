import type { ImageSetOutputSpec } from '@filesetgo/core';

/**
 * The single authoritative Website Logo Pack composition (FSG-005B
 * directive §13). Every governed numeric value — header bounds, icon
 * sizes, content scale — lives here once; the UI renders from it, the
 * worker request is compiled from it, and tests import it directly.
 */

export const ICON_CONTENT_SCALE = 0.9;
export const MAX_ICON_UPSCALE_FACTOR = 4;
export const GEOMETRY_WARNING_ASPECT_RATIO = 2.5;

export const HEADER_STANDARD_BOUNDS = { maxWidth: 400, maxHeight: 120 };
export const HEADER_HIGH_DENSITY_BOUNDS = { maxWidth: 800, maxHeight: 240 };

export const ICON_CANVAS_SIZES = {
  favicon32: 32,
  appleTouchIcon: 180,
  icon192: 192,
  icon512: 512,
} as const;

export const ICO_ENTRY_SIZES = [16, 32, 48] as const;

export const LOGO_PACK_ASSET_IDS = {
  headerStandard: 'logo-header',
  headerHighDensity: 'logo-header-2x',
  favicon: 'favicon-ico',
  favicon32: 'favicon-32',
  appleTouchIcon: 'apple-touch-icon',
  icon192: 'icon-192',
  icon512: 'icon-512',
} as const;

/** Short, user-facing explanation for each public asset (FSG-005B directive §43). */
export const LOGO_PACK_ASSET_EXPLANATIONS: Record<string, string> = {
  [LOGO_PACK_ASSET_IDS.headerStandard]: 'Standard website header logo',
  [LOGO_PACK_ASSET_IDS.headerHighDensity]: 'Higher-resolution header logo',
  [LOGO_PACK_ASSET_IDS.favicon]: 'Browser favicon containing 16, 32 and 48 px sizes',
  [LOGO_PACK_ASSET_IDS.favicon32]: 'Standalone PNG favicon',
  [LOGO_PACK_ASSET_IDS.appleTouchIcon]: '180 px touch icon',
  [LOGO_PACK_ASSET_IDS.icon192]: '192 px website/app icon',
  [LOGO_PACK_ASSET_IDS.icon512]: '512 px website/app icon',
};

/**
 * The exact seven public assets, in the exact governed order (directive
 * §13/§36). `favicon.ico` is a single `'ico'` output built from three
 * independently CONTAIN-rendered entries — its 16/48 px intermediates are
 * never exposed as separate assets.
 */
export function buildLogoPackOutputSpecs(): ImageSetOutputSpec[] {
  return [
    {
      kind: 'raster',
      id: LOGO_PACK_ASSET_IDS.headerStandard,
      filename: 'logo-header.png',
      output: { format: 'png' },
      resize: { maxWidth: HEADER_STANDARD_BOUNDS.maxWidth, maxHeight: HEADER_STANDARD_BOUNDS.maxHeight },
    },
    {
      kind: 'raster',
      id: LOGO_PACK_ASSET_IDS.headerHighDensity,
      filename: 'logo-header@2x.png',
      output: { format: 'png' },
      resize: { maxWidth: HEADER_HIGH_DENSITY_BOUNDS.maxWidth, maxHeight: HEADER_HIGH_DENSITY_BOUNDS.maxHeight },
    },
    {
      kind: 'ico',
      id: LOGO_PACK_ASSET_IDS.favicon,
      filename: 'favicon.ico',
      entries: ICO_ENTRY_SIZES.map((size) => ({ size, contentScale: ICON_CONTENT_SCALE, allowUpscale: true })),
    },
    {
      kind: 'contain',
      id: LOGO_PACK_ASSET_IDS.favicon32,
      filename: 'favicon-32x32.png',
      output: { format: 'png' },
      canvas: { width: ICON_CANVAS_SIZES.favicon32, height: ICON_CANVAS_SIZES.favicon32 },
      contentScale: ICON_CONTENT_SCALE,
      allowUpscale: true,
    },
    {
      kind: 'contain',
      id: LOGO_PACK_ASSET_IDS.appleTouchIcon,
      filename: 'apple-touch-icon.png',
      output: { format: 'png' },
      canvas: { width: ICON_CANVAS_SIZES.appleTouchIcon, height: ICON_CANVAS_SIZES.appleTouchIcon },
      contentScale: ICON_CONTENT_SCALE,
      allowUpscale: true,
    },
    {
      kind: 'contain',
      id: LOGO_PACK_ASSET_IDS.icon192,
      filename: 'icon-192x192.png',
      output: { format: 'png' },
      canvas: { width: ICON_CANVAS_SIZES.icon192, height: ICON_CANVAS_SIZES.icon192 },
      contentScale: ICON_CONTENT_SCALE,
      allowUpscale: true,
    },
    {
      kind: 'contain',
      id: LOGO_PACK_ASSET_IDS.icon512,
      filename: 'icon-512x512.png',
      output: { format: 'png' },
      canvas: { width: ICON_CANVAS_SIZES.icon512, height: ICON_CANVAS_SIZES.icon512 },
      contentScale: ICON_CONTENT_SCALE,
      allowUpscale: true,
    },
  ];
}

/** `<safe-basename>-filesetgo-logo-pack.zip` (directive §14) — no path, no traversal, no source path disclosure. */
export function buildArchiveFilename(sourceFileName: string): string {
  const trimmed = sourceFileName.trim();
  const withoutExtension = trimmed.replace(/\.[^./\\]+$/, '');
  const base = withoutExtension.length > 0 ? withoutExtension : 'logo';

  return `${base}-filesetgo-logo-pack.zip`;
}
