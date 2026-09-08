@php
    $title = 'Convert an Image to WebP | File. Set. Go.';
    $description = 'Convert JPEG, PNG or HEIC to WebP in your browser, a modern format commonly used for website images.';
    $structuredData = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'WebPage',
                'name' => $title,
                'description' => $description,
                'url' => route('convert-webp'),
            ],
            [
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Convert image to WebP', 'item' => route('convert-webp')],
                ],
            ],
        ],
    ];
@endphp

@extends('layouts.public')

@section('content')
    <div class="fsg-content-shell fsg-task-page fsg-task-page--webp">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Convert image to WebP', 'href' => null],
        ]])

        <section class="fsg-task-page__hero">
            <div class="fsg-task-page__copy">
                <h1>Turn it into WebP.</h1>
                <p>Convert JPEG, PNG or HEIC into a modern website format, locally in your browser.</p>
                <a href="{{ route('home', ['mode' => 'quick-fit']) }}" class="fsg-primary-action">
                    Convert my image to WebP
                    <x-icon name="arrow-right" class="size-4" />
                </a>
            </div>
            <div class="fsg-task-visual fsg-format-visual" aria-hidden="true">
                <div class="fsg-format-visual__sources">
                    <span>JPEG</span>
                    <span>PNG</span>
                    <span>HEIC</span>
                </div>
                <x-icon name="arrow-right" class="size-6 shrink-0" />
                <div class="fsg-format-visual__result">
                    <span>READY FORMAT</span>
                    <strong>WebP</strong>
                    <small>Example conversion</small>
                </div>
            </div>
        </section>

        @include('partials.step-list', ['title' => 'How it works', 'steps' => [
            ['label' => 'Upload', 'body' => 'JPEG, PNG, WebP or HEIC.'],
            ['label' => 'Set WebP as the output', 'body' => 'Resizing or a target size are optional extras, not required.'],
            ['label' => 'Download', 'body' => 'Your WebP file, ready to use.'],
        ], 'note' => "We won't promise an exact percentage saving, that depends on the image, and WebP isn't guaranteed to be supported by every browser that has ever existed, though it's well supported by current browsers."])

        @include('partials.privacy-note')

        @include('partials.related-tasks', ['related' => [
            ['href' => route('compress-image'), 'label' => 'Compress image', 'blurb' => 'Need WebP under a specific size limit too?'],
            ['href' => route('website-image-optimizer'), 'label' => 'Website image optimizer', 'blurb' => 'Let FileSetGo pick dimensions and size for you.'],
        ]])

        @include('partials.final-cta', ['heading' => 'Ready to convert your image?', 'href' => route('home', ['mode' => 'quick-fit']), 'label' => 'Convert my image to WebP'])
    </div>
@endsection
