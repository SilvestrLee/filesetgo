import { describe, expect, it } from 'vitest';

import {
  checkGeometryApproval,
  constrainLockedCrop,
  initialLockedCrop,
  isCropRequired,
  resizedLockedCropFromHandle,
} from '../crop';

describe('isCropRequired (re-exported from @filesetgo/core)', () => {
  it('is false when the source already matches the requested exact ratio', () => {
    expect(isCropRequired(1600, 900, 800, 450)).toBe(false);
  });

  it('is true when the source aspect ratio clearly differs from the requested ratio', () => {
    expect(isCropRequired(2560, 2103, 800, 800)).toBe(true);
  });
});

describe('initialLockedCrop', () => {
  it('is the largest centered region at the locked ratio that fits the source', () => {
    expect(initialLockedCrop({ width: 1536, height: 1024 }, 800, 800)).toEqual({
      x: 256,
      y: 0,
      width: 1024,
      height: 1024,
    });
  });
});

describe('constrainLockedCrop', () => {
  it('derives height from width and the locked ratio', () => {
    expect(constrainLockedCrop(
      { x: 0, y: 0, width: 800, height: 999_999 },
      { width: 2000, height: 2000 },
      800,
      800,
    )).toEqual({ x: 0, y: 0, width: 800, height: 800 });
  });

  it('falls back to the source height and re-derives width when the ratio would overflow it', () => {
    expect(constrainLockedCrop(
      { x: 0, y: 0, width: 2000, height: 2000 },
      { width: 2000, height: 300 },
      400,
      800,
    )).toEqual({ x: 0, y: 0, width: 150, height: 300 });
  });

  it('enforces a bounded minimum size for usable keyboard/touch adjustment', () => {
    expect(constrainLockedCrop(
      { x: 0, y: 0, width: 1, height: 1 },
      { width: 400, height: 200 },
      1,
      1,
    )).toEqual({ x: 0, y: 0, width: 20, height: 20 });
  });

  it('keeps the crop inside the source bounds', () => {
    expect(constrainLockedCrop(
      { x: 1900, y: 1900, width: 300, height: 300 },
      { width: 2000, height: 2000 },
      1,
      1,
    )).toEqual({ x: 1700, y: 1700, width: 300, height: 300 });
  });
});

describe('resizedLockedCropFromHandle', () => {
  const source = { width: 1000, height: 1000 };
  const crop = { x: 100, y: 100, width: 200, height: 200 };

  it('resizes an east edge handle from the fixed west edge, keeping the ratio', () => {
    expect(resizedLockedCropFromHandle(crop, 'e', 50, 0, source, 1, 1)).toEqual({
      x: 100,
      y: 75,
      width: 250,
      height: 250,
    });
  });

  it('resizes a corner handle from the fixed opposite corner, using the dominant drag axis', () => {
    expect(resizedLockedCropFromHandle(crop, 'se', 30, 10, source, 1, 1)).toEqual({
      x: 100,
      y: 100,
      width: 230,
      height: 230,
    });
  });

  it('uses the vertical drag when it dominates, even on a corner handle', () => {
    expect(resizedLockedCropFromHandle(crop, 'nw', 5, -40, source, 1, 1)).toEqual({
      x: 60,
      y: 60,
      width: 240,
      height: 240,
    });
  });

  it('resizes a pure north edge handle from the fixed south edge, centering the derived width', () => {
    expect(resizedLockedCropFromHandle(crop, 'n', 0, -20, source, 2, 1)).toEqual({
      x: 80,
      y: 180,
      width: 240,
      height: 120,
    });
  });
});

/**
 * `checkGeometryApproval` is the single chokepoint shared by Quick Fit's
 * manual form (`../validate-form.ts`) and Guided Fit's preset runner
 * (`../../presets/guided-fit-controller.ts`, FSG-007-FIT-002) — the two
 * surfaces can never silently disagree about when a crop/upscale approval
 * is mandatory.
 */
describe('checkGeometryApproval', () => {
  it('is ok when the source already matches the target ratio and needs no upscale', () => {
    expect(checkGeometryApproval({ width: 1600, height: 900 }, 800, 450, undefined, false)).toEqual({ ok: true });
  });

  it('rejects with crop-required when the ratio differs and no crop is supplied', () => {
    expect(checkGeometryApproval({ width: 2560, height: 2103 }, 800, 800, undefined, false)).toEqual({
      ok: false,
      reason: 'crop-required',
    });
  });

  it('is ok once a ratio-matching crop is supplied', () => {
    const crop = { x: 0, y: 0, width: 800, height: 800 };
    expect(checkGeometryApproval({ width: 2560, height: 2103 }, 800, 800, crop, false)).toEqual({ ok: true });
  });

  it('rejects with upscale-required when the (cropped or full) source is smaller than the target and unapproved', () => {
    expect(checkGeometryApproval({ width: 400, height: 300 }, 800, 600, undefined, false)).toEqual({
      ok: false,
      reason: 'upscale-required',
    });
  });

  it('is ok when upscale is required and approved', () => {
    expect(checkGeometryApproval({ width: 400, height: 300 }, 800, 600, undefined, true)).toEqual({ ok: true });
  });

  it('evaluates upscale against the EFFECTIVE (confirmed-crop) source, not the raw source', () => {
    // Raw source is large enough on its own, but the confirmed crop shrinks
    // it below the target — upscale must be evaluated against the crop.
    const crop = { x: 0, y: 0, width: 400, height: 300 };
    expect(checkGeometryApproval({ width: 4000, height: 3000 }, 800, 600, crop, false)).toEqual({
      ok: false,
      reason: 'upscale-required',
    });
  });

  it('reports crop-required before upscale-required when both are outstanding', () => {
    expect(checkGeometryApproval({ width: 100, height: 100 }, 800, 600, undefined, true)).toEqual({
      ok: false,
      reason: 'crop-required',
    });
  });
});
