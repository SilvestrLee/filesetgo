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
    <div class="mx-auto flex max-w-3xl flex-col gap-14 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Compress image for website', 'href' => null],
        ]])

        <section class="flex flex-col gap-4">
            <h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Compress an image for your website</h1>
            <p class="max-w-[52ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                Your website says the image is too large. Enter the limit it gave you and FileSetGo tries to meet it, no quality slider to guess at.
            </p>
            <a href="{{ route('home', ['mode' => 'quick-fit']) }}" class="inline-flex min-h-11 w-fit items-center gap-2 whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-zinc-950">
                Reduce my image size
                <x-icon name="arrow-right" class="size-4" />
            </a>
        </section>

        <section aria-labelledby="how-title" class="flex flex-col gap-4">
            <h2 id="how-title" class="text-xl font-semibold tracking-tight">How it works</h2>
            <ol class="flex flex-col divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                <li class="flex items-start gap-4 py-4">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">1</span>
                    <span class="text-sm text-zinc-700 dark:text-zinc-300">Enter the required size, in KB or MB.</span>
                </li>
                <li class="flex items-start gap-4 py-4">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">2</span>
                    <span class="text-sm text-zinc-700 dark:text-zinc-300">Optionally set a maximum width or height.</span>
                </li>
                <li class="flex items-start gap-4 py-4">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">3</span>
                    <span class="text-sm text-zinc-700 dark:text-zinc-300">Choose whether FileSetGo may reduce the dimensions if that's what it takes.</span>
                </li>
                <li class="flex items-start gap-4 py-4">
                    <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">4</span>
                    <span class="text-sm text-zinc-700 dark:text-zinc-300">FileSetGo searches within governed quality bounds, and tells you plainly if the target can't be reached under the rules you chose.</span>
                </li>
            </ol>
            <p class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                We can't guarantee every image reaches every target. A tiny size limit on a large, detailed photo may still need a dimension reduction, or may not be reachable at all. FileSetGo tells you which, rather than silently handing back a low-quality result.
            </p>
        </section>

        @include('partials.privacy-note')

        @include('partials.related-tasks', ['related' => [
            ['href' => route('website-image-optimizer'), 'label' => 'Website image optimizer', 'blurb' => "Not sure what size to target? Start from what the image is for instead."],
            ['href' => route('convert-webp'), 'label' => 'Convert to WebP', 'blurb' => 'Just need a smaller format, not a specific size?'],
        ]])

        @include('partials.final-cta', ['heading' => 'Have a size limit to hit?', 'href' => route('home', ['mode' => 'quick-fit']), 'label' => 'Reduce my image size'])
    </div>
@endsection
