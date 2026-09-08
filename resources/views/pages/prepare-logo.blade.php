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
    <div class="fsg-content-shell fsg-task-page fsg-task-page--logo">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Prepare a logo', 'href' => null],
        ]])

        <section class="fsg-task-page__hero">
            <div class="fsg-task-page__copy">
                <h1>One logo. Seven ready files.</h1>
                <p>Prepare a header logo, favicon and app icons from one source, then download everything together.</p>
                <a href="{{ route('home', ['mode' => 'logo-pack']) }}" class="fsg-primary-action">
                    Prepare my logo
                    <x-icon name="arrow-right" class="size-4" />
                </a>
            </div>
            <div class="fsg-task-visual fsg-pack-visual" aria-hidden="true">
                <div class="fsg-pack-visual__source">
                    <span>SOURCE</span>
                    <strong>logo.png</strong>
                </div>
                <ul>
                    <li><span>header-logo.png</span><small>1x</small></li>
                    <li><span>header-logo@2x.png</span><small>2x</small></li>
                    <li><span>favicon.ico</span><small>ICO</small></li>
                    <li><span>favicon-32x32.png</span><small>PNG</small></li>
                    <li><span>apple-touch-icon.png</span><small>PNG</small></li>
                    <li><span>icon-192x192.png</span><small>PNG</small></li>
                    <li><span>icon-512x512.png</span><small>PNG</small></li>
                </ul>
            </div>
        </section>

        <section aria-labelledby="what-title" class="fsg-task-section">
            <h2 id="what-title">A complete website logo pack.</h2>
            <div class="fsg-task-section__body">
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
                <p class="mt-7 text-sm leading-relaxed">
                    You explicitly choose a <a href="{{ route('transparent-logo') }}" class="font-semibold underline decoration-2 underline-offset-4">transparent background</a> or the existing background. FileSetGo never makes that choice silently.
                </p>
            </div>
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
