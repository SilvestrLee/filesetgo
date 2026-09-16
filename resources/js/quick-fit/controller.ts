import type { BackgroundRemovalStrength, CropRegion, ImageFormat, ImageProcessingStage, ImageSetResult, OutputImageFormat, TransparentMasterResult } from '@filesetgo/core';
import { getNormalizedDimensions } from '@filesetgo/core';

import { LOGO_PACK_ASSET_EXPLANATIONS, type LogoBackgroundMode } from '../logo-pack/spec';
import {
  constrainFreeformCrop,
  createInitialFreeformCrop,
  faviconSourceCanProduceLargestIcon,
  prepareAlternateFaviconSource,
  prepareSelectedFaviconSource,
  type FreeformCropSelection,
  type PreparedFaviconSource,
} from '../logo-pack/favicon-source';
import { assessResolution, type SuitabilityIssue } from '../logo-pack/suitability';
import { LogoPackController, type FaviconSourceKind } from '../logo-pack/logo-pack-controller';
import type { FileSetGoPreset } from '../presets/contracts';
import { getAllPresets } from '../presets/registry';
import { GuidedFitController, type QuickFitMode } from '../presets/guided-fit-controller';
import { describeRuntimeSupport } from './capabilities';
import * as coreClient from './core-client';
import { isCropRequired, isUpscaleRequired, type CropHandle } from './crop';
import { describeProcessingError, describeUnreachable } from './errors';
import { formatBytes } from './format-bytes';
import { createLockedCropStage, type LockedCropStage } from './locked-crop-stage';
import { resolveOutputFormat, shouldWarnAboutTransparency, type OutputFormatChoice, type QuickFitRequirements } from './request-plan';
import type { QuickFitSource, QuickFitState } from './state';
import { buildSuccessSummary, formatLabel } from './summary';
import { parsePositiveInt, readQuickFitForm } from './validate-form';
import { QuickFitWorkflow } from './workflow';
import { isActiveProcessingPhase, logoPackProcessingPhase, quickFitProcessingPhase, type ProcessingPhase } from '../shared/processing-phase';
import { MinimumDwellGate } from '../shared/minimum-dwell-gate';
import { glyphPhaseAttribute, renderProcessingSection, type ProcessingCopy } from '../shared/render-processing-section';
import { RevealGate } from '../shared/reveal-gate';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Required Quick Fit element is missing: ${selector}`);
  }

  return element;
}

const runtimeUnsupported = requireElement<HTMLElement>('#runtime-unsupported');
const app = requireElement<HTMLElement>('#quick-fit-app');
const sourceInput = requireElement<HTMLInputElement>('#source-file');
const dropZone = requireElement<HTMLElement>('#drop-zone');
const dropZoneLabel = requireElement<HTMLElement>('#drop-zone-label');
const sourcePanel = requireElement<HTMLElement>('#source-panel');
const sourceThumbnail = requireElement<HTMLImageElement>('#source-thumbnail');
const sourceName = requireElement<HTMLElement>('#source-name');
const sourceFormat = requireElement<HTMLElement>('#source-format');
const sourceDimensions = requireElement<HTMLElement>('#source-dimensions');
const sourceSize = requireElement<HTMLElement>('#source-size');
const sourceSummary = requireElement<HTMLElement>('#source-summary');
const sourceRejectedMessage = requireElement<HTMLElement>('#source-rejected-message');
const sourceReplaceImage = requireElement<HTMLButtonElement>('#source-replace-image');

const modeTabQuickFit = requireElement<HTMLButtonElement>('#mode-tab-quick-fit');
const modeTabGuidedFit = requireElement<HTMLButtonElement>('#mode-tab-guided-fit');
const modeDescription = requireElement<HTMLElement>('#mode-description');

const sourceRequiredDialog = requireElement<HTMLDialogElement>('#source-required-dialog');
const sourceRequiredCloseButton = requireElement<HTMLButtonElement>('#source-required-close');
const sourceRequiredChooseButton = requireElement<HTMLButtonElement>('#source-required-choose');

const quickFitPanel = requireElement<HTMLElement>('#quick-fit-panel');
const quickFitOpenButton = requireElement<HTMLButtonElement>('#quick-fit-open');
const quickFitCompactStatus = requireElement<HTMLElement>('#quick-fit-compact-status');
const quickFitDialog = requireElement<HTMLDialogElement>('#quick-fit-dialog');
const quickFitCloseButton = requireElement<HTMLButtonElement>('#quick-fit-close');
const quickFitModalCancelButton = requireElement<HTMLButtonElement>('#quick-fit-modal-cancel');
const quickFitSourceThumbnail = requireElement<HTMLImageElement>('#quick-fit-source-thumbnail');
const quickFitSourceName = requireElement<HTMLElement>('#quick-fit-source-name');
const quickFitSourceMeta = requireElement<HTMLElement>('#quick-fit-source-meta');
const quickFitChangeImageButton = requireElement<HTMLButtonElement>('#quick-fit-change-image');

const requirementsForm = requireElement<HTMLFormElement>('#requirements-form');
const targetSizeValue = requireElement<HTMLInputElement>('#target-size-value');
const targetSizeUnit = requireElement<HTMLSelectElement>('#target-size-unit');
const targetSizeError = requireElement<HTMLElement>('#target-size-error');
const maxWidthInput = requireElement<HTMLInputElement>('#max-width');
const maxHeightInput = requireElement<HTMLInputElement>('#max-height');
const quickFitDimensionsHelp = requireElement<HTMLElement>('#quick-fit-dimensions-help');
const outputFormatSelect = requireElement<HTMLSelectElement>('#output-format');
const outputFormatOriginalOption = requireElement<HTMLOptionElement>('#output-format-original');
const heicOutputNote = requireElement<HTMLElement>('#heic-output-note');
const transparencyWarning = requireElement<HTMLElement>('#transparency-warning');
const dimensionFlexibilityField = requireElement<HTMLElement>('#dimension-flexibility-field');
const dimensionFlexibilityIcon = requireElement<HTMLElement>('#dimension-flexibility-icon');
const dimensionFlexibilityLabel = requireElement<HTMLElement>('#dimension-flexibility-label');
const dimensionFlexibilityHelp = requireElement<HTMLElement>('#dimension-flexibility-help');
const allowDimensionReduction = requireElement<HTMLInputElement>('#allow-dimension-reduction');
const quickFitUpscaleField = requireElement<HTMLElement>('#quick-fit-upscale-field');
const quickFitUpscaleApprove = requireElement<HTMLInputElement>('#quick-fit-upscale-approve');
const noOpHint = requireElement<HTMLElement>('#no-op-hint');
const processButton = requireElement<HTMLButtonElement>('#process-button');

const quickFitStepRequirements = requireElement<HTMLElement>('#quick-fit-step-requirements');
const quickFitStepCrop = requireElement<HTMLElement>('#quick-fit-step-crop');
const quickFitCropBackButton = requireElement<HTMLButtonElement>('#quick-fit-crop-back');
const quickFitConfirmCropButton = requireElement<HTMLButtonElement>('#quick-fit-confirm-crop');
const quickFitCropStage = requireElement<HTMLElement>('#quick-fit-crop-stage');
const quickFitCropImage = requireElement<HTMLImageElement>('#quick-fit-crop-image');
const quickFitCropSelection = requireElement<HTMLElement>('#quick-fit-crop-selection');
const quickFitCropStatus = requireElement<HTMLElement>('#quick-fit-crop-status');
const quickFitCropResetButton = requireElement<HTMLButtonElement>('#quick-fit-crop-reset');
const quickFitCropFineTune = requireElement<HTMLDetailsElement>('#quick-fit-crop-fine-tune');
const quickFitCropXInput = requireElement<HTMLInputElement>('#quick-fit-crop-x');
const quickFitCropYInput = requireElement<HTMLInputElement>('#quick-fit-crop-y');
const quickFitCropWidthInput = requireElement<HTMLInputElement>('#quick-fit-crop-width');
const quickFitCropHeightInput = requireElement<HTMLInputElement>('#quick-fit-crop-height');

const guidedFitPanel = requireElement<HTMLElement>('#guided-fit-panel');
const guidedFitOpenButton = requireElement<HTMLButtonElement>('#guided-fit-open');
const guidedFitCompactStatus = requireElement<HTMLElement>('#guided-fit-compact-status');
const guidedFitDialog = requireElement<HTMLDialogElement>('#guided-fit-dialog');
const guidedFitCloseButton = requireElement<HTMLButtonElement>('#guided-fit-close');
const guidedFitModalCancelButton = requireElement<HTMLButtonElement>('#guided-fit-modal-cancel');
const guidedFitSourceThumbnail = requireElement<HTMLImageElement>('#guided-fit-source-thumbnail');
const guidedFitSourceName = requireElement<HTMLElement>('#guided-fit-source-name');
const guidedFitSourceMeta = requireElement<HTMLElement>('#guided-fit-source-meta');
const guidedFitChangeImageButton = requireElement<HTMLButtonElement>('#guided-fit-change-image');
const guidedFitProgressList = requireElement<HTMLElement>('#guided-fit-progress');
const guidedFitProgress = Array.from(guidedFitDialog.querySelectorAll<HTMLElement>('[data-modal-step-id]'));
const guidedFitMobileStep = requireElement<HTMLElement>('#guided-fit-mobile-step');
const guidedFitMobileTitle = requireElement<HTMLElement>('#guided-fit-mobile-title');
const guidedFitMobileProgress = requireElement<HTMLElement>('#guided-fit-mobile-progress-bar').parentElement as HTMLElement;
const guidedFitMobileProgressBar = requireElement<HTMLElement>('#guided-fit-mobile-progress-bar');
const guidedFitStepOne = requireElement<HTMLElement>('#guided-fit-step-1');
const guidedFitStepTwo = requireElement<HTMLElement>('#guided-fit-step-2');
const guidedFitStepThree = requireElement<HTMLElement>('#guided-fit-step-3');
const guidedFitUpscaleField = requireElement<HTMLElement>('#guided-fit-upscale-field');
const guidedFitUpscaleApprove = requireElement<HTMLInputElement>('#guided-fit-upscale-approve');
const guidedFitProcessingGlyph = requireElement<HTMLElement>('#guided-fit-step-3 .fsg-processing-glyph');

// --- Guided Fit exact-dimensions crop (FSG-007-FIT-002) ---
// Same locked-ratio crop stage engine as Quick Fit's (`./locked-crop-stage.ts`),
// bound to Guided Fit's own dialog markup — never a second implementation.
const guidedFitStepCrop = requireElement<HTMLElement>('#guided-fit-step-crop');
const guidedFitCropBackButton = requireElement<HTMLButtonElement>('#guided-fit-crop-back');
const guidedFitConfirmCropButton = requireElement<HTMLButtonElement>('#guided-fit-confirm-crop');
const guidedFitCropStage = requireElement<HTMLElement>('#guided-fit-crop-stage');
const guidedFitCropImage = requireElement<HTMLImageElement>('#guided-fit-crop-image');
const guidedFitCropSelection = requireElement<HTMLElement>('#guided-fit-crop-selection');
const guidedFitCropStatus = requireElement<HTMLElement>('#guided-fit-crop-status');
const guidedFitCropResetButton = requireElement<HTMLButtonElement>('#guided-fit-crop-reset');
const guidedFitCropXInput = requireElement<HTMLInputElement>('#guided-fit-crop-x');
const guidedFitCropYInput = requireElement<HTMLInputElement>('#guided-fit-crop-y');
const guidedFitCropWidthInput = requireElement<HTMLInputElement>('#guided-fit-crop-width');
const guidedFitCropHeightInput = requireElement<HTMLInputElement>('#guided-fit-crop-height');
const presetRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="preset-choice"]'));
const presetRecommendation = requireElement<HTMLElement>('#preset-recommendation');
const presetRecommendationTitle = requireElement<HTMLElement>('#preset-recommendation-title');
const presetRecommendationSummary = requireElement<HTMLElement>('#preset-recommendation-summary');
const presetRecommendationRationale = requireElement<HTMLElement>('#preset-recommendation-rationale');
const presetAlreadyReady = requireElement<HTMLElement>('#preset-already-ready');
const guidedNoFileHint = requireElement<HTMLElement>('#guided-no-file-hint');
const guidedSelectedSummaryTitle = requireElement<HTMLElement>('#guided-selected-summary-title');
const guidedSelectedSummaryMeta = requireElement<HTMLElement>('#guided-selected-summary-meta');
const guidedChangeDestinationButton = requireElement<HTMLButtonElement>('#guided-change-destination');
const guidedPreparingEyebrow = requireElement<HTMLElement>('#guided-preparing-eyebrow');
const guidedPreparingTitle = requireElement<HTMLElement>('#guided-fit-step-3-title');
const guidedPreparingSummary = requireElement<HTMLElement>('#guided-preparing-summary');
const guidedPreparingStatus = requireElement<HTMLElement>('#guided-preparing-status');
const guidedStepBackButton = requireElement<HTMLButtonElement>('#guided-step-back');
const guidedStepContinueButton = requireElement<HTMLButtonElement>('#guided-step-continue');
const guidedProcessButton = requireElement<HTMLButtonElement>('#guided-process-button');
const guidedUseFileButton = requireElement<HTMLAnchorElement>('#guided-use-file-button');
const guidedAdjustButton = requireElement<HTMLButtonElement>('#guided-adjust-button');

const modeTabLogoPack = requireElement<HTMLButtonElement>('#mode-tab-logo-pack');
const logoPackPanel = requireElement<HTMLElement>('#logo-pack-panel');
const logoPackOpenButton = requireElement<HTMLButtonElement>('#logo-pack-open');
const logoPackCompactStatus = requireElement<HTMLElement>('#logo-pack-compact-status');
const logoPackDialog = requireElement<HTMLDialogElement>('#logo-pack-dialog');
const logoPackCloseButton = requireElement<HTMLButtonElement>('#logo-pack-close');
const logoPackModalCancelButton = requireElement<HTMLButtonElement>('#logo-pack-modal-cancel');
const logoPackProgress = Array.from(logoPackDialog.querySelectorAll<HTMLElement>('[data-modal-step]'));
const logoPackMobileStep = requireElement<HTMLElement>('#logo-pack-mobile-step');
const logoPackMobileTitle = requireElement<HTMLElement>('#logo-pack-mobile-title');
const logoPackMobileProgress = requireElement<HTMLElement>('#logo-pack-mobile-progress-bar').parentElement as HTMLElement;
const logoPackMobileProgressBar = requireElement<HTMLElement>('#logo-pack-mobile-progress-bar');
const logoPackReview = requireElement<HTMLElement>('#logo-pack-review');
const logoPackSteps = [1, 2, 3, 4, 5].map((step) => requireElement<HTMLElement>(`#logo-pack-step-${step}`));
const logoPackSourceThumbnail = requireElement<HTMLImageElement>('#logo-pack-source-thumbnail');
const logoPackChangeImageButton = requireElement<HTMLButtonElement>('#logo-pack-change-image');
const logoPackModalSourceName = requireElement<HTMLElement>('#logo-pack-modal-source-name');
const logoPackSourceMeta = requireElement<HTMLElement>('#logo-pack-source-meta');

// Every source-thumbnail `<img>` in the document (homepage + each task
// dialog's own source confirmation) — `renderSourceThumbnails` writes the
// one shared preview URL into all of them (FSG-007-FIT-001B directive
// §21/§22).
const sourceThumbnailImages: HTMLImageElement[] = [
  sourceThumbnail,
  quickFitSourceThumbnail,
  guidedFitSourceThumbnail,
  logoPackSourceThumbnail,
];

const logoPackCompactSourceName = requireElement<HTMLElement>('#logo-pack-compact-source-name');
const logoPackCompactSourceMeta = requireElement<HTMLElement>('#logo-pack-compact-source-meta');
const logoPackIssues = requireElement<HTMLElement>('#logo-pack-issues');
const logoPackModeTransparent = requireElement<HTMLInputElement>('#logo-pack-mode-transparent');
const logoPackModeOriginal = requireElement<HTMLInputElement>('#logo-pack-mode-original');
const logoPackStrengthFieldset = requireElement<HTMLFieldSetElement>('#logo-pack-strength-fieldset');
const logoPackStrengthGentle = requireElement<HTMLInputElement>('#logo-pack-strength-gentle');
const logoPackStrengthBalanced = requireElement<HTMLInputElement>('#logo-pack-strength-balanced');
const logoPackStrengthStrong = requireElement<HTMLInputElement>('#logo-pack-strength-strong');
const logoPackPreviewStatus = requireElement<HTMLElement>('#logo-pack-preview-status');
const logoPackRetryPreviewButton = requireElement<HTMLButtonElement>('#logo-pack-retry-preview-button');
const logoPackOriginalReview = requireElement<HTMLElement>('#logo-pack-original-review');
const logoPackChangeBackgroundButton = requireElement<HTMLButtonElement>('#logo-pack-change-background');
const logoPackPreview = requireElement<HTMLElement>('#logo-pack-preview');
const logoPackPreviewConfidence = requireElement<HTMLElement>('#logo-pack-preview-confidence');
const logoPackPreviewFrame = requireElement<HTMLElement>('#logo-pack-preview-frame');
const logoPackPreviewImage = requireElement<HTMLImageElement>('#logo-pack-preview-image');
const logoPackPreviewOriginalDimensions = requireElement<HTMLElement>('#logo-pack-preview-original-dimensions');
const logoPackPreviewPreparedDimensions = requireElement<HTMLElement>('#logo-pack-preview-prepared-dimensions');
const logoPackPreviewCanvas = requireElement<HTMLElement>('#logo-pack-preview-canvas');
const logoPackPreviewResolution = requireElement<HTMLElement>('#logo-pack-preview-resolution');
const logoPackPreviewBgCheckerboard = requireElement<HTMLButtonElement>('#logo-pack-preview-bg-checkerboard');
const logoPackPreviewBgLight = requireElement<HTMLButtonElement>('#logo-pack-preview-bg-light');
const logoPackPreviewBgDark = requireElement<HTMLButtonElement>('#logo-pack-preview-bg-dark');
const logoPackFaviconSource = requireElement<HTMLElement>('#logo-pack-favicon-source');
const logoPackFaviconGuidance = requireElement<HTMLElement>('#logo-pack-favicon-guidance');
const logoPackFaviconOptionCrop = requireElement<HTMLInputElement>('#logo-pack-favicon-option-crop');
const logoPackFaviconOptionAlternate = requireElement<HTMLInputElement>('#logo-pack-favicon-option-alternate');
const logoPackFaviconOptionFull = requireElement<HTMLInputElement>('#logo-pack-favicon-option-full');
const logoPackFaviconFullDescription = requireElement<HTMLElement>('#logo-pack-favicon-full-description');
const logoPackFaviconCropPanel = requireElement<HTMLElement>('#logo-pack-favicon-crop-panel');
const logoPackFaviconCropStage = requireElement<HTMLElement>('#logo-pack-favicon-crop-stage');
const logoPackFaviconCropImage = requireElement<HTMLImageElement>('#logo-pack-favicon-crop-image');
const logoPackFaviconCropSelection = requireElement<HTMLElement>('#logo-pack-favicon-crop-selection');
const logoPackFaviconFineTune = requireElement<HTMLDetailsElement>('#logo-pack-favicon-fine-tune');
const logoPackFaviconCropX = requireElement<HTMLInputElement>('#logo-pack-favicon-crop-x');
const logoPackFaviconCropY = requireElement<HTMLInputElement>('#logo-pack-favicon-crop-y');
const logoPackFaviconCropWidth = requireElement<HTMLInputElement>('#logo-pack-favicon-crop-width');
const logoPackFaviconCropHeight = requireElement<HTMLInputElement>('#logo-pack-favicon-crop-height');
const logoPackFaviconCropReset = requireElement<HTMLButtonElement>('#logo-pack-favicon-crop-reset');
const logoPackFaviconSelectionStatus = requireElement<HTMLElement>('#logo-pack-favicon-selection-status');
const logoPackFaviconAlternatePanel = requireElement<HTMLElement>('#logo-pack-favicon-alternate-panel');
const logoPackFaviconAlternateFile = requireElement<HTMLInputElement>('#logo-pack-favicon-alternate-file');
const logoPackFaviconAlternateStatus = requireElement<HTMLElement>('#logo-pack-favicon-alternate-status');
const logoPackFaviconPreview = requireElement<HTMLElement>('#logo-pack-favicon-preview');
const logoPackFaviconPreviewSurface = requireElement<HTMLElement>('#logo-pack-favicon-preview-surface');
const logoPackFaviconPreviewLight = requireElement<HTMLButtonElement>('#logo-pack-favicon-preview-light');
const logoPackFaviconPreviewDark = requireElement<HTMLButtonElement>('#logo-pack-favicon-preview-dark');
const logoPackFaviconPreview16 = requireElement<HTMLCanvasElement>('#logo-pack-favicon-preview-16');
const logoPackFaviconPreview32 = requireElement<HTMLCanvasElement>('#logo-pack-favicon-preview-32');
const logoPackFaviconPreview180 = requireElement<HTMLCanvasElement>('#logo-pack-favicon-preview-180');
const logoPackFaviconConfirm = requireElement<HTMLButtonElement>('#logo-pack-favicon-confirm');
const logoPackFaviconConfirmed = requireElement<HTMLElement>('#logo-pack-favicon-confirmed');
const logoPackFinalReview = requireElement<HTMLElement>('#logo-pack-final-review');
const logoPackFinalHeaderPreview = requireElement<HTMLImageElement>('#logo-pack-final-header-preview');
const logoPackFinalFaviconPreview = requireElement<HTMLCanvasElement>('#logo-pack-final-favicon-preview');
const logoPackFinalFaviconSource = requireElement<HTMLElement>('#logo-pack-final-favicon-source');
const logoPackFinalBackground = requireElement<HTMLElement>('#logo-pack-final-background');
const logoPackChangeFaviconButton = requireElement<HTMLButtonElement>('#logo-pack-change-favicon');
const logoPackStepBackButton = requireElement<HTMLButtonElement>('#logo-pack-step-back');
const logoPackStepContinueButton = requireElement<HTMLButtonElement>('#logo-pack-step-continue');
const logoPackCreateButton = requireElement<HTMLButtonElement>('#logo-pack-create-button');
const logoPackResult = requireElement<HTMLElement>('#logo-pack-result');
const logoPackResultReadiness = requireElement<HTMLElement>('#logo-pack-result-readiness');
const logoPackResultOriginalDimensions = requireElement<HTMLElement>('#logo-pack-result-original-dimensions');
const logoPackResultPreparedDimensions = requireElement<HTMLElement>('#logo-pack-result-prepared-dimensions');
const logoPackResultTransparency = requireElement<HTMLElement>('#logo-pack-result-transparency');
const logoPackResultCanvas = requireElement<HTMLElement>('#logo-pack-result-canvas');
const logoPackResultFaviconSource = requireElement<HTMLElement>('#logo-pack-result-favicon-source');
const logoPackResultResolution = requireElement<HTMLElement>('#logo-pack-result-resolution');
const logoPackDownloadZip = requireElement<HTMLAnchorElement>('#logo-pack-download-zip');
const logoPackAssetsList = requireElement<HTMLElement>('#logo-pack-assets');

