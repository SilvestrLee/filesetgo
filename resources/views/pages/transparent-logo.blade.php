@php
    $title = 'Transparent Logo for Websites | File. Set. Go.';
    $description = 'Remove a solid logo background, preserve source detail, review the result on real surfaces, and prepare a transparent master in your browser.';
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
    <div class="fsg-logo-acquisition fsg-transparent-page">
        <div class="fsg-content-shell fsg-logo-acquisition__breadcrumb">
            @include('partials.breadcrumb', ['crumbs' => [
                ['label' => 'Home', 'href' => route('home')],
                ['label' => 'Transparent logo', 'href' => null],
            ]])
        </div>

        <section class="fsg-shell fsg-logo-hero fsg-transparent-hero" aria-labelledby="transparent-logo-title">
            <div class="fsg-logo-hero__copy">
                <p class="fsg-prepare-eyebrow">Transparent logo for website</p>
                <h1 id="transparent-logo-title">Remove the box around your logo. Keep the logo intact.</h1>
                <p class="fsg-logo-hero__intro">Prepare a clean transparent master, fit the canvas to the artwork, and inspect anything uncertain before you use it on your website.</p>
                <div class="fsg-prepare-actions">
                    <a href="{{ route('home', ['mode' => 'logo-pack']) }}" class="fsg-primary-action">Make my logo transparent <x-icon name="arrow-right" class="size-4" /></a>
                    <a href="#transparent-proof" class="fsg-secondary-action">See the surface proof</a>
                </div>
                <p class="fsg-prepare-hero__trust"><x-icon name="check" class="size-4" />Prepared in your browser. Your supported image stays on your device while it is processed.</p>
            </div>

            <figure class="fsg-transparent-hero__demo" aria-labelledby="transparent-hero-caption">
                <div class="fsg-transparent-hero__source"><span>Original</span><div><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></div><small>solid source canvas</small></div>
                <x-icon name="arrow-right" class="fsg-transparent-hero__arrow size-5" />
                <div class="fsg-transparent-hero__prepared"><span>Prepared</span><div class="fsg-logo-checkerboard"><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></div><small>transparent and fitted</small></div>
                <div class="fsg-transparent-hero__proof"><span>Proved</span><div class="fsg-transparent-proof-mini fsg-transparent-proof-mini--light"><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></div><div class="fsg-transparent-proof-mini fsg-transparent-proof-mini--dark"><img src="/brand/filesetgo-logo-dark-bg.png" alt="" width="2018" height="442"></div></div>
                <figcaption id="transparent-hero-caption">A project-owned logo shown before preparation, on transparency, and on real light and dark surfaces.</figcaption>
            </figure>
        </section>

        <section class="fsg-content-shell fsg-transparent-problems" aria-labelledby="transparent-problems-title">
            <div class="fsg-prepare-section-heading"><h2 id="transparent-problems-title">The background problem usually appears after placement.</h2><p>A file can look acceptable by itself and still fail in a header, footer, navigation bar or content block.</p></div>
            <div class="fsg-transparent-problems__story">
                <article><span class="fsg-logo-story-icon"><x-icon name="image" class="size-5" /></span><div><h3>A white rectangle follows the logo</h3><p>The source canvas becomes visible as soon as the website background changes.</p></div><div class="fsg-transparent-problem-visual fsg-transparent-problem-visual--boxed" aria-hidden="true"><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></div></article>
                <article><span class="fsg-logo-story-icon"><x-icon name="transparent" class="size-5" /></span><div><h3>Empty canvas makes the logo hard to place</h3><p>File. Set. Go. fits the outer canvas to the accepted artwork without reducing its useful detail.</p></div><div class="fsg-transparent-problem-visual fsg-transparent-problem-visual--canvas" aria-hidden="true"><span><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></span><x-icon name="arrow-right" class="size-4" /><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></div></article>
                <article><span class="fsg-logo-story-icon"><x-icon name="check" class="size-5" /></span><div><h3>White artwork can resemble the background</h3><p>Uncertain details are preserved and marked Needs Review instead of being erased blindly.</p></div><div class="fsg-transparent-problem-visual fsg-transparent-problem-visual--review" aria-hidden="true"><strong>Needs Review</strong><span>artwork preserved</span></div></article>
            </div>
        </section>

        <section id="transparent-proof" class="fsg-transparent-proof" aria-labelledby="transparent-proof-title">
            <div class="fsg-shell fsg-transparent-proof__inner">
                <div class="fsg-prepare-section-heading"><h2 id="transparent-proof-title">Transparency is only useful when the logo works on real surfaces.</h2><p>Checkerboard confirms open pixels. Light and dark proofs reveal halos, lost artwork and leftover background.</p></div>
                <div class="fsg-transparent-proof__surfaces" role="img" aria-label="The same prepared File. Set. Go. logo shown on checkerboard, light, and dark website surfaces.">
                    <div class="fsg-transparent-proof__surface fsg-transparent-proof__surface--checker"><span>Checkerboard</span><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"><small>Inspect open pixels</small></div>
                    <div class="fsg-transparent-proof__surface fsg-transparent-proof__surface--light"><span>Light website</span><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"><small>Check light edges</small></div>
                    <div class="fsg-transparent-proof__surface fsg-transparent-proof__surface--dark"><span>Dark website</span><img src="/brand/filesetgo-logo-dark-bg.png" alt="" width="2018" height="442"><small>Reveal pale halos</small></div>
                </div>
            </div>
        </section>

        <section class="fsg-content-shell fsg-transparent-review" aria-labelledby="transparent-review-title">
            <div class="fsg-transparent-review__status" aria-label="Example transparency status: Needs Review"><span><x-icon name="transparent" class="size-5" /></span><small>Transparency</small><strong>Needs Review</strong><p>Uncertain artwork stays visible.</p></div>
            <div class="fsg-transparent-review__copy"><h2 id="transparent-review-title">Careful is better than confidently wrong.</h2><p>If part of your artwork closely resembles the background, File. Set. Go. keeps it and asks you to review the result instead of deleting it blindly.</p><ul><li><x-icon name="check" class="size-4" /><span>Foreground preservation is checked separately from transparency.</span></li><li><x-icon name="check" class="size-4" /><span>Checkerboard, light and dark views show the same prepared file.</span></li><li><x-icon name="check" class="size-4" /><span>Already-transparent artwork keeps its authored internal appearance.</span></li></ul></div>
        </section>

        <section class="fsg-shell fsg-transparent-honesty" aria-labelledby="transparent-honesty-title">
            <div class="fsg-transparent-honesty__copy"><h2 id="transparent-honesty-title">Transparency cannot create missing detail.</h2><p>A small or blurry source may still be small or blurry after preparation. File. Set. Go. preserves the useful source detail and reports the prepared dimensions honestly.</p></div>
            <dl class="fsg-transparent-honesty__facts"><div><dt>Source detail</dt><dd>Preserved</dd></div><div><dt>Outer canvas</dt><dd>Fitted to the logo</dd></div><div><dt>Low resolution</dt><dd>Advisory shown</dd></div></dl>
        </section>

        <section class="fsg-content-shell fsg-logo-acquisition__steps" aria-labelledby="transparent-steps-title">
            <div class="fsg-prepare-section-heading"><h2 id="transparent-steps-title">Choose it. Review it. Use it.</h2></div>
            <ol><li><span><x-icon name="file" class="size-5" /></span><div><h3>Add your logo</h3><p>Choose a PNG, JPEG, WebP or supported HEIC file in the real Logo Pack workflow.</p></div></li><li><span><x-icon name="transparent" class="size-5" /></span><div><h3>Choose transparency</h3><p>Select a preparation strength, then inspect the result on three surfaces.</p></div></li><li><span><x-icon name="download" class="size-5" /></span><div><h3>Download the accepted result</h3><p>Use the fitted transparent master for header assets and continue to the complete pack.</p></div></li></ol>
        </section>

        <section class="fsg-prepare-trust" aria-labelledby="transparent-trust-title"><div class="fsg-content-shell fsg-prepare-trust__inner"><span class="fsg-prepare-trust__icon"><x-icon name="check" class="size-6" /></span><div><h2 id="transparent-trust-title">Your image itself is not uploaded for processing.</h2><p>Supported preparation runs in your browser. HEIC workflows may load File. Set. Go.'s same-origin decoder resources.</p></div><a href="{{ route('privacy') }}">Read the privacy details</a></div></section>

        <div class="fsg-content-shell fsg-logo-acquisition__faq">@include('partials.faq', ['faqs' => [
            ['q' => 'Does PNG automatically mean transparent?', 'a' => 'No. A PNG can still contain a solid flattened background. File. Set. Go. checks the actual pixels rather than assuming the format is ready.'],
            ['q' => 'What happens if the background is ambiguous?', 'a' => 'File. Set. Go. preserves uncertain artwork and marks the result Needs Review so you can inspect it before using or packaging it.'],
            ['q' => 'Will transparency preparation sharpen a blurry logo?', 'a' => 'No. It does not manufacture missing image detail. A low-resolution source can be prepared correctly and still receive a low-resolution advisory.'],
            ['q' => 'Does File. Set. Go. remove empty space around my logo?', 'a' => 'Yes. After an accepted transparency result, unnecessary outer transparent canvas is fitted to the visible logo with controlled safe padding.'],
            ['q' => 'Is my logo uploaded to a processing server?', 'a' => 'No. Supported logo preparation happens in your browser. HEIC may load the same-origin decoder resources needed for that format.'],
        ]])</div>

        <section class="fsg-shell fsg-prepare-final" aria-labelledby="transparent-final-title"><div><h2 id="transparent-final-title">Your logo should work wherever your website places it.</h2><p>Start with the source you have. File. Set. Go. will guide the preparation and ask for review when the result is uncertain.</p></div><a href="{{ route('home', ['mode' => 'logo-pack']) }}" class="fsg-primary-action">Make my logo transparent <x-icon name="arrow-right" class="size-4" /></a></section>

        <nav class="fsg-content-shell fsg-logo-acquisition__related" aria-label="Related logo tasks"><span>Related logo tasks</span><a href="{{ route('prepare-logo') }}">Prepare a complete logo pack</a><a href="{{ route('favicon-generator') }}">Create a favicon</a></nav>
    </div>
@endsection
