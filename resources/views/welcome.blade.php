<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="A local browser-processing proof for FileSetGo.">

        <title>File. Set. Go. | Local Processing Proof</title>

        @vite(['resources/css/app.css', 'resources/js/app.ts'])
    </head>
    <body class="min-h-[100dvh] bg-zinc-50 text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <header class="border-b border-zinc-200/80 dark:border-zinc-800">
            <div class="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
                <a class="text-lg font-semibold tracking-tight" href="/">File. Set. Go.</a>
                <p class="text-sm text-zinc-600 dark:text-zinc-400">Local processing proof</p>
            </div>
        </header>

        <main class="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:px-8 lg:py-12">
            <section class="flex flex-col gap-8" aria-labelledby="proof-title">
                <div class="flex flex-col gap-3">
                    <p class="text-sm font-medium text-blue-700 dark:text-blue-400">Browser worker runtime</p>
                    <h1 id="proof-title" class="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                        Turn a safe image into a ready local file.
                    </h1>
                    <p class="max-w-[60ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Preflight, decode, orient, resize, encode, and validate without uploading the image.
                    </p>
                </div>

                <form id="processing-form" class="flex flex-col gap-6" novalidate>
                    <div class="flex flex-col gap-2">
                        <label class="text-sm font-semibold" for="source-file">Choose an image</label>
                        <input
                            id="source-file"
                            class="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-700 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-offset-zinc-950"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                        >
                        <p class="text-sm text-zinc-600 dark:text-zinc-400">JPEG, PNG, or still WebP. Maximum 15 MB and 24 MP.</p>
                    </div>

                    <div id="source-summary" class="hidden rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900" aria-live="polite">
                        <div class="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-4">
                            <div><p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Format</p><p id="source-format" class="mt-1 font-semibold">Not selected</p></div>
                            <div><p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Dimensions</p><p id="source-dimensions" class="mt-1 font-semibold">0 × 0</p></div>
                            <div><p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Megapixels</p><p id="source-megapixels" class="mt-1 font-semibold">0 MP</p></div>
                            <div><p class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Size</p><p id="source-size" class="mt-1 font-semibold">0 B</p></div>
                        </div>
                        <p id="source-status" class="mt-4 text-sm font-medium"></p>
                    </div>

                    <div class="grid gap-5 sm:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <label class="text-sm font-semibold" for="max-edge">Longest edge</label>
                            <div class="relative">
                                <input id="max-edge" class="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 pr-12 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-offset-zinc-950" type="number" min="1" max="6000" step="1" value="1200">
                                <span class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-zinc-500">px</span>
                            </div>
                        </div>

                        <div class="flex flex-col gap-2">
                            <label class="text-sm font-semibold" for="output-format">Output format</label>
                            <select id="output-format" class="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:ring-offset-zinc-950">
                                <option value="webp">WebP</option>
                                <option value="jpeg">JPEG</option>
                                <option value="png">PNG</option>
                            </select>
                        </div>
                    </div>

                    <div id="quality-field" class="flex flex-col gap-2">
                        <div class="flex items-center justify-between gap-4">
                            <label class="text-sm font-semibold" for="output-quality">Quality</label>
                            <output id="quality-value" class="text-sm font-semibold text-zinc-700 dark:text-zinc-300" for="output-quality">0.85</output>
                        </div>
                        <input id="output-quality" class="w-full accent-blue-700" type="range" min="0" max="1" step="0.01" value="0.85">
                    </div>

                    <div class="flex flex-wrap gap-3">
                        <button id="process-button" class="whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed disabled:bg-zinc-400 dark:focus:ring-offset-zinc-950" type="submit" disabled>Process locally</button>
                        <button id="cancel-button" class="hidden whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus:ring-offset-zinc-950" type="button">Cancel</button>
                    </div>

                    <p id="processing-status" class="min-h-6 text-sm font-medium text-zinc-700 dark:text-zinc-300" aria-live="polite" data-state="idle">Choose a supported image to begin.</p>
                </form>
            </section>

            <aside class="flex flex-col gap-6" aria-labelledby="result-title">
                <div class="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <div class="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800"><h2 id="result-title" class="font-semibold">Local result</h2></div>
                    <div id="result-empty" class="flex min-h-72 items-center justify-center p-8 text-center text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">The validated output preview and download will appear here.</div>
                    <div id="result-content" class="hidden flex-col gap-5 p-5">
                        <div class="flex min-h-64 items-center justify-center overflow-hidden rounded-xl bg-zinc-100 p-4 dark:bg-zinc-800">
                            <img id="result-image" class="max-h-96 max-w-full object-contain" alt="Processed local output preview">
                        </div>
                        <div class="grid grid-cols-3 gap-4">
                            <div><p class="text-xs text-zinc-500 dark:text-zinc-400">Dimensions</p><p id="result-dimensions" class="mt-1 text-sm font-semibold"></p></div>
                            <div><p class="text-xs text-zinc-500 dark:text-zinc-400">Format</p><p id="result-format" class="mt-1 text-sm font-semibold"></p></div>
                            <div><p class="text-xs text-zinc-500 dark:text-zinc-400">Size</p><p id="result-size" class="mt-1 text-sm font-semibold"></p></div>
                        </div>
                        <a id="download-link" class="w-fit whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-zinc-900" href="#" download>Download result</a>
                    </div>
                </div>

                <div class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 class="font-semibold">Runtime capabilities</h2>
                    <dl id="capabilities" class="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm">
                        <div><dt class="text-zinc-500 dark:text-zinc-400">Worker processing</dt><dd data-capability="workerProcessing" class="mt-1 font-semibold">Checking</dd></div>
                        <div><dt class="text-zinc-500 dark:text-zinc-400">OffscreenCanvas</dt><dd data-capability="offscreenCanvas" class="mt-1 font-semibold">Checking</dd></div>
                        <div><dt class="text-zinc-500 dark:text-zinc-400">JPEG encode</dt><dd data-capability="jpegEncode" class="mt-1 font-semibold">Checking</dd></div>
                        <div><dt class="text-zinc-500 dark:text-zinc-400">PNG encode</dt><dd data-capability="pngEncode" class="mt-1 font-semibold">Checking</dd></div>
                        <div><dt class="text-zinc-500 dark:text-zinc-400">WebP encode</dt><dd data-capability="webpEncode" class="mt-1 font-semibold">Checking</dd></div>
                        <div><dt class="text-zinc-500 dark:text-zinc-400">HEIC decode</dt><dd data-capability="heicDecoderAvailable" class="mt-1 font-semibold">Checking</dd></div>
                    </dl>
                    <p class="mt-4 text-sm text-zinc-600 dark:text-zinc-400">HEIC/HEIF files are identified during preflight, but decoding is not yet wired in — see the sprint report's HEIC evaluation.</p>
                </div>
            </aside>
        </main>
    </body>
</html>
