import { calculateContainPlan, type ImageFormat, type ImagePreflightResult } from '@filesetgo/core';

import {
  GEOMETRY_WARNING_ASPECT_RATIO,
  HEADER_HIGH_DENSITY_BOUNDS,
  ICON_CANVAS_SIZES,
  ICON_CONTENT_SCALE,
  MAX_ICON_UPSCALE_FACTOR,
} from './spec';

export type SuitabilitySeverity = 'info' | 'warning' | 'blocking';

export interface SuitabilityIssue {
  id: string;
  severity: SuitabilitySeverity;
  message: string;
}

export type ResolutionStatus = 'good' | 'upscale-warning' | 'too-small';

/**
 * Deterministic source-resolution assessment (FSG-005B directive §23/§24)
 * — reuses `calculateContainPlan()`'s own scale math against the 512 px
 * icon canvas (the largest governed icon output) with `allowUpscale: true`
 * to get the *unclamped* required scale factor, entirely from preflight
 * dimensions. No AI/visual-quality estimation.
 */
export function assessResolution(preflight: Pick<ImagePreflightResult, 'width' | 'height'>): {
  status: ResolutionStatus;
  factor: number;
} {
  const plan = calculateContainPlan(
    preflight.width,
    preflight.height,
    ICON_CANVAS_SIZES.icon512,
    ICON_CANVAS_SIZES.icon512,
    ICON_CONTENT_SCALE,
    true,
  );

  if (plan.scale <= 1) {
    return { status: 'good', factor: plan.scale };
  }

  if (plan.scale <= MAX_ICON_UPSCALE_FACTOR) {
    return { status: 'upscale-warning', factor: plan.scale };
  }

  return { status: 'too-small', factor: plan.scale };
}

/** Extreme aspect ratios read poorly inside square icon canvases (directive §25). A warning, never an automatic crop. */
export function assessGeometry(preflight: Pick<ImagePreflightResult, 'width' | 'height'>): SuitabilityIssue | undefined {
  const longer = Math.max(preflight.width, preflight.height);
  const shorter = Math.min(preflight.width, preflight.height);
  const ratio = shorter === 0 ? Number.POSITIVE_INFINITY : longer / shorter;

  if (ratio > GEOMETRY_WARNING_ASPECT_RATIO) {
    return {
      id: 'geometry-aspect-ratio',
      severity: 'warning',
      message: 'This logo is very wide or tall. It may appear small inside square favicon and app-icon files. A compact or square icon mark usually works better.',
    };
  }

  return undefined;
}

/** Truthful transparency guidance (directive §11) — never claims the source definitely has/lacks transparency. */
export function assessTransparencyGuidance(format: ImageFormat): SuitabilityIssue | undefined {
  if (format === 'jpeg') {
    return {
      id: 'transparency-jpeg',
      severity: 'info',
      message: "JPEG doesn't support transparency. FileSetGo won't remove the existing background automatically.",
    };
  }

  if (format === 'png' || format === 'webp') {
    return {
      id: 'transparency-maybe',
      severity: 'info',
      message: 'If your source already contains transparency, PNG outputs can preserve it.',
    };
  }

  return undefined;
}

/** Detects whether source resolution keeps the header@2x asset below its intended higher-density relationship (directive §47). */
export function assessHeaderResolution(preflight: Pick<ImagePreflightResult, 'width' | 'height'>): SuitabilityIssue | undefined {
  const plan = calculateContainPlan(
    preflight.width,
    preflight.height,
    HEADER_HIGH_DENSITY_BOUNDS.maxWidth,
    HEADER_HIGH_DENSITY_BOUNDS.maxHeight,
    1,
    true,
  );

  if (plan.scale > 1) {
    return {
      id: 'header-resolution',
      severity: 'info',
      message: 'Your source logo is smaller than ideal for a high-resolution header asset.',
    };
  }

  return undefined;
}

export interface LogoPackSuitability {
  issues: SuitabilityIssue[];
  blocked: boolean;
  resolutionStatus: ResolutionStatus;
}

/** Aggregates every suitability check (directive §26/§27). Only a `>4×` required icon upscale blocks generation — everything else is informational or a warning. */
export function assessLogoPackSuitability(preflight: ImagePreflightResult): LogoPackSuitability {
  const issues: SuitabilityIssue[] = [];
  const resolution = assessResolution(preflight);

  if (resolution.status === 'too-small') {
    issues.push({
      id: 'resolution-too-small',
      severity: 'blocking',
      message: 'This logo is too small to create a useful 512 px website icon. Try a larger source file.',
    });
  } else if (resolution.status === 'upscale-warning') {
    issues.push({
      id: 'resolution-upscale-warning',
      severity: 'warning',
      message: 'Your logo is smaller than ideal for the largest icon size. FileSetGo will enlarge it carefully, but a larger source works best.',
    });
  }

  const geometry = assessGeometry(preflight);

  if (geometry !== undefined) {
    issues.push(geometry);
  }

  const transparency = assessTransparencyGuidance(preflight.format);

  if (transparency !== undefined) {
    issues.push(transparency);
  }

  const headerResolution = assessHeaderResolution(preflight);

  if (headerResolution !== undefined) {
    issues.push(headerResolution);
  }

  return {
    issues,
    blocked: issues.some((issue) => issue.severity === 'blocking'),
    resolutionStatus: resolution.status,
  };
}
