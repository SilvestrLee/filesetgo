<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="Resize, convert or fit an image under a file-size limit — right in your browser. Your image is never uploaded.">

        <title>File. Set. Go. | Get your file ready for where it needs to go.</title>

        @vite(['resources/css/app.css', 'resources/js/app.ts'])
    </head>
    <body class="min-h-[100dvh] bg-zinc-50 text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <a href="#quick-fit" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">Skip to Quick Fit</a>

        <header class="border-b border-zinc-200/80 dark:border-zinc-800">
            <div class="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
                <a class="text-lg font-semibold tracking-tight" href="/">File. Set. Go.</a>
                <nav aria-label="Primary" class="flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                    <a class="hover:text-zinc-950 dark:hover:text-zinc-100" href="#quick-fit">Quick Fit</a>
                    <a class="hover:text-zinc-950 dark:hover:text-zinc-100" href="#how-it-works">How it works</a>
                </nav>
            </div>
        </header>

        <main class="mx-auto flex max-w-6xl flex-col gap-16 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <section class="flex flex-col gap-3 text-center sm:text-left">
                <p class="text-sm font-semibold text-blue-700 dark:text-blue-400">File. Set. Go.</p>
                <h1 class="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                    Get your file ready for where it needs to go.
                </h1>
                <p class="max-w-[60ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:mx-0 mx-auto">
                    Resize, convert or fit an image under a file-size limit — right in your browser.
                </p>
            </section>

            <section id="quick-fit" class="scroll-mt-20" aria-labelledby="quick-fit-title">
                <h2 id="quick-fit-title" class="sr-only">Quick Fit</h2>

                <div id="runtime-unsupported" class="hidden rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm font-medium text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200" role="alert"></div>

                <div id="quick-fit-app" class="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)]">
                    <div class="flex flex-col gap-6">
                        <div>
                            <input id="source-file" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" class="sr-only">
                            <div
                                id="drop-zone"
                                role="button"
                                tabindex="0"
                                aria-describedby="drop-zone-help"
                                class="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white p-8 text-center transition hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-offset-zinc-950"
                            >
                                <p id="drop-zone-label" class="text-base font-semibold">Drop an image here, or choose a file</p>
                                <p id="drop-zone-help" class="text-sm text-zinc-500 dark:text-zinc-400">JPEG, PNG, WebP or HEIC · up to 15 MB</p>
                            </div>
                        </div>

                        <div id="source-panel" class="hidden rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                            <div id="source-summary" class="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
                                <div><p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Format</p><p id="source-format" class="mt-1 font-semibold">—</p></div>
                                <div><p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Dimensions</p><p id="source-dimensions" class="mt-1 font-semibold">—</p></div>
                                <div><p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Size</p><p id="source-size" class="mt-1 font-semibold">—</p></div>
                            </div>
                            <p id="source-rejected-message" class="hidden mt-3 text-sm font-medium text-red-700 dark:text-red-400"></p>
                        </div>

                        <form id="requirements-form" class="hidden flex-col gap-6" novalidate>
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
                                        class="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-offset-zinc-950"
                                    >
                                    <select id="target-size-unit" aria-label="Target size unit" class="rounded-xl border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-offset-zinc-950">
                                        <option value="KB" selected>KB</option>
                                        <option value="MB">MB</option>
                                    </select>
                                </div>
                                <p id="target-size-error" class="hidden text-sm font-medium text-red-700 dark:text-red-400" role="alert"></p>
                            </div>

                            <div class="grid gap-5 sm:grid-cols-2">
                                <div class="flex flex-col gap-2">
                                    <label class="text-sm font-semibold" for="max-width">Maximum width <span class="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span></label>
                                    <div class="relative">
                                        <input id="max-width" type="number" inputmode="numeric" min="1" step="1" placeholder="e.g. 1200" class="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-12 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-offset-zinc-950">
                                        <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-zinc-500">px</span>
                                    </div>
                                </div>

                                <div class="flex flex-col gap-2">
                                    <label class="text-sm font-semibold" for="max-height">Maximum height <span class="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span></label>
                                    <div class="relative">
                                        <input id="max-height" type="number" inputmode="numeric" min="1" step="1" placeholder="e.g. 1200" class="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-12 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-offset-zinc-950">
                                        <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-zinc-500">px</span>
                                    </div>
                                </div>
                            </div>

                            <div class="flex flex-col gap-2">
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

                            <div id="dimension-flexibility-field" class="hidden items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                                <input id="allow-dimension-reduction" type="checkbox" checked class="mt-1 size-4 rounded border-zinc-300 text-blue-700 focus:ring-2 focus:ring-blue-600 dark:border-zinc-700">
                                <label for="allow-dimension-reduction" class="flex flex-col gap-1">
                                    <span class="text-sm font-semibold">Allow FileSetGo to reduce dimensions if needed</span>
                                    <span class="text-sm text-zinc-500 dark:text-zinc-400">Helps reach very small file-size limits while preserving aspect ratio.</span>
                                </label>
                            </div>

                            <p id="no-op-hint" class="hidden text-sm text-zinc-500 dark:text-zinc-400">Add at least one requirement for your file.</p>

                            <div class="flex flex-wrap items-center gap-3">
                                <button id="process-button" type="submit" class="min-h-11 whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:bg-zinc-400 dark:focus:ring-offset-zinc-950">Get file ready</button>
                                <button id="cancel-button" type="button" class="hidden min-h-11 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950">Cancel</button>
                                <button id="reset-button" type="button" class="hidden min-h-11 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950">Start again</button>
                            </div>
                        </form>

                        <p id="status-message" class="min-h-6 text-sm font-medium text-zinc-700 dark:text-zinc-300" data-state="idle">Choose a supported image to begin.</p>
                        <p id="status-announcer" class="sr-only" aria-live="polite"></p>
                    </div>

                    <aside class="flex flex-col gap-6" aria-labelledby="result-title">
                        <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                            <div class="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800"><h2 id="result-title" class="font-semibold">Ready file</h2></div>

                            <div id="result-empty" class="flex min-h-72 items-center justify-center p-8 text-center text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">Your ready-to-use file will appear here.</div>

                            <div id="result-content" class="hidden flex-col gap-5 p-5">
                                <p id="result-headline" class="text-lg font-semibold">Your file is ready.</p>
                                <p id="result-detail" class="text-sm text-zinc-600 dark:text-zinc-400"></p>
                                <div class="grid grid-cols-3 gap-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-950">
                                    <div><p class="text-xs text-zinc-500 dark:text-zinc-400">Dimensions</p><p id="result-dimensions" class="mt-1 text-sm font-semibold"></p></div>
                                    <div><p class="text-xs text-zinc-500 dark:text-zinc-400">Format</p><p id="result-format" class="mt-1 text-sm font-semibold"></p></div>
                                    <div><p class="text-xs text-zinc-500 dark:text-zinc-400">Size</p><p id="result-size" class="mt-1 text-sm font-semibold"></p></div>
                                </div>
                                <a id="download-link" class="min-h-11 w-fit whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-zinc-900" href="#" download>Download ready file</a>
                            </div>

                            <div id="result-unreachable" class="hidden flex-col gap-4 p-5" role="alert">
                                <p class="font-semibold text-amber-800 dark:text-amber-400">We couldn't quite reach that.</p>
                                <p id="unreachable-message" class="text-sm text-zinc-700 dark:text-zinc-300"></p>
                                <p id="unreachable-suggestion" class="text-sm text-zinc-600 dark:text-zinc-400"></p>
                            </div>

                            <div id="result-error" class="hidden flex-col gap-4 p-5" role="alert">
                                <p class="font-semibold text-red-700 dark:text-red-400">Something went wrong.</p>
                                <p id="error-message" class="text-sm text-zinc-700 dark:text-zinc-300"></p>
                            </div>
                        </div>

                        <div class="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                            <h2 class="font-semibold text-zinc-950 dark:text-zinc-100">Your privacy</h2>
                            <p class="mt-2">Your image stays on your device while FileSetGo prepares it. It isn't uploaded to FileSetGo.</p>
                        </div>
                    </aside>
                </div>
            </section>

            <section id="how-it-works" class="scroll-mt-20" aria-labelledby="how-it-works-title">
                <h2 id="how-it-works-title" class="text-2xl font-semibold tracking-tight">How it works</h2>
                <ol class="mt-6 grid gap-6 sm:grid-cols-3">
                    <li class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                        <p class="text-sm font-semibold text-blue-700 dark:text-blue-400">1. Choose</p>
                        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Choose your image.</p>
                    </li>
                    <li class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                        <p class="text-sm font-semibold text-blue-700 dark:text-blue-400">2. Set</p>
                        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Set the requirement it needs to meet.</p>
                    </li>
                    <li class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                        <p class="text-sm font-semibold text-blue-700 dark:text-blue-400">3. Go</p>
                        <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Download the ready file.</p>
                    </li>
                </ol>
            </section>
        </main>

        <footer class="border-t border-zinc-200/80 dark:border-zinc-800">
            <div class="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-zinc-500 dark:text-zinc-400 sm:px-6 lg:px-8">
                <p>File. Set. Go.</p>
                <p>Get your file ready for where it needs to go.</p>
            </div>
        </footer>
    </body>
</html>
