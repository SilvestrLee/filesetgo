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
    <div class="fsg-content-shell fsg-task-page fsg-task-page--transparent">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Transparent logo', 'href' => null],
        ]])

        <section class="fsg-task-page__hero">
            <div class="fsg-task-page__copy">
                <h1>A logo that belongs on any background.</h1>
                <p>Prepare transparency, inspect the result on light and dark, then decide whether it is ready.</p>
                <a href="{{ route('home', ['mode' => 'logo-pack']) }}" class="fsg-primary-action">
                    Prepare a transparent logo
                    <x-icon name="arrow-right" class="size-4" />
                </a>
            </div>
            <div class="fsg-task-visual fsg-transparency-visual" aria-hidden="true">
                <div class="fsg-transparency-visual__context fsg-checkerboard">
                    <span>CHECKERBOARD</span>
                    <strong>FSG</strong>
                </div>
                <div class="fsg-transparency-visual__context fsg-transparency-visual__context--light">
                    <span>LIGHT</span>
                    <strong>FSG</strong>
                </div>
                <div class="fsg-transparency-visual__context fsg-transparency-visual__context--dark">
                    <span>DARK</span>
                    <strong>FSG</strong>
                </div>
            </div>
        </section>

        @include('partials.step-list', ['title' => 'How FileSetGo prepares transparency', 'steps' => [
            ['label' => 'Check', 'body' => 'FileSetGo checks whether your logo already has a usable transparent background.'],
            ['label' => 'Remove, if needed', 'body' => "If it doesn't, FileSetGo attempts to remove the existing background for you."],
            ['label' => 'Verify', 'body' => "The result is checked to confirm it's genuinely transparent, not just guessed."],
            ['label' => 'Preview', 'body' => 'You can inspect the result on a checkerboard, a light background and a dark background before downloading.'],
        ], 'note' => "The tool always asks you to choose Transparent background or Keep existing background. It never makes that decision silently. Busy photographs and soft-edged artwork may still need review; FileSetGo does not promise a perfect result for every image."])

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
