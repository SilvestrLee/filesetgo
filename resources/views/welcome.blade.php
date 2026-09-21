@php
    $title = 'File. Set. Go. | Get your file ready for where it needs to go.';
    $description = 'Prepare an image for an exact requirement, a website destination or a complete logo pack in your browser, with validated output details.';
    $structuredData = [
        '@context' => 'https://schema.org',
        '@type' => 'WebApplication',
        'name' => 'File. Set. Go.',
        'url' => route('home'),
        'description' => $description,
        'applicationCategory' => 'MultimediaApplication',
        'operatingSystem' => 'Any (runs in a modern web browser)',
    ];
@endphp

@extends('layouts.public')

@push('scripts')
    @vite(['resources/js/app.ts'])
@endpush

@push('overlays')
    {{--
        The full-page processing transition (FSG-007-FIT-003-R3/R4): a
        genuine top-level File. Set. Go. application state — not a card, not
        a small loader dropped onto a blank page, not a route, not a second
        result page. position:fixed covers the header/nav without needing to
        touch those partials; `body.fsg-processing-active` (toggled by
        `openProcessingOverlay()`/`closeProcessingOverlay()`) additionally
        hides them outright (R4 directive §10) rather than relying only on
        this surface's own opaque background to occlude them. Pushed into
        the layout's own `overlays` stack (a direct sibling of nav/main/
        footer), deliberately NOT nested inside `@section('content')`/
        `<main>` — `setWorkspaceInert()` marks the workspace inert while
        this is open, and it must never be a descendant of the subtree it
        marks inert. The dialog that hands off to this surface now closes
        *synchronously* (`closeWorkflowDialogForProcessing`, not the
        animated `closeWorkflowDialog`) — R3's measured defect was the old
        `<dialog>` remaining genuinely open (and therefore still painting in
        the browser's top layer, above this ordinary-stacking div regardless
        of z-index) for ~250ms after confirmation. One shared overlay reused
        by Quick Fit, Guided Fit, and Logo Pack; task-aware copy only, the
        phase/timing/glyph architecture is identical to what FIT-003/R1/R2
        already established (see resources/js/shared/). R5 replaced the
        small inline glyph with the FILE → SET → GO rail below and gave the
        brand mark its own top region — presentation only, no change to any
        of the above.
    --}}
    <div id="fsg-processing-overlay" class="fsg-processing-overlay hidden" role="status" aria-live="polite" tabindex="-1">
        <div class="fsg-processing-overlay__brand" aria-hidden="true">
            <span class="fsg-brand__wordmark">
                <img class="fsg-brand__logo fsg-brand__logo--light" src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442">
                <img class="fsg-brand__logo fsg-brand__logo--dark" src="/brand/filesetgo-logo-dark-bg.png" alt="" width="2018" height="442">
            </span>
        </div>

        <div class="fsg-processing-overlay__surface">
            <div class="fsg-processing-overlay__intro">
                <p id="fsg-processing-overlay-eyebrow" class="fsg-task-dialog__context"></p>
                <h2 id="fsg-processing-overlay-title"></h2>
            </div>

            {{--
                The FILE → SET → GO processing rail (FSG-007-FIT-003-R5): not
                a loading glyph, the structural processing grammar of
                File. Set. Go. itself — what came in (FILE), what's
                happening (SET), where it's headed (GO). `data-phase` is set
                on this root by the exact same `renderProcessingSection()`
                call (`../shared/render-processing-section.ts`, completely
                unmodified) that used to target the small `<x-processing-glyph>`
                — only *which* element receives that attribute changed. Every
                stage/caption/connector state below is pure CSS keyed off
                that one attribute; no new JS drives any of it.
            --}}
            <div id="fsg-processing-rail" class="fsg-processing-rail" role="presentation">
                <div class="fsg-processing-rail__stage" data-stage="file">
                    <p class="fsg-processing-rail__label">File</p>
                    <div class="fsg-processing-rail__node" data-node="file">
                        <img id="fsg-processing-overlay-source-thumb" class="fsg-processing-rail__thumb" alt="">
                        <span class="fsg-processing-rail__node-icon" data-node-icon="static"><x-icon name="file" class="size-7" /></span>
                    </div>
                    <p class="fsg-processing-rail__caption" data-caption="file">
                        <span data-phase-text="preparing validating ready">Source accepted</span>
                    </p>
                </div>

                <div class="fsg-processing-rail__connector" data-connector="1" aria-hidden="true"></div>

                <div class="fsg-processing-rail__stage fsg-processing-rail__stage--set" data-stage="set">
                    <p class="fsg-processing-rail__label">Set</p>
                    <div class="fsg-processing-rail__node" data-node="set">
                        <span class="fsg-processing-rail__spinner" data-node-icon="spinner" aria-hidden="true"></span>
                        <span class="fsg-processing-rail__node-icon" data-node-icon="check"><x-icon name="check" class="size-7" /></span>
                    </div>
                    <p class="fsg-processing-rail__caption" data-caption="set">
                        <span data-phase-text="preparing">Preparing</span>
                        <span data-phase-text="validating ready">Prepared</span>
                    </p>
                </div>

                <div class="fsg-processing-rail__connector" data-connector="2" aria-hidden="true"></div>

                <div class="fsg-processing-rail__stage" data-stage="go">
                    <p class="fsg-processing-rail__label">Go</p>
                    <div class="fsg-processing-rail__node" data-node="go">
                        <span class="fsg-processing-rail__spinner" data-node-icon="spinner" aria-hidden="true"></span>
                        <span class="fsg-processing-rail__node-icon" data-node-icon="check"><x-icon name="check" class="size-7" /></span>
                    </div>
                    <p class="fsg-processing-rail__caption" data-caption="go">
                        <span data-phase-text="preparing">Waiting</span>
                        <span data-phase-text="validating">Checking</span>
                        <span data-phase-text="ready">Ready</span>
                    </p>
                </div>
            </div>

            <div class="fsg-processing-overlay__supporting">
                <p id="fsg-processing-overlay-status" class="text-sm" role="status"></p>
                <p id="fsg-processing-overlay-context" class="fsg-processing-overlay__task-context"></p>
            </div>

            <div id="fsg-processing-overlay-actions" class="fsg-processing-overlay__actions">
                <button id="fsg-processing-overlay-cancel" type="button" class="fsg-modal-secondary hidden">Cancel</button>
                <button id="fsg-processing-overlay-back" type="button" class="fsg-modal-secondary hidden">Back to settings</button>
            </div>
        </div>
    </div>
@endpush

