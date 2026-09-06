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
    <div class="mx-auto flex max-w-3xl flex-col gap-14 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Website image optimizer', 'href' => null],
        ]])

        <section class="flex flex-col gap-4">
            <h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Optimize an image for your website</h1>
            <p class="max-w-[52ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                A photo straight from a camera or phone is usually much bigger than a website needs. Tell Guided Fit what it's for, and it takes care of the rest.
            </p>
            <a href="{{ route('home', ['mode' => 'guided-fit']) }}" class="inline-flex min-h-11 w-fit items-center gap-2 whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-zinc-950">
                Optimize my website image
                <x-icon name="arrow-right" class="size-4" />
            </a>
        </section>

        <section aria-labelledby="what-title" class="flex flex-col gap-6">
            <h2 id="what-title" class="text-xl font-semibold tracking-tight">Choose what you're preparing</h2>
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
            <p class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                These are FileSetGo's recommended starting points for general website use, not a rule your specific CMS or platform enforces. If your image already fits, FileSetGo tells you that instead of processing it unnecessarily.
            </p>
        </section>

        @include('partials.privacy-note')

        @include('partials.related-tasks', ['related' => [
            ['href' => route('compress-image'), 'label' => 'Compress image', 'blurb' => 'Have an exact KB/MB limit instead? Enter it directly.'],
            ['href' => route('convert-webp'), 'label' => 'Convert to WebP', 'blurb' => 'Just need a format conversion, without resizing?'],
        ]])

        @include('partials.final-cta', ['heading' => 'Ready to optimize your image?', 'href' => route('home', ['mode' => 'guided-fit']), 'label' => 'Optimize my website image'])
    </div>
@endsection
