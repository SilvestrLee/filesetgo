@php
    $title = 'Prepare a Logo for Your Website | File. Set. Go.';
    $description = 'Turn one logo into everything your website needs: header logo, favicon, Apple touch icon and app icons, prepared in your browser.';
    $structuredData = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'WebPage',
                'name' => $title,
                'description' => $description,
                'url' => route('prepare-logo'),
            ],
            [
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Prepare a logo', 'item' => route('prepare-logo')],
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
            ['label' => 'Prepare a logo', 'href' => null],
        ]])

        <section class="grid gap-8 sm:grid-cols-[1.3fr_1fr] sm:items-center">
            <div class="flex flex-col gap-4">
                <h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Prepare your logo for your website</h1>
                <p class="max-w-[48ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                    A header logo, a favicon, app icons. One upload, one download.
                </p>
                <a href="{{ route('home', ['mode' => 'logo-pack']) }}" class="inline-flex min-h-11 w-fit items-center gap-2 whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-zinc-950">
                    Prepare my logo
                    <x-icon name="arrow-right" class="size-4" />
                </a>
            </div>
            <div class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900" aria-hidden="true">
                <p class="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Website Logo Pack</p>
                <ul class="mt-3 flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <li class="flex items-center gap-2"><x-icon name="check" class="size-4 text-blue-700 dark:text-blue-400" /> Header logo + 2x</li>
                    <li class="flex items-center gap-2"><x-icon name="check" class="size-4 text-blue-700 dark:text-blue-400" /> Favicons</li>
                    <li class="flex items-center gap-2"><x-icon name="check" class="size-4 text-blue-700 dark:text-blue-400" /> App icons</li>
                </ul>
            </div>
        </section>

        <section aria-labelledby="what-title" class="flex flex-col gap-4">
            <h2 id="what-title" class="text-xl font-semibold tracking-tight">What's in the pack</h2>
            <div class="grid gap-x-8 gap-y-6 sm:grid-cols-3">
                <div class="flex flex-col gap-2">
                    <p class="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase dark:text-zinc-400">Website logo</p>
                    <ul class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                        <li>Header logo</li>
                        <li>High-density logo (2&times;)</li>
                    </ul>
                </div>
                <div class="flex flex-col gap-2">
                    <p class="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase dark:text-zinc-400">Favicons</p>
                    <ul class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                        <li>favicon.ico</li>
                        <li>favicon-32&times;32.png</li>
                    </ul>
                </div>
                <div class="flex flex-col gap-2">
                    <p class="text-xs font-bold tracking-[0.14em] text-zinc-500 uppercase dark:text-zinc-400">App &amp; site icons</p>
                    <ul class="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                        <li>apple-touch-icon.png</li>
                        <li>icon-192&times;192.png</li>
                        <li>icon-512&times;512.png</li>
                    </ul>
                </div>
            </div>
            <p class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                You choose how the background should be prepared: a <a href="{{ route('transparent-logo') }}" class="font-medium text-blue-700 underline dark:text-blue-400">transparent background</a>, which works on both light and dark website designs, or your logo's existing background, kept as supplied. FileSetGo does not choose this for you. It's an explicit step in the tool.
            </p>
        </section>

        @include('partials.step-list', ['title' => 'How it works', 'steps' => [
            ['label' => 'Upload', 'body' => 'Choose your logo: JPEG, PNG, WebP or HEIC.'],
            ['label' => 'Choose a background', 'body' => 'Transparent, or keep what you uploaded.'],
            ['label' => 'Download', 'body' => 'One ZIP with all seven files, ready to use.'],
        ], 'note' => "FileSetGo checks your logo first and lets you know about anything worth reviewing, for example a very wide logo or one that's too small to enlarge cleanly, before you download."])

        @include('partials.privacy-note')

        @include('partials.related-tasks', ['related' => [
            ['href' => route('transparent-logo'), 'label' => 'Transparent logo', 'blurb' => 'Prepare a logo with a genuinely transparent background.'],
            ['href' => route('favicon-generator'), 'label' => 'Favicon generator', 'blurb' => 'See exactly which favicon files are included.'],
        ]])

        @include('partials.faq', ['faqs' => [
            ['q' => 'Can I use a JPEG logo?', 'a' => "Yes. FileSetGo accepts JPEG, PNG, WebP and HEIC. If you choose the transparent background option, FileSetGo attempts to remove the JPEG's flat background for you."],
            ['q' => 'What files are included in the Logo Pack?', 'a' => 'A header logo, a high-density logo, favicon.ico, favicon-32x32.png, apple-touch-icon.png, icon-192x192.png and icon-512x512.png: seven files in one ZIP.'],
        ]])

        @include('partials.final-cta', ['heading' => 'Ready to prepare your logo?', 'href' => route('home', ['mode' => 'logo-pack']), 'label' => 'Prepare my logo'])
    </div>
@endsection
