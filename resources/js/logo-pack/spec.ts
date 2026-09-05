import type { ImageSetOutputSpec } from '@filesetgo/core';

/**
 * The single authoritative Website Logo Pack composition (FSG-005B
 * directive §13). Every governed numeric value — header bounds, icon
 * sizes, content scale — lives here once; the UI renders from it, the
 * worker request is compiled from it, and tests import it directly.
 */

/**
 * The user's explicit background choice for the header assets (FSG-005C
 * directive §5) — never inferred from source format/PNG/JPEG. `'original'`
 * means "keep the background exactly as uploaded," not "no processing" —
 * the existing governed resize/re-encode pipeline still runs.
 */
export type LogoBackgroundMode = 'transparent' | 'original';

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
 * Extracts a safe, filename-usable basename from a source filename
 * (FSG-005C directive §34): strips the final extension, then removes any
 * character that could enable path traversal or an unsafe archive entry
 * (slashes, backslashes, null bytes) rather than attempting to normalize a
 * path — this basename must never carry directory structure. Falls back to
 * `"logo"` when nothing safe remains (an empty name, an all-dots name, or a
 * name that becomes empty once unsafe characters are removed).
 */
function extractSafeBasename(sourceFileName: string): string {
  const trimmed = sourceFileName.trim();
  const withoutExtension = trimmed.replace(/\.[^./\\]+$/, '');
  const withoutUnsafeCharacters = withoutExtension.replace(/[\\/\0]/g, '');
  const sanitized = /^\.+$/.test(withoutUnsafeCharacters) ? '' : withoutUnsafeCharacters;

  return sanitized.length > 0 ? sanitized : 'logo';
}

/**
 * The mode-aware primary header filenames (FSG-005C directive §32/§33):
 * `{basename}-transparent.png` / `{basename}-transparent@2x.png` for
 * Transparent mode, `{basename}-original.png` / `{basename}-original@2x.png`
 * for Original mode — replacing the old fixed `logo-header.png` naming so
 * the two modes are never visually or nominally confusable.
 */
export function buildLogoPackPrimaryFilenames(
  mode: LogoBackgroundMode,
  sourceFileName: string,
): { standard: string; highDensity: string } {
  const basename = extractSafeBasename(sourceFileName);

  return {
    standard: `${basename}-${mode}.png`,
    highDensity: `${basename}-${mode}@2x.png`,
  };
}

/**
 * The exact seven public assets, in the exact governed order (directive
 * §13/§36, filenames per §32/§33). `favicon.ico` is a single `'ico'` output
 * built from three independently CONTAIN-rendered entries — its 16/48 px
 * intermediates are never exposed as separate assets.
 */
export function buildLogoPackOutputSpecs(mode: LogoBackgroundMode, sourceFileName: string): ImageSetOutputSpec[] {
  const primaryFilenames = buildLogoPackPrimaryFilenames(mode, sourceFileName);

  return [
    {
      kind: 'raster',
      id: LOGO_PACK_ASSET_IDS.headerStandard,
      filename: primaryFilenames.standard,
      output: { format: 'png' },
      resize: { maxWidth: HEADER_STANDARD_BOUNDS.maxWidth, maxHeight: HEADER_STANDARD_BOUNDS.maxHeight },
    },
    {
      kind: 'raster',
      id: LOGO_PACK_ASSET_IDS.headerHighDensity,
      filename: primaryFilenames.highDensity,
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

/**
 * `<safe-basename>-filesetgo-transparent-logo-pack.zip` /
 * `<safe-basename>-filesetgo-original-logo-pack.zip` (directive §32/§33) —
 * no path, no traversal, no source path disclosure.
 */
export function buildArchiveFilename(mode: LogoBackgroundMode, sourceFileName: string): string {
  const basename = extractSafeBasename(sourceFileName);

  return `${basename}-filesetgo-${mode}-logo-pack.zip`;
}
