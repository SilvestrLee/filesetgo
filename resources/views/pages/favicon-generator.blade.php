@php
    $title = 'Favicon Generator for Websites | File. Set. Go.';
    $description = 'Choose a compact source from your logo, inspect it at real favicon sizes, and create browser, Apple touch, and app icons in one Logo Pack.';
    $structuredData = [
        '@context' => 'https://schema.org',
        '@graph' => [
            ['@type' => 'WebPage', 'name' => $title, 'description' => $description, 'url' => route('favicon-generator')],
            ['@type' => 'BreadcrumbList', 'itemListElement' => [
                ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                ['@type' => 'ListItem', 'position' => 2, 'name' => 'Favicon generator', 'item' => route('favicon-generator')],
            ]],
        ],
    ];
@endphp

@extends('layouts.public')

@section('content')
    <div class="fsg-logo-acquisition fsg-favicon-page">
        <div class="fsg-content-shell fsg-logo-acquisition__breadcrumb">
            @include('partials.breadcrumb', ['crumbs' => [
                ['label' => 'Home', 'href' => route('home')],
                ['label' => 'Favicon generator', 'href' => null],
            ]])
        </div>

        <section class="fsg-shell fsg-logo-hero fsg-favicon-hero" aria-labelledby="favicon-title">
            <div class="fsg-logo-hero__copy">
                <p class="fsg-prepare-eyebrow">Favicon generator</p>
                <h1 id="favicon-title">Turn the right part of your logo into a favicon people can actually see.</h1>
                <p class="fsg-logo-hero__intro">Choose a compact mark from your prepared logo, preview it at real browser-tab sizes, and let File. Set. Go. create the required square assets.</p>
                <div class="fsg-prepare-actions">
                    <a href="{{ route('home', ['mode' => 'logo-pack']) }}" class="fsg-primary-action">Create my favicon <x-icon name="arrow-right" class="size-4" /></a>
                    <a href="#favicon-proof" class="fsg-secondary-action">See actual sizes</a>
                </div>
                <p class="fsg-prepare-hero__trust"><x-icon name="check" class="size-4" />One browser-local Logo Pack workflow. No separate uploader or icon engine.</p>
            </div>

            <figure class="fsg-favicon-hero__demo" aria-labelledby="favicon-hero-caption">
                <div class="fsg-favicon-hero__full"><span>Full wordmark</span><div><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></div></div>
                <x-icon name="arrow-right" class="fsg-favicon-hero__arrow size-5" />
                <div class="fsg-favicon-hero__mark"><span>Compact mark</span><img src="/brand/filesetgo-go-icon.png" alt="" width="1254" height="1254"></div>
                <div class="fsg-favicon-hero__actual"><span>Actual size</span><div><img src="/favicon-16x16.png" alt="" width="16" height="16"><small>16 px</small></div><div><img src="/favicon-32x32.png" alt="" width="32" height="32"><small>32 px</small></div></div>
                <div class="fsg-favicon-hero__device"><span>Device icon</span><img src="/apple-touch-icon.png" alt="" width="180" height="180"></div>
                <figcaption id="favicon-hero-caption">A project-owned horizontal logo becomes an approved compact source, then real-size browser and touch icons.</figcaption>
            </figure>
        </section>

        <section id="favicon-proof" class="fsg-favicon-proof" aria-labelledby="favicon-proof-title">
            <div class="fsg-shell fsg-favicon-proof__inner">
                <div class="fsg-prepare-section-heading"><h2 id="favicon-proof-title">A good header logo can disappear in a browser tab.</h2><p>The favicon canvas is only 32 pixels wide. A long wordmark must shrink until its letters are nearly invisible, while a compact mark can remain recognizable.</p></div>
                <div class="fsg-favicon-comparison" role="img" aria-label="At actual 32 pixel size, a full horizontal File. Set. Go. wordmark is difficult to read while the compact Go icon remains recognizable.">
                    <div class="fsg-favicon-comparison__case"><span>Full logo at 32 px</span><div class="fsg-favicon-actual-canvas"><img class="fsg-favicon-actual-full" src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></div><strong>Too small to read</strong></div>
                    <x-icon name="arrow-right" class="fsg-favicon-comparison__arrow size-5" />
                    <div class="fsg-favicon-comparison__case fsg-favicon-comparison__case--preferred"><span>Compact mark at 32 px</span><div class="fsg-favicon-actual-canvas"><img class="fsg-favicon-actual-32" src="/favicon-32x32.png" alt="" width="32" height="32"></div><strong>Recognizable</strong></div>
                </div>
            </div>
        </section>

        <section class="fsg-content-shell fsg-favicon-source" aria-labelledby="favicon-source-title">
            <div class="fsg-favicon-source__copy"><h2 id="favicon-source-title">Choose the source that still makes sense when it is tiny.</h2><p>The workflow keeps the complete prepared logo for header files. Only the square favicon outputs use your approved compact source.</p></div>
            <div class="fsg-favicon-source__choices">
                <article><span><x-icon name="target" class="size-5" /></span><div><h3>Select part of this logo</h3><p>Draw a freeform selection around the useful mark. The selection itself is not locked to a square.</p></div></article>
                <article><span><x-icon name="image" class="size-5" /></span><div><h3>Use another icon</h3><p>Choose a separate symbol, monogram or compact brand mark without replacing the header logo.</p></div></article>
                <article><span><x-icon name="favicon" class="size-5" /></span><div><h3>Use the full logo</h3><p>Keep the complete artwork when it is already compact, or accept the small-size warning deliberately.</p></div></article>
            </div>
        </section>

        <section class="fsg-shell fsg-favicon-selection-story" aria-labelledby="favicon-selection-title">
            <div class="fsg-prepare-section-heading"><h2 id="favicon-selection-title">Select freely. Output consistently.</h2><p>Your chosen region is fitted tightly, then contained inside the governed square canvases with intentional breathing room.</p></div>
            <div class="fsg-favicon-selection-story__flow">
                <div class="fsg-favicon-selection-story__source"><span>Prepared logo</span><div><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"><i aria-hidden="true"></i></div><small>Freeform source region</small></div>
                <x-icon name="arrow-right" class="size-5" />
                <div class="fsg-favicon-selection-story__trimmed"><span>Selected mark</span><img src="/brand/filesetgo-go-icon.png" alt="" width="1254" height="1254"><small>Fitted to the selection</small></div>
                <x-icon name="arrow-right" class="size-5" />
                <div class="fsg-favicon-selection-story__outputs"><span>Square outputs</span><div><img src="/favicon-32x32.png" alt="" width="32" height="32"><img src="/apple-touch-icon.png" alt="" width="180" height="180"></div><small>Normalized for each destination</small></div>
            </div>
        </section>

        <section class="fsg-content-shell fsg-favicon-actual" aria-labelledby="favicon-actual-title">
            <div class="fsg-prepare-section-heading"><h2 id="favicon-actual-title">Inspect the pixels people will actually see.</h2><p>Large previews help with detail. Actual-size previews answer the more important question: can you recognize the mark in a browser tab?</p></div>
            <div class="fsg-favicon-actual__stage">
                <div class="fsg-favicon-browser-proof fsg-favicon-browser-proof--light"><span>Light tab</span><div><img class="fsg-favicon-actual-16" src="/favicon-16x16.png" alt="" width="16" height="16"><strong>File. Set. Go.</strong></div><small>Actual 16 px icon</small></div>
                <div class="fsg-favicon-browser-proof fsg-favicon-browser-proof--dark"><span>Dark tab</span><div><img class="fsg-favicon-actual-32" src="/favicon-32x32.png" alt="" width="32" height="32"><strong>File. Set. Go.</strong></div><small>Actual 32 px icon</small></div>
                <div class="fsg-favicon-touch-proof"><span>Touch icon</span><img class="fsg-favicon-actual-180" src="/apple-touch-icon.png" alt="" width="180" height="180"><small>Actual 180 px icon</small></div>
            </div>
        </section>

        <section class="fsg-favicon-outputs" aria-labelledby="favicon-outputs-title">
            <div class="fsg-shell fsg-favicon-outputs__inner">
                <div class="fsg-prepare-section-heading"><h2 id="favicon-outputs-title">One approved source, fitted for each destination.</h2></div>
                <div class="fsg-favicon-output-groups">
                    <section><div><img src="/favicon-32x32.png" alt="" width="32" height="32"></div><h3>Browser</h3><p>Browser-tab and ICO assets.</p><small>favicon.ico<br>favicon-32x32.png</small></section>
                    <section><div><img src="/apple-touch-icon.png" alt="" width="180" height="180"></div><h3>Apple</h3><p>A touch icon for saved website shortcuts.</p><small>apple-touch-icon.png</small></section>
                    <section><div><img src="/brand/filesetgo-go-icon.png" alt="" width="1254" height="1254"></div><h3>App and manifest</h3><p>Square icons for governed web app destinations.</p><small>icon-192x192.png<br>icon-512x512.png</small></section>
                </div>
            </div>
        </section>

        <section class="fsg-content-shell fsg-logo-acquisition__steps" aria-labelledby="favicon-steps-title">
            <div class="fsg-prepare-section-heading"><h2 id="favicon-steps-title">Prepare the logo. Approve the mark. Download the pack.</h2></div>
            <ol><li><span><x-icon name="file" class="size-5" /></span><div><h3>Add your logo</h3><p>The real Logo Pack workflow first prepares and verifies the complete logo.</p></div></li><li><span><x-icon name="target" class="size-5" /></span><div><h3>Approve a favicon source</h3><p>Select a region, use another icon, or keep the full logo after reviewing the warning.</p></div></li><li><span><x-icon name="download" class="size-5" /></span><div><h3>Download seven assets</h3><p>Header files use the complete logo. Browser and app icons use the approved compact source.</p></div></li></ol>
        </section>

        <section class="fsg-prepare-trust" aria-labelledby="favicon-trust-title"><div class="fsg-content-shell fsg-prepare-trust__inner"><span class="fsg-prepare-trust__icon"><x-icon name="check" class="size-6" /></span><div><h2 id="favicon-trust-title">Your source and favicon choice stay in your browser.</h2><p>Supported preparation and icon composition run on your device. HEIC workflows may load File. Set. Go.'s same-origin decoder resources.</p></div><a href="{{ route('privacy') }}">Read the privacy details</a></div></section>

        <div class="fsg-content-shell fsg-logo-acquisition__faq">@include('partials.faq', ['faqs' => [
            ['q' => 'Why not use my full logo as the favicon?', 'a' => 'A long wordmark becomes extremely small when contained inside a 16 or 32 pixel square. A compact mark is usually easier to recognize.'],
            ['q' => 'Is the source selection forced to be square?', 'a' => 'No. You can choose a freeform region around the useful mark. File. Set. Go. then fits that accepted source into the required square outputs.'],
            ['q' => 'Can I upload a separate icon?', 'a' => 'Yes. A separate compact symbol can become the favicon source without replacing the full prepared logo used for header files.'],
            ['q' => 'What favicon files do I get?', 'a' => 'The seven-file Logo Pack includes favicon.ico, favicon-32x32.png, apple-touch-icon.png, icon-192x192.png and icon-512x512.png, plus two header logos.'],
            ['q' => 'Does the favicon workflow upload my logo?', 'a' => 'No. Supported preparation happens in your browser. HEIC may load the same-origin decoder resources needed for that format.'],
        ]])</div>

        <section class="fsg-shell fsg-prepare-final" aria-labelledby="favicon-final-title"><div><h2 id="favicon-final-title">Give the smallest website asset a source chosen for the job.</h2><p>Keep the complete logo for your header. Approve a compact mark for every square icon in the same Logo Pack.</p></div><a href="{{ route('home', ['mode' => 'logo-pack']) }}" class="fsg-primary-action">Create my favicon <x-icon name="arrow-right" class="size-4" /></a></section>

        <nav class="fsg-content-shell fsg-logo-acquisition__related" aria-label="Related logo tasks"><span>Related logo tasks</span><a href="{{ route('prepare-logo') }}">Prepare a complete logo pack</a><a href="{{ route('transparent-logo') }}">Prepare a transparent logo</a></nav>
    </div>
@endsection