const cancelButton = requireElement<HTMLButtonElement>('#cancel-button');
const resetButton = requireElement<HTMLButtonElement>('#reset-button');
const statusMessage = requireElement<HTMLElement>('#status-message');
const statusAnnouncer = requireElement<HTMLElement>('#status-announcer');

const resultTitle = requireElement<HTMLElement>('#result-title');
const resultObject = requireElement<HTMLElement>('.fsg-result-object');
const resultEmpty = requireElement<HTMLElement>('#result-empty');
const resultContent = requireElement<HTMLElement>('#result-content');
const resultHeadline = requireElement<HTMLElement>('#result-headline');
const resultFilename = requireElement<HTMLElement>('#result-filename');
const resultPreparedFor = requireElement<HTMLElement>('#result-prepared-for');
const resultPreparedForValue = requireElement<HTMLElement>('#result-prepared-for-value');
const resultDetail = requireElement<HTMLElement>('#result-detail');
const resultDimensions = requireElement<HTMLElement>('#result-dimensions');
const resultFormat = requireElement<HTMLElement>('#result-format');
const resultSize = requireElement<HTMLElement>('#result-size');
const downloadLink = requireElement<HTMLAnchorElement>('#download-link');
const resultUnreachable = requireElement<HTMLElement>('#result-unreachable');
const unreachableMessage = requireElement<HTMLElement>('#unreachable-message');
const unreachableSuggestion = requireElement<HTMLElement>('#unreachable-suggestion');
const unreachableAdjustButton = requireElement<HTMLButtonElement>('#unreachable-adjust-button');
const resultError = requireElement<HTMLElement>('#result-error');
const errorMessage = requireElement<HTMLElement>('#error-message');

// --- Full-page processing transition (FSG-007-FIT-003-R3) ---
// One shared application-level surface, not a route, not a modal, not a
// second result page — the task modal's job ends at final confirmation.
const processingOverlay = requireElement<HTMLElement>('#fsg-processing-overlay');
const processingOverlayEyebrow = requireElement<HTMLElement>('#fsg-processing-overlay-eyebrow');
const processingOverlayTitle = requireElement<HTMLElement>('#fsg-processing-overlay-title');
/**
 * FSG-007-FIT-003-R5: the FILE → SET → GO rail, not the small inline
 * `<x-processing-glyph>` any more — `renderProcessingSection()`
 * (`../shared/render-processing-section.ts`, unmodified) only ever needs a
 * generic `HTMLElement` to carry `data-phase`; which element that is
 * changed, nothing about that shared function did.
 */
const processingOverlayGlyph = requireElement<HTMLElement>('#fsg-processing-rail');
const processingOverlaySourceThumb = requireElement<HTMLImageElement>('#fsg-processing-overlay-source-thumb');
// The FILE stage's own preview joins the existing unified-source-thumbnail
// group (FSG-007-FIT-001B) declared above — `renderSourceThumbnails()`
// already keeps every registered `<img>` in sync with the one confirmed
// source, so this needs no new update logic of its own.
sourceThumbnailImages.push(processingOverlaySourceThumb);
const processingOverlayStatus = requireElement<HTMLElement>('#fsg-processing-overlay-status');
const processingOverlayContext = requireElement<HTMLElement>('#fsg-processing-overlay-context');
const processingOverlayCancelButton = requireElement<HTMLButtonElement>('#fsg-processing-overlay-cancel');
const processingOverlayBackButton = requireElement<HTMLButtonElement>('#fsg-processing-overlay-back');

const workflow = new QuickFitWorkflow({ core: coreClient });
const logoPack = new LogoPackController(workflow, coreClient);
const guidedFit = new GuidedFitController(workflow, () => logoPack.getState().status === 'processing');

/**
 * The one shared "reveal-then-close" gate (FSG-007-FIT-003) behind the
 * atomic Ready → close-modal + populate-GO handoff. Quick Fit and Guided
 * Fit share `workflowRevealGate` because they share the same underlying
 * `QuickFitState` — only one of their two dialogs can ever be open (and
 * therefore be the one whose run this reflects) at a time, so one gate
 * serves both without duplicating the one-shot idiom per dialog. Logo Pack
 * has its own independent state, so it gets its own gate.
 */
const workflowRevealGate = new RevealGate();
const logoPackRevealGate = new RevealGate();

/**
 * FSG-007-FIT-003-R2: ensures the Preparing/Validating phase has genuinely
 * been visible for a minimum duration before the UI is allowed to advance
 * to Ready — a fast job must not jump Preparing → Ready → closed before a
 * real user can perceive any of it. Shared between Quick Fit and Guided Fit
 * for the same reason `workflowRevealGate` is; Logo Pack gets its own.
 * `*LastActivePhase` remembers the last real preparing/validating phase so
 * the display can keep showing genuine, already-happened progress text
 * during the held window, rather than freezing on stale/blank text or
 * fabricating a new one.
 */
const workflowMinDwellGate = new MinimumDwellGate();
const logoPackMinDwellGate = new MinimumDwellGate();
let quickFitLastActivePhase: ProcessingPhase | undefined;
let logoPackLastActivePhase: ProcessingPhase | undefined;

/**
 * 1200ms (FSG-007-FIT-003-R4 directive §20) — raised again from R2/R3's
 * 800ms after direct Product Office feedback that the full-page transition
 * still read as too quick even at the upper end of the R2 range. Never a
 * fake computation delay — this only governs when the *display* is allowed
 * to advance to Ready; the worker is never slowed down, and a job that has
 * already been visibly preparing this long or longer waits zero additional
 * time (`MinimumDwellGate.armIfNeeded`'s "positive remainder" logic).
 */
const MIN_PREPARING_VISIBLE_MS = 1200;
/** 600ms (FSG-007-FIT-003-R4 directive §20/§23) — raised from R2/R3's 500ms for the same reason: a comfortably perceptible Ready acknowledgement before the atomic close. */
const READY_DWELL_MS = 600;

/**
 * Applies the minimum-preparing-visibility hold to a raw `ProcessingPhase`:
 * while genuinely preparing/validating, marks the dwell clock visible and
 * remembers the phase; once the real job reaches 'ready' but the minimum
 * hasn't elapsed yet, keeps *displaying* the last real active phase (not a
 * fabricated one) and arms the remaining wait; only once satisfied does the
 * real 'ready' phase (and everything gated on it — the reveal, Cancel's
 * disappearance from the footer, etc.) actually show.
 */
function applyMinimumDwell(
  rawPhase: ProcessingPhase,
  dwellGate: MinimumDwellGate,
  lastActivePhase: ProcessingPhase | undefined,
  rememberActivePhase: (phase: ProcessingPhase) => void,
  onSatisfied: () => void,
): ProcessingPhase {
  if (rawPhase.kind === 'preparing' || rawPhase.kind === 'validating') {
    dwellGate.markVisible();
    rememberActivePhase(rawPhase);
    return rawPhase;
  }

  if (rawPhase.kind === 'ready' && !dwellGate.isSatisfied()) {
    dwellGate.armIfNeeded(onSatisfied, MIN_PREPARING_VISIBLE_MS);
    return lastActivePhase ?? rawPhase;
  }

  return rawPhase;
}

/**
 * Which real job the full-page overlay is currently representing (FSG-007-
 * FIT-003-R3) — set the instant a tool's own confirmation starts a job
 * (alongside closing that tool's dialog), cleared once the transition
 * concludes (Ready → workspace return, or Cancelled). Guided Fit carries
 * its own preset so the overlay can show destination-aware copy without a
 * second, task-specific transition surface.
 */
/**
 * `context` is a one-line summary of the approved task configuration
 * (FSG-007-FIT-003-R4 directive §15) — e.g. "500 × 500 · JPEG · target
 * 150 KB" — shown beneath the status text on the full-page overlay so the
 * transition still reads as connected to the decision the user just made in
 * the (now-closed) task dialog. A function of the current *display* phase,
 * not a frozen string (FSG-007-FIT-003-R5.1 directive §2): Quick Fit's and
 * Guided Fit's requirement summary is phase-neutral and always reads the
 * same regardless of phase, but Logo Pack's context uses an active verb
 * ("Preparing…") while genuinely preparing and must not carry that verb
 * into a Ready state that already says "ready" elsewhere on the same
 * screen — the invariant this shared shape enforces is: Preparing phase may
 * use active/process wording, Ready phase is a static result description
 * only. Called with the same dwell-adjusted `phase` that already drives
 * `renderProcessingSection()`'s eyebrow/title/status, so the context line
 * can never show "Preparing…" wording while the title above it already
 * says "ready" (or vice versa).
 */
type OverlayTask =
  | { kind: 'quick-fit'; context: (phase: ProcessingPhase) => string }
  | { kind: 'guided-fit'; preset: FileSetGoPreset; context: (phase: ProcessingPhase) => string }
  | { kind: 'logo-pack'; context: (phase: ProcessingPhase) => string };
let activeOverlayTask: OverlayTask | undefined;
let overlayReturnFocus: HTMLElement | undefined;

function guidedFitTaskDimensions(preset: FileSetGoPreset): string | undefined {
  return preset.requirements.maxWidth !== undefined && preset.requirements.maxHeight !== undefined
    ? `${preset.requirements.maxWidth} × ${preset.requirements.maxHeight}`
    : undefined;
}

/**
 * "1600 × 900 · WebP · target under 500 KB" (directive §15/§28) — assembled
 * from the same preset fields the copy/geometry below already reads, never
 * a second source of truth. Deliberately omits `preset.title` here: the
 * overlay's own title (directly above, in `guidedFitProcessingCopy`) is
 * already the preset's title, so repeating it in the context line would
 * just echo the same words back rather than adding information.
 */
function guidedFitTaskContext(preset: FileSetGoPreset): string {
  const dimensions = guidedFitTaskDimensions(preset);
  const size = preset.requirements.targetBytes === undefined ? undefined : `target under ${formatBytes(preset.requirements.targetBytes)}`;

  return [dimensions, formatLabel(preset.requirements.outputFormat), size].filter(Boolean).join(' · ');
}

/** "500 × 500 · JPEG · target 150 KB" (directive §15/§27) — assembled from the exact requirements object Quick Fit's own form just confirmed, never re-derived from live form fields that might already be showing something else. */
function quickFitTaskContext(sourceFormat: ImageFormat, requirements: QuickFitRequirements): string {
  const dimensions = requirements.maxWidth !== undefined && requirements.maxHeight !== undefined
    ? `${requirements.maxWidth} × ${requirements.maxHeight}`
    : undefined;
  const format = formatLabel(resolveOutputFormat(sourceFormat, requirements.outputChoice));
  const size = requirements.targetBytes === undefined ? undefined : `target ${formatBytes(requirements.targetBytes)}`;

  return [dimensions, format, size].filter(Boolean).join(' · ');
}

/**
 * "Preparing 7 website-ready logo assets" while genuinely preparing, but
 * "7 website-ready logo assets" once Ready (FSG-007-FIT-003-R5.1 directive
 * §1/§5) — the earlier constant carried the "Preparing" verb into the Ready
 * screen, directly contradicting the title above it ("Your logo pack is
 * ready") and the status line below it ("All seven files are checked and
 * ready to download."). The pack's asset count is fixed and governed
 * (ADR-018's seven-file contract), never derived per-run.
 */
function logoPackTaskContext(phase: ProcessingPhase): string {
  return phase.kind === 'ready' ? '7 website-ready logo assets' : 'Preparing 7 website-ready logo assets';
}

/** Mirrors `SINGLE_IMAGE_PREPARING_STAGE_COPY` further below — declared once there and reused by both Quick Fit's and Guided Fit's overlay copy. */
function guidedFitProcessingCopy(preset: FileSetGoPreset): ProcessingCopy {
  const dimensions = guidedFitTaskDimensions(preset);

  return {
    preparing: (stage) => ({
      eyebrow: 'Preparing for',
      title: preset.title,
      status: SINGLE_IMAGE_PREPARING_STAGE_COPY[stage] ?? 'Preparing your file...',
    }),
    validating: () => ({
      eyebrow: 'Checking the result',
      title: preset.title,
      status: 'Confirming the output matches what you requested.',
    }),
    ready: {
      eyebrow: 'Ready',
      title: `${preset.title} prepared`,
      status: `${[dimensions, formatLabel(preset.requirements.outputFormat)].filter(Boolean).join(' ')} is ready.`,
    },
    failed: (error) => ({
      eyebrow: "Couldn't finish",
      title: preset.title,
      status: describeProcessingError(error),
    }),
    cancelled: {
      eyebrow: 'Cancelled',
      title: preset.title,
      status: 'Preparation was cancelled. Your selected destination is preserved.',
    },
  };
}

/** Every top-level sibling except the overlay itself becomes `inert` while it's open — real focus-trapping/interaction-lock (FSG-007-FIT-003-R3 directive §24), not merely a visual scrim. */
function setWorkspaceInert(inert: boolean): void {
  for (const child of Array.from(document.body.children)) {
    if (child === processingOverlay) {
      continue;
    }

    if (inert) {
      child.setAttribute('inert', '');
    } else {
      child.removeAttribute('inert');
    }
  }
}

/**
 * `fsg-processing-active` (FSG-007-FIT-003-R4 directive §10) hides the
 * ordinary header/footer outright via CSS rather than relying only on this
 * surface's own opaque background to occlude them — processing is a
 * top-level application state, not chrome layered underneath a loader.
 */
/**
 * A restrained, one-shot border-emphasis on GO's own result panel
 * (FSG-007-FIT-003-R4 directive §26) — no bounce, no confetti, no banner.
 * Forces a reflow before re-adding the class so a second run in the same
 * session replays the animation rather than silently no-op'ing because the
 * class never actually toggled off.
 */
function triggerResultArrivalEmphasis(): void {
  resultObject.classList.remove('fsg-result-object--arrived');
  void resultObject.offsetWidth;
  resultObject.classList.add('fsg-result-object--arrived');
}

function openProcessingOverlay(): void {
  if (!processingOverlay.classList.contains('hidden')) {
    return;
  }

  overlayReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  processingOverlay.classList.remove('hidden');
  processingOverlay.classList.add('flex');
  document.body.classList.add('fsg-processing-active');
  setWorkspaceInert(true);
  processingOverlay.focus();
}

function closeProcessingOverlay(): void {
  if (processingOverlay.classList.contains('hidden')) {
    return;
  }

  processingOverlay.classList.add('hidden');
  processingOverlay.classList.remove('flex');
  document.body.classList.remove('fsg-processing-active');
  setWorkspaceInert(false);
  overlayReturnFocus?.focus();
  overlayReturnFocus = undefined;
}

/**
 * Renders the one shared overlay from whichever tool's job
 * `activeOverlayTask` currently represents. Shows for every phase except
 * 'idle' and 'cancelled' (cancellation returns straight to the workspace —
 * directive §26 "the interstitial leaves", not a lingering cancelled
 * message on the transition surface itself).
 */
function renderProcessingOverlay(workflowState: QuickFitState, logoPackState: ReturnType<typeof logoPack.getState>): void {
  if (activeOverlayTask === undefined) {
    closeProcessingOverlay();
    return;
  }

  const rawPhase = activeOverlayTask.kind === 'logo-pack'
    ? logoPackProcessingPhase(logoPackState, logoPackRevealGate)
    : quickFitProcessingPhase(workflowState, workflowRevealGate);

  const dwellGate = activeOverlayTask.kind === 'logo-pack' ? logoPackMinDwellGate : workflowMinDwellGate;
  const rememberActivePhase = activeOverlayTask.kind === 'logo-pack'
    ? (phase: ProcessingPhase) => { logoPackLastActivePhase = phase; }
    : (phase: ProcessingPhase) => { quickFitLastActivePhase = phase; };
  const lastActivePhase = activeOverlayTask.kind === 'logo-pack' ? logoPackLastActivePhase : quickFitLastActivePhase;
  const phase = applyMinimumDwell(rawPhase, dwellGate, lastActivePhase, rememberActivePhase, renderAll);

  if (phase.kind === 'idle' || phase.kind === 'cancelled') {
    // A genuinely completed run (not 'unreachable', which also collapses to
    // 'idle' immediately via the default case in `quickFitProcessingPhase`/
    // `logoPackProcessingPhase` — that has no new GO result to focus)
    // returns focus to the result heading, not the now-closed dialog's
    // trigger button (FSG-007-FIT-003-R4 directive §38).
    const wasSuccess = activeOverlayTask.kind === 'logo-pack'
      ? logoPackState.status === 'success'
      : workflowState.status === 'success';
    activeOverlayTask = undefined;
    closeProcessingOverlay();

    if (wasSuccess) {
      // `closeProcessingOverlay()` already focused the dialog's original
      // trigger button above; this synchronously overrides that with the
      // real result location — no intermediate paint occurs in between.
      resultTitle.focus();
      triggerResultArrivalEmphasis();
    }

    return;
  }

  processingOverlayContext.textContent = activeOverlayTask.context(phase);

  openProcessingOverlay();

  const copy = activeOverlayTask.kind === 'guided-fit'
    ? guidedFitProcessingCopy(activeOverlayTask.preset)
    : activeOverlayTask.kind === 'logo-pack'
      ? LOGO_PACK_PROCESSING_COPY
      : QUICK_FIT_PROCESSING_COPY;

  renderProcessingSection(
    { root: processingOverlayGlyph, eyebrow: processingOverlayEyebrow, title: processingOverlayTitle, statusText: processingOverlayStatus },
    phase,
    copy,
  );

  // Cancel is real and available only while the underlying job is
  // genuinely still active — never once it has actually resolved, even if
  // the UI is still holding the perceptible Ready/minimum-dwell window
  // (directive §17/§27). This reads the *raw*, undelayed phase/status —
  // not the dwell-adjusted display phase above.
  const reallyActive = activeOverlayTask.kind === 'logo-pack'
    ? logoPackState.status === 'processing'
    : workflowState.status === 'processing';
  processingOverlayCancelButton.classList.toggle('hidden', !reallyActive);
  processingOverlayBackButton.classList.toggle('hidden', phase.kind !== 'failed');
}

