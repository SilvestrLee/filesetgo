import type { CropRegion } from '@filesetgo/core';

import { constrainLockedCrop, initialLockedCrop, resizedLockedCropFromHandle, type CropHandle } from './crop';

/**
 * The DOM elements one locked-ratio crop stage instance needs. Handles are
 * read via `data-crop-handle` delegation on `selection` itself (matching
 * the original Quick Fit markup), so no per-handle refs are required.
 */
export interface LockedCropStageElements {
  stage: HTMLElement;
  image: HTMLImageElement;
  selection: HTMLElement;
  status: HTMLElement;
  resetButton: HTMLButtonElement;
  confirmButton: HTMLButtonElement;
  xInput: HTMLInputElement;
  yInput: HTMLInputElement;
  widthInput: HTMLInputElement;
  /** Height is always derived from width and the locked ratio — kept disabled, read for its `max`. */
  heightInput: HTMLInputElement;
}

export interface LockedCropStageCallbacks {
  /** Called with the currently drafted crop when the caller's own confirm action fires. */
  onConfirm(crop: CropRegion): void;
}

export interface LockedCropStage {
  /**
   * Seeds the stage for a source/destination pair. A previously confirmed
   * crop (still valid for these exact dimensions) is re-shown, re-constrained,
   * as the starting point; otherwise the largest centered suggestion is
   * shown — only ever a suggestion, never auto-approved.
   */
  enter(
    sourceFile: File,
    sourceDimensions: { width: number; height: number },
    targetWidth: number,
    targetHeight: number,
    previousConfirmedCrop?: CropRegion,
  ): void;
  /** Revokes the current source object URL. Call on dialog close/reset. */
  release(): void;
}

/**
 * Creates one interactive locked-ratio crop stage — pointer drag/resize,
 * keyboard nudging, fine-tune range inputs, and live overlay positioning —
 * bound to a specific set of DOM elements. This is the single implementation
 * of Quick Fit's crop engine (FSG-007-FIT-001); Guided Fit (FSG-007-FIT-002)
 * reuses it verbatim against its own dialog's markup rather than a second,
 * copy-pasted implementation. Both instances are driven purely by the
 * shared, pure geometry functions in `./crop.ts` — this module owns only the
 * interactive DOM wiring around them.
 */
