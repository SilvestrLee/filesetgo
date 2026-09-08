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
    <article class="fsg-prose-shell fsg-legal">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Privacy', 'href' => null],
        ]])

        <header class="fsg-legal__header">
            <h1>Privacy</h1>
            <p class="fsg-text-muted mt-5 max-w-[58ch] text-base leading-relaxed">
                This page describes how FileSetGo actually works today, not a generic privacy template. It separates two
                different things: your image, and ordinary web request data.
            </p>
        </header>

        <section aria-labelledby="image-title">
            <h2 id="image-title">Your image</h2>
            <ul class="flex list-disc flex-col gap-3 pl-5 text-sm">
                <li>Supported image processing (resizing, format conversion, target file size, and Website Logo Pack preparation) happens locally in your browser.</li>
                <li>Your source image is not uploaded to FileSetGo for this processing.</li>
                <li>Generated files (your ready-to-use image, or your logo pack ZIP) are produced locally and offered to you as a browser download; FileSetGo does not keep a copy.</li>
                <li>Temporary preview and download links use your browser's own Blob/object URLs, which exist only for your current session and are released when you reset or leave the page.</li>
                <li>There is no user account or file storage in this version of FileSetGo. Nothing about your image is intentionally retained after your visit.</li>
                <li>Some file types (including HEIC) are decoded using FileSetGo's own browser processing resources, such as a same-origin decoder. Loading that decoder is a normal part of using the site, like any other script or style it loads, and is separate from your image itself, which still isn't uploaded.</li>
            </ul>
        </section>

        <section aria-labelledby="requests-title">
            <h2 id="requests-title">Ordinary web request data</h2>
            <p class="text-sm">
                Like any website, FileSetGo's web server may keep ordinary request logs (for example, the page requested
                and a timestamp) as part of normal web hosting operation. The site sets a basic session cookie needed
                for the site to function correctly and a one-year color-theme preference cookie when you choose
                System, Light or Dark. Neither is used for tracking or advertising.
            </p>
            <p class="mt-4 text-sm">
                This is separate from your image, described above, which is not uploaded for processing.
            </p>
        </section>

        <section aria-labelledby="scope-title">
            <h2 id="scope-title">What this page doesn't cover</h2>
            <p class="text-sm">
                FileSetGo does not currently run analytics or advertising tracking. If that changes, this page will be
                updated to reflect it truthfully before it happens.
            </p>
        </section>
    </article>
@endsection