let lastConfiguredFile: File | undefined;
let originalFileUrl: string | undefined;
let logoPackZipUrl: string | undefined;
let logoPackAssetUrls: string[] = [];
let lastRenderedLogoPackResult: ImageSetResult | undefined;
let logoPackPreviewUrl: string | undefined;
let lastRenderedLogoPackMaster: TransparentMasterResult | undefined;
type LogoPackPreviewBackground = 'checkerboard' | 'light' | 'dark';
let logoPackPreviewBackground: LogoPackPreviewBackground = 'checkerboard';
let faviconDraftKind: FaviconSourceKind | undefined;
let faviconCrop: FreeformCropSelection | undefined;
let faviconAlternatePrepared: PreparedFaviconSource | undefined;
let faviconBaseBlob: Blob | undefined;
let faviconBaseUrl: string | undefined;
let faviconPreviewBlob: Blob | undefined;
let faviconPreviewUrl: string | undefined;
let faviconPreviewImage: HTMLImageElement | undefined;
let faviconPreviewCrop: FreeformCropSelection | undefined;
let faviconPreviewTheme: 'light' | 'dark' = 'light';
let faviconPreparationToken = 0;
/**
 * Guided Fit's step sequence is dynamic (FSG-007-FIT-002): 'crop' only
 * appears between 'review' and 'prepare' when the selected destination
 * actually requires a user-approved crop for the current source — see
 * `guidedFitStepSequence()`.
 */
type GuidedModalStepId = 'destination' | 'review' | 'crop' | 'prepare';
type LogoPackModalStep = 1 | 2 | 3 | 4 | 5;
/**
 * No 'processing' member (FSG-007-FIT-003-R4) — the dialog now closes
 * synchronously the instant a run is confirmed (`closeWorkflowDialogForProcessing`),
 * before the full-page overlay ever paints, so there is no dialog step left
 * to represent an in-modal processing presentation.
 */
type QuickFitDialogStep = 'requirements' | 'crop';
let guidedFitStep: GuidedModalStepId = 'destination';
let logoPackModalStep: LogoPackModalStep = 1;
/**
 * Rising-edge trackers so `workflowRevealGate`/`logoPackRevealGate` are
 * reset exactly once at the start of a genuinely new run (FSG-007-FIT-003)
 * — never mid-run, and never stuck 'revealed' from a previous run once a
 * later run reaches 'success' again (which would otherwise silently skip
 * the atomic close+announce a second time).
 */
let previousWorkflowStatus: QuickFitState['status'] = 'idle';
let previousLogoPackStatus: ReturnType<typeof logoPack.getState>['status'] = 'idle';
let modalStepSourceFile: File | undefined;
let advanceToReviewAfterFaviconApproval = false;

// --- Unified source-file experience (FSG-007-FIT-001B) ---
// One object URL feeds every thumbnail instance (homepage + all three task
// dialogs) — same revoke-before-create convention as `originalFileUrl`
// et al., created/released exactly once per confirmed source change (see
// the `activeSourceFile !== modalStepSourceFile` branch in `render()`),
// never per render.
let sourceThumbnailUrl: string | undefined;
let pendingWorkflowIntent: QuickFitMode | undefined;

// --- Quick Fit exact-dimensions crop (FSG-007-FIT-001) ---
// `quickFitCropConfirmed` is the confirmed value that actually reaches the
// request — kept as a controller-local module variable, not inside
// QuickFitState, the same precedent as the favicon crop above: the
// workflow FSM is about processing lifecycle, not transient UI-only
// geometry. The in-progress draft, pointer interaction, and source-URL
// lifecycle live inside the shared `createLockedCropStage` instance
// (`./locked-crop-stage.ts`, FSG-007-FIT-002) rather than as controller
// module state — Guided Fit's own crop step instantiates a second,
// independent copy of that same stage against its own DOM refs.
let quickFitDialogStep: QuickFitDialogStep = 'requirements';
let quickFitCropConfirmed: CropRegion | undefined;
/**
 * Tracks only the rising edge of "upscale approval is required" so the
 * approval control is auto-scrolled into view exactly once when it newly
 * becomes required — never repeatedly, and never fighting a user who has
 * since scrolled away on purpose (FSG-007 Quick Fit approval-visibility
 * closeout directive §2/§4 Option B).
 */
let quickFitUpscaleWasRequired = false;

function currentOutputChoice(): OutputFormatChoice {
  return outputFormatSelect.value as OutputFormatChoice;
}

function updateFormatWarnings(sourceFormat: ImageFormat): void {
  const resolved = resolveOutputFormat(sourceFormat, currentOutputChoice());
  transparencyWarning.classList.toggle('hidden', !shouldWarnAboutTransparency(sourceFormat, resolved));
}

/** Re-derives the output-format options for a newly selected source (FSG-003 directive §15). */
function configureOutputFormatForSource(format: ImageFormat): void {
  const isHeic = format === 'heic';

  outputFormatOriginalOption.hidden = isHeic;
  outputFormatOriginalOption.disabled = isHeic;
  heicOutputNote.classList.toggle('hidden', !isHeic);
  outputFormatSelect.value = isHeic ? 'webp' : 'original';
  updateFormatWarnings(format);
}

/** The current source's dimensions in NORMALIZED (EXIF-oriented) source-pixel space — the same space the worker's `exact.crop` operates in. */
function currentQuickFitSourceDimensions(): { width: number; height: number } | undefined {
  const source = currentSource(workflow.getState());

  if (source === undefined) {
    return undefined;
  }

  return getNormalizedDimensions(
    source.preflight.width,
    source.preflight.height,
    source.preflight.orientation ?? 1,
  );
}

/**
 * Updates every piece of UI whose meaning changes once Width AND Height are
 * both set — exact mode (FSG-007-FIT-001 directive §2/§4). There is no
 * separate "exact mode" toggle; this is entirely derived from the two
 * fields' current values, recomputed on every relevant input event.
 */
function updateExactModeFields(): void {
  const maxWidth = parsePositiveInt(maxWidthInput.value);
  const maxHeight = parsePositiveInt(maxHeightInput.value);
  const exact = typeof maxWidth === 'number' && typeof maxHeight === 'number';
  const onlyOneDimension = (typeof maxWidth === 'number') !== (typeof maxHeight === 'number');
  const hasTarget = targetSizeValue.value.trim().length > 0;

  // Field labels are static ("Output width"/"Output height") regardless of
  // mode (FSG-007-FIT-001B-R1 directive §11/§12). One dynamic helper line
  // carries the proportional-vs-exact explanation — never two paragraphs
  // repeating the same contract (FSG-007-FIT Quick Fit compact-content
  // remediation directive §7).
  quickFitDimensionsHelp.textContent = onlyOneDimension
    ? "With one dimension, File. Set. Go. keeps the image's proportions."
    : "Enter both dimensions for an exact-size result. If the source has a different shape, you'll choose what to keep.";

  dimensionFlexibilityField.classList.toggle('hidden', !exact && !hasTarget);
  allowDimensionReduction.disabled = allowDimensionReduction.disabled || exact;
  // In exact mode the checkbox is forced-unchecked and disabled — showing it
  // implies a choice the user no longer has, so a compact locked-status icon
  // replaces it instead (directive §10); the flexible-mode checkbox is a
  // real, user-toggleable control and keeps its own visual treatment.
  dimensionFlexibilityIcon.classList.toggle('hidden', !exact);
  allowDimensionReduction.classList.toggle('hidden', exact);

  if (exact) {
    allowDimensionReduction.checked = false;
    dimensionFlexibilityLabel.textContent = 'Exact dimensions locked';
    dimensionFlexibilityHelp.textContent = `File. Set. Go. will work toward the size target without changing ${maxWidth} × ${maxHeight}.`;
  } else {
    dimensionFlexibilityLabel.textContent = 'Allow FileSetGo to reduce dimensions if needed';
    dimensionFlexibilityHelp.textContent = 'Helps reach very small file-size limits while preserving aspect ratio.';
  }

  const sourceDimensions = currentQuickFitSourceDimensions();
  const effectiveSource = quickFitCropConfirmed ?? sourceDimensions;
  const upscale = exact
    && typeof maxWidth === 'number'
    && typeof maxHeight === 'number'
    && effectiveSource !== undefined
    && isUpscaleRequired(effectiveSource, maxWidth, maxHeight);

  quickFitUpscaleField.classList.toggle('hidden', !upscale);

  if (!upscale) {
    quickFitUpscaleApprove.checked = false;
  }

  // A visible CTA must never sit above a governing approval hidden below
  // the fold (FSG-007 Quick Fit approval-visibility closeout directive §2).
  // Bring the approval into view exactly once, on the rising edge of it
  // becoming required — never on every render while it stays required, so a
  // user who has since scrolled away on purpose is never fought.
  if (upscale && !quickFitUpscaleWasRequired) {
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    // 'center' rather than 'nearest': the field can be taller than the
    // remaining visible content area, and 'nearest' would settle for
    // showing only whichever edge needed the least scrolling (observed:
    // just the checkbox, with the explanation text still cut off).
    quickFitUpscaleField.scrollIntoView({ behavior, block: 'center' });
  }

  quickFitUpscaleWasRequired = upscale;

  // The primary action names the actual next step (FSG-007-FIT Quick Fit
  // compact-content remediation directive §15) — a crop decision still
  // pending is not "Get file ready" yet, and saying so would be untrue.
  const cropStillPending = exact
    && typeof maxWidth === 'number'
    && typeof maxHeight === 'number'
    && quickFitCropConfirmed === undefined
    && sourceDimensions !== undefined
    && isCropRequired(sourceDimensions.width, sourceDimensions.height, maxWidth, maxHeight);

  processButton.textContent = cropStillPending ? 'Choose image focus' : 'Get file ready';

  // A visible CTA must never silently no-op (FSG-007 Quick Fit
  // approval-visibility closeout directive §6): once a crop decision is
  // resolved (or was never needed), an outstanding-and-unapproved upscale
  // truthfully disables the button rather than accepting a click that would
  // just re-show the same warning. Crop is not gated this way — clicking
  // while it's pending is exactly what opens the crop step.
  const state = workflow.getState();
  const upscaleBlocksSubmit = !cropStillPending && upscale && !quickFitUpscaleApprove.checked;
  processButton.disabled = state.status === 'processing' || currentSource(state) === undefined || upscaleBlocksSubmit;
}

function updateTargetSizeDependentFields(): void {
  updateExactModeFields();
}

function readForm(sourceFormat: ImageFormat, sourceDimensions: { width: number; height: number }) {
  return readQuickFitForm({
    sourceFormat,
    sourceDimensions,
    targetSizeValue: targetSizeValue.value,
    targetSizeUnit: targetSizeUnit.value as 'KB' | 'MB',
    maxWidth: maxWidthInput.value,
    maxHeight: maxHeightInput.value,
    outputChoice: currentOutputChoice(),
    allowDimensionReduction: allowDimensionReduction.checked,
    confirmedCrop: quickFitCropConfirmed,
    upscaleApproved: quickFitUpscaleApprove.checked,
  });
}

function setFieldsDisabled(disabled: boolean): void {
  targetSizeValue.disabled = disabled;
  targetSizeUnit.disabled = disabled;
  maxWidthInput.disabled = disabled;
  maxHeightInput.disabled = disabled;
  outputFormatSelect.disabled = disabled;
  allowDimensionReduction.disabled = disabled;
  quickFitUpscaleApprove.disabled = disabled;
  // updateExactModeFields() runs after this on every render and additionally
  // disables allowDimensionReduction whenever exact mode is active — never
  // the other way around, so processing-disable is never accidentally lifted.
}

// --- Quick Fit crop step (FSG-007-FIT-001) ---
// The interactive stage itself is the shared `createLockedCropStage`
// engine (FSG-007-FIT-002) — this instance is bound to Quick Fit's own
// dialog markup; Guided Fit's crop step (below) instantiates a second,
// independent copy against its own markup.

const quickFitCropStageController: LockedCropStage = createLockedCropStage(
  {
    stage: quickFitCropStage,
    image: quickFitCropImage,
    selection: quickFitCropSelection,
    status: quickFitCropStatus,
    resetButton: quickFitCropResetButton,
    confirmButton: quickFitConfirmCropButton,
    xInput: quickFitCropXInput,
    yInput: quickFitCropYInput,
    widthInput: quickFitCropWidthInput,
    heightInput: quickFitCropHeightInput,
  },
  {
    onConfirm(crop) {
      quickFitCropConfirmed = crop;
      quickFitDialogStep = 'requirements';
      renderQuickFitDialogStep();
      updateExactModeFields();
      requirementsForm.requestSubmit();
    },
  },
);

function renderQuickFitDialogStep(): void {
  const showCrop = quickFitDialogStep === 'crop';

  quickFitStepRequirements.classList.toggle('hidden', showCrop);
  quickFitStepRequirements.classList.toggle('flex', !showCrop);
  quickFitStepCrop.classList.toggle('hidden', !showCrop);
  quickFitStepCrop.classList.toggle('flex', showCrop);

  processButton.classList.toggle('hidden', showCrop);
  quickFitCropBackButton.classList.toggle('hidden', !showCrop);
  quickFitConfirmCropButton.classList.toggle('hidden', !showCrop);

  if (showCrop) {
    quickFitModalCancelButton.classList.add('hidden');
  }
}

/** Enters the conditional crop-review step — only ever reached when `isCropRequired` is actually true for the current source + requested exact dimensions (never shown otherwise). */
function enterQuickFitCropStep(
  sourceFile: File,
  sourceDimensions: { width: number; height: number },
  targetWidth: number,
  targetHeight: number,
): void {
  quickFitCropStageController.enter(sourceFile, sourceDimensions, targetWidth, targetHeight, quickFitCropConfirmed);
  quickFitDialogStep = 'crop';
  renderQuickFitDialogStep();
}

function announce(message: string): void {
  statusAnnouncer.textContent = message;
}

function setStatus(message: string, state: string): void {
  statusMessage.textContent = message;
  statusMessage.dataset.state = state;
  statusMessage.classList.toggle('text-red-700', state === 'error');
  statusMessage.classList.toggle('dark:text-red-400', state === 'error');
}

function showResultPanel(panel: 'empty' | 'content' | 'unreachable' | 'error'): void {
  resultEmpty.classList.toggle('hidden', panel !== 'empty');
  resultContent.classList.toggle('hidden', panel !== 'content');
  resultContent.classList.toggle('flex', panel === 'content');
  resultUnreachable.classList.toggle('hidden', panel !== 'unreachable');
  resultUnreachable.classList.toggle('flex', panel === 'unreachable');
  resultError.classList.toggle('hidden', panel !== 'error');
  resultError.classList.toggle('flex', panel === 'error');
}

function currentSource(state: QuickFitState) {
  return state.status === 'success' ? state.result.source : 'source' in state ? state.source : undefined;
}

// --- Guided Fit: static preset card content, rendered once from the registry (FSG-004 directive §12). ---
for (const card of document.querySelectorAll<HTMLElement>('.preset-card')) {
  const presetId = card.dataset.presetId;
  const preset = getAllPresets().find((candidate) => candidate.id === presetId);

  if (preset === undefined) {
    continue;
  }

  const title = card.querySelector<HTMLElement>('.preset-card-title');
  const use = card.querySelector<HTMLElement>('.preset-card-use');
  const summary = card.querySelector<HTMLElement>('.preset-card-summary');
  const radio = card.querySelector<HTMLInputElement>('input[type="radio"]');

  if (title !== null) {
    title.textContent = preset.title;
  }

  if (use !== null) {
    use.textContent = preset.description;
  }

  if (summary !== null) {
    const dimensions = describePresetDimensions(preset);
    const size = preset.requirements.targetBytes === undefined ? undefined : `under ${formatBytes(preset.requirements.targetBytes)}`;
    summary.textContent = [formatLabel(preset.requirements.outputFormat), dimensions, size].filter(Boolean).join(' · ');
  }

  if (radio !== null) {
    radio.id = `preset-choice-${preset.id}`;
  }
}

function releaseOriginalFileUrl(): void {
  if (originalFileUrl !== undefined) {
    URL.revokeObjectURL(originalFileUrl);
    originalFileUrl = undefined;
  }

  guidedUseFileButton.removeAttribute('href');
}

function releaseSourceThumbnailUrl(): void {
  if (sourceThumbnailUrl !== undefined) {
    URL.revokeObjectURL(sourceThumbnailUrl);
    sourceThumbnailUrl = undefined;
  }
}

/**
 * Writes one shared preview URL into every source-thumbnail `<img>` in the
 * document — the homepage FILE area plus each task dialog's own source
 * confirmation (FSG-007-FIT-001B directive §2/§21/§22). Called exactly once
 * per confirmed source change (from the `activeSourceFile !==
 * modalStepSourceFile` branch in `render()`), never per render, matching
 * the established object-URL convention (`releaseOriginalFileUrl` et al.).
 * A plain `URL.createObjectURL(file)` assigned to `<img>.src` is enough —
 * like the existing crop stage (`quickFitCropImage`), the browser's native
 * EXIF-aware `<img>` rendering already agrees with processing about
 * orientation, with no canvas step needed for a static preview.
 */
function renderSourceThumbnails(source: QuickFitSource | undefined): void {
  releaseSourceThumbnailUrl();

  // HEIC has no native browser <img> decoder — assigning a HEIC blob URL to
  // `src` doesn't just fail quietly, it trips a CSP connect-src violation
  // in Chromium's decode-fallback path. There's nothing browser-displayable
  // to preview here, same as any other unsupported-format case.
  if (source === undefined || source.preflight.format === 'heic') {
    // `img.src = ''` is a footgun — some browsers resolve an empty string
    // against the current page URL and issue a spurious request for it.
    for (const image of sourceThumbnailImages) {
      image.removeAttribute('src');
    }
    return;
  }

  sourceThumbnailUrl = URL.createObjectURL(source.file);

  for (const image of sourceThumbnailImages) {
    image.src = sourceThumbnailUrl;
  }
}

/**
 * Quick Fit's and Guided Fit's own filename/format/dimensions/size text
 * (Logo Pack's equivalent fields are already populated by `renderLogoPack()`
 * on every render, following its own pre-existing convention — this only
 * covers the two new confirmation blocks added by FSG-007-FIT-001B).
 */
