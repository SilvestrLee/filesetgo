import { describe, expect, it } from 'vitest';

import {
  buildArchiveFilename,
  buildLogoPackOutputSpecs,
  GEOMETRY_WARNING_ASPECT_RATIO,
  HEADER_HIGH_DENSITY_BOUNDS,
  HEADER_STANDARD_BOUNDS,
  ICON_CANVAS_SIZES,
  ICON_CONTENT_SCALE,
  ICO_ENTRY_SIZES,
  MAX_ICON_UPSCALE_FACTOR,
} from '../spec';

describe('buildLogoPackOutputSpecs', () => {
  const specs = buildLogoPackOutputSpecs();

  it('produces exactly seven public outputs (favicon.ico counted once)', () => {
    expect(specs).toHaveLength(7);
  });

  it('orders the outputs exactly as governed (directive §13)', () => {
    expect(specs.map((spec) => spec.filename)).toEqual([
      'logo-header.png',
      'logo-header@2x.png',
      'favicon.ico',
      'favicon-32x32.png',
      'apple-touch-icon.png',
      'icon-192x192.png',
      'icon-512x512.png',
    ]);
  });

  it('gives every output a unique id', () => {
    const ids = specs.map((spec) => spec.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every output a unique filename', () => {
    const filenames = specs.map((spec) => spec.filename);
    expect(new Set(filenames).size).toBe(filenames.length);
  });

  it('uses PNG for every raster/contain output', () => {
    for (const spec of specs) {
      if (spec.kind === 'raster' || spec.kind === 'contain') {
        expect(spec.output.format).toBe('png');
      }
    }
  });

  it('bounds the standard header to 400×120', () => {
    const header = specs.find((spec) => spec.filename === 'logo-header.png');
    expect(header?.kind).toBe('raster');
    if (header?.kind === 'raster') {
      expect(header.resize).toEqual({ maxWidth: 400, maxHeight: 120 });
    }
    expect(HEADER_STANDARD_BOUNDS).toEqual({ maxWidth: 400, maxHeight: 120 });
  });

  it('bounds the high-density header to 800×240', () => {
    const header2x = specs.find((spec) => spec.filename === 'logo-header@2x.png');
    expect(header2x?.kind).toBe('raster');
    if (header2x?.kind === 'raster') {
      expect(header2x.resize).toEqual({ maxWidth: 800, maxHeight: 240 });
    }
    expect(HEADER_HIGH_DENSITY_BOUNDS).toEqual({ maxWidth: 800, maxHeight: 240 });
  });

  it('sizes every square icon canvas exactly (32/180/192/512)', () => {
    const bySize = (size: number) => specs.find((spec) => spec.kind === 'contain' && spec.canvas.width === size);
    expect(bySize(ICON_CANVAS_SIZES.favicon32)?.filename).toBe('favicon-32x32.png');
    expect(bySize(ICON_CANVAS_SIZES.appleTouchIcon)?.filename).toBe('apple-touch-icon.png');
    expect(bySize(ICON_CANVAS_SIZES.icon192)?.filename).toBe('icon-192x192.png');
    expect(bySize(ICON_CANVAS_SIZES.icon512)?.filename).toBe('icon-512x512.png');
  });

  it('uses square (equal width/height) canvases for every contain output', () => {
    for (const spec of specs) {
      if (spec.kind === 'contain') {
        expect(spec.canvas.width).toBe(spec.canvas.height);
      }
    }
  });

  it('applies the governed 90% content scale to every contain/ico output', () => {
    for (const spec of specs) {
      if (spec.kind === 'contain') {
        expect(spec.contentScale).toBe(ICON_CONTENT_SCALE);
      }

      if (spec.kind === 'ico') {
        for (const entry of spec.entries) {
          expect(entry.contentScale).toBe(ICON_CONTENT_SCALE);
        }
      }
    }

    expect(ICON_CONTENT_SCALE).toBe(0.9);
  });

  it('requests exactly the 16/32/48 ICO entry sizes, in that order', () => {
    const favicon = specs.find((spec) => spec.kind === 'ico');
    expect(favicon?.kind).toBe('ico');
    if (favicon?.kind === 'ico') {
      expect(favicon.entries.map((entry) => entry.size)).toEqual([16, 32, 48]);
    }
    expect(ICO_ENTRY_SIZES).toEqual([16, 32, 48]);
  });

  it('records the governed geometry-warning and icon-upscale thresholds', () => {
    expect(GEOMETRY_WARNING_ASPECT_RATIO).toBe(2.5);
    expect(MAX_ICON_UPSCALE_FACTOR).toBe(4);
  });
});

describe('buildArchiveFilename', () => {
  it('appends -filesetgo-logo-pack.zip to the source basename', () => {
    expect(buildArchiveFilename('acme-logo.png')).toBe('acme-logo-filesetgo-logo-pack.zip');
  });

  it('strips only the final extension', () => {
    expect(buildArchiveFilename('acme.brand.logo.svg.png')).toBe('acme.brand.logo.svg-filesetgo-logo-pack.zip');
  });

  it('falls back to "logo" for a name with no usable basename', () => {
    expect(buildArchiveFilename('.png')).toBe('logo-filesetgo-logo-pack.zip');
    expect(buildArchiveFilename('')).toBe('logo-filesetgo-logo-pack.zip');
  });

  it('never includes a path separator', () => {
    expect(buildArchiveFilename('acme-logo.png')).not.toMatch(/[/\\]/);
  });
});
