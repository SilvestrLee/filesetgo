import type { OutputImageFormat } from '@filesetgo/core';

const EXTENSION_BY_FORMAT: Record<OutputImageFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
};

/**
 * Builds a safe, local-only download filename such as `logo-filesetgo.webp`.
 * Never sent anywhere — used only for the local `download` attribute.
 */
export function buildOutputFilename(originalName: string, outputFormat: OutputImageFormat): string {
  const trimmed = originalName.trim();
  const withoutExtension = trimmed.replace(/\.[^./\\]+$/, '');
  const base = withoutExtension.length > 0 ? withoutExtension : 'file';

  return `${base}-filesetgo.${EXTENSION_BY_FORMAT[outputFormat]}`;
}