export function createLockedCropStage(elements: LockedCropStageElements, callbacks: LockedCropStageCallbacks): LockedCropStage {
  let sourceUrl: string | undefined;
  let sourceDimensions: { width: number; height: number } | undefined;
  let targetWidth = 0;
  let targetHeight = 0;
  let draft: CropRegion | undefined;
  let pointerInteraction: {
    pointerId: number;
    mode: 'move' | CropHandle;
    startX: number;
    startY: number;
    crop: CropRegion;
  } | undefined;

  function releaseSourceUrl(): void {
    if (sourceUrl !== undefined) {
      URL.revokeObjectURL(sourceUrl);
      sourceUrl = undefined;
    }
  }

  function updateOverlay(): void {
    if (draft === undefined || sourceDimensions === undefined) {
      return;
    }

    const stage = elements.stage.getBoundingClientRect();
    const scale = Math.min(stage.width / sourceDimensions.width, stage.height / sourceDimensions.height);
    const renderedWidth = sourceDimensions.width * scale;
    const renderedHeight = sourceDimensions.height * scale;
    const offsetX = (stage.width - renderedWidth) / 2;
    const offsetY = (stage.height - renderedHeight) / 2;

    elements.selection.style.left = `${offsetX + draft.x * scale}px`;
    elements.selection.style.top = `${offsetY + draft.y * scale}px`;
    elements.selection.style.width = `${draft.width * scale}px`;
    elements.selection.style.height = `${draft.height * scale}px`;
  }

  function updateControls(): void {
    if (draft === undefined || sourceDimensions === undefined) {
      return;
    }

    const minimumWidth = Math.min(sourceDimensions.width, Math.max(16, Math.floor(sourceDimensions.width * 0.05)));

    elements.xInput.max = String(sourceDimensions.width - draft.width);
    elements.yInput.max = String(sourceDimensions.height - draft.height);
    elements.widthInput.min = String(minimumWidth);
    elements.widthInput.max = String(sourceDimensions.width);
    elements.heightInput.max = String(sourceDimensions.height);
    elements.xInput.value = String(draft.x);
    elements.yInput.value = String(draft.y);
    elements.widthInput.value = String(draft.width);
    elements.heightInput.value = String(draft.height);

    elements.status.textContent = `${draft.width} × ${draft.height} px selected.`;

    updateOverlay();
  }

  /** The single chokepoint every crop mutation passes through. */
  function setDraft(next: CropRegion): void {
    if (sourceDimensions === undefined) {
      return;
    }

    draft = constrainLockedCrop(next, sourceDimensions, targetWidth, targetHeight);
    updateControls();
  }

  elements.resetButton.addEventListener('click', () => {
    if (sourceDimensions === undefined) {
      return;
    }

    setDraft(initialLockedCrop(sourceDimensions, targetWidth, targetHeight));
  });

  elements.confirmButton.addEventListener('click', () => {
    if (draft === undefined) {
      return;
    }

    callbacks.onConfirm(draft);
  });

  elements.image.addEventListener('load', updateOverlay);
  new ResizeObserver(updateOverlay).observe(elements.stage);

  for (const input of [elements.xInput, elements.yInput, elements.widthInput]) {
    input.addEventListener('input', () => {
      if (draft === undefined) {
        return;
      }

      setDraft({
        x: Number(elements.xInput.value),
        y: Number(elements.yInput.value),
        width: Number(elements.widthInput.value),
        height: draft.height,
      });
    });
  }

  elements.selection.addEventListener('pointerdown', (event) => {
    if (draft === undefined) {
      return;
    }

    const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-crop-handle]') : null;
    const handle = target?.dataset.cropHandle as CropHandle | undefined;
    pointerInteraction = {
      pointerId: event.pointerId,
      mode: handle ?? 'move',
      startX: event.clientX,
      startY: event.clientY,
      crop: { ...draft },
    };
    elements.selection.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  elements.selection.addEventListener('pointermove', (event) => {
    const interaction = pointerInteraction;

    if (interaction === undefined || sourceDimensions === undefined || event.pointerId !== interaction.pointerId) {
      return;
    }

    const stage = elements.stage.getBoundingClientRect();
    const scale = Math.min(stage.width / sourceDimensions.width, stage.height / sourceDimensions.height);
    const deltaX = (event.clientX - interaction.startX) / scale;
    const deltaY = (event.clientY - interaction.startY) / scale;

    if (interaction.mode !== 'move') {
      setDraft(resizedLockedCropFromHandle(
        interaction.crop,
        interaction.mode,
        deltaX,
        deltaY,
        sourceDimensions,
        targetWidth,
        targetHeight,
      ));
    } else {
      setDraft({ ...interaction.crop, x: interaction.crop.x + deltaX, y: interaction.crop.y + deltaY });
    }
  });

  const endPointerInteraction = (event: PointerEvent): void => {
    if (pointerInteraction?.pointerId !== event.pointerId) {
      return;
    }

    pointerInteraction = undefined;
  };

  elements.selection.addEventListener('pointerup', endPointerInteraction);
  elements.selection.addEventListener('pointercancel', endPointerInteraction);
  elements.selection.addEventListener('keydown', (event) => {
    if (draft === undefined || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const amount = event.altKey ? 10 : 1;

    if (event.shiftKey) {
      // The locked ratio leaves only one size degree of freedom — all four
      // arrows resize via width (height follows automatically), unlike the
      // favicon crop's independent width/height resize.
      const widthDelta = event.key === 'ArrowLeft'
        ? -amount
        : event.key === 'ArrowRight'
          ? amount
          : event.key === 'ArrowUp'
            ? amount
            : -amount;
      setDraft({ ...draft, width: draft.width + widthDelta });
      return;
    }

    const deltaX = event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0;
    const deltaY = event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0;
    setDraft({ ...draft, x: draft.x + deltaX, y: draft.y + deltaY });
  });

  return {
    enter(sourceFile, dimensions, width, height, previousConfirmedCrop) {
      sourceDimensions = dimensions;
      targetWidth = width;
      targetHeight = height;

      releaseSourceUrl();
      sourceUrl = URL.createObjectURL(sourceFile);
      elements.image.src = sourceUrl;

      draft = previousConfirmedCrop !== undefined
        ? constrainLockedCrop(previousConfirmedCrop, dimensions, width, height)
        : initialLockedCrop(dimensions, width, height);

      updateControls();
    },
    release() {
      releaseSourceUrl();
    },
  };
}
