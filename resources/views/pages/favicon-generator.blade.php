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
    <div class="mx-auto flex max-w-3xl flex-col gap-14 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Favicon generator', 'href' => null],
        ]])

        <section class="grid gap-8 sm:grid-cols-[1.3fr_1fr] sm:items-center">
            <div class="flex flex-col gap-4">
                <h1 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Create a favicon for your website</h1>
                <p class="max-w-[48ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
                    The small icon browsers show in a tab, bookmark or search result, generated from your logo.
                </p>
                <a href="{{ route('home', ['mode' => 'logo-pack']) }}" class="inline-flex min-h-11 w-fit items-center gap-2 whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-zinc-950">
                    Create my website logo pack
                    <x-icon name="arrow-right" class="size-4" />
                </a>
            </div>
            <div aria-hidden="true" class="rounded-t-lg border border-zinc-200 bg-zinc-100 pt-2 dark:border-zinc-800 dark:bg-zinc-800">
                <div class="mx-2 flex items-center gap-2 rounded-t-md bg-white px-3 py-2 dark:bg-zinc-900">
                    <div class="flex size-4 shrink-0 items-center justify-center rounded-sm bg-blue-700 text-[9px] font-bold text-white">F</div>
                    <div class="h-2 w-24 rounded-full bg-zinc-200 dark:bg-zinc-700"></div>
                </div>
                <div class="h-6 rounded-b-lg bg-white dark:bg-zinc-900"></div>
            </div>
        </section>

        <section aria-labelledby="what-title" class="flex flex-col gap-4">
            <h2 id="what-title" class="text-xl font-semibold tracking-tight">What's included</h2>
            <p class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                FileSetGo doesn't run a separate favicon-only tool. Favicon files come from the same Website Logo Pack that also prepares your header logo and app icons, so everything stays consistent:
            </p>
            <ul class="flex flex-wrap gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">favicon.ico</li>
                <li class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">favicon-32&times;32.png</li>
                <li class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">apple-touch-icon.png</li>
                <li class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">icon-192&times;192.png</li>
                <li class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">icon-512&times;512.png</li>
            </ul>
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