function renderSourceMetadataText(source: QuickFitSource | undefined): void {
  const name = source?.file.name ?? '';
  const meta = source === undefined
    ? ''
    : `${source.preflight.format.toUpperCase()} · ${source.preflight.width} × ${source.preflight.height} · ${formatBytes(source.preflight.fileSize)}`;

  quickFitSourceName.textContent = name;
  quickFitSourceMeta.textContent = meta;
  guidedFitSourceName.textContent = name;
  guidedFitSourceMeta.textContent = meta;
}

function releaseLogoPackUrls(): void {
  if (logoPackZipUrl !== undefined) {
    URL.revokeObjectURL(logoPackZipUrl);
    logoPackZipUrl = undefined;
  }

  for (const url of logoPackAssetUrls) {
    URL.revokeObjectURL(url);
  }

  logoPackAssetUrls = [];
}

/** Revoked on regeneration, strength/mode change, source replacement, reset, and pagehide (directive §30). */
function releaseLogoPackPreviewUrl(): void {
  if (logoPackPreviewUrl !== undefined) {
    URL.revokeObjectURL(logoPackPreviewUrl);
    logoPackPreviewUrl = undefined;
  }

  lastRenderedLogoPackMaster = undefined;
}

const MODE_DESCRIPTIONS: Record<string, string> = {
  'quick-fit': 'Enter the requirement yourself.',
  'guided-fit': 'Choose what you’re preparing.',
  'logo-pack': 'Prepare your website logo files.',
};

function setTabActive(tab: HTMLButtonElement, active: boolean): void {
  tab.setAttribute('aria-selected', String(active));
  tab.tabIndex = active ? 0 : -1;
  tab.classList.toggle('bg-blue-700', active);
  tab.classList.toggle('text-white', active);
  tab.classList.toggle('text-zinc-600', !active);
  tab.classList.toggle('dark:text-zinc-400', !active);
}

function renderModeTabs(): void {
  const mode = guidedFit.getMode();

  setTabActive(modeTabQuickFit, mode === 'quick-fit');
  setTabActive(modeTabGuidedFit, mode === 'guided-fit');
  setTabActive(modeTabLogoPack, mode === 'logo-pack');

  modeDescription.textContent = MODE_DESCRIPTIONS[mode];
  quickFitPanel.classList.toggle('hidden', mode !== 'quick-fit');
  quickFitPanel.classList.toggle('flex', mode === 'quick-fit');
  guidedFitPanel.classList.toggle('hidden', mode !== 'guided-fit');
  guidedFitPanel.classList.toggle('flex', mode === 'guided-fit');
  logoPackPanel.classList.toggle('hidden', mode !== 'logo-pack');
  logoPackPanel.classList.toggle('flex', mode === 'logo-pack');
}

function setModalProgress(
  items: HTMLElement[],
  activeStep: number,
  labels: readonly string[],
  mobileStep: HTMLElement,
  mobileTitle: HTMLElement,
  mobileProgress: HTMLElement,
  mobileProgressBar: HTMLElement,
): void {
  for (const item of items) {
    const step = Number(item.dataset.modalStep);
    const active = step === activeStep;
    const complete = step < activeStep;

    if (active) {
      item.setAttribute('aria-current', 'step');
    } else {
      item.removeAttribute('aria-current');
    }
    item.dataset.state = active ? 'active' : complete ? 'complete' : 'upcoming';
  }

  mobileStep.textContent = `Step ${activeStep} of ${items.length}`;
  mobileTitle.textContent = labels[activeStep - 1] ?? '';
  mobileProgress.setAttribute('aria-valuenow', String(activeStep));
  mobileProgressBar.style.transform = `scaleX(${activeStep / items.length})`;
}

const GUIDED_STEP_LABELS_BY_ID: Record<GuidedModalStepId, string> = {
  destination: 'Choose destination',
  review: 'Review recommendation',
  crop: 'Confirm crop',
  prepare: 'Prepare file',
};
const LOGO_PACK_STEP_LABELS = ['Check logo', 'Choose background', 'Review transparency', 'Choose icon', 'Review pack'] as const;

function showModalStep(steps: readonly HTMLElement[], activeStep: number): void {
  steps.forEach((step, index) => {
    const active = index + 1 === activeStep;
    step.classList.toggle('hidden', !active);
    step.classList.toggle('flex', active);
  });
}

/**
 * The 'crop' step only appears when the selected destination actually
 * requires a user-approved crop for the current source (FSG-007-FIT-002) —
 * never shown otherwise. Both the progress bar and the section visibility
 * derive from this single computation.
 */
function guidedFitStepSequence(): GuidedModalStepId[] {
  return guidedFit.needsCrop() === true
    ? ['destination', 'review', 'crop', 'prepare']
    : ['destination', 'review', 'prepare'];
}

/**
 * Renumbers the progress `<li>`s to the currently active sequence (always
 * contiguous — "1, 2, 3" or "1, 2, 3, 4", never "1, 2, 4") and delegates the
 * actual rendering to the existing, unmodified `setModalProgress()`.
 */
function renderGuidedFitProgress(): void {
  const sequence = guidedFitStepSequence();
  const activeIndex = sequence.indexOf(guidedFitStep) + 1;
  const visibleItems: HTMLElement[] = [];

  // The grid's column count must match the visible step count — a fixed
  // 3-column grid would misplace a 4th visible item onto a wrapped row
  // instead of filling four equal columns.
  guidedFitProgressList.classList.toggle('fsg-task-dialog__progress--four', sequence.length === 4);

  for (const item of guidedFitProgress) {
    const id = item.dataset.modalStepId as GuidedModalStepId;
    const position = sequence.indexOf(id);
    const visible = position !== -1;

    item.classList.toggle('hidden', !visible);

    if (visible) {
      const displayNumber = position + 1;
      item.dataset.modalStep = String(displayNumber);
      const badge = item.querySelector('span');

      if (badge !== null) {
        badge.textContent = String(displayNumber);
      }

      visibleItems.push(item);
    }
  }

  setModalProgress(
    visibleItems,
    activeIndex,
    sequence.map((id) => GUIDED_STEP_LABELS_BY_ID[id]),
    guidedFitMobileStep,
    guidedFitMobileTitle,
    guidedFitMobileProgress,
    guidedFitMobileProgressBar,
  );
}

/** Guided Fit's section visibility is keyed by step id directly rather than a fixed array index, since the sequence length varies. */
function showGuidedFitStepSection(): void {
  const sections: Record<GuidedModalStepId, HTMLElement> = {
    destination: guidedFitStepOne,
    review: guidedFitStepTwo,
    crop: guidedFitStepCrop,
    prepare: guidedFitStepThree,
  };

  for (const id of Object.keys(sections) as GuidedModalStepId[]) {
    const active = id === guidedFitStep;
    sections[id].classList.toggle('hidden', !active);
    sections[id].classList.toggle('flex', active);
  }
}

/** Exact-frame dimensions are stated plainly ("1600 × 900 px"); a bounding-box preset (none currently ship) would still read as an upper bound. */
function describePresetDimensions(preset: FileSetGoPreset): string | undefined {
  if (preset.requirements.maxWidth === undefined || preset.requirements.maxHeight === undefined) {
    return undefined;
  }

  return preset.requirements.exactDimensions
    ? `${preset.requirements.maxWidth} × ${preset.requirements.maxHeight} px`
    : `up to ${preset.requirements.maxWidth} × ${preset.requirements.maxHeight} px`;
}

let dialogReturnFocus: HTMLElement | undefined;

function openWorkflowDialog(dialog: HTMLDialogElement, trigger: HTMLElement): void {
  if (dialog.open) {
    return;
  }

  dialogReturnFocus = trigger;
  dialog.showModal();
  document.body.classList.add('fsg-dialog-open');
}

function closeWorkflowDialog(dialog: HTMLDialogElement): void {
  if (!dialog.open || dialog.classList.contains('is-closing')) {
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    dialog.close();
    return;
  }

  dialog.classList.add('is-closing');
  window.setTimeout(() => {
    if (dialog.open) {
      dialog.close();
    }
  }, 160);
}

/**
 * The processing-handoff close path (FSG-007-FIT-003-R4 directive §3/§39) —
 * deliberately distinct from `closeWorkflowDialog()`'s animated exit. A
 * measured recovery audit proved the 160ms `.is-closing` fade left the
 * native `<dialog>` genuinely `open` (and therefore still painting in the
 * browser's top layer, above the ordinary-stacking `#fsg-processing-overlay`
 * div regardless of z-index) for up to ~250ms after the user confirmed —
 * long enough to visibly show the old in-modal processing pane on top of
 * the new full-page one. The animated exit is correct for ordinary user
 * dismissal (Close/Escape/backdrop); it is never correct for "task
 * complete, hand off to processing," where the full-page interstitial
 * itself *is* the transition and the modal must already be gone before it
 * paints. This closes the dialog synchronously — no animation, no
 * `.is-closing`, no deferred `.close()` — so there is no frame in which
 * both are visible.
 */
function closeWorkflowDialogForProcessing(dialog: HTMLDialogElement): void {
  dialog.classList.remove('is-closing');

  if (dialog.open) {
    dialog.close();
  }
}

function handleDialogClosed(): void {
  quickFitDialog.classList.remove('is-closing');
  guidedFitDialog.classList.remove('is-closing');
  logoPackDialog.classList.remove('is-closing');
  sourceRequiredDialog.classList.remove('is-closing');
  if (!quickFitDialog.open && !guidedFitDialog.open && !logoPackDialog.open && !sourceRequiredDialog.open) {
    document.body.classList.remove('fsg-dialog-open');
  }

  dialogReturnFocus?.focus();
  dialogReturnFocus = undefined;
}

/**
 * True while a real job behind this specific dialog is actively
 * preparing/validating — never true for the brief 'ready' beat or any
 * terminal outcome (FSG-007-FIT-003 directive §17/§30). Guards the header
 * close button, Escape (`cancel`), and backdrop-click dismissal below so a
 * running job is never silently abandoned mid-flight with no visible
 * cancellation and no visible completion later — genuine Cancel remains
 * the only way out while this is true.
 */
function isDialogActivelyProcessing(dialog: HTMLDialogElement): boolean {
  if (dialog === quickFitDialog || dialog === guidedFitDialog) {
    return isActiveProcessingPhase(quickFitProcessingPhase(workflow.getState(), workflowRevealGate));
  }

  if (dialog === logoPackDialog) {
    return isActiveProcessingPhase(logoPackProcessingPhase(logoPack.getState(), logoPackRevealGate));
  }

  return false;
}

for (const dialog of [quickFitDialog, guidedFitDialog, logoPackDialog, sourceRequiredDialog]) {
  dialog.addEventListener('close', handleDialogClosed);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();

    if (isDialogActivelyProcessing(dialog)) {
      return;
    }

    closeWorkflowDialog(dialog);
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && !isDialogActivelyProcessing(dialog)) {
      closeWorkflowDialog(dialog);
    }
  });
}

/**
 * The single rule for every launcher (tab-heading clicks, deep links, and
 * pending-intent resume all funnel through this one function — FSG-007-FIT-001B
 * directive §30): if a valid source exists, open that mode's real task
 * dialog; otherwise remember the requested mode and show the shared
 * "choose an image first" gate instead of silently doing nothing.
 */
function requestWorkflowEntry(mode: QuickFitMode, trigger: HTMLElement): void {
  const source = currentSource(workflow.getState());

  if (source === undefined) {
    pendingWorkflowIntent = mode;
    openWorkflowDialog(sourceRequiredDialog, trigger);
    return;
  }

  pendingWorkflowIntent = undefined;
  // The gate may already be open (this is exactly the pending-intent resume
  // path) — close it before opening the real task dialog so the two never
  // stack, each a separate native <dialog> otherwise happy to both be open.
  // An instant `.close()` rather than the animated `closeWorkflowDialog`:
  // the gate is being immediately superseded by another dialog, so there's
  // nothing to visibly animate, and it avoids a race where the gate's own
  // deferred close later overwrites the shared `dialogReturnFocus` with a
  // stale value after the new dialog has already claimed it.
  if (sourceRequiredDialog.open) {
    sourceRequiredDialog.close();
  }

  switch (mode) {
    case 'quick-fit':
      openWorkflowDialog(quickFitDialog, quickFitOpenButton);
      break;
    case 'guided-fit':
      openWorkflowDialog(guidedFitDialog, guidedFitOpenButton);
      break;
    case 'logo-pack':
      openWorkflowDialog(logoPackDialog, logoPackOpenButton);
      break;
  }
}

function renderGuidedFit(): void {
  const state = workflow.getState();
  const processing = state.status === 'processing';

  for (const radio of presetRadios) {
    radio.checked = radio.value === guidedFit.getSelectedPresetId();
    radio.disabled = processing;
  }

  const preset = guidedFit.currentPreset();

  const guidedPhase = applyMinimumDwell(
    quickFitProcessingPhase(state, workflowRevealGate),
    workflowMinDwellGate,
    quickFitLastActivePhase,
    (phase) => { quickFitLastActivePhase = phase; },
    renderAll,
  );

  renderGuidedFitProgress();
  showGuidedFitStepSection();
  guidedFitModalCancelButton.classList.toggle('hidden', !processing);
  // Never navigable away from mid-run, and not during the brief 'ready'
  // beat either — the atomic handoff is already imminent by then
  // (FSG-007-FIT-003 directive §17/§30).
  guidedStepBackButton.classList.toggle('hidden', guidedFitStep === 'destination' || guidedFitStep === 'crop' || processing || guidedPhase.kind === 'ready');
  // Hidden, not merely disabled — an active job locks the source, and there
  // is no reason to present an unavailable mutation as if it might still
  // work (FSG-007-FIT-003-R1 directive §9).
  guidedFitChangeImageButton.classList.toggle('hidden', isActiveProcessingPhase(guidedPhase));
  // Hidden, not left looking clickable-but-inert — Cancel is the one
  // legitimate way out of active work (FSG-007-FIT-003-R1 directive §10).
  // The Escape/backdrop runtime guard (`isDialogActivelyProcessing`) is
  // unchanged; this only makes the header × agree with it visually.
  guidedFitCloseButton.classList.toggle('hidden', isActiveProcessingPhase(guidedPhase));
  guidedFitCropBackButton.classList.toggle('hidden', guidedFitStep !== 'crop');
  guidedFitConfirmCropButton.classList.toggle('hidden', guidedFitStep !== 'crop');
  guidedStepContinueButton.classList.toggle('hidden', guidedFitStep !== 'destination');
  guidedStepContinueButton.disabled = preset === undefined;
  guidedProcessButton.classList.toggle('hidden', guidedFitStep !== 'review');
  guidedAdjustButton.classList.toggle('hidden', guidedFitStep !== 'review');
  guidedFitCompactStatus.textContent = preset === undefined
    ? 'Choose a website destination and review a practical recommendation.'
    : `${preset.title} selected. Review or continue the recommendation.`;

  if (preset === undefined) {
    presetRecommendation.classList.add('hidden');
    presetRecommendation.classList.remove('flex');
    guidedProcessButton.classList.add('hidden');
    guidedAdjustButton.classList.add('hidden');
    guidedUseFileButton.classList.add('hidden');
    guidedFitUpscaleField.classList.add('hidden');
    releaseOriginalFileUrl();
    return;
  }

  const showRecommendation = guidedFitStep === 'review';
  presetRecommendation.classList.toggle('hidden', !showRecommendation);
  presetRecommendation.classList.toggle('flex', showRecommendation);
  presetRecommendationTitle.textContent = preset.title;

  const dimensions = describePresetDimensions(preset);
  const size = preset.requirements.targetBytes === undefined ? undefined : `under ${formatBytes(preset.requirements.targetBytes)}`;
  const targetSummary = [formatLabel(preset.requirements.outputFormat), dimensions, size].filter(Boolean).join(' · ');
  guidedSelectedSummaryTitle.textContent = preset.title;
  guidedSelectedSummaryMeta.textContent = targetSummary;
  guidedPreparingSummary.textContent = targetSummary;
  presetRecommendationSummary.textContent = `We'll prepare it as ${[formatLabel(preset.requirements.outputFormat), dimensions, size].filter(Boolean).join(', ')}.`;
  presetRecommendationRationale.textContent = preset.rationale;

  const source = currentSource(state);
  const ready = guidedFit.alreadyReady();
  const needsUpscale = guidedFit.needsUpscale();

  presetAlreadyReady.classList.toggle('hidden', ready !== true);
  guidedNoFileHint.classList.toggle('hidden', source !== undefined);
  guidedFitUpscaleField.classList.toggle('hidden', guidedFitStep !== 'review' || needsUpscale !== true);
  guidedFitUpscaleApprove.checked = needsUpscale === true && guidedFit.isUpscaleApproved();
  guidedFitUpscaleApprove.disabled = processing;
  guidedProcessButton.classList.toggle('hidden', guidedFitStep !== 'review' || ready === true);
  guidedProcessButton.disabled = processing || source === undefined || (needsUpscale === true && !guidedFit.isUpscaleApproved());
  guidedUseFileButton.classList.toggle('hidden', guidedFitStep !== 'review' || ready !== true);
  guidedAdjustButton.disabled = processing;
  // One phase = one visual truth (FSG-007-FIT-003-R1 directive §1/§15) —
  // eyebrow, title, and status change together. No 'processing' branch any
  // more (FSG-007-FIT-003-R4): the dialog closes synchronously the instant
  // a run is confirmed, before this pane could ever be visible while a real
  // job is active — the full-page overlay is the only surface that ever
  // shows live Preparing/Validating copy now (`renderProcessingOverlay`).
  // These remaining terminal-outcome branches only matter for a later
  // reopen (e.g. Back navigation after cancel/failure/success), never for
  // an in-progress run. Folds the distinct 'unreachable' outcome into the
  // same treatment as 'failed' (there is no separate `ProcessingPhase` slot
  // for a target-size search dead-end, since it isn't a
  // `FileSetGoProcessingError`) — this bespoke block, not the shared
  // `ProcessingPhase` model, is deliberately what still owns that case.
  if (state.status === 'cancelled') {
    guidedPreparingEyebrow.textContent = 'Cancelled';
    guidedPreparingTitle.textContent = preset.title;
    guidedPreparingStatus.textContent = 'Preparation was cancelled. Your selected destination is preserved.';
  } else if (state.status === 'failed' || state.status === 'unreachable') {
    guidedPreparingEyebrow.textContent = "Couldn't finish";
    guidedPreparingTitle.textContent = preset.title;
    guidedPreparingStatus.textContent = 'Preparation did not complete. Review the result guidance, then go back to adjust.';
  } else if (state.status === 'success') {
    const dimensions = preset.requirements.maxWidth !== undefined && preset.requirements.maxHeight !== undefined
      ? `${preset.requirements.maxWidth} × ${preset.requirements.maxHeight}`
      : undefined;
    guidedPreparingEyebrow.textContent = 'Ready';
    guidedPreparingTitle.textContent = `${preset.title} prepared`;
    guidedPreparingStatus.textContent = [dimensions, formatLabel(preset.requirements.outputFormat)].filter(Boolean).join(' ') + ' is ready.';
  } else {
    guidedPreparingEyebrow.textContent = 'Preparing for';
    guidedPreparingTitle.textContent = preset.title;
    guidedPreparingStatus.textContent = 'Ready to prepare this file.';
  }

  // The glyph is still driven by the one shared phase/CSS contract, even
  // though the text above stays Guided-Fit-specific.
  const guidedGlyphPhase = glyphPhaseAttribute(guidedPhase);

  if (guidedGlyphPhase === undefined) {
    delete guidedFitProcessingGlyph.dataset.phase;
  } else {
    guidedFitProcessingGlyph.dataset.phase = guidedGlyphPhase;
  }

  if (ready === true && source !== undefined) {
    releaseOriginalFileUrl();
    originalFileUrl = URL.createObjectURL(source.file);
    guidedUseFileButton.href = originalFileUrl;
    guidedUseFileButton.download = source.file.name;
  } else {
    releaseOriginalFileUrl();
  }

  // The atomic Ready → close-modal + populate-GO handoff itself is armed
  // centrally in `render()` (not here) — this function returns early above
  // whenever no preset is selected, which is exactly the case for a run
  // Quick Fit's own manual form initiated, so arming it here would silently
  // never fire for that (very common) path.
}

