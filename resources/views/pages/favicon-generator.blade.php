@php
    $title = 'Favicon Generator for Websites | File. Set. Go.';
    $description = "Create favicon.ico, apple-touch-icon and web app icons from your logo, as part of FileSetGo's Website Logo Pack.";
    $structuredData = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'WebPage',
                'name' => $title,
                'description' => $description,
                'url' => route('favicon-generator'),
            ],
            [
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Favicon generator', 'item' => route('favicon-generator')],
                ],
            ],
        ],
    ];
@endphp

@extends('layouts.public')

@section('content')
    <div class="fsg-content-shell fsg-task-page fsg-task-page--favicon">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Favicon generator', 'href' => null],
        ]])

        <section class="fsg-task-page__hero">
            <div class="fsg-task-page__copy">
                <h1>Give the browser tab an identity.</h1>
                <p>Create favicon and app-icon files from your logo as part of one consistent Website Logo Pack.</p>
                <a href="{{ route('home', ['mode' => 'logo-pack']) }}" class="fsg-primary-action">
                    Create my website logo pack
                    <x-icon name="arrow-right" class="size-4" />
                </a>
            </div>
            <div aria-hidden="true" class="fsg-task-visual fsg-favicon-visual">
                <div class="fsg-favicon-visual__window">
                    <div class="fsg-favicon-visual__tab">
                        <span class="fsg-brand__mark">F</span>
                        <strong>File. Set. Go.</strong>
                    </div>
                    <div class="fsg-favicon-visual__page">
                        <span>favicon.ico</span>
                        <span>favicon-32x32.png</span>
                        <span>apple-touch-icon.png</span>
                    </div>
                </div>
            </div>
        </section>

        <section aria-labelledby="what-title" class="fsg-task-section">
            <h2 id="what-title">Favicons stay with the pack.</h2>
            <div class="fsg-task-section__body">
                <p>FileSetGo does not run a separate favicon engine. The same Logo Pack also prepares your header logo and app icons, keeping the source consistent.</p>
                <ul class="mt-6 flex flex-wrap gap-2 text-sm">
                <li class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">favicon.ico</li>
                <li class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">favicon-32&times;32.png</li>
                <li class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">apple-touch-icon.png</li>
                <li class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">icon-192&times;192.png</li>
                <li class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">icon-512&times;512.png</li>
                </ul>
            </div>
        </section>

        @include('partials.step-list', ['title' => 'How it works', 'steps' => [
            ['label' => 'Upload your logo', 'body' => 'Ideally square or close to it, for the cleanest icon crop.'],
            ['label' => 'Choose a background', 'body' => 'Transparent, or keep what you uploaded.'],
            ['label' => 'Download the pack', 'body' => 'Every favicon size is in the same ZIP.'],
        ], 'note' => "If your logo is very small or a very wide banner shape, FileSetGo will tell you before you download. A favicon needs to hold up at a tiny size, and an extreme upscale or a very wide crop rarely looks right."])

        @include('partials.privacy-note')

        @include('partials.related-tasks', ['related' => [
            ['href' => route('prepare-logo'), 'label' => 'Prepare a logo', 'blurb' => 'See the full Website Logo Pack contents.'],
            ['href' => route('transparent-logo'), 'label' => 'Transparent logo', 'blurb' => 'Give your favicon a transparent background too.'],
        ]])

        @include('partials.faq', ['faqs' => [
            ['q' => 'Do I need a separate favicon tool?', 'a' => "No. Favicon files are one part of FileSetGo's Website Logo Pack. You get them alongside your header logo and app icons from the same upload."],
            ['q' => 'What size logo works best?', 'a' => "A square or near-square logo crops most cleanly into an icon. FileSetGo will flag a logo that's too small to enlarge or too wide to crop well before you download."],
        ]])

        @include('partials.final-cta', ['heading' => 'Ready to create your favicon?', 'href' => route('home', ['mode' => 'logo-pack']), 'label' => 'Create my website logo pack'])
    </div>
@endsection
