import {
  getRuntimeCapabilities,
  preflightImage,
  processImage,
  type ImagePreflightResult,
  type ImageProcessingJob,
  type OutputImageFormat,
} from '@filesetgo/core';

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Required proof element is missing: ${selector}`);
  }

  return element;
}

const processingForm = requireElement<HTMLFormElement>('#processing-form');
const sourceInput = requireElement<HTMLInputElement>('#source-file');
const sourceSummary = requireElement<HTMLElement>('#source-summary');
const sourceFormat = requireElement<HTMLElement>('#source-format');
const sourceDimensions = requireElement<HTMLElement>('#source-dimensions');
const sourceMegapixels = requireElement<HTMLElement>('#source-megapixels');
const sourceSize = requireElement<HTMLElement>('#source-size');
const sourceStatus = requireElement<HTMLElement>('#source-status');
const maxEdgeInput = requireElement<HTMLInputElement>('#max-edge');
const outputFormatInput = requireElement<HTMLSelectElement>('#output-format');
const qualityField = requireElement<HTMLElement>('#quality-field');
const qualityInput = requireElement<HTMLInputElement>('#output-quality');
const qualityValue = requireElement<HTMLOutputElement>('#quality-value');
const processButton = requireElement<HTMLButtonElement>('#process-button');
const cancelButton = requireElement<HTMLButtonElement>('#cancel-button');
const processingStatus = requireElement<HTMLElement>('#processing-status');
const resultEmpty = requireElement<HTMLElement>('#result-empty');
const resultContent = requireElement<HTMLElement>('#result-content');
const resultImage = requireElement<HTMLImageElement>('#result-image');
const resultDimensions = requireElement<HTMLElement>('#result-dimensions');
const resultFormat = requireElement<HTMLElement>('#result-format');
const resultSize = requireElement<HTMLElement>('#result-size');
const downloadLink = requireElement<HTMLAnchorElement>('#download-link');

let selectedFile: File | undefined;
let selectedPreflight: ImagePreflightResult | undefined;
let activeJob: ImageProcessingJob | undefined;
let selectionSequence = 0;
let resultObjectUrl: string | undefined;

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function setProcessingStatus(
  message: string,
  state: 'idle' | 'preflighting' | 'ready' | 'processing' | 'complete' | 'cancelled' | 'error',
): void {
  processingStatus.textContent = message;
  processingStatus.dataset.state = state;
  processingStatus.classList.toggle('text-red-700', state === 'error');
  processingStatus.classList.toggle('dark:text-red-400', state === 'error');
}

function releaseResultUrl(): void {
  if (resultObjectUrl !== undefined) {
    URL.revokeObjectURL(resultObjectUrl);
    resultObjectUrl = undefined;
  }

  resultImage.removeAttribute('src');
  downloadLink.removeAttribute('href');
}

function clearResult(): void {
  releaseResultUrl();
  resultEmpty.classList.remove('hidden');
  resultContent.classList.add('hidden');
  resultContent.classList.remove('flex');
}

function resetProcessingControls(): void {
  activeJob = undefined;
  processButton.disabled = selectedPreflight === undefined;
  cancelButton.classList.add('hidden');
}

async function selectFile(file: File | undefined): Promise<void> {
  selectionSequence += 1;
  const currentSelection = selectionSequence;

  activeJob?.cancel();
  activeJob = undefined;
  selectedFile = file;
  selectedPreflight = undefined;
  processButton.disabled = true;
  cancelButton.classList.add('hidden');
  clearResult();

  if (file === undefined) {
    sourceSummary.classList.add('hidden');
    setProcessingStatus('Choose a supported image to begin.', 'idle');
    return;
  }

  sourceSummary.classList.remove('hidden');
  sourceFormat.textContent = 'Inspecting';
  sourceDimensions.textContent = 'Inspecting';
  sourceMegapixels.textContent = 'Inspecting';
  sourceSize.textContent = formatBytes(file.size);
  sourceStatus.textContent = 'Reading bounded image headers.';
  sourceStatus.className = 'mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-300';
  setProcessingStatus('Preflighting the source file.', 'preflighting');

  const outcome = await preflightImage(file);

  if (currentSelection !== selectionSequence) {
    return;
  }

  if (outcome.status === 'rejected') {
    sourceFormat.textContent = outcome.result?.format.toUpperCase() ?? 'Unknown';
    sourceDimensions.textContent = outcome.result === undefined ? 'Unavailable' : `${outcome.result.width} × ${outcome.result.height}`;
    sourceMegapixels.textContent = outcome.result === undefined ? 'Unavailable' : `${outcome.result.megapixels.toFixed(2)} MP`;
    sourceStatus.textContent = `${outcome.error.code}: ${outcome.error.message}`;
    sourceStatus.className = 'mt-4 text-sm font-medium text-red-700 dark:text-red-400';
    setProcessingStatus('The selected image cannot enter the decode worker.', 'error');
    return;
  }

  selectedPreflight = outcome.result;
  sourceFormat.textContent = outcome.result.format.toUpperCase();
  sourceDimensions.textContent = `${outcome.result.width} × ${outcome.result.height}`;
  sourceMegapixels.textContent = `${outcome.result.megapixels.toFixed(2)} MP`;
  sourceStatus.textContent = outcome.result.orientation === undefined ? 'Safe to decode locally.' : `Safe to decode locally. EXIF orientation ${outcome.result.orientation}.`;
  sourceStatus.className = 'mt-4 text-sm font-medium text-blue-700 dark:text-blue-400';
  processButton.disabled = false;
  setProcessingStatus('Ready for local worker processing.', 'ready');
}

sourceInput.addEventListener('change', () => {
  void selectFile(sourceInput.files?.[0]);
});

qualityInput.addEventListener('input', () => {
  qualityValue.value = Number(qualityInput.value).toFixed(2);
});

outputFormatInput.addEventListener('change', () => {
  qualityField.classList.toggle('hidden', outputFormatInput.value === 'png');
});

cancelButton.addEventListener('click', () => {
  activeJob?.cancel();
});

processingForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (selectedFile === undefined || selectedPreflight === undefined) {
    setProcessingStatus('Choose an image that passes preflight first.', 'error');
    return;
  }

  const maxEdge = Number(maxEdgeInput.value);
  const outputFormat = outputFormatInput.value as OutputImageFormat;
  const startedAt = performance.now();
  const job = processImage(selectedFile, {
    resize: { maxWidth: maxEdge, maxHeight: maxEdge, allowUpscale: false },
    output: {
      format: outputFormat,
      ...(outputFormat === 'png' ? {} : { quality: Number(qualityInput.value) }),
    },
    onProgress: ({ jobId, stage }) => {
      if (activeJob === undefined || activeJob.jobId === jobId) {
        setProcessingStatus(`Processing stage: ${stage}.`, 'processing');
      }
    },
  });

  activeJob = job;
  processButton.disabled = true;
  cancelButton.classList.remove('hidden');
  clearResult();

  const outcome = await job.result;

  if (activeJob?.jobId !== job.jobId) {
    return;
  }

  if (outcome.status === 'cancelled') {
    setProcessingStatus('Processing cancelled. The runtime is ready again.', 'cancelled');
    resetProcessingControls();
    return;
  }

  if (outcome.status === 'failed') {
    setProcessingStatus(`${outcome.error.code}: ${outcome.error.message}`, 'error');
    resetProcessingControls();
    return;
  }

  const elapsedMilliseconds = performance.now() - startedAt;
  resultObjectUrl = URL.createObjectURL(outcome.result.blob);
  resultImage.src = resultObjectUrl;
  resultDimensions.textContent = `${outcome.result.width} × ${outcome.result.height}`;
  resultFormat.textContent = outcome.result.format.toUpperCase();
  resultSize.textContent = formatBytes(outcome.result.byteSize);
  downloadLink.href = resultObjectUrl;
  downloadLink.download = `${selectedFile.name.replace(/\.[^.]+$/, '') || 'filesetgo-output'}.${outcome.result.format === 'jpeg' ? 'jpg' : outcome.result.format}`;
  resultEmpty.classList.add('hidden');
  resultContent.classList.remove('hidden');
  resultContent.classList.add('flex');
  setProcessingStatus(`Complete in ${Math.round(elapsedMilliseconds)} ms. Output validated locally.`, 'complete');
  resetProcessingControls();
});

window.addEventListener('pagehide', () => {
  activeJob?.cancel();
  releaseResultUrl();
});

void getRuntimeCapabilities().then((capabilities) => {
  for (const [name, available] of Object.entries(capabilities)) {
    const element = document.querySelector<HTMLElement>(`[data-capability="${name}"]`);

    if (element !== null) {
      element.textContent = available ? 'Available' : 'Unavailable';
      element.classList.toggle('text-blue-700', available);
      element.classList.toggle('dark:text-blue-400', available);
    }
  }
});
