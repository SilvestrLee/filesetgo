import type { ImageFormat, ImageSetResult, OutputImageFormat } from '@filesetgo/core';

import { LOGO_PACK_ASSET_EXPLANATIONS } from '../logo-pack/spec';
import type { SuitabilityIssue } from '../logo-pack/suitability';
import { LogoPackController } from '../logo-pack/logo-pack-controller';
import { getAllPresets } from '../presets/registry';
import { GuidedFitController } from '../presets/guided-fit-controller';
import { describeRuntimeSupport } from './capabilities';
import * as coreClient from './core-client';
import { describeProcessingError, describeUnreachable } from './errors';
import { formatBytes } from './format-bytes';
import { resolveOutputFormat, shouldWarnAboutTransparency, type OutputFormatChoice } from './request-plan';
import type { QuickFitState } from './state';
import { buildSuccessSummary, formatLabel } from './summary';
import { readQuickFitForm } from './validate-form';
import { QuickFitWorkflow } from './workflow';

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
const sourceFormat = requireElement<HTMLElement>('#source-format');
const sourceDimensions = requireElement<HTMLElement>('#source-dimensions');
const sourceSize = requireElement<HTMLElement>('#source-size');
const sourceSummary = requireElement<HTMLElement>('#source-summary');
const sourceRejectedMessage = requireElement<HTMLElement>('#source-rejected-message');

const modeTabQuickFit = requireElement<HTMLButtonElement>('#mode-tab-quick-fit');
const modeTabGuidedFit = requireElement<HTMLButtonElement>('#mode-tab-guided-fit');
const modeDescription = requireElement<HTMLElement>('#mode-description');

const requirementsForm = requireElement<HTMLFormElement>('#requirements-form');
const targetSizeValue = requireElement<HTMLInputElement>('#target-size-value');
const targetSizeUnit = requireElement<HTMLSelectElement>('#target-size-unit');
const targetSizeError = requireElement<HTMLElement>('#target-size-error');
const maxWidthInput = requireElement<HTMLInputElement>('#max-width');
const maxHeightInput = requireElement<HTMLInputElement>('#max-height');
const outputFormatSelect = requireElement<HTMLSelectElement>('#output-format');
const outputFormatOriginalOption = requireElement<HTMLOptionElement>('#output-format-original');
const heicOutputNote = requireElement<HTMLElement>('#heic-output-note');
const transparencyWarning = requireElement<HTMLElement>('#transparency-warning');
const dimensionFlexibilityField = requireElement<HTMLElement>('#dimension-flexibility-field');
const allowDimensionReduction = requireElement<HTMLInputElement>('#allow-dimension-reduction');
const noOpHint = requireElement<HTMLElement>('#no-op-hint');
const processButton = requireElement<HTMLButtonElement>('#process-button');

const guidedFitPanel = requireElement<HTMLElement>('#guided-fit-panel');
const presetRadios = Array.from(document.querySelectorAll<HTMLInputElement>('input[name="preset-choice"]'));
const presetRecommendation = requireElement<HTMLElement>('#preset-recommendation');
const presetRecommendationTitle = requireElement<HTMLElement>('#preset-recommendation-title');
const presetRecommendationSummary = requireElement<HTMLElement>('#preset-recommendation-summary');
const presetRecommendationRationale = requireElement<HTMLElement>('#preset-recommendation-rationale');
const presetAlreadyReady = requireElement<HTMLElement>('#preset-already-ready');
const guidedNoFileHint = requireElement<HTMLElement>('#guided-no-file-hint');
const guidedProcessButton = requireElement<HTMLButtonElement>('#guided-process-button');
const guidedUseFileButton = requireElement<HTMLAnchorElement>('#guided-use-file-button');
const guidedAdjustButton = requireElement<HTMLButtonElement>('#guided-adjust-button');

const modeTabLogoPack = requireElement<HTMLButtonElement>('#mode-tab-logo-pack');
const logoPackPanel = requireElement<HTMLElement>('#logo-pack-panel');
const logoPackNoFileHint = requireElement<HTMLElement>('#logo-pack-no-file-hint');
const logoPackReview = requireElement<HTMLElement>('#logo-pack-review');
const logoPackIssues = requireElement<HTMLElement>('#logo-pack-issues');
const logoPackCreateButton = requireElement<HTMLButtonElement>('#logo-pack-create-button');
const logoPackResult = requireElement<HTMLElement>('#logo-pack-result');
const logoPackDownloadZip = requireElement<HTMLAnchorElement>('#logo-pack-download-zip');
const logoPackAssetsList = requireElement<HTMLElement>('#logo-pack-assets');

const cancelButton = requireElement<HTMLButtonElement>('#cancel-button');
const resetButton = requireElement<HTMLButtonElement>('#reset-button');
const statusMessage = requireElement<HTMLElement>('#status-message');
const statusAnnouncer = requireElement<HTMLElement>('#status-announcer');

const resultEmpty = requireElement<HTMLElement>('#result-empty');
const resultContent = requireElement<HTMLElement>('#result-content');
const resultHeadline = requireElement<HTMLElement>('#result-headline');
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