@section('content')
        <div class="fsg-home fsg-home--mature">
            <section class="fsg-shell fsg-hero">
                <div class="fsg-hero__statement">
                    <p class="fsg-hero__brand">File. Set. Go.</p>
                    <h1><span class="fsg-hero__mobile-line">Get your file</span> <span class="fsg-hero__mobile-line">ready for where it</span> <span class="fsg-hero__mobile-line">needs to go.</span></h1>
                </div>
                <div class="fsg-hero__aside">
                    <p>Choose the file. Set the job: exact requirement, website destination or logo pack. Download the validated result.</p>
                </div>
            </section>

            <section id="quick-fit" class="fsg-shell fsg-workspace scroll-mt-20" aria-labelledby="quick-fit-title">
                <h2 id="quick-fit-title" class="sr-only">Quick Fit and Guided Fit</h2>

                <div id="runtime-unsupported" class="hidden rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200" role="alert"></div>

                <div class="fsg-workspace__topline" aria-hidden="true">
                    <span>FILE / SET / GO</span>
                    <span class="fsg-workspace__state">Browser-local preparation</span>
                </div>

                <div id="quick-fit-app" class="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
                    <div class="fsg-workflow flex flex-col gap-6">
                        <div class="fsg-set-stage fsg-stage-label" aria-hidden="true">
                            <span class="fsg-stage-label__word">SET</span>
                            <span class="fsg-stage-label__instruction">Choose how to prepare it</span>
                        </div>
                        <div role="tablist" aria-label="How would you like to prepare your file?" class="fsg-mode-tabs inline-flex w-fit gap-1 rounded-xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900">
                            <button
                                id="mode-tab-quick-fit"
                                type="button"
                                role="tab"
                                aria-selected="true"
                                aria-controls="quick-fit-panel"
                                class="min-h-11 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            >Quick Fit</button>
                            <button
                                id="mode-tab-guided-fit"
                                type="button"
                                role="tab"
                                aria-selected="false"
                                aria-controls="guided-fit-panel"
                                tabindex="-1"
                                class="min-h-11 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            >Guided Fit</button>
                            <button
                                id="mode-tab-logo-pack"
                                type="button"
                                role="tab"
                                aria-selected="false"
                                aria-controls="logo-pack-panel"
                                tabindex="-1"
                                class="min-h-11 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                            >Logo Pack</button>
                        </div>
                        <p id="mode-description" class="fsg-mode-description -mt-4 text-sm text-zinc-500 dark:text-zinc-400">Enter the requirement yourself.</p>

                        <div class="fsg-source-stage">
                            <div class="fsg-stage-label" aria-hidden="true">
                                <span class="fsg-stage-label__word">FILE</span>
                                <span class="fsg-stage-label__instruction">Choose your source image</span>
                            </div>
                            <input id="source-file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" class="sr-only">
                            <div
                                id="drop-zone"
                                role="button"
                                tabindex="0"
                                aria-describedby="drop-zone-help"
                                class="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white p-8 text-center transition hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-offset-zinc-950"
                            >
                                <p id="drop-zone-label" class="text-base font-semibold">Drop an image here, or choose a file</p>
                                <p id="drop-zone-help" class="text-sm text-zinc-500 dark:text-zinc-400">JPEG, PNG, WebP or HEIC. Up to 15 MB.</p>
                            </div>
                        </div>

                        <div id="source-panel" class="hidden rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                            <div class="fsg-source-confirmation fsg-source-confirmation--large">
                                <div class="fsg-source-confirmation__thumb">
                                    <img id="source-thumbnail" alt="Preview of your selected source image">
                                </div>
                                <div class="fsg-source-confirmation__meta">
                                    <p class="text-sm font-semibold" id="source-name"></p>
                                    <div id="source-summary" class="mt-3 grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-x-5 gap-y-4">
                                        <div><p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Format</p><p id="source-format" class="mt-1 font-semibold">-</p></div>
                                        <div><p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Dimensions</p><p id="source-dimensions" class="mt-1 font-semibold">-</p></div>
                                        <div><p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Size</p><p id="source-size" class="mt-1 font-semibold">-</p></div>
                                    </div>
                                </div>
                                <button id="source-replace-image" type="button" class="fsg-summary-action">Replace image</button>
                            </div>
                            <p id="source-rejected-message" class="hidden mt-3 text-sm font-medium text-red-700 dark:text-red-400"></p>
                        </div>

                        <div id="quick-fit-panel" role="tabpanel" aria-labelledby="mode-tab-quick-fit" class="flex flex-col gap-6">
                            <div class="fsg-workflow-launcher">
                                <span class="fsg-workflow-launcher__icon"><x-icon name="file" class="size-5" /></span>
                                <div>
                                    <h3>Set your own requirement</h3>
                                    <p id="quick-fit-compact-status">Choose an image above, then set your own dimensions, size target and format.</p>
                                </div>
                                <button id="quick-fit-open" type="button" class="fsg-modal-primary" aria-haspopup="dialog" aria-controls="quick-fit-dialog" disabled>Open Quick Fit</button>
                            </div>

                            <dialog id="quick-fit-dialog" class="fsg-task-dialog fsg-task-dialog--wide" aria-labelledby="quick-fit-dialog-title" aria-describedby="quick-fit-dialog-description">
                                <div class="fsg-task-dialog__surface fsg-task-dialog__surface--no-progress">
                                    <header class="fsg-task-dialog__header">
                                        <div>
                                            <p class="fsg-task-dialog__context">Quick Fit</p>
                                            <h2 id="quick-fit-dialog-title">Enter the requirement yourself</h2>
                                            <p id="quick-fit-dialog-description">Set a file-size target, dimensions or output format, then get the file ready.</p>
                                        </div>
                                        <div class="fsg-task-dialog__header-actions">
                                            <button id="quick-fit-close" type="button" class="fsg-task-dialog__close" aria-label="Close Quick Fit">
                                                <x-icon name="close" class="size-5" />
                                            </button>
                                        </div>
                                    </header>
                                    <div class="fsg-task-dialog__content">
                                        <div id="quick-fit-source-confirmation" class="fsg-source-confirmation">
                                            <div class="fsg-source-confirmation__thumb">
                                                <img id="quick-fit-source-thumbnail" alt="Preview of your selected source image">
                                            </div>
                                            <div class="fsg-source-confirmation__meta">
                                                <p class="fsg-task-dialog__context">Source image</p>
                                                <p id="quick-fit-source-name" class="text-sm font-semibold"></p>
                                                <p id="quick-fit-source-meta" class="text-xs text-zinc-500 dark:text-zinc-400"></p>
                                            </div>
                                            <button id="quick-fit-change-image" type="button" class="fsg-summary-action">Change image</button>
                                        </div>
                                        <section id="quick-fit-step-requirements" class="fsg-modal-step flex flex-col gap-6">
                                            <form id="requirements-form" class="fsg-quick-fit-rail flex flex-col gap-5" novalidate>
                                                <div class="flex flex-col gap-2">
                                                    <span class="text-sm font-semibold" id="target-size-label">Target file size <span class="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span></span>
                                                    <div class="flex gap-2">
                                                        <input
                                                            id="target-size-value"
                                                            type="number"
                                                            inputmode="decimal"
                                                            min="0"
                                                            step="any"
                                                            aria-labelledby="target-size-label"
                                                            placeholder="e.g. 200"
                                                            class="w-full max-w-64 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-offset-zinc-950"
                                                        >
                                                        <select id="target-size-unit" aria-label="Target size unit" class="rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-offset-zinc-950">
                                                            <option value="KB" selected>KB</option>
                                                            <option value="MB">MB</option>
                                                        </select>
                                                    </div>
                                                    <p id="target-size-error" class="hidden text-sm font-medium text-red-700 dark:text-red-400" role="alert"></p>
                                                </div>

                                                <div class="flex flex-wrap gap-5">
                                                    <div class="flex w-full flex-col gap-2 sm:w-48">
                                                        <label class="text-sm font-semibold" for="max-width">Output width <span class="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span></label>
                                                        <div class="relative">
                                                            <input id="max-width" type="number" inputmode="numeric" min="1" step="1" placeholder="e.g. 1200" class="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-12 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-offset-zinc-950">
                                                            <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-zinc-500">px</span>
                                                        </div>
                                                    </div>

                                                    <div class="flex w-full flex-col gap-2 sm:w-48">
                                                        <label class="text-sm font-semibold" for="max-height">Output height <span class="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span></label>
                                                        <div class="relative">
                                                            <input id="max-height" type="number" inputmode="numeric" min="1" step="1" placeholder="e.g. 1200" class="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-12 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-offset-zinc-950">
                                                            <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-zinc-500">px</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p id="quick-fit-dimensions-help" class="text-sm text-zinc-600 dark:text-zinc-400">Enter both dimensions for an exact-size result. If the source has a different shape, you'll choose what to keep.</p>

                                                <div class="flex flex-col gap-2 sm:max-w-xs">
                                                    <label class="text-sm font-semibold" for="output-format">Output format</label>
                                                    <select id="output-format" class="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-offset-zinc-950">
                                                        <option id="output-format-original" value="original">Keep original</option>
                                                        <option value="jpeg">JPEG</option>
                                                        <option value="png">PNG</option>
                                                        <option value="webp">WebP</option>
                                                    </select>
                                                    <p id="heic-output-note" class="hidden text-sm text-zinc-600 dark:text-zinc-400">HEIC can't be used as an output format, so your ready file will be WebP.</p>
                                                    <p id="transparency-warning" class="hidden text-sm text-amber-700 dark:text-amber-400">JPEG does not support transparency.</p>
                                                </div>

                                                <div id="dimension-flexibility-field" class="hidden items-start gap-2.5 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                                                    <span id="dimension-flexibility-icon" class="mt-0.5 hidden flex-none text-blue-700 dark:text-blue-400"><x-icon name="check" class="size-4" /></span>
                                                    <input id="allow-dimension-reduction" type="checkbox" checked class="mt-1 size-4 flex-none rounded border-zinc-300 text-blue-700 focus:ring-2 focus:ring-blue-600 dark:border-zinc-700 disabled:opacity-50">
                                                    <label for="allow-dimension-reduction" class="flex flex-col gap-0.5">
                                                        <span id="dimension-flexibility-label" class="text-sm font-semibold">Allow FileSetGo to reduce dimensions if needed</span>
                                                        <span id="dimension-flexibility-help" class="text-xs text-zinc-500 dark:text-zinc-400">Helps reach very small file-size limits while preserving aspect ratio.</span>
                                                    </label>
                                                </div>

                                                <div id="quick-fit-upscale-field" class="hidden items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                                                    <input id="quick-fit-upscale-approve" type="checkbox" class="mt-1 size-4 flex-none rounded border-amber-400 text-blue-700 focus:ring-2 focus:ring-blue-600">
                                                    <label for="quick-fit-upscale-approve" class="flex flex-col gap-0.5">
                                                        <span class="text-sm font-semibold text-amber-900 dark:text-amber-200">This result needs enlargement</span>
                                                        <span class="text-xs text-amber-800 dark:text-amber-300">The selected crop has less source detail than the requested size. Enlarging it may look softer.</span>
                                                        <span class="text-xs font-semibold text-amber-900 dark:text-amber-200">Approve enlargement</span>
                                                    </label>
                                                </div>

                                                <p id="no-op-hint" class="hidden text-sm text-zinc-500 dark:text-zinc-400">Add at least one requirement for your file.</p>
                                            </form>
                                        </section>

                                        <section id="quick-fit-step-crop" class="fsg-modal-step hidden flex-col gap-4" aria-labelledby="quick-fit-crop-heading">
                                            <div class="flex flex-col gap-1">
                                                <h3 id="quick-fit-crop-heading" class="text-base font-semibold">Choose the part of the image you want to keep</h3>
                                                <p class="text-sm text-zinc-600 dark:text-zinc-400">Your requested dimensions have a different shape from the source image. FileSetGo will not crop it without your approval.</p>
                                            </div>

                                            <div id="quick-fit-crop-stage" class="fsg-quick-fit-crop-stage" aria-label="Locked-ratio crop selection area">
                                                <img id="quick-fit-crop-image" alt="Source image available for crop selection" draggable="false">
                                                <div id="quick-fit-crop-selection" class="fsg-quick-fit-crop-selection" tabindex="0" role="group" aria-label="Locked-ratio crop selection. Drag to move. Drag an edge or corner to resize, keeping the requested shape. Use arrow keys to move; hold Shift to resize.">
                                                    @foreach (['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as $handle)
                                                        <span class="fsg-quick-fit-crop-handle fsg-quick-fit-crop-handle--{{ $handle }}" data-crop-handle="{{ $handle }}" aria-hidden="true"></span>
                                                    @endforeach
                                                </div>
                                            </div>
                                            <div class="flex flex-wrap items-center justify-between gap-3">
                                                <p id="quick-fit-crop-status" class="text-xs text-zinc-600 dark:text-zinc-400" role="status"></p>
                                                <button id="quick-fit-crop-reset" type="button" class="fsg-modal-secondary">Reset selection</button>
                                            </div>
                                            <details id="quick-fit-crop-fine-tune" class="fsg-quick-fit-crop-fine-tune">
                                                <summary>Fine tune crop</summary>
                                                <div class="grid gap-3 pt-4 sm:grid-cols-2">
                                                    <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Horizontal position
                                                        <input id="quick-fit-crop-x" type="range" min="0" max="0" value="0" class="mt-2 w-full accent-blue-700">
                                                    </label>
                                                    <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Vertical position
                                                        <input id="quick-fit-crop-y" type="range" min="0" max="0" value="0" class="mt-2 w-full accent-blue-700">
                                                    </label>
                                                    <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Crop width
                                                        <input id="quick-fit-crop-width" type="range" min="16" max="16" value="16" class="mt-2 w-full accent-blue-700">
                                                    </label>
                                                    <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Crop height <span class="font-normal text-zinc-500 dark:text-zinc-400">(follows width, to keep the requested shape)</span>
                                                        <input id="quick-fit-crop-height" type="range" min="16" max="16" value="16" class="mt-2 w-full accent-blue-700" disabled>
                                                    </label>
                                                </div>
                                            </details>
                                        </section>

                                    </div>
                                    <div class="fsg-task-dialog__actions">
                                        <div>
                                            <button id="quick-fit-modal-cancel" type="button" class="fsg-modal-secondary hidden">Cancel</button>
                                            <button id="quick-fit-crop-back" type="button" class="fsg-modal-secondary hidden">Back</button>
                                        </div>
                                        <div>
                                            <button id="process-button" type="submit" form="requirements-form" class="fsg-modal-primary">Get file ready</button>
                                            <button id="quick-fit-confirm-crop" type="button" class="fsg-modal-primary hidden">Confirm crop</button>
                                        </div>
                                    </div>
                                </div>
                            </dialog>
                        </div>

                        <div id="guided-fit-panel" role="tabpanel" aria-labelledby="mode-tab-guided-fit" class="hidden flex-col gap-6">
                            <div class="fsg-workflow-launcher">
                                <span class="fsg-workflow-launcher__icon"><x-icon name="target" class="size-5" /></span>
                                <div>
                                    <h3>Choose a website destination</h3>
                                    <p id="guided-fit-compact-status">Choose a website destination and review a practical recommendation.</p>
                                </div>
                                <button id="guided-fit-open" type="button" class="fsg-modal-primary" aria-haspopup="dialog" aria-controls="guided-fit-dialog" disabled>Choose destination</button>
                            </div>

                            <dialog id="guided-fit-dialog" class="fsg-task-dialog fsg-task-dialog--wide" aria-labelledby="guided-fit-dialog-title" aria-describedby="guided-fit-dialog-description">
                                <div class="fsg-task-dialog__surface">
                                    <header class="fsg-task-dialog__header">
                                        <div>
                                            <p class="fsg-task-dialog__context">Guided Fit</p>
                                            <h2 id="guided-fit-dialog-title">Prepare for the right website placement</h2>
                                            <p id="guided-fit-dialog-description">Choose where the image will be used, then review FileSetGo's practical recommendation before preparing it.</p>
                                        </div>
                                        <div class="fsg-task-dialog__header-actions">
                                            <button id="guided-fit-close" type="button" class="fsg-task-dialog__close" aria-label="Close Guided Fit">
                                                <x-icon name="close" class="size-5" />
                                            </button>
                                        </div>
                                    </header>
                                    <ol id="guided-fit-progress" class="fsg-task-dialog__progress" aria-label="Guided Fit progress">
                                        <li data-modal-step-id="destination" data-modal-step="1"><span>1</span>Choose destination</li>
                                        <li data-modal-step-id="review" data-modal-step="2"><span>2</span>Review recommendation</li>
                                        <li data-modal-step-id="crop" data-modal-step="3"><span>3</span>Confirm crop</li>
                                        <li data-modal-step-id="prepare" data-modal-step="4"><span>4</span>Prepare file</li>
                                    </ol>
                                    <div class="fsg-task-dialog__mobile-progress" aria-live="polite">
                                        <div><span id="guided-fit-mobile-step">Step 1 of 3</span><strong id="guided-fit-mobile-title">Choose destination</strong></div>
                                        <span class="fsg-task-dialog__progress-track" role="progressbar" aria-label="Guided Fit progress" aria-valuemin="1" aria-valuemax="3" aria-valuenow="1"><span id="guided-fit-mobile-progress-bar"></span></span>
                                    </div>
                                    <div class="fsg-task-dialog__content">
                                        <div id="guided-fit-source-confirmation" class="fsg-source-confirmation">
                                            <div class="fsg-source-confirmation__thumb">
                                                <img id="guided-fit-source-thumbnail" alt="Preview of your selected source image">
                                            </div>
                                            <div class="fsg-source-confirmation__meta">
                                                <p class="fsg-task-dialog__context">Source image</p>
                                                <p id="guided-fit-source-name" class="text-sm font-semibold"></p>
                                                <p id="guided-fit-source-meta" class="text-xs text-zinc-500 dark:text-zinc-400"></p>
                                            </div>
                                            <button id="guided-fit-change-image" type="button" class="fsg-summary-action">Change image</button>
                                        </div>
                                        <section id="guided-fit-step-1" class="fsg-modal-step flex flex-col gap-4" aria-labelledby="guided-fit-step-1-title">
                                            <div>
                                                <h3 id="guided-fit-step-1-title" class="text-base font-semibold">Choose what you're preparing</h3>
                                                <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Choose the destination. FileSetGo will translate it into practical format, dimension and size guidance.</p>
                                            </div>
                                            <div role="radiogroup" aria-label="What are you preparing?" class="grid gap-4 sm:grid-cols-3">
                                                @foreach (['web.hero', 'web.content', 'web.card'] as $presetId)
                                                    <label class="preset-card flex cursor-pointer flex-col gap-2 rounded-xl border border-zinc-300 bg-white p-4 transition hover:border-blue-500 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600 has-[:checked]:border-blue-600 has-[:checked]:ring-2 has-[:checked]:ring-blue-600 dark:border-zinc-700 dark:bg-zinc-900" data-preset-id="{{ $presetId }}">
                                                        <input type="radio" name="preset-choice" value="{{ $presetId }}" class="sr-only">
                                                        <span class="preset-card-title font-semibold"></span>
                                                        <span class="preset-card-use text-sm text-zinc-600 dark:text-zinc-400"></span>
                                                        <span class="preset-card-summary text-xs font-medium text-blue-700 dark:text-blue-400"></span>
                                                    </label>
                                                @endforeach
                                            </div>
                                        </section>

                                        <section id="guided-fit-step-2" class="fsg-modal-step hidden flex-col gap-5" aria-labelledby="guided-fit-step-2-title">
                                            <div class="fsg-decision-summary">
                                                <div><p class="fsg-task-dialog__context">Selected destination</p><h3 id="guided-selected-summary-title"></h3><p id="guided-selected-summary-meta"></p></div>
                                                <button id="guided-change-destination" type="button" class="fsg-summary-action">Change</button>
                                            </div>
                                            <div id="preset-recommendation" class="hidden flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                                                <div>
                                                    <p class="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">FileSetGo recommendation</p>
                                                    <p id="preset-recommendation-title" class="mt-1 text-lg font-semibold"></p>
                                                </div>
                                                <p id="preset-recommendation-summary" class="text-sm text-zinc-700 dark:text-zinc-300"></p>
                                                <p class="text-sm text-zinc-500 dark:text-zinc-400">This destination uses an exact size. If your image's shape doesn't already match, you'll be asked to choose what to keep before it's prepared.</p>
                                                <p id="preset-recommendation-rationale" class="text-sm text-zinc-500 dark:text-zinc-400"></p>
                                                <div id="preset-already-ready" class="hidden rounded-lg bg-blue-50 p-3 text-sm font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300">This file already fits this recommendation.</div>
                                                <p id="guided-no-file-hint" class="hidden text-sm text-zinc-500 dark:text-zinc-400">Choose an image above to continue.</p>
                                                <div id="guided-fit-upscale-field" class="hidden items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                                                    <input id="guided-fit-upscale-approve" type="checkbox" class="mt-1 size-4 rounded border-amber-400 text-blue-700 focus:ring-2 focus:ring-blue-600">
                                                    <label for="guided-fit-upscale-approve" class="flex flex-col gap-1">
                                                        <span class="text-sm font-semibold text-amber-900 dark:text-amber-200">This result is larger than the source detail available</span>
                                                        <span class="text-sm text-amber-800 dark:text-amber-300">Reaching this destination's exact size means enlarging the image, which can make it look softer. Approve to continue anyway.</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </section>

                                        <section id="guided-fit-step-crop" class="fsg-modal-step hidden flex-col gap-4" aria-labelledby="guided-fit-crop-heading">
                                            <div class="flex flex-col gap-1">
                                                <h3 id="guided-fit-crop-heading" class="text-base font-semibold">Choose the part of the image you want to keep</h3>
                                                <p class="text-sm text-zinc-600 dark:text-zinc-400">This destination's shape is different from your source image. FileSetGo will not crop it without your approval.</p>
                                            </div>

                                            <div id="guided-fit-crop-stage" class="fsg-quick-fit-crop-stage" aria-label="Locked-ratio crop selection area">
                                                <img id="guided-fit-crop-image" alt="Source image available for crop selection" draggable="false">
                                                <div id="guided-fit-crop-selection" class="fsg-quick-fit-crop-selection" tabindex="0" role="group" aria-label="Locked-ratio crop selection. Drag to move. Drag an edge or corner to resize, keeping the requested shape. Use arrow keys to move; hold Shift to resize.">
                                                    @foreach (['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as $handle)
                                                        <span class="fsg-quick-fit-crop-handle fsg-quick-fit-crop-handle--{{ $handle }}" data-crop-handle="{{ $handle }}" aria-hidden="true"></span>
                                                    @endforeach
                                                </div>
                                            </div>
                                            <div class="flex flex-wrap items-center justify-between gap-3">
                                                <p id="guided-fit-crop-status" class="text-xs text-zinc-600 dark:text-zinc-400" role="status"></p>
                                                <button id="guided-fit-crop-reset" type="button" class="fsg-modal-secondary">Reset selection</button>
                                            </div>
                                            <details id="guided-fit-crop-fine-tune" class="fsg-quick-fit-crop-fine-tune">
                                                <summary>Fine tune crop</summary>
                                                <div class="grid gap-3 pt-4 sm:grid-cols-2">
                                                    <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Horizontal position
                                                        <input id="guided-fit-crop-x" type="range" min="0" max="0" value="0" class="mt-2 w-full accent-blue-700">
                                                    </label>
                                                    <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Vertical position
                                                        <input id="guided-fit-crop-y" type="range" min="0" max="0" value="0" class="mt-2 w-full accent-blue-700">
                                                    </label>
                                                    <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Crop width
                                                        <input id="guided-fit-crop-width" type="range" min="16" max="16" value="16" class="mt-2 w-full accent-blue-700">
                                                    </label>
                                                    <label class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Crop height <span class="font-normal text-zinc-500 dark:text-zinc-400">(follows width, to keep the requested shape)</span>
                                                        <input id="guided-fit-crop-height" type="range" min="16" max="16" value="16" class="mt-2 w-full accent-blue-700" disabled>
                                                    </label>
                                                </div>
                                            </details>
                                        </section>

                                        <section id="guided-fit-step-3" class="fsg-modal-step hidden flex-col gap-5" aria-labelledby="guided-fit-step-3-title">
                                            <div class="fsg-processing-focal">
                                                <span class="fsg-processing-focal__icon"><x-icon name="target" class="size-6" /></span>
                                                <p id="guided-preparing-eyebrow" class="fsg-task-dialog__context">Preparing for</p>
                                                <h3 id="guided-fit-step-3-title"></h3>
                                                <p id="guided-preparing-summary" class="text-sm text-zinc-500 dark:text-zinc-400"></p>
                                                <x-processing-glyph />
                                                <p id="guided-preparing-status" class="text-sm" role="status">Ready to prepare this file.</p>
                                            </div>
                                        </section>
                                    </div>
                                    <div class="fsg-task-dialog__actions">
                                        <div>
                                            <button id="guided-step-back" type="button" class="fsg-modal-secondary hidden">Back</button>
                                            <button id="guided-fit-crop-back" type="button" class="fsg-modal-secondary hidden">Back</button>
                                            <button id="guided-adjust-button" type="button" class="fsg-modal-secondary hidden">Adjust settings</button>
                                            <button id="guided-fit-modal-cancel" type="button" class="fsg-modal-secondary hidden">Cancel</button>
                                        </div>
                                        <div>
                                            <button id="guided-step-continue" type="button" class="fsg-modal-primary">Continue</button>
                                            <button id="guided-process-button" type="button" class="fsg-modal-primary hidden">Get file ready</button>
                                            <a id="guided-use-file-button" href="#" class="fsg-modal-primary hidden">Use this file</a>
                                            <button id="guided-fit-confirm-crop" type="button" class="fsg-modal-primary hidden">Confirm crop</button>
                                        </div>
                                    </div>
                                </div>
                            </dialog>
                        </div>

                        <div id="logo-pack-panel" role="tabpanel" aria-labelledby="mode-tab-logo-pack" class="hidden flex-col gap-6">
                            <div class="fsg-workflow-launcher">
                                <span class="fsg-workflow-launcher__icon"><x-icon name="favicon" class="size-5" /></span>
                                <div>
                                    <h3>Build a complete website logo pack</h3>
                                    <p id="logo-pack-compact-status">Choose a source image, then review background and icon choices in one focused flow.</p>
                                </div>
                                <button id="logo-pack-open" type="button" class="fsg-modal-primary" aria-haspopup="dialog" aria-controls="logo-pack-dialog" disabled>Prepare logo pack</button>
                            </div>

                            <dialog id="logo-pack-dialog" class="fsg-task-dialog fsg-task-dialog--wide" aria-labelledby="logo-pack-dialog-title" aria-describedby="logo-pack-dialog-description">
                                <div class="fsg-task-dialog__surface">
                                    <header class="fsg-task-dialog__header">
                                        <div>
                                            <p class="fsg-task-dialog__context">Logo Pack</p>
                                            <h2 id="logo-pack-dialog-title">Turn one logo into seven website assets</h2>
                                            <p id="logo-pack-dialog-description">Review the source, choose the background treatment and approve the compact mark used for favicon assets.</p>
                                        </div>
                                        <div class="fsg-task-dialog__header-actions">
                                            <button id="logo-pack-close" type="button" class="fsg-task-dialog__close" aria-label="Close Logo Pack">
                                                <x-icon name="close" class="size-5" />
                                            </button>
                                        </div>
                                    </header>
                                    <ol class="fsg-task-dialog__progress fsg-task-dialog__progress--five" aria-label="Logo Pack progress">
                                        <li data-modal-step="1"><span>1</span>Check logo</li>
                                        <li data-modal-step="2"><span>2</span>Choose background</li>
                                        <li data-modal-step="3"><span>3</span>Review transparency</li>
                                        <li data-modal-step="4"><span>4</span>Choose icon</li>
                                        <li data-modal-step="5"><span>5</span>Review pack</li>
                                    </ol>
                                    <div class="fsg-task-dialog__mobile-progress" aria-live="polite">
                                        <div><span id="logo-pack-mobile-step">Step 1 of 5</span><strong id="logo-pack-mobile-title">Check logo</strong></div>
                                        <span class="fsg-task-dialog__progress-track" role="progressbar" aria-label="Logo Pack progress" aria-valuemin="1" aria-valuemax="5" aria-valuenow="1"><span id="logo-pack-mobile-progress-bar"></span></span>
                                    </div>
                                    <div class="fsg-task-dialog__content">
                                        <!-- The source-required gate (FSG-007-FIT-001B) guarantees this dialog
                                             never opens without an active source, so Logo Pack no longer needs
                                             its own independent upload input — it always goes straight to review. -->
                                        <div id="logo-pack-review" class="flex flex-col gap-4">
                                            <section id="logo-pack-step-1" class="fsg-modal-step flex flex-col gap-4" aria-labelledby="logo-pack-step-1-title">
                                                <div id="logo-pack-source-confirmation" class="fsg-source-confirmation">
                                                    <div class="fsg-source-confirmation__thumb">
                                                        <img id="logo-pack-source-thumbnail" alt="Preview of your selected source image">
                                                    </div>
                                                    <div class="fsg-source-confirmation__meta">
                                                        <p class="fsg-task-dialog__context">Source logo</p>
                                                        <p id="logo-pack-modal-source-name" class="text-sm font-semibold"></p>
                                                        <p id="logo-pack-source-meta" class="text-xs text-zinc-500 dark:text-zinc-400"></p>
                                                    </div>
                                                    <button id="logo-pack-change-image" type="button" class="fsg-summary-action">Change image</button>
                                                </div>
                                                <div><h3 id="logo-pack-step-1-title" class="text-base font-semibold">Suitability review</h3><p class="mt-1 text-sm text-zinc-600 dark:text-zinc-400">FileSetGo checks whether this source can produce the governed website logo files.</p></div>
                                                <ul id="logo-pack-issues" class="flex flex-col gap-2 text-sm"></ul>
                                            </section>

                                            <section id="logo-pack-step-2" class="fsg-modal-step hidden flex-col gap-4" aria-labelledby="logo-pack-step-2-title">
                                                <div class="fsg-compact-source-summary"><span><strong id="logo-pack-compact-source-name"></strong><small id="logo-pack-compact-source-meta"></small></span></div>
                                                <fieldset id="logo-pack-mode-fieldset" class="flex flex-col gap-3">
                                    <legend class="text-sm font-semibold">How should we prepare your logo?</legend>
                                    <label class="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:border-zinc-800 dark:has-[:checked]:border-blue-500 dark:has-[:checked]:bg-blue-950/40">
                                        <input type="radio" name="logo-pack-mode" id="logo-pack-mode-transparent" value="transparent" class="mt-1 h-4 w-4 shrink-0 accent-blue-700">
                                        <span>
                                            <span class="block text-sm font-semibold">Transparent background</span>
                                            <span class="block text-xs text-zinc-600 dark:text-zinc-400">Best for website headers, navigation, overlays and footers. Works on light or dark backgrounds.</span>
                                        </span>
                                    </label>
                                    <label class="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 dark:border-zinc-800 dark:has-[:checked]:border-blue-500 dark:has-[:checked]:bg-blue-950/40">
                                        <input type="radio" name="logo-pack-mode" id="logo-pack-mode-original" value="original" class="mt-1 h-4 w-4 shrink-0 accent-blue-700">
                                        <span>
                                            <span class="block text-sm font-semibold">Keep existing background</span>
                                            <span class="block text-xs text-zinc-600 dark:text-zinc-400">Preserves the uploaded artwork/background as supplied.</span>
                                        </span>
                                    </label>
                                                </fieldset>

                                                <fieldset id="logo-pack-strength-fieldset" class="hidden flex-col gap-2">
                                    <legend class="text-sm font-semibold">Background removal</legend>
                                    <div class="flex flex-wrap gap-2">
                                        <label class="flex min-h-11 cursor-pointer items-center rounded-lg border border-zinc-200 px-4 text-sm font-medium transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-800 dark:border-zinc-800 dark:has-[:checked]:border-blue-500 dark:has-[:checked]:bg-blue-950/40 dark:has-[:checked]:text-blue-300">
                                            <input type="radio" name="logo-pack-strength" id="logo-pack-strength-gentle" value="gentle" class="sr-only">Gentle
                                        </label>
                                        <label class="flex min-h-11 cursor-pointer items-center rounded-lg border border-zinc-200 px-4 text-sm font-medium transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-800 dark:border-zinc-800 dark:has-[:checked]:border-blue-500 dark:has-[:checked]:bg-blue-950/40 dark:has-[:checked]:text-blue-300">
                                            <input type="radio" name="logo-pack-strength" id="logo-pack-strength-balanced" value="balanced" class="sr-only">Balanced
                                        </label>
                                        <label class="flex min-h-11 cursor-pointer items-center rounded-lg border border-zinc-200 px-4 text-sm font-medium transition has-[:checked]:border-blue-600 has-[:checked]:bg-blue-50 has-[:checked]:text-blue-800 dark:border-zinc-800 dark:has-[:checked]:border-blue-500 dark:has-[:checked]:bg-blue-950/40 dark:has-[:checked]:text-blue-300">
                                            <input type="radio" name="logo-pack-strength" id="logo-pack-strength-strong" value="strong" class="sr-only">Strong
                                        </label>
                                    </div>
                                                </fieldset>

                                                <p id="logo-pack-preview-status" class="hidden text-sm text-zinc-600 dark:text-zinc-400" role="status"></p>

                                                <button id="logo-pack-retry-preview-button" type="button" class="fsg-modal-secondary hidden w-fit">Try again</button>
                                            </section>

                                            <section id="logo-pack-step-3" class="fsg-modal-step hidden flex-col gap-4" aria-labelledby="logo-pack-step-3-title">
                                                <div class="flex flex-wrap items-center justify-between gap-3"><div><p class="fsg-task-dialog__context">Prepared logo</p><h3 id="logo-pack-step-3-title" class="text-base font-semibold">Review transparency</h3></div><button id="logo-pack-change-background" type="button" class="fsg-summary-action">Change background treatment</button></div>
                                                <div id="logo-pack-original-review" class="fsg-decision-summary hidden"><div><p class="fsg-task-dialog__context">Background</p><h3>Existing background kept</h3><p>The uploaded artwork and its current background will be used for the pack.</p></div></div>
                                                <div id="logo-pack-preview" class="hidden flex-col gap-3">
                                    <div class="flex flex-wrap items-center justify-between gap-3">
                                        <p id="logo-pack-preview-confidence" class="text-sm font-semibold"></p>
                                        <div role="group" aria-label="Preview background" class="flex gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
                                            <button type="button" id="logo-pack-preview-bg-checkerboard" class="min-h-11 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition" aria-pressed="true">Checkerboard</button>
                                            <button type="button" id="logo-pack-preview-bg-light" class="min-h-11 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition" aria-pressed="false">Light</button>
                                            <button type="button" id="logo-pack-preview-bg-dark" class="min-h-11 whitespace-nowrap rounded-md px-3 text-xs font-semibold transition" aria-pressed="false">Dark</button>
                                        </div>
                                    </div>
                                    <div id="logo-pack-preview-frame" class="fsg-checkerboard flex min-h-40 items-center justify-center rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
                                        <img id="logo-pack-preview-image" alt="Preview of your logo with the prepared transparent background" class="max-h-32 max-w-full">
                                    </div>
                                    <dl id="logo-pack-preview-readiness" class="grid grid-cols-2 gap-x-5 gap-y-3 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-950">
                                        <div>
                                            <dt class="text-xs text-zinc-500 dark:text-zinc-400">Original</dt>
                                            <dd id="logo-pack-preview-original-dimensions" class="mt-1 font-semibold"></dd>
                                        </div>
                                        <div>
                                            <dt class="text-xs text-zinc-500 dark:text-zinc-400">Prepared logo</dt>
                                            <dd id="logo-pack-preview-prepared-dimensions" class="mt-1 font-semibold"></dd>
                                        </div>
                                        <div>
                                            <dt class="text-xs text-zinc-500 dark:text-zinc-400">Canvas</dt>
                                            <dd id="logo-pack-preview-canvas" class="mt-1 font-semibold"></dd>
                                        </div>
                                        <div>
                                            <dt class="text-xs text-zinc-500 dark:text-zinc-400">Resolution</dt>
                                            <dd id="logo-pack-preview-resolution" class="mt-1 font-semibold"></dd>
                                        </div>
                                    </dl>
                                                </div>
                                            </section>

                                            <section id="logo-pack-step-4" class="fsg-modal-step hidden" aria-labelledby="logo-pack-favicon-heading">
                                                <section id="logo-pack-favicon-source" class="fsg-favicon-source-step hidden flex-col gap-4" aria-labelledby="logo-pack-favicon-heading">
                                    <div class="flex flex-col gap-1">
                                        <h3 id="logo-pack-favicon-heading" class="text-base font-semibold text-slate-950 dark:text-slate-100">Choose your favicon source</h3>
                                        <p id="logo-pack-favicon-guidance" class="text-sm leading-relaxed text-slate-600 dark:text-slate-300"></p>
                                    </div>

                                    <div class="fsg-favicon-workbench">
                                        <div class="fsg-favicon-workbench__controls">
                                    <fieldset id="logo-pack-favicon-options" class="grid gap-2" aria-describedby="logo-pack-favicon-guidance">
                                        <legend class="sr-only">Favicon source</legend>
                                        <label class="fsg-favicon-option">
                                            <input id="logo-pack-favicon-option-crop" type="radio" name="logo-pack-favicon-source" value="selected-region" class="mt-1 h-4 w-4 shrink-0 accent-blue-700">
                                            <span><strong>Select part of this logo</strong><small>Choose the mark or artwork area freely. FileSetGo will fit it into the square outputs afterward.</small></span>
                                        </label>
                                        <label class="fsg-favicon-option">
                                            <input id="logo-pack-favicon-option-alternate" type="radio" name="logo-pack-favicon-source" value="alternate-icon" class="mt-1 h-4 w-4 shrink-0 accent-blue-700">
                                            <span><strong>Use another icon</strong><small>Upload a standalone symbol, monogram, or compact mark.</small></span>
                                        </label>
                                        <label class="fsg-favicon-option">
                                            <input id="logo-pack-favicon-option-full" type="radio" name="logo-pack-favicon-source" value="full-logo" class="mt-1 h-4 w-4 shrink-0 accent-blue-700">
                                            <span><strong>Use full logo</strong><small id="logo-pack-favicon-full-description">Keep the entire prepared logo in every square icon.</small></span>
                                        </label>
                                    </fieldset>

                                    <div id="logo-pack-favicon-crop-panel" class="hidden flex-col gap-4">
                                        <p class="text-sm font-medium text-slate-800 dark:text-slate-200">Adjust icon area</p>
                                        <div id="logo-pack-favicon-crop-stage" class="fsg-favicon-crop-stage" aria-label="Freeform favicon source selection area">
                                            <img id="logo-pack-favicon-crop-image" alt="Prepared logo available for favicon selection" draggable="false">
                                            <div id="logo-pack-favicon-crop-selection" class="fsg-favicon-crop-selection" tabindex="0" role="group" aria-label="Freeform favicon source selection. Drag to move. Drag an edge or corner to resize. Use arrow keys to move; hold Shift to change width or height.">
                                                @foreach (['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as $handle)
                                                    <span class="fsg-favicon-crop-handle fsg-favicon-crop-handle--{{ $handle }}" data-crop-handle="{{ $handle }}" aria-hidden="true"></span>
                                                @endforeach
                                            </div>
                                        </div>
                                        <div class="flex flex-wrap items-center justify-between gap-3">
                                            <p id="logo-pack-favicon-selection-status" class="text-xs text-slate-600 dark:text-slate-400" role="status"></p>
                                            <button id="logo-pack-favicon-crop-reset" type="button" class="fsg-modal-secondary">Reset selection</button>
                                        </div>
                                        <details id="logo-pack-favicon-fine-tune" class="fsg-favicon-fine-tune">
                                            <summary>Fine tune selection</summary>
                                            <div class="grid gap-3 pt-4 sm:grid-cols-2">
                                            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Horizontal position
                                                <input id="logo-pack-favicon-crop-x" type="range" min="0" max="0" value="0" class="mt-2 w-full accent-blue-700">
                                            </label>
                                            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Vertical position
                                                <input id="logo-pack-favicon-crop-y" type="range" min="0" max="0" value="0" class="mt-2 w-full accent-blue-700">
                                            </label>
                                            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Selection width
                                                <input id="logo-pack-favicon-crop-width" type="range" min="16" max="16" value="16" class="mt-2 w-full accent-blue-700">
                                            </label>
                                            <label class="text-xs font-semibold text-slate-700 dark:text-slate-300">Selection height
                                                <input id="logo-pack-favicon-crop-height" type="range" min="16" max="16" value="16" class="mt-2 w-full accent-blue-700">
                                            </label>
                                            </div>
                                        </details>
                                    </div>

                                    <div id="logo-pack-favicon-alternate-panel" class="hidden flex-col gap-2">
                                        <label for="logo-pack-favicon-alternate-file" class="text-sm font-semibold text-slate-900 dark:text-slate-100">Choose a separate icon file</label>
                                        <input id="logo-pack-favicon-alternate-file" type="file" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif" class="fsg-file-input min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-blue-700 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                                        <p class="text-xs leading-relaxed text-slate-600 dark:text-slate-400">The icon is safety-checked and kept separate from your header logo. Existing transparency is preserved; opaque backgrounds are kept.</p>
                                        <p id="logo-pack-favicon-alternate-status" class="hidden text-sm" role="status"></p>
                                    </div>
                                        </div>

                                    <div id="logo-pack-favicon-preview" class="hidden flex-col gap-3" aria-labelledby="logo-pack-favicon-preview-heading">
                                        <div class="flex flex-wrap items-center justify-between gap-3">
                                            <h4 id="logo-pack-favicon-preview-heading" class="text-sm font-semibold text-slate-900 dark:text-slate-100">Actual icon preview</h4>
                                            <div class="flex gap-1" aria-label="Favicon preview background">
                                                <button id="logo-pack-favicon-preview-light" type="button" class="min-h-11 rounded-md px-3 text-xs font-semibold" aria-pressed="true">Light</button>
                                                <button id="logo-pack-favicon-preview-dark" type="button" class="min-h-11 rounded-md px-3 text-xs font-semibold" aria-pressed="false">Dark</button>
                                            </div>
                                        </div>
                                        <div id="logo-pack-favicon-preview-surface" class="fsg-favicon-preview-surface">
                                            <figure><canvas id="logo-pack-favicon-preview-16" width="16" height="16" aria-label="16 pixel favicon preview"></canvas><figcaption>16 px</figcaption></figure>
                                            <figure><canvas id="logo-pack-favicon-preview-32" width="32" height="32" aria-label="32 pixel favicon preview"></canvas><figcaption>32 px</figcaption></figure>
                                            <figure><canvas id="logo-pack-favicon-preview-180" width="180" height="180" aria-label="180 pixel touch icon preview"></canvas><figcaption>180 px</figcaption></figure>
                                        </div>
                                    </div>
                                                    </div>
                                                    <p id="logo-pack-favicon-confirmed" class="hidden text-sm font-semibold text-emerald-700 dark:text-emerald-400" role="status"></p>
                                                </section>
                                            </section>

                                            <section id="logo-pack-step-5" class="fsg-modal-step hidden" aria-labelledby="logo-pack-final-review-heading">
                                                <section id="logo-pack-final-review" class="fsg-package-review hidden" aria-labelledby="logo-pack-final-review-heading">
                                                    <div class="fsg-package-review__intro">
                                                        <p class="fsg-task-dialog__context">Ready to generate</p>
                                                        <h3 id="logo-pack-final-review-heading">Review the package</h3>
                                                        <p>One prepared logo, two governed source paths, seven website assets.</p>
                                                    </div>
                                                    <div class="fsg-package-review__sources">
                                                        <article><div class="fsg-package-review__preview fsg-package-review__preview--wide"><img id="logo-pack-final-header-preview" alt="Full prepared logo used for header assets"></div><p>Header assets</p><strong>Full prepared logo</strong></article>
                                                        <article><div class="fsg-package-review__preview"><canvas id="logo-pack-final-favicon-preview" width="64" height="64" aria-label="Approved favicon source preview"></canvas></div><p>Favicon source</p><strong id="logo-pack-final-favicon-source"></strong><button id="logo-pack-change-favicon" type="button" class="fsg-summary-action">Change</button></article>
                                                    </div>
                                                    <dl>
                                                        <div><dt>Package</dt><dd>7 website assets</dd></div>
                                                        <div><dt>Background</dt><dd id="logo-pack-final-background"></dd></div>
                                                    </dl>
                                                </section>
                                            </section>
                                        </div>
                                    </div>
                                    <div class="fsg-task-dialog__actions">
                                        <div>
                                            <button id="logo-pack-step-back" type="button" class="fsg-modal-secondary hidden">Back</button>
                                            <button id="logo-pack-modal-cancel" type="button" class="fsg-modal-secondary hidden">Cancel</button>
                                        </div>
                                        <div>
                                            <button id="logo-pack-step-continue" type="button" class="fsg-modal-primary">Continue</button>
                                            <button id="logo-pack-favicon-confirm" type="button" class="fsg-modal-primary hidden" disabled>Confirm favicon source</button>
                                            <button id="logo-pack-create-button" type="button" class="fsg-modal-primary hidden">Generate logo pack</button>
                                        </div>
                                    </div>
                                </div>
                            </dialog>
                        </div>

                        <!-- Sibling of all three per-mode panels, not nested inside any —
                             a <dialog> shown via showModal() still fails to render if any
                             flat-tree ancestor is `display:none`, and each panel toggles
                             `hidden` whenever it isn't the active mode (FSG-007-FIT-001B). -->
                        <dialog id="source-required-dialog" class="fsg-gate-dialog" aria-labelledby="source-required-title" aria-describedby="source-required-body">
                            <div class="fsg-gate-dialog__surface">
                                <button id="source-required-close" type="button" class="fsg-task-dialog__close" aria-label="Close">
                                    <x-icon name="close" class="size-5" />
                                </button>
                                <h2 id="source-required-title">Choose an image first</h2>
                                <p id="source-required-body">File. Set. Go. needs the source image before it can prepare this task.</p>
                                <button id="source-required-choose" type="button" class="fsg-modal-primary">Choose image</button>
                            </div>
                        </dialog>

                        <div class="fsg-workflow-actions flex flex-wrap items-center gap-3">
                            <button id="cancel-button" type="button" class="hidden min-h-11 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950">Cancel</button>
                            <button id="reset-button" type="button" class="hidden min-h-11 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950">Start again</button>
                        </div>

                        <p id="status-message" class="min-h-6 text-sm font-medium text-zinc-700 dark:text-zinc-300" data-state="idle">Choose a supported image to begin.</p>
                        <p id="status-announcer" class="sr-only" aria-live="polite"></p>
                    </div>

                    <aside class="fsg-result-stage flex flex-col gap-6" aria-labelledby="result-title">
                        <div class="fsg-stage-label" aria-hidden="true">
                            <span class="fsg-stage-label__word">GO</span>
                            <span class="fsg-stage-label__instruction">Download the prepared result</span>
                        </div>
                        <div class="fsg-result-object overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                            <header class="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800"><h2 id="result-title" tabindex="-1" class="font-semibold">Ready file</h2></header>

                            <div id="result-empty" class="flex min-h-72 items-center justify-center p-8 text-center text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">Your ready-to-use file will appear here.</div>

                            <div id="result-content" class="hidden flex-col gap-5 p-5">
                                <p id="result-headline" class="text-lg font-semibold">Your file is ready.</p>
                                <p id="result-filename" class="font-mono text-sm font-semibold"></p>
                                <p id="result-prepared-for" class="hidden text-sm font-medium text-blue-700 dark:text-blue-400">Prepared for: <span id="result-prepared-for-value"></span></p>
                                <p id="result-detail" class="text-sm text-zinc-600 dark:text-zinc-400"></p>
                                <div class="grid grid-cols-3 gap-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950">
                                    <div><p class="text-xs text-zinc-500 dark:text-zinc-400">Dimensions</p><p id="result-dimensions" class="mt-1 text-sm font-semibold"></p></div>
                                    <div><p class="text-xs text-zinc-500 dark:text-zinc-400">Format</p><p id="result-format" class="mt-1 text-sm font-semibold"></p></div>
                                    <div><p class="text-xs text-zinc-500 dark:text-zinc-400">Size</p><p id="result-size" class="mt-1 text-sm font-semibold"></p></div>
                                </div>
                                <a id="download-link" class="min-h-11 w-fit whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-zinc-900" href="#" download>Download ready file</a>
                                <x-related-product
                                    product-key="site"
                                    context="quick-fit"
                                    prompt="Want to know whether the rest of your website is ready?"
                                />
                            </div>

                            <div id="logo-pack-result" class="hidden flex-col gap-4 p-5">
                                <p class="text-lg font-semibold">Your logo pack is ready.</p>
                                <p class="fsg-text-muted text-sm">Seven validated website files are packaged together for download.</p>
                                <div id="logo-pack-result-readiness" class="fsg-logo-pack-readiness hidden flex-col gap-3 rounded-xl p-4">
                                    <p class="text-sm font-semibold">Full-resolution transparent PNG</p>
                                    <dl class="grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
                                        <div>
                                            <dt class="text-xs text-zinc-500 dark:text-zinc-400">Original</dt>
                                            <dd id="logo-pack-result-original-dimensions" class="mt-1 font-semibold"></dd>
                                        </div>
                                        <div>
                                            <dt class="text-xs text-zinc-500 dark:text-zinc-400">Prepared logo</dt>
                                            <dd id="logo-pack-result-prepared-dimensions" class="mt-1 font-semibold"></dd>
                                        </div>
                                        <div>
                                            <dt class="text-xs text-zinc-500 dark:text-zinc-400">Transparency</dt>
                                            <dd id="logo-pack-result-transparency" class="mt-1 font-semibold"></dd>
                                        </div>
                                        <div>
                                            <dt class="text-xs text-zinc-500 dark:text-zinc-400">Canvas</dt>
                                            <dd id="logo-pack-result-canvas" class="mt-1 font-semibold"></dd>
                                        </div>
                                    </dl>
                                    <p id="logo-pack-result-resolution" class="text-sm"></p>
                                </div>
                                <dl id="logo-pack-result-sources" class="fsg-logo-pack-sources grid grid-cols-2 gap-x-5 gap-y-3 rounded-xl p-4 text-sm">
                                    <div>
                                        <dt class="text-zinc-500 dark:text-zinc-400">Header logo</dt>
                                        <dd class="mt-1 font-semibold">Full prepared logo</dd>
                                    </div>
                                    <div>
                                        <dt class="text-zinc-500 dark:text-zinc-400">Favicon source</dt>
                                        <dd id="logo-pack-result-favicon-source" class="mt-1 font-semibold"></dd>
                                    </div>
                                </dl>
                                <a id="logo-pack-download-zip" href="#" class="min-h-11 w-fit whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-zinc-950" download>Download logo pack</a>
                                <details class="fsg-logo-pack-assets">
                                    <summary>View individual files <span>7 files</span></summary>
                                    <ul id="logo-pack-assets" class="flex flex-col gap-2"></ul>
                                </details>
                                <x-related-product
                                    product-key="brand"
                                    context="logo-pack"
                                    prompt="Building out the rest of your brand assets?"
                                />
                            </div>

                            <div id="result-unreachable" class="hidden flex-col gap-4 p-5" role="alert">
                                <p class="font-semibold text-amber-800 dark:text-amber-400">We couldn't quite reach that.</p>
                                <p id="unreachable-message" class="text-sm text-zinc-700 dark:text-zinc-300"></p>
                                <p id="unreachable-suggestion" class="text-sm text-zinc-600 dark:text-zinc-400"></p>
                                <button id="unreachable-adjust-button" type="button" class="hidden min-h-11 w-fit whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">Adjust settings</button>
                            </div>

                            <div id="result-error" class="hidden flex-col gap-4 p-5" role="alert">
                                <p class="font-semibold text-red-700 dark:text-red-400">Something went wrong.</p>
                                <p id="error-message" class="text-sm text-zinc-700 dark:text-zinc-300"></p>
                            </div>
                        </div>

                        <div class="fsg-workspace__privacy text-sm leading-relaxed">
                            <span class="fsg-workspace__privacy-mark" aria-hidden="true">✓</span>
                            <div>
                                <h2 class="font-semibold">Your image is processed here</h2>
                                <p class="mt-1">The image itself is not uploaded to FileSetGo for processing.</p>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>

            <section id="how-it-works" class="fsg-home-modes scroll-mt-20" aria-labelledby="how-it-works-title">
                <div class="fsg-content-shell">
                    <header class="fsg-home-section-heading">
                        <h2 id="how-it-works-title">Start with what you know.</h2>
                        <p>Choose the work mode that matches the job. The workspace keeps one source active while you decide how it should be prepared.</p>
                    </header>
                    <div class="fsg-home-modes__index">
                        <article class="fsg-home-mode fsg-home-mode--quick">
                            <div><h3>Quick Fit</h3><p>You know the requirement.</p></div>
                            <p>Set exact dimensions, a target file size or the output format yourself.</p>
                            <span>Exact size / target weight / format</span>
                        </article>
                        <article class="fsg-home-mode fsg-home-mode--guided">
                            <div><h3>Guided Fit</h3><p>You know where it will be used.</p></div>
                            <p>Choose Hero, Content or Card and review the practical recommendation before preparation.</p>
                            <span>Destination / recommendation / focus</span>
                        </article>
                        <article class="fsg-home-mode fsg-home-mode--logo">
                            <div><h3>Logo Pack</h3><p>You need the logo assets ready.</p></div>
                            <p>Prepare the website logo, transparency and favicon-ready assets as one governed package.</p>
                            <span>Website logo / transparency / favicon</span>
                        </article>
                    </div>
                </div>
            </section>

            <section class="fsg-home-destinations" aria-labelledby="home-destinations-title">
                <div class="fsg-shell fsg-home-destinations__inner">
                    <div class="fsg-home-destinations__copy">
                        <h2 id="home-destinations-title">The same image can need a different ready file.</h2>
                        <p>Guided Fit uses real destination geometry. A Hero needs width, Content needs balance, and a Card needs a compact repeatable frame.</p>
                        <a href="{{ route('website-image-optimizer') }}">Optimize an image for a website <x-icon name="arrow-right" class="size-4" /></a>
                    </div>
                    <figure class="fsg-home-destination-map" aria-labelledby="home-destination-caption">
                        <div class="fsg-home-destination-map__source">
                            <span>Source</span>
                            <img src="/brand/website-placement-demo.webp" alt="Blue ceramic vessels in a bright studio, used as the common source for three website destinations." width="1536" height="1024" loading="lazy">
                        </div>
                        <div class="fsg-home-destination-map__route" aria-hidden="true"><x-icon name="arrow-right" class="size-5" /></div>
                        <div class="fsg-home-destination-map__outputs">
                            <figure data-output-aspect="16:9"><img src="/brand/website-optimizer-hero-result.webp" alt="Wide Hero output from the ceramic studio source." width="1600" height="900" loading="lazy"><figcaption><strong>Hero</strong><span>1600 × 900</span></figcaption></figure>
                            <figure data-output-aspect="3:2"><img src="/brand/website-optimizer-content-result.webp" alt="Balanced Content output from the same ceramic studio source." width="1200" height="800" loading="lazy"><figcaption><strong>Content</strong><span>1200 × 800</span></figcaption></figure>
                            <figure data-output-aspect="4:3"><img src="/brand/website-optimizer-card-result.webp" alt="Compact Card output from the same ceramic studio source." width="800" height="600" loading="lazy"><figcaption><strong>Card</strong><span>800 × 600</span></figcaption></figure>
                        </div>
                        <figcaption id="home-destination-caption">One source. Three website jobs. Three prepared shapes.</figcaption>
                    </figure>
                </div>
            </section>

            <section class="fsg-shell fsg-home-control" aria-labelledby="home-control-title">
                <div class="fsg-home-control__copy">
                    <h2 id="home-control-title">When the image needs a different shape, you choose what stays.</h2>
                    <p>File. Set. Go. shows the required frame. You choose the image focus before the crop is applied.</p>
                    <strong>No silent crop. No automatic subject decision.</strong>
                </div>
                <figure class="fsg-home-crop" aria-labelledby="home-crop-caption">
                    <div class="fsg-home-crop__image">
                        <img src="/brand/website-placement-demo.webp" alt="The full ceramic studio source with a wide Hero frame preserving the main blue vase." width="1536" height="1024" loading="lazy">
                        <span class="fsg-home-crop__shade fsg-home-crop__shade--top" aria-hidden="true"></span>
                        <span class="fsg-home-crop__shade fsg-home-crop__shade--bottom" aria-hidden="true"></span>
                        <span class="fsg-home-crop__frame" aria-hidden="true"></span>
                    </div>
                    <figcaption id="home-crop-caption"><span>Source 3:2</span><x-icon name="arrow-right" class="size-4" /><strong>Approved Hero frame 16:9</strong></figcaption>
                </figure>
            </section>

            <section class="fsg-home-processing" aria-labelledby="home-processing-title">
                <div class="fsg-shell fsg-home-processing__inner">
                    <header class="fsg-home-section-heading">
                        <h2 id="home-processing-title">Then File. Set. Go. does the preparation.</h2>
                        <p>FILE accepts the source. SET applies the approved requirement. GO receives the validated result.</p>
                    </header>
                    <div class="fsg-home-processing__states" role="img" aria-label="The File, Set, Go processing system shown while preparing and when the result is ready.">
                        @foreach ([['phase' => 'preparing', 'label' => 'Preparing'], ['phase' => 'ready', 'label' => 'Ready']] as $state)
                            <div class="fsg-home-processing__state @if ($state['phase'] === 'ready') fsg-home-processing__state--ready @endif">
                                <span>{{ $state['label'] }}</span>
                                <div class="fsg-processing-rail" data-phase="{{ $state['phase'] }}" role="presentation">
                                    <div class="fsg-processing-rail__stage" data-stage="file"><p class="fsg-processing-rail__label">File</p><div class="fsg-processing-rail__node" data-node="file"><img class="fsg-processing-rail__thumb" src="/brand/website-placement-demo.webp" alt=""><span class="fsg-processing-rail__node-icon" data-node-icon="static"><x-icon name="file" class="size-7" /></span></div><p class="fsg-processing-rail__caption"><span data-phase-text="preparing validating ready">Source accepted</span></p></div>
                                    <div class="fsg-processing-rail__connector" data-connector="1" aria-hidden="true"></div>
                                    <div class="fsg-processing-rail__stage fsg-processing-rail__stage--set" data-stage="set"><p class="fsg-processing-rail__label">Set</p><div class="fsg-processing-rail__node" data-node="set"><span class="fsg-processing-rail__spinner" aria-hidden="true"></span><span class="fsg-processing-rail__node-icon" data-node-icon="check"><x-icon name="check" class="size-7" /></span></div><p class="fsg-processing-rail__caption"><span data-phase-text="preparing">Preparing</span><span data-phase-text="validating ready">Prepared</span></p></div>
                                    <div class="fsg-processing-rail__connector" data-connector="2" aria-hidden="true"></div>
                                    <div class="fsg-processing-rail__stage" data-stage="go"><p class="fsg-processing-rail__label">Go</p><div class="fsg-processing-rail__node" data-node="go"><span class="fsg-processing-rail__node-icon" data-node-icon="check"><x-icon name="check" class="size-7" /></span></div><p class="fsg-processing-rail__caption"><span data-phase-text="preparing">Waiting</span><span data-phase-text="ready">Ready</span></p></div>
                                </div>
                            </div>
                        @endforeach
                    </div>
                    <div class="fsg-home-result-truth">
                        <div><h3>Ready means checked.</h3><p>File. Set. Go. reports the actual finished format, dimensions and file size, not only what was requested.</p></div>
                        <dl><div><dt>Format</dt><dd>Final output</dd></div><div><dt>Dimensions</dt><dd>Measured result</dd></div><div><dt>File size</dt><dd>Actual bytes</dd></div></dl>
                    </div>
                </div>
            </section>

            <section class="fsg-home-trust" aria-labelledby="trust-title">
                <div class="fsg-content-shell fsg-home-trust__inner">
                    <div class="fsg-home-trust__heading">
                        <span aria-hidden="true"><x-icon name="check" class="size-5" /></span>
                        <h2 id="trust-title">Your image itself is not uploaded for processing.</h2>
                    </div>
                    <div>
                        <p>Supported workflows run in your browser. HEIC may load File. Set. Go.'s same-origin decoder resources, which is separate from sending your image to a processing endpoint.</p>
                        <a href="{{ route('privacy') }}">Read the privacy details</a>
                    </div>
                </div>
            </section>

            <section class="fsg-home-directory" aria-labelledby="home-directory-title">
                <div class="fsg-content-shell">
                    <header class="fsg-home-directory__header">
                        <div><h2 id="home-directory-title">What needs to be ready?</h2><p>Open the live workspace, or start from the website task you already recognize.</p></div>
                        <a href="#quick-fit" class="fsg-primary-action">Prepare a file <x-icon name="arrow-right" class="size-4" /></a>
                    </header>
                    <div class="fsg-home-directory__groups">
                        <nav aria-labelledby="logo-readiness-title"><h3 id="logo-readiness-title">Logo readiness</h3><a href="{{ route('prepare-logo') }}"><span>Prepare a logo</span><x-icon name="arrow-right" class="size-4" /></a><a href="{{ route('transparent-logo') }}"><span>Make a logo transparent</span><x-icon name="arrow-right" class="size-4" /></a><a href="{{ route('favicon-generator') }}"><span>Create a favicon</span><x-icon name="arrow-right" class="size-4" /></a></nav>
                        <nav aria-labelledby="image-readiness-title"><h3 id="image-readiness-title">Image readiness</h3><a href="{{ route('website-image-optimizer') }}"><span>Optimize a website image</span><x-icon name="arrow-right" class="size-4" /></a><a href="{{ route('compress-image') }}"><span>Compress an image</span><x-icon name="arrow-right" class="size-4" /></a><a href="{{ route('convert-webp') }}"><span>Convert to WebP</span><x-icon name="arrow-right" class="size-4" /></a></nav>
                        <nav aria-labelledby="exact-requirement-title"><h3 id="exact-requirement-title">Exact requirement</h3><a href="{{ route('home', ['mode' => 'quick-fit']) }}"><span>Use Quick Fit</span><x-icon name="arrow-right" class="size-4" /></a><p>Use the dimensions, file-size target or format your website already gave you.</p></nav>
                    </div>
                </div>
            </section>
        </div>
@endsection
