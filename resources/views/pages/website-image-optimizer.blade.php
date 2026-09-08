@php
    $title = 'Website Image Optimizer | File. Set. Go.';
    $description = "Get an image ready for your website: sensible dimensions, modern WebP output, and a size that won't slow your site down.";
    $structuredData = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'WebPage',
                'name' => $title,
                'description' => $description,
                'url' => route('website-image-optimizer'),
            ],
            [
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Website image optimizer', 'item' => route('website-image-optimizer')],
                ],
            ],
        ],
    ];
@endphp

@extends('layouts.public')

@section('content')
    <div class="fsg-content-shell fsg-task-page fsg-task-page--optimizer">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Website image optimizer', 'href' => null],
        ]])

        <section class="fsg-task-page__hero">
            <div class="fsg-task-page__copy">
                <h1>Fit the image to its place.</h1>
                <p>Choose where it will appear. Guided Fit applies FileSetGo's practical website recommendation.</p>
                <a href="{{ route('home', ['mode' => 'guided-fit']) }}" class="fsg-primary-action">
                    Optimize my website image
                    <x-icon name="arrow-right" class="size-4" />
                </a>
            </div>
            <div class="fsg-task-visual fsg-destination-visual" aria-hidden="true">
                <div class="fsg-destination-visual__hero"><span>HERO</span></div>
                <div class="fsg-destination-visual__content"><span>CONTENT</span></div>
                <div class="fsg-destination-visual__card"><span>CARD</span></div>
            </div>
        </section>

        <section aria-labelledby="what-title" class="fsg-task-section">
            <h2 id="what-title">Choose the destination.</h2>
            <div class="fsg-task-section__body">
                <div class="grid gap-6 sm:grid-cols-3">
                <div class="flex flex-col gap-3">
                    <div class="flex h-16 items-center rounded-lg bg-zinc-200 dark:bg-zinc-800"></div>
                    <p class="font-semibold">Hero</p>
                    <p class="text-sm text-zinc-600 dark:text-zinc-400">Banners and wide full-width imagery. Up to 1920 &times; 1080, around 500 KB, WebP.</p>
                </div>
                <div class="flex flex-col gap-3">
                    <div class="mx-auto flex aspect-[4/3] w-full items-center rounded-lg bg-zinc-200 dark:bg-zinc-800"></div>
                    <p class="font-semibold">Content</p>
                    <p class="text-sm text-zinc-600 dark:text-zinc-400">Images inside pages and articles. Up to 1600 &times; 1600, around 300 KB, WebP.</p>
                </div>
                <div class="flex flex-col gap-3">
                    <div class="mx-auto flex aspect-square w-2/3 items-center rounded-lg bg-zinc-200 dark:bg-zinc-800"></div>
                    <p class="font-semibold">Card</p>
                    <p class="text-sm text-zinc-600 dark:text-zinc-400">Cards, grids and thumbnails. Up to 800 &times; 800, around 150 KB, WebP.</p>
                </div>
                </div>
                <p class="mt-7 text-sm leading-relaxed">These are FileSetGo recommendations for general website use, not limits imposed by your platform. If the image already fits, FileSetGo says so.</p>
            </div>
        </section>

        @include('partials.privacy-note')

        @include('partials.related-tasks', ['related' => [
            ['href' => route('compress-image'), 'label' => 'Compress image', 'blurb' => 'Have an exact KB/MB limit instead? Enter it directly.'],
            ['href' => route('convert-webp'), 'label' => 'Convert to WebP', 'blurb' => 'Just need a format conversion, without resizing?'],
        ]])

        @include('partials.final-cta', ['heading' => 'Ready to optimize your image?', 'href' => route('home', ['mode' => 'guided-fit']), 'label' => 'Optimize my website image'])
    </div>
@endsection