const workflow = new QuickFitWorkflow({ core: coreClient });
const logoPack = new LogoPackController(workflow, coreClient);
const guidedFit = new GuidedFitController(workflow, () => logoPack.getState().status === 'processing');

let lastConfiguredFile: File | undefined;
let originalFileUrl: string | undefined;
let logoPackZipUrl: string | undefined;
let logoPackAssetUrls: string[] = [];
let lastRenderedLogoPackResult: ImageSetResult | undefined;

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

function updateTargetSizeDependentFields(): void {
  const hasTarget = targetSizeValue.value.trim().length > 0;
  dimensionFlexibilityField.classList.toggle('hidden', !hasTarget);
}

function readForm(sourceFormat: ImageFormat) {
  return readQuickFitForm({
    sourceFormat,
    targetSizeValue: targetSizeValue.value,
    targetSizeUnit: targetSizeUnit.value as 'KB' | 'MB',
    maxWidth: maxWidthInput.value,
    maxHeight: maxHeightInput.value,
    outputChoice: currentOutputChoice(),
    allowDimensionReduction: allowDimensionReduction.checked,
  });
}

function setFieldsDisabled(disabled: boolean): void {
  targetSizeValue.disabled = disabled;
  targetSizeUnit.disabled = disabled;
  maxWidthInput.disabled = disabled;
  maxHeightInput.disabled = disabled;
  outputFormatSelect.disabled = disabled;
  allowDimensionReduction.disabled = disabled;
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
    const dimensions = preset.requirements.maxWidth !== undefined && preset.requirements.maxHeight !== undefined
      ? `up to ${preset.requirements.maxWidth} × ${preset.requirements.maxHeight} px`
      : undefined;
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
  guidedFitPanel.classList.toggle('hidden', mode !== 'guided-fit');
  guidedFitPanel.classList.toggle('flex', mode === 'guided-fit');
  logoPackPanel.classList.toggle('hidden', mode !== 'logo-pack');
  logoPackPanel.classList.toggle('flex', mode === 'logo-pack');
}

function renderGuidedFit(): void {
  const state = workflow.getState();
  const processing = state.status === 'processing';

  for (const radio of presetRadios) {
    radio.checked = radio.value === guidedFit.getSelectedPresetId();
    radio.disabled = processing;
  }

  const preset = guidedFit.currentPreset();

  if (preset === undefined) {
    presetRecommendation.classList.add('hidden');
    presetRecommendation.classList.remove('flex');
    releaseOriginalFileUrl();
    return;
  }

  presetRecommendation.classList.remove('hidden');
  presetRecommendation.classList.add('flex');
  presetRecommendationTitle.textContent = preset.title;

  const dimensions = preset.requirements.maxWidth !== undefined && preset.requirements.maxHeight !== undefined
    ? `up to ${preset.requirements.maxWidth} × ${preset.requirements.maxHeight} px`
    : undefined;
  const size = preset.requirements.targetBytes === undefined ? undefined : `under ${formatBytes(preset.requirements.targetBytes)}`;
  presetRecommendationSummary.textContent = `We'll prepare it as ${[formatLabel(preset.requirements.outputFormat), dimensions, size].filter(Boolean).join(', ')}.`;
  presetRecommendationRationale.textContent = preset.rationale;

  const source = currentSource(state);
  const ready = guidedFit.alreadyReady();

  presetAlreadyReady.classList.toggle('hidden', ready !== true);
  guidedNoFileHint.classList.toggle('hidden', source !== undefined);
  guidedProcessButton.classList.toggle('hidden', ready === true);
  guidedProcessButton.disabled = processing || source === undefined;
  guidedUseFileButton.classList.toggle('hidden', ready !== true);
  guidedAdjustButton.disabled = processing;

  if (ready === true && source !== undefined) {
    releaseOriginalFileUrl();
    originalFileUrl = URL.createObjectURL(source.file);
    guidedUseFileButton.href = originalFileUrl;
    guidedUseFileButton.download = source.file.name;
  } else {
    releaseOriginalFileUrl();
  }
}

function issueTextClass(severity: SuitabilityIssue['severity']): string {
  if (severity === 'blocking') {
    return 'text-red-700 dark:text-red-400';
  }

  if (severity === 'warning') {
    return 'text-amber-700 dark:text-amber-400';
  }

  return 'text-zinc-600 dark:text-zinc-400';
}

function renderLogoPack(): void {
  const source = currentSource(workflow.getState());
  const logoPackState = logoPack.getState();
  const processing = logoPackState.status === 'processing';

  logoPackNoFileHint.classList.toggle('hidden', source !== undefined);
  logoPackReview.classList.toggle('hidden', source === undefined);
  logoPackReview.classList.toggle('flex', source !== undefined);

  logoPackIssues.replaceChildren();

  let blocked = false;

  if (source !== undefined) {
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

  logoPackCreateButton.disabled = source === undefined || processing || blocked;

  if (logoPackState.status !== 'success' || logoPackState.result !== lastRenderedLogoPackResult) {
    releaseLogoPackUrls();
  }

  if (logoPackState.status === 'success') {
    lastRenderedLogoPackResult = logoPackState.result;
    logoPackResult.classList.remove('hidden');
    logoPackResult.classList.add('flex');

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
        download.className = 'min-h-11 flex shrink-0 items-center whitespace-nowrap rounded-lg border border-zinc-300 px-4 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800';

        item.appendChild(info);
        item.appendChild(download);
        logoPackAssetsList.appendChild(item);
      }
    }
  } else {
    logoPackResult.classList.add('hidden');
    logoPackResult.classList.remove('flex');
  }
}

