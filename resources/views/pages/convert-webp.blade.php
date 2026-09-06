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
    <div class="mx-auto flex max-w-3xl flex-col gap-14 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Convert image to WebP', 'href' => null],
        ]])

        <section class="grid gap-8 sm:grid-cols-[1.3fr_1fr] sm:items-center">
            <div class="flex flex-col gap-4">
                <h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Convert an image to WebP</h1>
                <p class="max-w-[48ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                    A modern format commonly used on websites. Converted locally, in your browser.
                </p>
                <a href="{{ route('home', ['mode' => 'quick-fit']) }}" class="inline-flex min-h-11 w-fit items-center gap-2 whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-zinc-950">
                    Convert my image to WebP
                    <x-icon name="arrow-right" class="size-4" />
                </a>
            </div>
            <div class="flex items-center justify-center gap-3" aria-hidden="true">
                <div class="flex flex-col gap-1.5">
                    <span class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-center text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">JPEG</span>
                    <span class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-center text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">PNG</span>
                    <span class="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-center text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">HEIC</span>
                </div>
                <x-icon name="arrow-right" class="size-5 shrink-0 text-zinc-400" />
                <span class="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">WebP</span>
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
