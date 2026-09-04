import type { ImageFormat, OutputImageFormat } from '@filesetgo/core';

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
const cancelButton = requireElement<HTMLButtonElement>('#cancel-button');
const resetButton = requireElement<HTMLButtonElement>('#reset-button');
const statusMessage = requireElement<HTMLElement>('#status-message');
const statusAnnouncer = requireElement<HTMLElement>('#status-announcer');
const resultEmpty = requireElement<HTMLElement>('#result-empty');
const resultContent = requireElement<HTMLElement>('#result-content');
const resultHeadline = requireElement<HTMLElement>('#result-headline');
const resultDetail = requireElement<HTMLElement>('#result-detail');
const resultDimensions = requireElement<HTMLElement>('#result-dimensions');
const resultFormat = requireElement<HTMLElement>('#result-format');
const resultSize = requireElement<HTMLElement>('#result-size');
const downloadLink = requireElement<HTMLAnchorElement>('#download-link');
const resultUnreachable = requireElement<HTMLElement>('#result-unreachable');
const unreachableMessage = requireElement<HTMLElement>('#unreachable-message');
const unreachableSuggestion = requireElement<HTMLElement>('#unreachable-suggestion');
const resultError = requireElement<HTMLElement>('#result-error');
const errorMessage = requireElement<HTMLElement>('#error-message');

const workflow = new QuickFitWorkflow({ core: coreClient });

let lastConfiguredFile: File | undefined;

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

function render(state: QuickFitState): void {
  const hasSource = state.status !== 'idle';

  sourcePanel.classList.toggle('hidden', !hasSource);
  sourceRejectedMessage.classList.add('hidden');
  sourceSummary.classList.remove('hidden');

  const showForm = state.status !== 'idle' && state.status !== 'inspecting' && state.status !== 'file-rejected';
  requirementsForm.classList.toggle('hidden', !showForm);
  requirementsForm.classList.toggle('flex', showForm);

  const processing = state.status === 'processing';
  setFieldsDisabled(processing);
  processButton.disabled = processing || state.status === 'idle' || state.status === 'inspecting' || state.status === 'file-rejected';
  cancelButton.classList.toggle('hidden', !processing);
  resetButton.classList.toggle('hidden', !hasSource || state.status === 'inspecting');

  showResultPanel('empty');

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
        showResultPanel('content');
        setStatus('Your file is ready.', 'success');
        announce('Your file is ready to download.');
      } else if (state.status === 'unreachable') {
        const explanation = describeUnreachable(state.outcome, allowDimensionReduction.checked ? 'flexible' : 'hard', outputFormatSelect.value as OutputImageFormat);
        unreachableMessage.textContent = explanation.message;
        unreachableSuggestion.textContent = explanation.suggestion;
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
}

workflow.subscribe(render);
render(workflow.getState());

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
  const state = workflow.getState();
  const source = state.status === 'success' ? state.result.source : 'source' in state ? state.source : undefined;

  if (source !== undefined) {
    updateFormatWarnings(source.preflight.format);
  }
});

targetSizeValue.addEventListener('input', updateTargetSizeDependentFields);

cancelButton.addEventListener('click', () => {
  workflow.cancel();
});

resetButton.addEventListener('click', () => {
  workflow.reset();
  sourceInput.value = '';
  requirementsForm.reset();
  targetSizeError.classList.add('hidden');
  lastConfiguredFile = undefined;
});

requirementsForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const state = workflow.getState();
  const source = state.status === 'success' ? state.result.source : 'source' in state ? state.source : undefined;

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

window.addEventListener('pagehide', () => {
  workflow.reset();
});

void coreClient.getRuntimeCapabilities().then((capabilities) => {
  const support = describeRuntimeSupport(capabilities);

  if (!support.supported) {
    runtimeUnsupported.textContent = support.message;
    runtimeUnsupported.classList.remove('hidden');
    app.classList.add('hidden');
  }
});