/**
 * The single "move this along" action for Guided Fit's review step
 * (FSG-007-FIT-002): enters the crop step when one is required and not yet
 * confirmed; otherwise runs the preset if upscale (when required) is
 * already approved, or simply re-renders to surface the upscale-approval
 * control if not. Also the crop stage's own confirm callback re-enters
 * this same function immediately after storing the confirmed crop, so
 * confirming never silently proceeds past a still-outstanding upscale
 * approval — mirroring Quick Fit's identical confirm-then-attempt pattern.
 */
function attemptGuidedFitPrepare(): void {
  const preset = guidedFit.currentPreset();
  const source = currentSource(workflow.getState());
  const dimensions = guidedFit.sourceDimensions();

  if (preset === undefined || source === undefined || dimensions === undefined) {
    return;
  }

  // needsCrop() describes the SOURCE/DESTINATION aspect relationship, not
  // whether an approval already exists for it — a confirmed crop for this
  // exact source+destination pair means the mismatch is already resolved,
  // so only route into the crop step when no confirmed crop exists yet.
  if (guidedFit.needsCrop() === true && guidedFit.getConfirmedCrop() === undefined) {
    guidedFitCropStageController.enter(
      source.file,
      dimensions,
      preset.requirements.maxWidth!,
      preset.requirements.maxHeight!,
      guidedFit.getConfirmedCrop(),
    );
    guidedFitStep = 'crop';
    renderAll();
    return;
  }

  if (guidedFit.needsUpscale() === true && !guidedFit.isUpscaleApproved()) {
    renderAll();
    return;
  }

  // FSG-007-FIT-003-R3/R4: the modal's job ends at final confirmation — the
  // full-page transition represents the actual job from here on. Closed
  // synchronously (see `closeWorkflowDialogForProcessing`) so the dialog can
  // never still be open (and therefore top-layer-visible) once the
  // full-page overlay opens. `guidedFitStep` still moves to 'prepare' —
  // unrelated to the removed defect, this only governs which step a later
  // reopen (post-success/-cancel/-failure Back navigation) lands on.
  guidedFitStep = 'prepare';
  activeOverlayTask = { kind: 'guided-fit', preset, context: () => guidedFitTaskContext(preset) };
  closeWorkflowDialogForProcessing(guidedFitDialog);
  guidedFit.runSelectedPreset();
  renderAll();
}

const guidedFitCropStageController: LockedCropStage = createLockedCropStage(
  {
    stage: guidedFitCropStage,
    image: guidedFitCropImage,
    selection: guidedFitCropSelection,
    status: guidedFitCropStatus,
    resetButton: guidedFitCropResetButton,
    confirmButton: guidedFitConfirmCropButton,
    xInput: guidedFitCropXInput,
    yInput: guidedFitCropYInput,
    widthInput: guidedFitCropWidthInput,
    heightInput: guidedFitCropHeightInput,
  },
  {
    onConfirm(crop) {
      guidedFit.confirmCrop(crop);
      guidedFitStep = 'review';
      attemptGuidedFitPrepare();
    },
  },
);

function issueTextClass(severity: SuitabilityIssue['severity']): string {
  if (severity === 'blocking') {
    return 'text-red-700 dark:text-red-400';
  }

  if (severity === 'warning') {
    return 'text-amber-700 dark:text-amber-400';
  }

  return 'text-zinc-600 dark:text-zinc-400';
}

/** Understandable progress copy (directive §29) — never worker/protocol stage names. */
const LOGO_PACK_PREVIEW_STAGE_COPY: Partial<Record<ImageProcessingStage, string>> = {
  decoding: 'Checking your logo...',
  normalizing: 'Checking your logo...',
  resizing: 'Checking your logo...',
  optimizing: 'Preparing transparent background...',
  encoding: 'Cleaning up the edges...',
  finalizing: 'Verifying transparency...',
};

function describeLogoPackPreviewStage(stage: ImageProcessingStage | undefined): string {
  return (stage !== undefined ? LOGO_PACK_PREVIEW_STAGE_COPY[stage] : undefined) ?? 'Preparing transparent background...';
}

// --- FSG-007-FIT-003: Preparing → Validating → Ready processing copy ---
// Quick Fit and Guided Fit run the same single-image jobs, so they share
// one stage-copy table. `'finalizing'` is labeled as truly "checking" the
// file rather than folded into "preparing": `validateOutput()`
// (`packages/core/src/workers/process-image.ts`) genuinely re-decodes and
// re-checks the produced Blob inside that exact window before the job
// resolves — this is real, awaited work, not a fabricated stage.
const SINGLE_IMAGE_PREPARING_STAGE_COPY: Partial<Record<ImageProcessingStage, string>> = {
  preflighting: 'Getting started...',
  accepted: 'Getting started...',
  decoding: 'Reading your image...',
  normalizing: 'Reading your image...',
  resizing: 'Resizing your image...',
  optimizing: 'Finding the right file size...',
  encoding: 'Encoding your file...',
  // The runtime reports one real 'complete' progress event right after
  // 'finalizing' and just before the job actually resolves (`ImageProcessingRuntime`
  // in `packages/core/src/runtime/worker-client.ts`) — labeled forward,
  // never falling back to "Preparing..." which would read as regressing
  // after "Checking the finished file...".
  complete: 'Finishing up...',
};

// FSG-007-FIT-003-R1 directive §1/§15: every visible label for a phase must
// agree — an eyebrow can never keep claiming "preparing"/"building" once
// the status underneath already says ready, failed, or cancelled.
const QUICK_FIT_PROCESSING_COPY: ProcessingCopy = {
  preparing: (stage) => ({
    eyebrow: 'Getting your file ready',
    title: 'Preparing your file',
    status: SINGLE_IMAGE_PREPARING_STAGE_COPY[stage] ?? 'Preparing your file...',
  }),
  validating: () => ({
    eyebrow: 'Checking the result',
    title: 'Checking your finished file',
    status: 'Confirming the output matches what you requested.',
  }),
  ready: {
    eyebrow: 'Ready',
    title: 'Your file is ready',
    status: 'The finished file has been checked and is ready to download.',
  },
  failed: (error) => ({
    eyebrow: "Couldn't finish",
    title: 'Preparation failed',
    status: describeProcessingError(error),
  }),
  cancelled: {
    eyebrow: 'Cancelled',
    title: 'Preparation cancelled',
    status: 'Your requirements are preserved.',
  },
};

// Logo Pack never reaches the 'validating' phase (see `logoPackProcessingPhase`
// in `../shared/processing-phase.ts`) — its own real per-asset validation
// already happens inside `'encoding'`, so `'packaging'`/`'finalizing'` are
// labeled as real, distinct steps of preparing the pack rather than a
// fabricated "validating" beat with no truthful moment behind it. Its own
// `validating` entry below is therefore never reached in practice — kept
// only so `ProcessingCopy` stays a total function, and left truthful on the
// off chance the phase model ever changes.
const LOGO_PACK_PACKAGING_STAGE_COPY: Partial<Record<ImageProcessingStage, string>> = {
  decoding: 'Reading your logo...',
  normalizing: 'Reading your logo...',
  resizing: 'Building each asset...',
  encoding: 'Encoding and checking each asset...',
  packaging: 'Building your ZIP archive...',
  finalizing: 'Finishing up...',
  complete: 'Finishing up...',
};

const LOGO_PACK_PROCESSING_COPY: ProcessingCopy = {
  preparing: (stage) => ({
    eyebrow: 'Building your pack',
    title: 'Preparing your logo pack',
    status: LOGO_PACK_PACKAGING_STAGE_COPY[stage] ?? 'Preparing your logo pack...',
  }),
  validating: () => ({
    eyebrow: 'Checking the result',
    title: 'Checking your logo pack',
    status: 'Confirming each file matches what was requested.',
  }),
  ready: {
    eyebrow: 'Ready',
    title: 'Your logo pack is ready',
    status: 'All seven files are checked and ready to download.',
  },
  failed: (error) => ({
    eyebrow: "Couldn't finish",
    title: 'Logo pack creation failed',
    status: describeProcessingError(error),
  }),
  cancelled: {
    eyebrow: 'Cancelled',
    title: 'Logo pack creation cancelled',
    status: 'You can try again.',
  },
};

/** undefined outside a ready preview — kept as a helper so callers narrow safely instead of relying on a separately-computed boolean. */
function logoPackPreviewMaster(state: ReturnType<typeof logoPack.getState>): TransparentMasterResult | undefined {
  return state.status === 'preview-ready' ? state.master : undefined;
}

/** A FAILED transparent master must never be packaged (directive §28); needs-review/verified may proceed. */
function isTransparentPackagingBlocked(state: ReturnType<typeof logoPack.getState>): boolean {
  if (state.status !== 'preview-ready') {
    return true;
  }

  return state.master.status === 'failed';
}

function applyLogoPackPreviewBackground(): void {
  const isCheckerboard = logoPackPreviewBackground === 'checkerboard';
  const isLight = logoPackPreviewBackground === 'light';
  const isDark = logoPackPreviewBackground === 'dark';

  logoPackPreviewFrame.classList.toggle('fsg-checkerboard', isCheckerboard);
  logoPackPreviewFrame.classList.toggle('bg-white', isLight);
  logoPackPreviewFrame.classList.toggle('bg-zinc-900', isDark);

  logoPackPreviewBgCheckerboard.setAttribute('aria-pressed', String(isCheckerboard));
  logoPackPreviewBgLight.setAttribute('aria-pressed', String(isLight));
  logoPackPreviewBgDark.setAttribute('aria-pressed', String(isDark));

  for (const [button, active] of [
    [logoPackPreviewBgCheckerboard, isCheckerboard],
    [logoPackPreviewBgLight, isLight],
    [logoPackPreviewBgDark, isDark],
  ] as const) {
    button.classList.toggle('bg-blue-700', active);
    button.classList.toggle('text-white', active);
    button.classList.toggle('text-zinc-600', !active);
    button.classList.toggle('dark:text-zinc-400', !active);
  }
}

function releaseFaviconUrls(): void {
  if (faviconBaseUrl !== undefined) {
    URL.revokeObjectURL(faviconBaseUrl);
    faviconBaseUrl = undefined;
  }

  if (faviconPreviewUrl !== undefined) {
    URL.revokeObjectURL(faviconPreviewUrl);
    faviconPreviewUrl = undefined;
  }

  faviconPreviewBlob = undefined;
  faviconPreviewImage = undefined;
}

function faviconSourceLabel(kind: FaviconSourceKind): string {
  if (kind === 'selected-region') {
    return 'Selected compact mark';
  }

  if (kind === 'alternate-icon') {
    return 'Separate icon';
  }

  return 'Full logo';
}