function render(state: QuickFitState): void {
  const hasSource = state.status !== 'idle';

  sourcePanel.classList.toggle('hidden', !hasSource);
  sourceRejectedMessage.classList.add('hidden');
  sourceSummary.classList.remove('hidden');

  const mode = guidedFit.getMode();
  const showForm = mode === 'quick-fit' && state.status !== 'idle' && state.status !== 'inspecting' && state.status !== 'file-rejected';
  requirementsForm.classList.toggle('hidden', !showForm);
  requirementsForm.classList.toggle('flex', showForm);

  const processing = state.status === 'processing';
  setFieldsDisabled(processing);
  processButton.disabled = processing || state.status === 'idle' || state.status === 'inspecting' || state.status === 'file-rejected';
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
      sourceSummary.classList.add('hidden');
      setStatus('Checking file...', 'inspecting');
      break;

    case 'file-rejected':
      dropZoneLabel.textContent = state.file.name;
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
        setStatus('Your file is ready.', 'success');
        announce('Your file is ready to download.');
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

    cancelButton.classList.toggle('hidden', logoPackState.status !== 'processing');
    resetButton.classList.toggle('hidden', currentSource(state) === undefined);

    if (logoPackState.status === 'processing') {
      setStatus('Creating your logo pack...', 'processing');
    } else if (logoPackState.status === 'success') {
      setStatus('Your logo pack is ready.', 'success');
      announce('Your logo pack is ready to download.');
    } else if (logoPackState.status === 'failed') {
      const message = describeProcessingError(logoPackState.error);
      setStatus(message, 'error');
      announce(message);
    } else if (logoPackState.status === 'cancelled') {
      setStatus('Logo pack creation cancelled. You can try again.', 'cancelled');
      announce('Logo pack creation cancelled.');
    } else if (currentSource(state) !== undefined) {
      setStatus('Review the suitability notes, then create your logo pack.', 'ready');
    }
  }
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
});

targetSizeValue.addEventListener('input', updateTargetSizeDependentFields);

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
});

requirementsForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const source = currentSource(workflow.getState());

  if (source === undefined) {
    return;
  }

  const result = readForm(source.preflight.format);

  targetSizeError.classList.toggle('hidden', result.ok || result.errors.targetSize === undefined);
  noOpHint.classList.toggle('hidden', result.ok || result.errors.general === undefined);

  if (!result.ok) {
    if (result.errors.targetSize !== undefined) {
      targetSizeError.textContent = result.errors.targetSize;
    }

    return;
  }

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

modeTabQuickFit.addEventListener('click', () => {
  guidedFit.setMode('quick-fit');
});

modeTabGuidedFit.addEventListener('click', () => {
  guidedFit.setMode('guided-fit');
});

modeTabLogoPack.addEventListener('click', () => {
  guidedFit.setMode('logo-pack');
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
    next.focus();
    next.click();
  });
}

for (const radio of presetRadios) {
  radio.addEventListener('change', () => {
    if (radio.checked) {
      guidedFit.selectPreset(radio.value);
      const preset = guidedFit.currentPreset();

      if (preset !== undefined) {
        const dimensions = preset.requirements.maxWidth !== undefined && preset.requirements.maxHeight !== undefined
          ? `up to ${preset.requirements.maxWidth} × ${preset.requirements.maxHeight} px`
          : undefined;
        const size = preset.requirements.targetBytes === undefined ? undefined : `under ${formatBytes(preset.requirements.targetBytes)}`;
        announce(`Recommendation: ${preset.title} — ${[formatLabel(preset.requirements.outputFormat), dimensions, size].filter(Boolean).join(', ')}.`);
      }
    }
  });
}

guidedProcessButton.addEventListener('click', () => {
  guidedFit.runSelectedPreset();
});

guidedAdjustButton.addEventListener('click', () => {
  applyPrefill(guidedFit.adjustSettings());
});

unreachableAdjustButton.addEventListener('click', () => {
  applyPrefill(guidedFit.adjustSettings());
});

logoPackCreateButton.addEventListener('click', () => {
  logoPack.createLogoPack();
});

window.addEventListener('pagehide', () => {
  workflow.reset();
  logoPack.reset();
  releaseOriginalFileUrl();
  releaseLogoPackUrls();
});

void coreClient.getRuntimeCapabilities().then((capabilities) => {
  const support = describeRuntimeSupport(capabilities);

  if (!support.supported) {
    runtimeUnsupported.textContent = support.message;
    runtimeUnsupported.classList.remove('hidden');
    app.classList.add('hidden');
  }
});
