@php
    $title = 'Compress an Image for Your Website | File. Set. Go.';
    $description = 'Your website or CMS says the image is too large? Enter the size limit and FileSetGo tries to meet it in your browser.';
    $structuredData = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'WebPage',
                'name' => $title,
                'description' => $description,
                'url' => route('compress-image'),
            ],
            [
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Compress image for website', 'item' => route('compress-image')],
                ],
            ],
        ],
    ];
@endphp

@extends('layouts.public')

@section('content')
    <div class="fsg-content-shell fsg-task-page fsg-task-page--compress">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Compress image for website', 'href' => null],
        ]])

        <section class="fsg-task-page__hero">
            <div class="fsg-task-page__copy">
                <h1>Meet the file-size limit.</h1>
                <p>Your website says the image is too large. Enter its KB or MB limit and FileSetGo tries to reach it.</p>
                <a href="{{ route('home', ['mode' => 'quick-fit']) }}" class="fsg-primary-action">
                    Reduce my image size
                    <x-icon name="arrow-right" class="size-4" />
                </a>
            </div>
            <div class="fsg-task-visual fsg-compress-visual" aria-hidden="true">
                <div class="fsg-metric-file">
                    <span>CURRENT SIZE</span>
                    <strong>2.8 MB</strong>
                    <small>website-photo.jpg</small>
                </div>
                <div class="fsg-compress-visual__target">
                    <span>TARGET</span>
                    <strong>&le; 500 KB</strong>
                </div>
                <div class="fsg-metric-file fsg-metric-file--ready">
                    <span>RESULT</span>
                    <strong>438 KB</strong>
                    <small>Example outcome</small>
                </div>
            </div>
        </section>

        <section aria-labelledby="how-title" class="fsg-task-section">
            <h2 id="how-title">Set a real target, not a quality guess.</h2>
            <div class="fsg-task-section__body">
                <ol class="fsg-step-list">
                    <li><span>Enter the required size in KB or MB.</span></li>
                    <li><span>Optionally set a maximum width or height.</span></li>
                    <li><span>Choose whether dimensions may be reduced when needed.</span></li>
                    <li><span>Get the closest governed result or a clear unreachable outcome.</span></li>
                </ol>
                <p class="mt-6 text-sm">Not every image can reach every target. A very small limit may require smaller dimensions or may remain unreachable. FileSetGo tells you which.</p>
            </div>
        </section>

        @include('partials.privacy-note')

        @include('partials.related-tasks', ['related' => [
            ['href' => route('website-image-optimizer'), 'label' => 'Website image optimizer', 'blurb' => "Not sure what size to target? Start from what the image is for instead."],
            ['href' => route('convert-webp'), 'label' => 'Convert to WebP', 'blurb' => 'Just need a smaller format, not a specific size?'],
        ]])

        @include('partials.final-cta', ['heading' => 'Have a size limit to hit?', 'href' => route('home', ['mode' => 'quick-fit']), 'label' => 'Reduce my image size'])
    </div>
@endsection