function formatProjectedFaviconDimension(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function drawFaviconPreview(): void {
  const image = faviconPreviewImage;

  if (image === undefined || !image.complete || image.naturalWidth === 0) {
    return;
  }

  const source = faviconPreviewCrop ?? {
    x: 0,
    y: 0,
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
  const usesCrop = faviconPreviewCrop !== undefined;

  for (const canvas of [logoPackFaviconPreview16, logoPackFaviconPreview32, logoPackFaviconPreview180, logoPackFinalFaviconPreview]) {
    const context = canvas.getContext('2d', { alpha: true });

    if (context === null) {
      continue;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const contentBox = Math.floor(canvas.width * 0.9);
    const sourceWidth = usesCrop ? source.width : image.naturalWidth;
    const sourceHeight = usesCrop ? source.height : image.naturalHeight;
    const scale = Math.min(contentBox / sourceWidth, contentBox / sourceHeight);
    const drawWidth = Math.max(1, Math.floor(sourceWidth * scale));
    const drawHeight = Math.max(1, Math.floor(sourceHeight * scale));
    const offsetX = Math.floor((canvas.width - drawWidth) / 2);
    const offsetY = Math.floor((canvas.height - drawHeight) / 2);

    context.drawImage(
      image,
      usesCrop ? source.x : 0,
      usesCrop ? source.y : 0,
      sourceWidth,
      sourceHeight,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight,
    );
  }
}

function showFaviconPreview(blob: Blob, crop?: FreeformCropSelection): void {
  faviconPreviewCrop = crop;
  logoPackFaviconPreview.classList.remove('hidden');
  logoPackFaviconPreview.classList.add('flex');

  if (faviconPreviewBlob === blob && faviconPreviewImage !== undefined) {
    drawFaviconPreview();
    return;
  }

  if (faviconPreviewUrl !== undefined) {
    URL.revokeObjectURL(faviconPreviewUrl);
  }

  faviconPreviewBlob = blob;
  faviconPreviewUrl = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = drawFaviconPreview;
  image.src = faviconPreviewUrl;
  faviconPreviewImage = image;
}

function hideFaviconPreview(): void {
  logoPackFaviconPreview.classList.add('hidden');
  logoPackFaviconPreview.classList.remove('flex');
}

function applyFaviconPreviewTheme(): void {
  logoPackFaviconPreviewSurface.dataset.previewTheme = faviconPreviewTheme;
  const light = faviconPreviewTheme === 'light';
  logoPackFaviconPreviewLight.setAttribute('aria-pressed', String(light));
  logoPackFaviconPreviewDark.setAttribute('aria-pressed', String(!light));

  for (const [button, active] of [
    [logoPackFaviconPreviewLight, light],
    [logoPackFaviconPreviewDark, !light],
  ] as const) {
    button.classList.toggle('bg-blue-700', active);
    button.classList.toggle('text-white', active);
    button.classList.toggle('text-slate-600', !active);
    button.classList.toggle('dark:text-slate-300', !active);
  }
}

function updateFaviconCropOverlay(): void {
  const crop = faviconCrop;
  const base = logoPack.getFaviconSourceBase();

  if (crop === undefined || base === undefined) {
    return;
  }

  const stage = logoPackFaviconCropStage.getBoundingClientRect();
  const scale = Math.min(stage.width / base.width, stage.height / base.height);
  const renderedWidth = base.width * scale;
  const renderedHeight = base.height * scale;
  const offsetX = (stage.width - renderedWidth) / 2;
  const offsetY = (stage.height - renderedHeight) / 2;

  logoPackFaviconCropSelection.style.left = `${offsetX + crop.x * scale}px`;
  logoPackFaviconCropSelection.style.top = `${offsetY + crop.y * scale}px`;
  logoPackFaviconCropSelection.style.width = `${crop.width * scale}px`;
  logoPackFaviconCropSelection.style.height = `${crop.height * scale}px`;
}

function updateFaviconCropControls(): void {
  const crop = faviconCrop;
  const base = logoPack.getFaviconSourceBase();

  if (crop === undefined || base === undefined) {
    return;
  }

  logoPackFaviconCropX.max = String(base.width - crop.width);
  logoPackFaviconCropY.max = String(base.height - crop.height);
  logoPackFaviconCropWidth.max = String(base.width);
  logoPackFaviconCropHeight.max = String(base.height);
  logoPackFaviconCropWidth.min = String(Math.min(base.width, Math.max(16, Math.floor(base.width * 0.05))));
  logoPackFaviconCropHeight.min = String(Math.min(base.height, Math.max(16, Math.floor(base.height * 0.05))));
  logoPackFaviconCropX.value = String(crop.x);
  logoPackFaviconCropY.value = String(crop.y);
  logoPackFaviconCropWidth.value = String(crop.width);
  logoPackFaviconCropHeight.value = String(crop.height);
  const usable = faviconSourceCanProduceLargestIcon(crop);
  logoPackFaviconSelectionStatus.textContent = usable
    ? `${crop.width} × ${crop.height} px selected. The chosen artwork will be trimmed, then fitted into square icon outputs.`
    : `${crop.width} × ${crop.height} px selected. Choose a larger area to avoid excessive enlargement.`;
  logoPackFaviconSelectionStatus.className = usable
    ? 'text-xs text-slate-600 dark:text-slate-400'
    : 'text-xs font-semibold text-amber-700 dark:text-amber-400';
  logoPackFaviconConfirm.disabled = !usable;
  updateFaviconCropOverlay();
  const baseSource = logoPack.getFaviconSourceBase();

  if (baseSource !== undefined) {
    showFaviconPreview(baseSource.blob, crop);
  }
}

function setFaviconCrop(next: FreeformCropSelection): void {
  const base = logoPack.getFaviconSourceBase();

  if (base === undefined) {
    return;
  }

  faviconCrop = constrainFreeformCrop(next, base);
  logoPack.clearFaviconSource();
  updateFaviconCropControls();
}

function resetFaviconDraft(base: NonNullable<ReturnType<typeof logoPack.getFaviconSourceBase>>): void {
  faviconPreparationToken += 1;
  releaseFaviconUrls();
  faviconBaseBlob = base.blob;
  faviconBaseUrl = URL.createObjectURL(base.blob);
  logoPackFaviconCropImage.src = faviconBaseUrl;
  logoPackFaviconCropStage.style.aspectRatio = String(Math.min(4, Math.max(1, base.width / base.height)));
  faviconCrop = createInitialFreeformCrop(base);
  faviconAlternatePrepared = undefined;
  logoPackFaviconAlternateFile.value = '';
  logoPackFaviconAlternateStatus.classList.add('hidden');
  faviconDraftKind = base.suitability.suitable ? 'full-logo' : undefined;
  hideFaviconPreview();

  if (faviconDraftKind === 'full-logo') {
    showFaviconPreview(base.blob);
  }
}

function renderFaviconSourceStep(processing: boolean): void {
  const base = logoPack.getFaviconSourceBase();
  const visible = base !== undefined && logoPack.getState().status !== 'success' && logoPackModalStep === 4;
  const approved = logoPack.getApprovedFaviconSource();
  logoPackFaviconConfirmed.classList.toggle('hidden', approved === undefined);
  logoPackFaviconConfirmed.textContent = approved === undefined
    ? ''
    : `✓ Favicon source confirmed: ${faviconSourceLabel(approved.kind)}`;
  logoPackFaviconSource.classList.toggle('hidden', !visible);
  logoPackFaviconSource.classList.toggle('flex', visible);

  if (!visible || base === undefined) {
    if (base === undefined && faviconBaseBlob !== undefined) {
      faviconBaseBlob = undefined;
      faviconDraftKind = undefined;
      faviconCrop = undefined;
      faviconAlternatePrepared = undefined;
      releaseFaviconUrls();
    }

    return;
  }

  if (faviconBaseBlob !== base.blob) {
    resetFaviconDraft(base);
  }

  const unsuitable = !base.suitability.suitable;
  logoPackFaviconGuidance.textContent = unsuitable
    ? `Your full logo would render at about ${formatProjectedFaviconDimension(base.suitability.projectedWidth)} × ${formatProjectedFaviconDimension(base.suitability.projectedHeight)} px inside a 32 px favicon. Choose a compact part, use another icon, or keep the full logo.`
    : `Your prepared logo remains clear at about ${formatProjectedFaviconDimension(base.suitability.projectedWidth)} × ${formatProjectedFaviconDimension(base.suitability.projectedHeight)} px inside a 32 px favicon. Preview and confirm the source before creating the pack.`;
  logoPackFaviconFullDescription.textContent = unsuitable
    ? 'Keep the entire logo. It may be difficult to recognize at browser-tab size.'
    : 'Keep the entire prepared logo in every square icon.';

  logoPackFaviconOptionCrop.checked = faviconDraftKind === 'selected-region';
  logoPackFaviconOptionAlternate.checked = faviconDraftKind === 'alternate-icon';
  logoPackFaviconOptionFull.checked = faviconDraftKind === 'full-logo';
  logoPackFaviconCropPanel.classList.toggle('hidden', faviconDraftKind !== 'selected-region');
  logoPackFaviconCropPanel.classList.toggle('flex', faviconDraftKind === 'selected-region');
  logoPackFaviconAlternatePanel.classList.toggle('hidden', faviconDraftKind !== 'alternate-icon');
  logoPackFaviconAlternatePanel.classList.toggle('flex', faviconDraftKind === 'alternate-icon');

  logoPackFaviconConfirm.textContent = approved?.kind === faviconDraftKind
    ? 'Favicon source confirmed'
    : 'Confirm favicon source';
  logoPackFaviconConfirm.disabled = processing || faviconDraftKind === undefined || (
    faviconDraftKind === 'alternate-icon' && faviconAlternatePrepared === undefined
  );

  if (faviconDraftKind === 'selected-region') {
    updateFaviconCropControls();
  } else if (faviconDraftKind === 'full-logo') {
    showFaviconPreview(base.blob);
  } else if (faviconDraftKind === 'alternate-icon' && faviconAlternatePrepared !== undefined) {
    showFaviconPreview(faviconAlternatePrepared.blob);
  } else if (faviconDraftKind === undefined || faviconDraftKind === 'alternate-icon') {
    hideFaviconPreview();
  }

  applyFaviconPreviewTheme();
}

function renderLogoPack(): void {
  const workflowState = workflow.getState();
  const source = currentSource(workflowState);
  const logoPackState = logoPack.getState();
  const mode = logoPack.getMode();
  const processing = logoPackState.status === 'processing';
  const preparingPreview = logoPackState.status === 'preparing-preview';
  const busy = processing || preparingPreview;

  // Reset the reveal gate on the rising edge of a new packaging run —
  // mirrors `workflowRevealGate`'s identical reset in `render()`
  // (FSG-007-FIT-003).
  if (logoPackState.status === 'processing' && previousLogoPackStatus !== 'processing') {
    logoPackRevealGate.reset();
    logoPackMinDwellGate.reset();
    logoPackLastActivePhase = undefined;
  }

  previousLogoPackStatus = logoPackState.status;

  const logoPackPhase = applyMinimumDwell(
    logoPackProcessingPhase(logoPackState, logoPackRevealGate),
    logoPackMinDwellGate,
    logoPackLastActivePhase,
    (phase) => { logoPackLastActivePhase = phase; },
    renderAll,
  );
  // Hidden, not merely disabled — see the identical Quick Fit/Guided Fit treatment.
  logoPackChangeImageButton.classList.toggle('hidden', isActiveProcessingPhase(logoPackPhase));
  logoPackCloseButton.classList.toggle('hidden', isActiveProcessingPhase(logoPackPhase));

  if (source === undefined) {
    logoPackModalStep = 1;
  } else if (preparingPreview) {
    logoPackModalStep = 2;
  } else if (processing) {
    logoPackModalStep = 5;
  }

  const approvedFaviconSource = logoPack.getApprovedFaviconSource();

  if (advanceToReviewAfterFaviconApproval && approvedFaviconSource !== undefined) {
    logoPackModalStep = 5;
    advanceToReviewAfterFaviconApproval = false;
  }

  setModalProgress(
    logoPackProgress,
    logoPackModalStep,
    LOGO_PACK_STEP_LABELS,
    logoPackMobileStep,
    logoPackMobileTitle,
    logoPackMobileProgress,
    logoPackMobileProgressBar,
  );
  showModalStep(logoPackSteps, logoPackModalStep);
  logoPackModalCancelButton.classList.toggle('hidden', !busy);

  logoPackCompactStatus.textContent = source === undefined
    ? 'Choose a source image, then review background and icon choices in one focused flow.'
    : mode === undefined
      ? 'Source ready. Review suitability and choose how to prepare the background.'
      : logoPack.getApprovedFaviconSource() === undefined
        ? 'Preparation in progress. Review the logo and approve a favicon source.'
        : 'Logo and favicon sources are ready for final package review.';

  logoPackIssues.replaceChildren();

  let blocked = false;

  if (source !== undefined) {
    logoPackModalSourceName.textContent = source.file.name;
    // Same "FORMAT · W × H · SIZE" order Quick Fit/Guided Fit's source
    // confirmation uses — one shared visual/textual pattern across all
    // three task modals (FSG-007-FIT-001B-R1 directive §6/§8), not three
    // independently-formatted compositions.
    logoPackSourceMeta.textContent = `${source.preflight.format.toUpperCase()} · ${source.preflight.width} × ${source.preflight.height} · ${formatBytes(source.preflight.fileSize)}`;
    logoPackCompactSourceName.textContent = source.file.name;
    logoPackCompactSourceMeta.textContent = `${source.preflight.width} × ${source.preflight.height} · ${source.preflight.format.toUpperCase()} · ${formatBytes(source.preflight.fileSize)}`;
    const suitability = logoPack.suitability();
    blocked = suitability?.blocked ?? false;

    for (const issue of suitability?.issues ?? []) {
      const item = document.createElement('li');
      item.className = issueTextClass(issue.severity);
      item.textContent = issue.message;
      item.setAttribute('role', issue.severity === 'blocking' ? 'alert' : 'status');
      logoPackIssues.appendChild(item);
    }

    if (suitability !== undefined && suitability.issues.length === 0) {
      const item = document.createElement('li');
      item.className = 'text-zinc-600 dark:text-zinc-400';
      item.textContent = 'This logo looks ready to prepare.';
      logoPackIssues.appendChild(item);
    }
  }

  // Background-mode choice (directive §5) — reflected, never re-selected by rendering.
  logoPackModeTransparent.checked = mode === 'transparent';
  logoPackModeOriginal.checked = mode === 'original';
  logoPackModeTransparent.disabled = source === undefined || processing || preparingPreview;
  logoPackModeOriginal.disabled = source === undefined || processing || preparingPreview;

  // Removal strength — hidden entirely for an already-transparent source, where it would be meaningless (directive §15).
  const previewMaster = logoPackPreviewMaster(logoPackState);
  const showStrength = mode === 'transparent' && previewMaster?.removalApplied !== false;
  logoPackStrengthFieldset.classList.toggle('hidden', !showStrength);
  logoPackStrengthFieldset.classList.toggle('flex', showStrength);

  const strength = logoPack.getStrength();
  logoPackStrengthGentle.checked = strength === 'gentle';
  logoPackStrengthBalanced.checked = strength === 'balanced';
  logoPackStrengthStrong.checked = strength === 'strong';
  const strengthDisabled = processing || preparingPreview;
  logoPackStrengthGentle.disabled = strengthDisabled;
  logoPackStrengthBalanced.disabled = strengthDisabled;
  logoPackStrengthStrong.disabled = strengthDisabled;

  // Preview progress / failure copy (directive §29).
  if (logoPackState.status === 'preparing-preview') {
    logoPackPreviewStatus.textContent = describeLogoPackPreviewStage(logoPackState.stage);
    logoPackPreviewStatus.classList.remove('hidden');
  } else if (logoPackState.status === 'preview-failed') {
    logoPackPreviewStatus.textContent = describeProcessingError(logoPackState.error);
    logoPackPreviewStatus.classList.remove('hidden');
  } else {
    logoPackPreviewStatus.classList.add('hidden');
  }

  // Retry (directive §22 of FSG-005C): clicking an already-selected radio
  // fires no `change` event in any real browser, so re-selecting Transparent
  // is not an available retry path once it is already the current mode —
  // this explicit button is the real one. Shown whenever Transparent mode
  // is not currently mid-preparation and has no ready preview to show.
  const canRetryPreview = mode === 'transparent' && (logoPackState.status === 'cancelled' || logoPackState.status === 'preview-failed');
  logoPackRetryPreviewButton.classList.toggle('hidden', !canRetryPreview);

  // The transparent preview — one real generated Blob, three background
  // contexts (checkerboard/light/dark), never three different images
  // (directive §27).
  const showTransparentReview = logoPackModalStep === 3 && previewMaster !== undefined;
  logoPackPreview.classList.toggle('hidden', !showTransparentReview);
  logoPackPreview.classList.toggle('flex', showTransparentReview);
  logoPackOriginalReview.classList.toggle('hidden', logoPackModalStep !== 3 || mode !== 'original');

  if (previewMaster !== undefined && previewMaster !== lastRenderedLogoPackMaster) {
    releaseLogoPackPreviewUrl();
    lastRenderedLogoPackMaster = previewMaster;
    logoPackPreviewUrl = URL.createObjectURL(previewMaster.blob);
    logoPackPreviewImage.src = logoPackPreviewUrl;
  } else if (previewMaster === undefined) {
    releaseLogoPackPreviewUrl();
  }

  if (previewMaster !== undefined) {
    // Mechanical verification vocabulary only — never "perfect"/"flawless"
    // claims, and status is never conveyed by colour alone (icon + text
    // together (directive §25)).
    if (previewMaster.status === 'verified') {
      logoPackPreviewConfidence.textContent = '✓ Transparent background verified';
      logoPackPreviewConfidence.className = 'text-sm font-semibold text-emerald-700 dark:text-emerald-400';
    } else if (previewMaster.status === 'needs-review') {
      logoPackPreviewConfidence.textContent = '⚠ Please review the edges before continuing';
      logoPackPreviewConfidence.className = 'text-sm font-semibold text-amber-700 dark:text-amber-400';
    } else {
      logoPackPreviewConfidence.textContent = '✕ We couldn’t produce a clean transparent background';
      logoPackPreviewConfidence.className = 'text-sm font-semibold text-red-700 dark:text-red-400';
    }

    const visibleDimensions = previewMaster.visibleBounds ?? previewMaster.normalizedDimensions;
    const resolutionStatus = assessResolution(visibleDimensions).status;
    logoPackPreviewOriginalDimensions.textContent = `${previewMaster.sourceDimensions.width} × ${previewMaster.sourceDimensions.height}`;
    logoPackPreviewPreparedDimensions.textContent = `${previewMaster.width} × ${previewMaster.height}`;
    logoPackPreviewCanvas.textContent = previewMaster.canvasTrimmed ? 'Trimmed to your logo' : 'Already closely fitted';
    logoPackPreviewResolution.textContent = resolutionStatus === 'good' ? 'Source detail preserved' : 'Low-source warning';
    logoPackPreviewResolution.className = resolutionStatus === 'good'
      ? 'mt-1 font-semibold text-emerald-700 dark:text-emerald-400'
      : 'mt-1 font-semibold text-amber-700 dark:text-amber-400';
  }

  applyLogoPackPreviewBackground();
  renderFaviconSourceStep(processing || preparingPreview);

  // FSG-007-FIT-003-R4: Logo Pack's dialog closes synchronously the instant
  // "Generate logo pack" is confirmed (`closeWorkflowDialogForProcessing`),
  // before a run can ever reach 'processing'/'ready'/'failed' while still
  // open — there is no in-modal processing/failure presentation to show
  // any more (the full-page overlay owns all of that; see
  // `renderProcessingOverlay`). Step 5's package review is therefore always
  // the current step-5 content while the dialog is actually open.
  const showFinalReview = logoPackModalStep === 5 && approvedFaviconSource !== undefined;
  logoPackFinalReview.classList.toggle('hidden', !showFinalReview);

  if (approvedFaviconSource !== undefined) {
    logoPackFinalFaviconSource.textContent = faviconSourceLabel(approvedFaviconSource.kind);
    logoPackFinalBackground.textContent = mode === 'transparent'
      ? previewMaster?.status === 'verified' ? 'Transparent · Verified' : 'Transparent · Needs review'
      : 'Existing background';
    const headerPreviewUrl = mode === 'transparent' ? logoPackPreviewUrl : faviconBaseUrl;

    if (headerPreviewUrl !== undefined) {
      logoPackFinalHeaderPreview.src = headerPreviewUrl;
    }

    drawFaviconPreview();
  }

  // Not navigable away during the brief 'ready' beat either — the atomic
  // handoff is already imminent by then (FSG-007-FIT-003 directive §17/§30).
  logoPackStepBackButton.classList.toggle('hidden', logoPackModalStep === 1 || busy || logoPackPhase.kind === 'ready');
  logoPackStepContinueButton.classList.toggle('hidden', logoPackModalStep > 3 || busy || source === undefined);
  logoPackStepContinueButton.textContent = 'Continue';
  logoPackStepContinueButton.disabled = logoPackModalStep === 1
    ? source === undefined || blocked
    : logoPackModalStep === 2
      ? mode === undefined || (mode === 'transparent' && previewMaster === undefined)
      : logoPackModalStep === 3
        ? mode === undefined || (mode === 'transparent' && isTransparentPackagingBlocked(logoPackState))
        : true;
  logoPackFaviconConfirm.classList.toggle('hidden', logoPackModalStep !== 4 || busy);

  // The CTA's label reflects the chosen mode; it stays disabled until
  // packaging is actually allowed to proceed (directive §28).
  logoPackCreateButton.textContent = mode === 'transparent' ? 'Generate transparent logo pack' : 'Generate logo pack';
  logoPackCreateButton.classList.toggle('hidden', logoPackModalStep !== 5 || approvedFaviconSource === undefined);
  logoPackCreateButton.disabled =
    source === undefined ||
    mode === undefined ||
    processing ||
    blocked ||
    logoPack.getApprovedFaviconSource() === undefined ||
    (mode === 'transparent' && isTransparentPackagingBlocked(logoPackState));

  if (logoPackState.status !== 'success' || logoPackState.result !== lastRenderedLogoPackResult) {
    releaseLogoPackUrls();
  }

  // The atomic Ready → close-modal + populate-GO handoff (FSG-007-FIT-003):
  // GO's own content below is populated unconditionally while status stays
  // 'success' — strictly before this gate's timer can ever fire — so there
  // is no render in which the dialog is closed while `#logo-pack-result`
  // is still empty.
  if (logoPackPhase.kind === 'ready') {
    logoPackRevealGate.armIfNeeded(() => {
      // Set directly here, not left for a later render to pick up
      // `isRevealed()` — nothing else changes state once a job has
      // already settled to 'success', so no further render would
      // otherwise ever occur to apply it (mirrors Quick Fit/Guided Fit's
      // identical direct `setStatus` call in their own shared onReveal).
      if (guidedFit.getMode() === 'logo-pack') {
        setStatus('Your logo pack is ready.', 'success');
      }

      announce('Your logo pack is ready to download.');
      closeWorkflowDialog(logoPackDialog);
      // A fresh render so every other piece of UI (button visibility, the
      // glyph's `data-phase`, etc.) also picks up the now-revealed gate —
      // nothing else changes state once a job has settled to 'success', so
      // no render would otherwise ever happen after this timer fires.
      renderAll();
    }, READY_DWELL_MS);
  }

  if (logoPackState.status === 'success') {
    lastRenderedLogoPackResult = logoPackState.result;
    resultEmpty.classList.add('hidden');
    logoPackResult.classList.remove('hidden');
    logoPackResult.classList.add('flex');

    const preparation = logoPackState.preparation;
    logoPackResultReadiness.classList.toggle('hidden', preparation === undefined);
    logoPackResultReadiness.classList.toggle('flex', preparation !== undefined);

    if (preparation !== undefined) {
      logoPackResultOriginalDimensions.textContent = `${preparation.sourceDimensions.width} × ${preparation.sourceDimensions.height}`;
      logoPackResultPreparedDimensions.textContent = `${preparation.preparedDimensions.width} × ${preparation.preparedDimensions.height}`;
      logoPackResultTransparency.textContent = preparation.transparencyStatus === 'verified' ? 'Verified' : 'Needs review';
      logoPackResultTransparency.className = preparation.transparencyStatus === 'verified'
        ? 'mt-1 font-semibold text-emerald-700 dark:text-emerald-400'
        : 'mt-1 font-semibold text-amber-700 dark:text-amber-400';
      logoPackResultCanvas.textContent = preparation.canvasTrimmed ? 'Trimmed to your logo' : 'Already closely fitted';
      logoPackResultResolution.textContent = preparation.resolutionStatus === 'good'
        ? 'Source detail preserved at full resolution.'
        : 'Source logo resolution is low. It may look soft when displayed larger.';
      logoPackResultResolution.className = preparation.resolutionStatus === 'good'
        ? 'text-sm text-zinc-600 dark:text-zinc-400'
        : 'text-sm font-medium text-amber-700 dark:text-amber-400';
    }

    logoPackResultFaviconSource.textContent = faviconSourceLabel(logoPackState.faviconSourceKind);

    if (logoPackAssetUrls.length === 0) {
      const result = logoPackState.result;

      if (result.archive !== undefined) {
        logoPackZipUrl = URL.createObjectURL(result.archive.blob);
        logoPackDownloadZip.href = logoPackZipUrl;
        logoPackDownloadZip.download = result.archive.filename;
      }

      logoPackAssetsList.replaceChildren();

      for (const asset of result.assets) {
        const url = URL.createObjectURL(asset.blob);
        logoPackAssetUrls.push(url);

        const item = document.createElement('li');
        item.className = 'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800';

        const info = document.createElement('div');
        // A flex item with no explicit width defaults to its content's
        // intrinsic width (min-width: auto), which lets a long filename or
        // asset explanation force this row (and the page) wider than a
        // narrow viewport instead of wrapping — found via FSG-006's 320px
        // mobile-viewport audit (directive §11/§12). `min-w-0` lets the text
        // wrap normally within the row instead.
        info.className = 'min-w-0 flex-1';
        const name = document.createElement('p');
        name.className = 'text-sm font-semibold';
        name.textContent = asset.filename;
        const detail = document.createElement('p');
        detail.className = 'text-xs text-zinc-500 dark:text-zinc-400';
        const sizeLabel = asset.kind === 'ico'
          ? `ICO · ${asset.sizes.join('/')} px · ${formatBytes(asset.byteSize)}`
          : `${formatLabel(asset.format)} · ${asset.width} × ${asset.height} · ${formatBytes(asset.byteSize)}`;
        detail.textContent = `${LOGO_PACK_ASSET_EXPLANATIONS[asset.id] ?? ''} — ${sizeLabel}`;
        info.appendChild(name);
        info.appendChild(detail);

        const download = document.createElement('a');
        download.href = url;
        download.download = asset.filename;
        // The visible label stays short ("Download") since the filename is
        // already shown above; a `whitespace-nowrap` label including the
        // filename forced this button wider than a 320px viewport — found
        // via FSG-006's mobile-viewport audit (directive §11/§12). The
        // accessible name still carries the full, distinct filename.
        download.textContent = 'Download';
        download.setAttribute('aria-label', `Download ${asset.filename}`);
        download.className = 'min-h-11 flex shrink-0 items-center whitespace-nowrap rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800';

        item.appendChild(info);
        item.appendChild(download);
        logoPackAssetsList.appendChild(item);
      }
    }
  } else {
    logoPackResult.classList.add('hidden');
    logoPackResult.classList.remove('flex');
    logoPackResultReadiness.classList.add('hidden');
    logoPackResultReadiness.classList.remove('flex');
  }
}

function render(state: QuickFitState): void {
  // Reset the shared reveal gate exactly once, on the rising edge of a
  // genuinely new run starting — never mid-run, and critically not left
  // 'revealed' from a previous run once a later run reaches 'success'
  // again (FSG-007-FIT-003; see `workflowRevealGate`'s declaration).
  if (state.status === 'processing' && previousWorkflowStatus !== 'processing') {
    workflowRevealGate.reset();
    workflowMinDwellGate.reset();
    quickFitLastActivePhase = undefined;
  }

  previousWorkflowStatus = state.status;

  const hasSource = state.status !== 'idle';
  const activeSourceFile = currentSource(state)?.file;

  if (activeSourceFile !== modalStepSourceFile) {
    modalStepSourceFile = activeSourceFile;
    guidedFitStep = 'destination';
    guidedFitCropStageController.release();
    logoPackModalStep = 1;
    advanceToReviewAfterFaviconApproval = false;
    logoPackFaviconFineTune.open = false;
    workflowRevealGate.reset();
    logoPackRevealGate.reset();
    workflowMinDwellGate.reset();
    logoPackMinDwellGate.reset();
    quickFitLastActivePhase = undefined;
    logoPackLastActivePhase = undefined;
    // A new source invalidates any confirmed crop and returns Quick Fit's
    // dialog to its requirements step (FSG-007-FIT-001 directive §16/§25).
    quickFitDialogStep = 'requirements';
    quickFitCropConfirmed = undefined;
    quickFitUpscaleWasRequired = false;
    quickFitCropStageController.release();
    renderQuickFitDialogStep();
    renderSourceThumbnails(currentSource(state));
    renderSourceMetadataText(currentSource(state));

    // A source just became available while a launcher/deep-link request
    // was waiting on it — resume straight into the originally-requested
    // task instead of leaving the user to remember what they were doing
    // (FSG-007-FIT-001B directive §9/§24/§25).
    if (activeSourceFile !== undefined && pendingWorkflowIntent !== undefined) {
      requestWorkflowEntry(pendingWorkflowIntent, quickFitOpenButton);
    }
  }

  // The FILE area has exactly one visual state at a time once a source is
  // actually confirmed (FSG-007-FIT-001B-R1 directive §2/§5) — the drop-zone
  // placeholder hides in favor of the enlarged source-confirmation card,
  // rather than both a filename-bearing drop-zone and a metadata card
  // showing simultaneously. `activeSourceFile` (not the broader `hasSource`)
  // is deliberately used here: a rejected file still has nowhere useful to
  // show a thumbnail, so the drop-zone stays available to retry, exactly as
  // it did before this pass.
  const confirmedSourceExists = activeSourceFile !== undefined;
  dropZone.classList.toggle('hidden', confirmedSourceExists);
  sourcePanel.classList.toggle('hidden', !hasSource);
  sourceRejectedMessage.classList.add('hidden');
  sourceSummary.classList.remove('hidden');

  const mode = guidedFit.getMode();
  resultTitle.textContent = mode === 'logo-pack' ? 'Ready package' : 'Ready file';

  const processing = state.status === 'processing';
  const sourceReady = hasSource && state.status !== 'inspecting' && state.status !== 'file-rejected';
  // The three launcher buttons stay clickable for the genuinely-idle "no
  // source chosen yet" case — that's exactly when `requestWorkflowEntry`
  // must be able to fire and show the source-required gate, rather than a
  // disabled button silently doing nothing (FSG-007-FIT-001B directive
  // §7/§30). They're only disabled for the momentary mid-preflight state
  // and for an already-rejected file, which already has its own truthful
  // in-place error (`#source-rejected-message`) — a generic gate there
  // would be redundant.
  const launcherBlocked = state.status === 'inspecting' || state.status === 'file-rejected';
  setFieldsDisabled(processing);
  processButton.disabled = processing || !sourceReady;
  quickFitOpenButton.disabled = launcherBlocked;
  guidedFitOpenButton.disabled = launcherBlocked;
  logoPackOpenButton.disabled = launcherBlocked;
  quickFitCompactStatus.textContent = sourceReady
    ? 'Set your own dimensions, size target and format.'
    : 'Choose an image above, then set your own dimensions, size target and format.';
  quickFitModalCancelButton.classList.toggle('hidden', !processing || quickFitDialogStep === 'crop');

  // Quick Fit's own processing step (FSG-007-FIT-003). Two terminal
  // outcomes return straight to the requirements step, no extra "Back"
  // FSG-007-FIT-003-R4: Quick Fit's dialog no longer has an in-modal
  // processing step to represent any phase — it closes synchronously the
  // instant a run is confirmed (`closeWorkflowDialogForProcessing`), before
  // the run can ever reach 'processing'/'ready'/'failed'/'cancelled' while
  // still open. `quickFitPhase` therefore only drives the full-page
  // overlay (`renderProcessingOverlay`) and the button-visibility toggles
  // just below, not any dialog-local copy.
  const quickFitPhase = applyMinimumDwell(
    quickFitProcessingPhase(state, workflowRevealGate),
    workflowMinDwellGate,
    quickFitLastActivePhase,
    (phase) => { quickFitLastActivePhase = phase; },
    renderAll,
  );
  // Hidden, not merely disabled — see the identical Guided Fit/Logo Pack treatment.
  quickFitChangeImageButton.classList.toggle('hidden', isActiveProcessingPhase(quickFitPhase));
  quickFitCloseButton.classList.toggle('hidden', isActiveProcessingPhase(quickFitPhase));
  renderQuickFitDialogStep();

  // The atomic Ready → close-modal + populate-GO handoff (FSG-007-FIT-003):
  // a real result already exists the instant status becomes 'success' — GO
  // itself is populated unconditionally by the switch below, strictly
  // before this gate's timer can ever fire, so there is no render in which
  // a dialog is closed while GO is still empty. Computed centrally here
  // (not inside `renderGuidedFit()`, which returns early whenever no
  // preset is selected — exactly the case for a run Quick Fit's own manual
  // form initiated) and shared between both dialogs, since Quick Fit and
  // Guided Fit read the same underlying `QuickFitState` and only one of
  // their two dialogs is ever open at a time.
  if (quickFitPhase.kind === 'ready') {
    workflowRevealGate.armIfNeeded(() => {
      setStatus('Your file is ready.', 'success');
      announce('Your file is ready to download.');
      closeWorkflowDialog(quickFitDialog);
      closeWorkflowDialog(guidedFitDialog);
      // Reopening Quick Fit afterward (e.g. to run a second job against the
      // same source) must land back on its real requirements step, not the
      // just-finished processing section it closed from. Guided Fit's own
      // step is deliberately left untouched here — it already stays on
      // 'prepare' after success (pre-existing behavior this milestone does
      // not change), so reopening still lets the user navigate Back through
      // Review to Destination exactly as before.
      quickFitDialogStep = 'requirements';
      renderQuickFitDialogStep();
      // A fresh render so every other piece of UI (Guided Fit's own button
      // visibility, the glyph's `data-phase`, etc.) also picks up the
      // now-revealed gate — nothing else changes state once a job has
      // settled to 'success', so no render would otherwise ever happen
      // after this timer fires.
      renderAll();
    }, READY_DWELL_MS);
  }
  cancelButton.classList.toggle('hidden', !processing);
  resetButton.classList.toggle('hidden', !hasSource || state.status === 'inspecting');

  showResultPanel('empty');
  resultPreparedFor.classList.add('hidden');
  unreachableAdjustButton.classList.add('hidden');

  renderModeTabs();
  renderGuidedFit();
  renderLogoPack();

  switch (state.status) {
    case 'idle':
      dropZoneLabel.textContent = 'Drop an image here, or choose a file';
      setStatus('Choose a supported image to begin.', 'idle');
      break;

    case 'inspecting':
      dropZoneLabel.textContent = state.file.name;
      sourceName.textContent = state.file.name;
      sourceSummary.classList.add('hidden');
      setStatus('Checking file...', 'inspecting');
      break;

    case 'file-rejected':
      dropZoneLabel.textContent = state.file.name;
      sourceName.textContent = state.file.name;
      sourceSummary.classList.add('hidden');
      sourceRejectedMessage.textContent = state.message;
      sourceRejectedMessage.classList.remove('hidden');
      setStatus('This file can’t be used.', 'error');
      announce(`File rejected: ${state.message}`);
      break;

    case 'ready':
    case 'processing':
    case 'success':
    case 'unreachable':
    case 'failed':
    case 'cancelled': {
      const source = state.status === 'success' ? state.result.source : state.source;
      dropZoneLabel.textContent = source.file.name;
      sourceName.textContent = source.file.name;
      sourceFormat.textContent = source.preflight.format.toUpperCase();
      sourceDimensions.textContent = `${source.preflight.width} × ${source.preflight.height}`;
      sourceSize.textContent = formatBytes(source.preflight.fileSize);

      if (source.file !== lastConfiguredFile) {
        lastConfiguredFile = source.file;
        configureOutputFormatForSource(source.preflight.format);
      }

      updateTargetSizeDependentFields();

      if (state.status === 'ready') {
        setStatus('Ready. Set your requirement and get your file ready.', 'ready');
      } else if (state.status === 'processing') {
        setStatus('Getting your file ready...', 'processing');
      } else if (state.status === 'success') {
        const summary = buildSuccessSummary(source.preflight, state.result.data);
        resultHeadline.textContent = summary.headline;
        resultFilename.textContent = state.result.filename;
        resultDetail.textContent = summary.reductionLabel === undefined
          ? summary.detail
          : `${summary.detail} ${summary.reductionLabel}.`;
        resultDimensions.textContent = `${state.result.data.width} × ${state.result.data.height}`;
        resultFormat.textContent = formatLabel(state.result.data.format);
        resultSize.textContent = formatBytes(state.result.data.byteSize);
        downloadLink.href = state.result.downloadUrl;
        downloadLink.download = state.result.filename;

        const resultPresetId = guidedFit.getResultPresetId();
        if (resultPresetId !== undefined) {
          resultPreparedForValue.textContent = getAllPresets().find((preset) => preset.id === resultPresetId)?.title ?? '';
          resultPreparedFor.classList.remove('hidden');
        }

        showResultPanel('content');
        // The atomic Ready → close-modal + populate-GO handoff
        // (FSG-007-FIT-003): GO's own content above is populated
        // unconditionally the instant status becomes 'success' — strictly
        // before `workflowRevealGate`'s onReveal callback (see
        // `renderGuidedFit()`) can ever fire — so there is no render in
        // which the announced/status-bar "success" lags behind or races
        // ahead of GO's real content. The status bar and live-region
        // announcement are deliberately held at "processing" until the
        // gate actually reveals, matching what the still-open dialog is
        // telling the user in the same moment.
        if (workflowRevealGate.isRevealed()) {
          setStatus('Your file is ready.', 'success');
        } else {
          setStatus('Getting your file ready...', 'processing');
        }
      } else if (state.status === 'unreachable') {
        const explanation = describeUnreachable(state.outcome, allowDimensionReduction.checked ? 'flexible' : 'hard', outputFormatSelect.value as OutputImageFormat);
        unreachableMessage.textContent = explanation.message;
        unreachableSuggestion.textContent = explanation.suggestion;
        unreachableAdjustButton.classList.toggle('hidden', guidedFit.getResultPresetId() === undefined);
        showResultPanel('unreachable');
        setStatus('That limit couldn’t be reached. Adjust your requirements and try again.', 'unreachable');
        announce(explanation.message);
      } else if (state.status === 'failed') {
        const message = describeProcessingError(state.error);
        errorMessage.textContent = message;
        showResultPanel('error');
        setStatus(message, 'error');
        announce(message);
      } else if (state.status === 'cancelled') {
        setStatus('Processing cancelled. Adjust your requirements and try again.', 'cancelled');
        announce('Processing cancelled.');
      }

      break;
    }
  }

  // Logo Pack has its own processing/result state, independent of the
  // Quick Fit workflow's state above — this has the final say on the
  // shared status bar/cancel/reset controls whenever Logo Pack is the
  // active mode, since `workflow` itself typically just sits at 'ready'
  // while a Logo Pack job runs (directive §38/§39).
  if (guidedFit.getMode() === 'logo-pack') {
    const logoPackState = logoPack.getState();
    const logoPackBusy = logoPackState.status === 'processing' || logoPackState.status === 'preparing-preview';

    cancelButton.classList.toggle('hidden', !logoPackBusy);
    resetButton.classList.toggle('hidden', currentSource(state) === undefined);

    if (logoPackState.status === 'preparing-preview') {
      setStatus(describeLogoPackPreviewStage(logoPackState.stage), 'processing');
    } else if (logoPackState.status === 'preview-ready') {
      if (logoPackState.master.status === 'verified') {
        setStatus('Transparent background verified. Review the preview, then create your logo pack.', 'ready');
      } else if (logoPackState.master.status === 'needs-review') {
        setStatus('Preview ready — please review the edges before creating your logo pack.', 'ready');
        announce('Preview ready. Please review the edges before continuing.');
      } else {
        setStatus('We couldn’t produce a clean transparent background. Try Gentle strength, or keep the existing background.', 'error');
        announce('We couldn’t produce a clean transparent background.');
      }
    } else if (logoPackState.status === 'preview-failed') {
      const message = describeProcessingError(logoPackState.error);
      setStatus(message, 'error');
      announce(message);
    } else if (logoPackState.status === 'processing') {
      setStatus('Creating your logo pack...', 'processing');
    } else if (logoPackState.status === 'success') {
      // Gated on the atomic reveal exactly like Quick Fit/Guided Fit's own
      // success handling above — see `renderLogoPack()`'s `onReveal`
      // (FSG-007-FIT-003).
      if (logoPackRevealGate.isRevealed()) {
        setStatus('Your logo pack is ready.', 'success');
      } else {
        setStatus('Creating your logo pack...', 'processing');
      }
    } else if (logoPackState.status === 'failed') {
      const message = describeProcessingError(logoPackState.error);
      setStatus(message, 'error');
      announce(message);
    } else if (logoPackState.status === 'cancelled') {
      setStatus('Logo pack creation cancelled. You can try again.', 'cancelled');
      announce('Logo pack creation cancelled.');
    } else if (currentSource(state) !== undefined && logoPack.getMode() === undefined) {
      setStatus('Choose how to prepare your logo to continue.', 'ready');
    } else if (currentSource(state) !== undefined) {
      setStatus('Review the suitability notes, then create your logo pack.', 'ready');
    }
  }

  renderProcessingOverlay(state, logoPack.getState());
}

function renderAll(): void {
  render(workflow.getState());
}

workflow.subscribe(renderAll);
guidedFit.subscribe(renderAll);
logoPack.subscribe(renderAll);
renderAll();

function openFilePicker(): void {
  sourceInput.click();
}

dropZone.addEventListener('click', openFilePicker);
dropZone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openFilePicker();
  }
});

