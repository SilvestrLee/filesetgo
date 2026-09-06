@php
    $title = 'Transparent Logo for Websites | File. Set. Go.';
    $description = 'Get a logo with a genuinely transparent background, verified, previewed on light and dark, and prepared in your browser.';
    $structuredData = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'WebPage',
                'name' => $title,
                'description' => $description,
                'url' => route('transparent-logo'),
            ],
            [
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Transparent logo', 'item' => route('transparent-logo')],
                ],
            ],
        ],
    ];
@endphp

@extends('layouts.public')

@section('content')
    <div class="mx-auto flex max-w-3xl flex-col gap-14 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Transparent logo', 'href' => null],
        ]])

        <section class="grid gap-8 sm:grid-cols-[1.3fr_1fr] sm:items-center">
            <div class="flex flex-col gap-4">
                <h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Get a transparent logo for your website</h1>
                <p class="max-w-[48ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                    One logo that works on a light header, a dark footer, or over a photo.
                </p>
                <a href="{{ route('home', ['mode' => 'logo-pack']) }}" class="inline-flex min-h-11 w-fit items-center gap-2 whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-zinc-950">
                    Prepare a transparent logo
                    <x-icon name="arrow-right" class="size-4" />
                </a>
            </div>
            <div class="grid grid-cols-3 gap-2" aria-hidden="true">
                <div class="fsg-checkerboard flex aspect-square items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div class="size-8 rounded-full bg-zinc-700 dark:bg-zinc-300"></div>
                </div>
                <div class="flex aspect-square items-center justify-center rounded-lg border border-zinc-200 bg-white dark:border-zinc-800">
                    <div class="size-8 rounded-full bg-zinc-700"></div>
                </div>
                <div class="flex aspect-square items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950">
                    <div class="size-8 rounded-full bg-zinc-100"></div>
                </div>
            </div>
        </section>

        @include('partials.step-list', ['title' => 'How FileSetGo prepares transparency', 'steps' => [
            ['label' => 'Check', 'body' => 'FileSetGo checks whether your logo already has a usable transparent background.'],
            ['label' => 'Remove, if needed', 'body' => "If it doesn't, FileSetGo attempts to remove the existing background for you."],
            ['label' => 'Verify', 'body' => "The result is checked to confirm it's genuinely transparent, not just guessed."],
            ['label' => 'Preview', 'body' => 'You can inspect the result on a checkerboard, a light background and a dark background before downloading.'],
        ], 'note' => "Some logos are difficult, a busy photo background, or artwork with soft edges, and FileSetGo will mark these for your review rather than silently guessing. We don't promise a perfect result for every image, but we do promise to tell you when a result needs a second look."])

        @include('partials.privacy-note')

        @include('partials.related-tasks', ['related' => [
            ['href' => route('prepare-logo'), 'label' => 'Prepare a logo', 'blurb' => 'See the full Website Logo Pack: header logo, favicon and app icons.'],
            ['href' => route('favicon-generator'), 'label' => 'Favicon generator', 'blurb' => 'The same pack also includes your favicon files.'],
        ]])

        @include('partials.faq', ['faqs' => [
            ['q' => 'Does PNG automatically mean transparent?', 'a' => 'No. A PNG can still have a solid, flattened background. FileSetGo checks the actual pixels rather than assuming the file format means the logo is ready.'],
            ['q' => 'What happens if the background cannot be removed cleanly?', 'a' => 'FileSetGo marks the result as needing review instead of presenting it as finished, so you can decide whether to use it, try a different logo, or keep the original background.'],
            ['q' => 'Does FileSetGo upload my image?', 'a' => 'No. Your logo is processed in your browser and is not uploaded to FileSetGo for this.'],
        ]])

        @include('partials.final-cta', ['heading' => 'Ready to try it on your logo?', 'href' => route('home', ['mode' => 'logo-pack']), 'label' => 'Prepare a transparent logo'])
    </div>
@endsection
