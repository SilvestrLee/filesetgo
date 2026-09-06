@php
    $title = 'Privacy | File. Set. Go.';
    $description = 'How FileSetGo handles your image and ordinary web request data.';
    $structuredData = [
        '@context' => 'https://schema.org',
        '@type' => 'WebPage',
        'name' => $title,
        'description' => $description,
        'url' => route('privacy'),
    ];
@endphp

@extends('layouts.public')

@section('content')
    <div class="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Privacy', 'href' => null],
        ]])

        <section class="flex flex-col gap-4">
            <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Privacy</h1>
            <p class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                This page describes how FileSetGo actually works today, not a generic privacy template. It separates two
                different things: your image, and ordinary web request data.
            </p>
        </section>

        <section aria-labelledby="image-title" class="flex flex-col gap-3">
            <h2 id="image-title" class="text-xl font-semibold tracking-tight">Your image</h2>
            <ul class="flex flex-col gap-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                <li>Supported image processing (resizing, format conversion, target file size, and Website Logo Pack preparation) happens locally in your browser.</li>
                <li>Your source image is not uploaded to FileSetGo for this processing.</li>
                <li>Generated files (your ready-to-use image, or your logo pack ZIP) are produced locally and offered to you as a browser download; FileSetGo does not keep a copy.</li>
                <li>Temporary preview and download links use your browser's own Blob/object URLs, which exist only for your current session and are released when you reset or leave the page.</li>
                <li>There is no user account or file storage in this version of FileSetGo. Nothing about your image is intentionally retained after your visit.</li>
                <li>Some file types (including HEIC) are decoded using FileSetGo's own browser processing resources, such as a same-origin decoder. Loading that decoder is a normal part of using the site, like any other script or style it loads, and is separate from your image itself, which still isn't uploaded.</li>
            </ul>
        </section>

        <section aria-labelledby="requests-title" class="flex flex-col gap-3">
            <h2 id="requests-title" class="text-xl font-semibold tracking-tight">Ordinary web request data</h2>
            <p class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Like any website, FileSetGo's web server may keep ordinary request logs (for example, the page requested
                and a timestamp) as part of normal web hosting operation. The site also sets a basic session cookie
                needed for the site to function correctly. This is not used for tracking or advertising.
            </p>
            <p class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                This is separate from your image, described above, which is not uploaded for processing.
            </p>
        </section>

        <section aria-labelledby="scope-title" class="flex flex-col gap-3">
            <h2 id="scope-title" class="text-xl font-semibold tracking-tight">What this page doesn't cover</h2>
            <p class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                FileSetGo does not currently run analytics or advertising tracking. If that changes, this page will be
                updated to reflect it truthfully before it happens.
            </p>
        </section>
    </div>
@endsection