dropZone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropZone.classList.add('border-blue-500');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('border-blue-500');
});

dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropZone.classList.remove('border-blue-500');
  const file = event.dataTransfer?.files?.[0];

  if (file !== undefined) {
    void workflow.selectFile(file);
  }
});

sourceInput.addEventListener('change', () => {
  const file = sourceInput.files?.[0];

  if (file !== undefined) {
    void workflow.selectFile(file);
  }
});

outputFormatSelect.addEventListener('change', () => {
  const source = currentSource(workflow.getState());

  if (source !== undefined) {
    updateFormatWarnings(source.preflight.format);
  }

  // Format doesn't affect geometry, so any confirmed crop/upscale approval
  // remains valid — only the shown result is stale (directive §10/§24).
  workflow.invalidateResult();
});

targetSizeValue.addEventListener('input', () => {
  workflow.invalidateResult();
  updateTargetSizeDependentFields();
});

for (const dimensionInput of [maxWidthInput, maxHeightInput]) {
  dimensionInput.addEventListener('input', () => {
    workflow.invalidateResult();
    // A geometry-affecting change invalidates any confirmed crop/upscale
    // approval — never silently reused against a changed requirement
    // (directive §16/§25).
    quickFitCropConfirmed = undefined;
    quickFitUpscaleApprove.checked = false;
    quickFitUpscaleWasRequired = false;
    updateExactModeFields();
  });
}

cancelButton.addEventListener('click', () => {
  workflow.cancel();
  logoPack.cancel();
});

resetButton.addEventListener('click', () => {
  workflow.reset();
  logoPack.reset();
  sourceInput.value = '';
  requirementsForm.reset();
  targetSizeError.classList.add('hidden');
  lastConfiguredFile = undefined;
  quickFitDialogStep = 'requirements';
  quickFitCropConfirmed = undefined;
  quickFitUpscaleWasRequired = false;
  quickFitCropStageController.release();
  workflowRevealGate.reset();
  logoPackRevealGate.reset();
  workflowMinDwellGate.reset();
  logoPackMinDwellGate.reset();
  quickFitLastActivePhase = undefined;
  logoPackLastActivePhase = undefined;
  renderQuickFitDialogStep();
});

quickFitCropBackButton.addEventListener('click', () => {
  quickFitDialogStep = 'requirements';
  renderQuickFitDialogStep();
});

quickFitUpscaleApprove.addEventListener('change', updateExactModeFields);

requirementsForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const source = currentSource(workflow.getState());

  if (source === undefined) {
    return;
  }

  const sourceDimensions = currentQuickFitSourceDimensions() ?? { width: source.preflight.width, height: source.preflight.height };
  const maxWidth = parsePositiveInt(maxWidthInput.value);
  const maxHeight = parsePositiveInt(maxHeightInput.value);

  if (
    quickFitDialogStep === 'requirements'
    && typeof maxWidth === 'number'
    && typeof maxHeight === 'number'
    && quickFitCropConfirmed === undefined
    && isCropRequired(sourceDimensions.width, sourceDimensions.height, maxWidth, maxHeight)
  ) {
    enterQuickFitCropStep(source.file, sourceDimensions, maxWidth, maxHeight);
    return;
  }

  const result = readForm(source.preflight.format, sourceDimensions);

  targetSizeError.classList.toggle('hidden', result.ok || result.errors.targetSize === undefined);
  noOpHint.classList.toggle('hidden', result.ok || result.errors.general === undefined);

  if (!result.ok) {
    if (result.errors.targetSize !== undefined) {
      targetSizeError.textContent = result.errors.targetSize;
    }

    if (result.errors.general !== undefined) {
      noOpHint.textContent = result.errors.general;
    }

    return;
  }

  // FSG-007-FIT-003-R3/R4: the modal's job ends at final confirmation — the
  // full-page transition represents the actual job from here on, not this
  // dialog. The dialog is closed synchronously (`...ForProcessing`), never
  // animated, so it can never still be visible (top layer) once the
  // full-page overlay opens.
  activeOverlayTask = { kind: 'quick-fit', context: () => quickFitTaskContext(source.preflight.format, result.requirements) };
  closeWorkflowDialogForProcessing(quickFitDialog);
  quickFitDialogStep = 'requirements';
  workflow.run(result.requirements);
});

// --- Mode switching (FSG-004 directive §15–§17, §26–§27) ---

function applyPrefill(prefill: ReturnType<typeof guidedFit.adjustSettings>): void {
  if (prefill === undefined) {
    return;
  }

  targetSizeValue.value = prefill.targetSizeValue;
  targetSizeUnit.value = prefill.targetSizeUnit;
  maxWidthInput.value = prefill.maxWidth;
  maxHeightInput.value = prefill.maxHeight;
  outputFormatSelect.value = prefill.outputChoice;
  allowDimensionReduction.checked = prefill.allowDimensionReduction;
  updateTargetSizeDependentFields();

  const source = currentSource(workflow.getState());

  if (source !== undefined) {
    updateFormatWarnings(source.preflight.format);
  }
}

// A mode-tab click only ever switches which launcher panel is shown (FSG-007-FIT-001B
// directive §31) — it never opens a modal itself, and an explicit tab
// choice is the user overriding whatever task they were previously routed
// toward, so it also clears any pending source-required intent.
modeTabQuickFit.addEventListener('click', () => {
  closeWorkflowDialog(guidedFitDialog);
  closeWorkflowDialog(logoPackDialog);
  pendingWorkflowIntent = undefined;
  guidedFit.setMode('quick-fit');
});

modeTabGuidedFit.addEventListener('click', () => {
  closeWorkflowDialog(quickFitDialog);
  closeWorkflowDialog(logoPackDialog);
  pendingWorkflowIntent = undefined;
  guidedFit.setMode('guided-fit');
});

modeTabLogoPack.addEventListener('click', () => {
  closeWorkflowDialog(quickFitDialog);
  closeWorkflowDialog(guidedFitDialog);
  pendingWorkflowIntent = undefined;
  guidedFit.setMode('logo-pack');
});

quickFitOpenButton.addEventListener('click', () => {
  requestWorkflowEntry('quick-fit', quickFitOpenButton);
});

guidedFitOpenButton.addEventListener('click', () => {
  requestWorkflowEntry('guided-fit', guidedFitOpenButton);
});

logoPackOpenButton.addEventListener('click', () => {
  requestWorkflowEntry('logo-pack', logoPackOpenButton);
});

sourceRequiredCloseButton.addEventListener('click', () => {
  closeWorkflowDialog(sourceRequiredDialog);
});

sourceRequiredChooseButton.addEventListener('click', () => {
  closeWorkflowDialog(sourceRequiredDialog);
  sourceInput.click();
});

// "Change image" invokes the same central source input directly, in place
// — no dialog close, no navigation (FSG-007-FIT-001B directive §12). The
// existing `activeSourceFile !== modalStepSourceFile` branch in `render()`
// already re-renders this same dialog's confirmation block and invalidates
// stale state once the new file lands.
sourceReplaceImage.addEventListener('click', () => {
  sourceInput.click();
});

quickFitChangeImageButton.addEventListener('click', () => {
  sourceInput.click();
});

guidedFitChangeImageButton.addEventListener('click', () => {
  sourceInput.click();
});

logoPackChangeImageButton.addEventListener('click', () => {
  sourceInput.click();
});

quickFitCloseButton.addEventListener('click', () => {
  if (isDialogActivelyProcessing(quickFitDialog)) {
    return;
  }

  closeWorkflowDialog(quickFitDialog);
});

guidedFitCloseButton.addEventListener('click', () => {
  if (isDialogActivelyProcessing(guidedFitDialog)) {
    return;
  }

  closeWorkflowDialog(guidedFitDialog);
});

logoPackCloseButton.addEventListener('click', () => {
  if (isDialogActivelyProcessing(logoPackDialog)) {
    return;
  }

  closeWorkflowDialog(logoPackDialog);
});

quickFitModalCancelButton.addEventListener('click', () => {
  workflow.cancel();
});

guidedFitModalCancelButton.addEventListener('click', () => {
  workflow.cancel();
});

logoPackModalCancelButton.addEventListener('click', () => {
  logoPack.cancel();
});

// --- Full-page processing transition actions (FSG-007-FIT-003-R3) ---
processingOverlayCancelButton.addEventListener('click', () => {
  if (activeOverlayTask?.kind === 'logo-pack') {
    logoPack.cancel();
  } else if (activeOverlayTask !== undefined) {
    workflow.cancel();
  }
});

processingOverlayBackButton.addEventListener('click', () => {
  const task = activeOverlayTask;
  activeOverlayTask = undefined;
  closeProcessingOverlay();

  if (task?.kind === 'logo-pack') {
    openWorkflowDialog(logoPackDialog, logoPackOpenButton);
  } else if (task?.kind === 'guided-fit') {
    openWorkflowDialog(guidedFitDialog, guidedFitOpenButton);
  } else if (task?.kind === 'quick-fit') {
    openWorkflowDialog(quickFitDialog, quickFitOpenButton);
  }
});

const modeTabs = [modeTabQuickFit, modeTabGuidedFit, modeTabLogoPack];

for (const tab of modeTabs) {
  tab.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
      return;
    }

    event.preventDefault();
    const currentIndex = modeTabs.indexOf(tab);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = modeTabs[(currentIndex + delta + modeTabs.length) % modeTabs.length];
    next.click();

    if (next === modeTabQuickFit) {
      next.focus();
    }
  });
}

for (const radio of presetRadios) {
  radio.addEventListener('change', () => {
    if (radio.checked) {
      guidedFit.selectPreset(radio.value);
      const preset = guidedFit.currentPreset();

      if (preset !== undefined) {
        const dimensions = describePresetDimensions(preset);
        const size = preset.requirements.targetBytes === undefined ? undefined : `under ${formatBytes(preset.requirements.targetBytes)}`;
        announce(`Recommendation: ${preset.title} — ${[formatLabel(preset.requirements.outputFormat), dimensions, size].filter(Boolean).join(', ')}.`);
      }
    }
  });
}

guidedStepContinueButton.addEventListener('click', () => {
  if (guidedFit.currentPreset() === undefined) {
    return;
  }

  guidedFitStep = 'review';
  renderAll();
});

guidedStepBackButton.addEventListener('click', () => {
  guidedFitStep = guidedFitStep === 'prepare' ? 'review' : 'destination';
  renderAll();
});

guidedFitCropBackButton.addEventListener('click', () => {
  guidedFitStep = 'review';
  renderAll();
});

guidedChangeDestinationButton.addEventListener('click', () => {
  guidedFitStep = 'destination';
  renderAll();
  presetRadios.find((radio) => radio.checked)?.focus();
});

guidedProcessButton.addEventListener('click', () => {
  attemptGuidedFitPrepare();
});

guidedFitUpscaleApprove.addEventListener('change', () => {
  guidedFit.setUpscaleApproved(guidedFitUpscaleApprove.checked);
});

guidedAdjustButton.addEventListener('click', () => {
  applyPrefill(guidedFit.adjustSettings());
  closeWorkflowDialog(guidedFitDialog);
  openWorkflowDialog(quickFitDialog, guidedAdjustButton);
});

unreachableAdjustButton.addEventListener('click', () => {
  applyPrefill(guidedFit.adjustSettings());
  openWorkflowDialog(quickFitDialog, unreachableAdjustButton);
});

logoPackCreateButton.addEventListener('click', () => {
  // FSG-007-FIT-003-R3/R4: the modal's job ends at final confirmation — the
  // full-page transition represents the actual job from here on. Closed
  // synchronously (see `closeWorkflowDialogForProcessing`) so the dialog can
  // never still be open (and therefore top-layer-visible) once the
  // full-page overlay opens.
  activeOverlayTask = { kind: 'logo-pack', context: logoPackTaskContext };
  closeWorkflowDialogForProcessing(logoPackDialog);
  logoPack.createLogoPack();
});

logoPackStepContinueButton.addEventListener('click', () => {
  const state = logoPack.getState();

  if (logoPackModalStep === 1 && currentSource(workflow.getState()) !== undefined && logoPack.suitability()?.blocked !== true) {
    logoPackModalStep = 2;
  } else if (logoPackModalStep === 2 && logoPack.getMode() !== undefined) {
    if (logoPack.getMode() === 'original' || state.status === 'preview-ready') {
      logoPackModalStep = 3;
    }
  } else if (logoPackModalStep === 3 && logoPack.getFaviconSourceBase() !== undefined) {
    logoPackModalStep = 4;
  }

  renderAll();
});

logoPackStepBackButton.addEventListener('click', () => {
  logoPackModalStep = Math.max(1, logoPackModalStep - 1) as LogoPackModalStep;
  logoPackFaviconFineTune.open = false;
  renderAll();
});

logoPackChangeBackgroundButton.addEventListener('click', () => {
  logoPackModalStep = 2;
  renderAll();
});

logoPackChangeFaviconButton.addEventListener('click', () => {
  logoPackModalStep = 4;
  renderAll();
});

for (const [radio, kind] of [
  [logoPackFaviconOptionCrop, 'selected-region'],
  [logoPackFaviconOptionAlternate, 'alternate-icon'],
  [logoPackFaviconOptionFull, 'full-logo'],
] as const) {
  radio.addEventListener('change', () => {
    if (!radio.checked) {
      return;
    }

    faviconDraftKind = kind;
    logoPack.clearFaviconSource();
    const base = logoPack.getFaviconSourceBase();

    if (kind === 'selected-region' && base !== undefined) {
      faviconCrop ??= createInitialFreeformCrop(base);
    }

    renderFaviconSourceStep(false);
  });
}

for (const input of [logoPackFaviconCropX, logoPackFaviconCropY, logoPackFaviconCropWidth, logoPackFaviconCropHeight]) {
  input.addEventListener('input', () => {
    if (faviconCrop === undefined) {
      return;
    }

    setFaviconCrop({
      x: Number(logoPackFaviconCropX.value),
      y: Number(logoPackFaviconCropY.value),
      width: Number(logoPackFaviconCropWidth.value),
      height: Number(logoPackFaviconCropHeight.value),
    });
  });
}

logoPackFaviconCropReset.addEventListener('click', () => {
  const base = logoPack.getFaviconSourceBase();

  if (base !== undefined) {
    setFaviconCrop(createInitialFreeformCrop(base));
  }
});

logoPackFaviconCropImage.addEventListener('load', updateFaviconCropOverlay);
new ResizeObserver(updateFaviconCropOverlay).observe(logoPackFaviconCropStage);

let cropPointerInteraction: {
  pointerId: number;
  mode: 'move' | CropHandle;
  startX: number;
  startY: number;
  crop: FreeformCropSelection;
} | undefined;

function resizedCropFromHandle(
  crop: FreeformCropSelection,
  handle: CropHandle,
  deltaX: number,
  deltaY: number,
  base: { width: number; height: number },
): FreeformCropSelection {
  const minimumWidth = Math.min(base.width, Math.max(16, Math.floor(base.width * 0.05)));
  const minimumHeight = Math.min(base.height, Math.max(16, Math.floor(base.height * 0.05)));
  let left = crop.x;
  let top = crop.y;
  let right = crop.x + crop.width;
  let bottom = crop.y + crop.height;

  if (handle.includes('w')) {
    left = Math.min(right - minimumWidth, Math.max(0, crop.x + deltaX));
  }

  if (handle.includes('e')) {
    right = Math.max(left + minimumWidth, Math.min(base.width, crop.x + crop.width + deltaX));
  }

  if (handle.includes('n')) {
    top = Math.min(bottom - minimumHeight, Math.max(0, crop.y + deltaY));
  }

  if (handle.includes('s')) {
    bottom = Math.max(top + minimumHeight, Math.min(base.height, crop.y + crop.height + deltaY));
  }

  return { x: left, y: top, width: right - left, height: bottom - top };
}

logoPackFaviconCropSelection.addEventListener('pointerdown', (event) => {
  if (faviconCrop === undefined) {
    return;
  }

  const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-crop-handle]') : null;
  const handle = target?.dataset.cropHandle as CropHandle | undefined;
  cropPointerInteraction = {
    pointerId: event.pointerId,
    mode: handle ?? 'move',
    startX: event.clientX,
    startY: event.clientY,
    crop: { ...faviconCrop },
  };
  logoPackFaviconCropSelection.setPointerCapture(event.pointerId);
  event.preventDefault();
});

logoPackFaviconCropSelection.addEventListener('pointermove', (event) => {
  const interaction = cropPointerInteraction;
  const base = logoPack.getFaviconSourceBase();

  if (interaction === undefined || base === undefined || event.pointerId !== interaction.pointerId) {
    return;
  }

  const stage = logoPackFaviconCropStage.getBoundingClientRect();
  const scale = Math.min(stage.width / base.width, stage.height / base.height);
  const deltaX = (event.clientX - interaction.startX) / scale;
  const deltaY = (event.clientY - interaction.startY) / scale;

  if (interaction.mode !== 'move') {
    setFaviconCrop(resizedCropFromHandle(interaction.crop, interaction.mode, deltaX, deltaY, base));
  } else {
    setFaviconCrop({ ...interaction.crop, x: interaction.crop.x + deltaX, y: interaction.crop.y + deltaY });
  }
});

const endCropPointerInteraction = (event: PointerEvent): void => {
  if (cropPointerInteraction?.pointerId !== event.pointerId) {
    return;
  }

  cropPointerInteraction = undefined;
};

logoPackFaviconCropSelection.addEventListener('pointerup', endCropPointerInteraction);
logoPackFaviconCropSelection.addEventListener('pointercancel', endCropPointerInteraction);
logoPackFaviconCropSelection.addEventListener('keydown', (event) => {
  if (faviconCrop === undefined || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
    return;
  }

  event.preventDefault();
  const amount = event.altKey ? 10 : 1;

  if (event.shiftKey) {
    const widthDelta = event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0;
    const heightDelta = event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0;
    setFaviconCrop({
      ...faviconCrop,
      width: faviconCrop.width + widthDelta,
      height: faviconCrop.height + heightDelta,
    });
    return;
  }

  const deltaX = event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0;
  const deltaY = event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0;
  setFaviconCrop({ ...faviconCrop, x: faviconCrop.x + deltaX, y: faviconCrop.y + deltaY });
});

logoPackFaviconAlternateFile.addEventListener('change', () => {
  const file = logoPackFaviconAlternateFile.files?.[0];
  const token = ++faviconPreparationToken;
  faviconAlternatePrepared = undefined;
  logoPack.clearFaviconSource();

  if (file === undefined) {
    logoPackFaviconAlternateStatus.classList.add('hidden');
    renderFaviconSourceStep(false);
    return;
  }

  logoPackFaviconAlternateStatus.textContent = 'Checking the separate icon...';
  logoPackFaviconAlternateStatus.className = 'text-sm text-slate-600 dark:text-slate-300';
  logoPackFaviconAlternateStatus.classList.remove('hidden');
  logoPackFaviconConfirm.disabled = true;

  void logoPack.inspectAlternateFaviconSource(file).then(async (outcome) => {
    if (token !== faviconPreparationToken) {
      return;
    }

    if (outcome.status === 'rejected') {
      logoPackFaviconAlternateStatus.textContent = outcome.error.message;
      logoPackFaviconAlternateStatus.className = 'text-sm font-semibold text-red-700 dark:text-red-400';
      return;
    }

    try {
      const prepared = await prepareAlternateFaviconSource(file);

      if (token !== faviconPreparationToken) {
        return;
      }

      if (!faviconSourceCanProduceLargestIcon(prepared)) {
        logoPackFaviconAlternateStatus.textContent = 'This icon is too small to create a useful 512 px website icon. Choose a larger source.';
        logoPackFaviconAlternateStatus.className = 'text-sm font-semibold text-amber-700 dark:text-amber-400';
        return;
      }

      faviconAlternatePrepared = prepared;
      logoPackFaviconAlternateStatus.textContent = prepared.transparentCanvasTrimmed
        ? `Ready to confirm. Transparent outer space was removed (${prepared.width} × ${prepared.height} px).`
        : `Ready to confirm (${prepared.width} × ${prepared.height} px). The existing background is preserved.`;
      logoPackFaviconAlternateStatus.className = 'text-sm font-medium text-emerald-700 dark:text-emerald-400';
      showFaviconPreview(prepared.blob);
      renderFaviconSourceStep(false);
    } catch {
      logoPackFaviconAlternateStatus.textContent = 'This icon could not be prepared. Try a different image.';
      logoPackFaviconAlternateStatus.className = 'text-sm font-semibold text-red-700 dark:text-red-400';
    }
  });
});

logoPackFaviconConfirm.addEventListener('click', () => {
  const kind = faviconDraftKind;

  if (kind === undefined) {
    return;
  }

  if (kind === 'full-logo') {
    advanceToReviewAfterFaviconApproval = true;
    logoPack.approveFullLogoFaviconSource();
    return;
  }

  if (kind === 'alternate-icon') {
    if (faviconAlternatePrepared !== undefined) {
      advanceToReviewAfterFaviconApproval = true;
      logoPack.approvePreparedFaviconSource(kind, faviconAlternatePrepared);
    }
    return;
  }

  const base = logoPack.getFaviconSourceBase();
  const crop = faviconCrop;

  if (base === undefined || crop === undefined || !faviconSourceCanProduceLargestIcon(crop)) {
    return;
  }

  const token = ++faviconPreparationToken;
  advanceToReviewAfterFaviconApproval = true;
  logoPackFaviconConfirm.disabled = true;
  logoPackFaviconConfirm.textContent = 'Preparing icon source...';

  void prepareSelectedFaviconSource(base.blob, crop).then((prepared) => {
    if (token !== faviconPreparationToken) {
      return;
    }

    logoPack.approvePreparedFaviconSource(kind, prepared);
  }).catch(() => {
    if (token !== faviconPreparationToken) {
      return;
    }

    logoPackFaviconSelectionStatus.textContent = 'The selected icon area could not be prepared. Adjust the selection and try again.';
    logoPackFaviconSelectionStatus.className = 'text-xs font-semibold text-red-700 dark:text-red-400';
    advanceToReviewAfterFaviconApproval = false;
    renderFaviconSourceStep(false);
  });
});

logoPackFaviconPreviewLight.addEventListener('click', () => {
  faviconPreviewTheme = 'light';
  applyFaviconPreviewTheme();
});

logoPackFaviconPreviewDark.addEventListener('click', () => {
  faviconPreviewTheme = 'dark';
  applyFaviconPreviewTheme();
});

logoPackRetryPreviewButton.addEventListener('click', () => {
  logoPack.retryTransparentPreview();
});

logoPackModeTransparent.addEventListener('change', () => {
  if (logoPackModeTransparent.checked) {
    logoPack.selectBackgroundMode('transparent');
  }
});

logoPackModeOriginal.addEventListener('change', () => {
  if (logoPackModeOriginal.checked) {
    logoPack.selectBackgroundMode('original');
  }
});

const logoPackStrengthRadios: Array<[HTMLInputElement, BackgroundRemovalStrength]> = [
  [logoPackStrengthGentle, 'gentle'],
  [logoPackStrengthBalanced, 'balanced'],
  [logoPackStrengthStrong, 'strong'],
];

for (const [radio, strength] of logoPackStrengthRadios) {
  radio.addEventListener('change', () => {
    if (radio.checked) {
      logoPack.setRemovalStrength(strength);
    }
  });
}

const logoPackPreviewBackgroundButtons: Array<[HTMLButtonElement, LogoPackPreviewBackground]> = [
  [logoPackPreviewBgCheckerboard, 'checkerboard'],
  [logoPackPreviewBgLight, 'light'],
  [logoPackPreviewBgDark, 'dark'],
];

for (const [button, background] of logoPackPreviewBackgroundButtons) {
  button.addEventListener('click', () => {
    logoPackPreviewBackground = background;
    applyLogoPackPreviewBackground();
  });
}

window.addEventListener('pagehide', () => {
  workflow.reset();
  logoPack.reset();
  releaseOriginalFileUrl();
  releaseLogoPackUrls();
  releaseFaviconUrls();
  releaseSourceThumbnailUrl();
});

void coreClient.getRuntimeCapabilities().then((capabilities) => {
  const support = describeRuntimeSupport(capabilities);

  if (!support.supported) {
    runtimeUnsupported.textContent = support.message;
    runtimeUnsupported.classList.remove('hidden');
    app.classList.add('hidden');
  }
});

// --- SEO acquisition deep-linking (FSG-007 directive §9, FSG-007-FIT-001B directive §24/§25) ---
//
// An acquisition landing page's CTA may open the main application with a
// mode preselected via `?mode=`, e.g. `/?mode=logo-pack`. This deliberately
// goes no further than `setMode()` already goes for a tab click: it never
// selects a source, never starts processing, and never chooses a Logo
// Pack background/removal strength — those remain explicit in-product
// decisions. An unrecognised or missing value is a no-op, leaving the
// default Quick Fit mode in place. Entry into the actual task dialog goes
// through the same `requestWorkflowEntry` every launcher button uses, so a
// deep link with no source selected gets the same gate + pending-intent
// resume as clicking a launcher would — no separate acquisition-only
// upload mechanism.
const DEEP_LINK_MODES: ReadonlyArray<QuickFitMode> = ['quick-fit', 'guided-fit', 'logo-pack'];
const DEEP_LINK_TRIGGER: Record<QuickFitMode, HTMLElement> = {
  'quick-fit': modeTabQuickFit,
  'guided-fit': modeTabGuidedFit,
  'logo-pack': modeTabLogoPack,
};

function applyDeepLinkMode(): void {
  const requested = new URLSearchParams(window.location.search).get('mode');

  if (requested !== null && (DEEP_LINK_MODES as readonly string[]).includes(requested)) {
    const mode = requested as QuickFitMode;
    guidedFit.setMode(mode);
    requestWorkflowEntry(mode, DEEP_LINK_TRIGGER[mode]);
  }
}

applyDeepLinkMode();
