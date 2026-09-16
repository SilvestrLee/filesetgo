@php
    $title = 'Convert an Image to WebP | File. Set. Go.';
    $description = 'Turn a supported source image into a modern WebP file for website use, with optional resizing and target-size preparation.';
    $structuredData = [
        '@context' => 'https://schema.org',
        '@graph' => [
            ['@type' => 'WebPage', 'name' => $title, 'description' => $description, 'url' => route('convert-webp')],
            ['@type' => 'BreadcrumbList', 'itemListElement' => [
                ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                ['@type' => 'ListItem', 'position' => 2, 'name' => 'Convert image to WebP', 'item' => route('convert-webp')],
            ]],
        ],
    ];
@endphp

@extends('layouts.public')

@section('content')
    <div class="fsg-transform-page fsg-webp-page">
        <div class="fsg-content-shell fsg-transform-page__breadcrumb">
            @include('partials.breadcrumb', ['crumbs' => [
                ['label' => 'Home', 'href' => route('home')],
                ['label' => 'Convert image to WebP', 'href' => null],
            ]])
        </div>

        <section class="fsg-shell fsg-transform-hero fsg-webp-hero" aria-labelledby="webp-title">
            <div class="fsg-transform-hero__copy">
                <p class="fsg-prepare-eyebrow">Convert image to WebP</p>
                <h1 id="webp-title">Turn your image into a web-ready WebP.</h1>
                <p class="fsg-transform-hero__intro">Change the format without losing sight of the image's purpose. Keep useful dimensions, add a size target when needed, and download a modern website image through the existing Quick Fit workflow.</p>
                <div class="fsg-prepare-actions">
                    <a href="{{ route('home', ['mode' => 'quick-fit']) }}" class="fsg-primary-action">Convert to WebP <x-icon name="arrow-right" class="size-4" /></a>
                    <a href="#webp-proof" class="fsg-secondary-action">See the difference</a>
                </div>
                <p class="fsg-prepare-hero__trust"><x-icon name="check" class="size-4" />Prepared in your browser. Your supported image stays on your device while it is processed.</p>
            </div>

            <figure class="fsg-task-visual fsg-transform-demo fsg-webp-demo" aria-labelledby="webp-demo-caption">
                <div class="fsg-webp-demo__format"><span>Source</span><strong>PNG</strong><small>101.5 KB · 640 × 480</small></div>
                <div class="fsg-webp-demo__image"><img src="/brand/transformation-webp-source.png" alt="A project-owned multicolour gradient PNG used for the WebP conversion example." width="640" height="480"></div>
                <x-icon name="arrow-right" class="fsg-webp-demo__arrow size-6" />
                <div class="fsg-webp-demo__format fsg-webp-demo__format--ready"><span>Ready</span><strong>WebP</strong><small>1.9 KB · 640 × 480</small></div>
                <figcaption id="webp-demo-caption">Real no-resize output from File. Set. Go.'s local sample fixture. File-size change varies by image.</figcaption>
            </figure>
        </section>

        <section id="webp-proof" class="fsg-transform-proof fsg-webp-proof" aria-labelledby="webp-proof-title">
            <div class="fsg-shell fsg-transform-proof__inner">
                <div class="fsg-prepare-section-heading"><h2 id="webp-proof-title">The format changes. The image's job stays clear.</h2><p>WebP is the required output in this example. The dimensions remain 640 × 480 because no resize was requested, while the real encoded file changes from PNG to WebP.</p></div>
                <div class="fsg-webp-proof__comparison" role="img" aria-label="The same 640 by 480 fixture shown first as a 101.5 kilobyte PNG and then as a 1.9 kilobyte WebP.">
                    <figure><span>Source · PNG</span><img src="/brand/transformation-webp-source.png" alt="" width="640" height="480"><figcaption><strong>101.5 KB</strong><small>640 × 480</small></figcaption></figure>
                    <x-icon name="arrow-right" class="size-5" />
                    <figure><span>Ready · WebP</span><img src="/brand/transformation-webp-result.webp" alt="" width="640" height="480"><figcaption><strong>1.9 KB</strong><small>640 × 480</small></figcaption></figure>
                </div>
            </div>
        </section>

        <section class="fsg-content-shell fsg-webp-change" aria-labelledby="webp-change-title">
            <div class="fsg-webp-change__copy"><h2 id="webp-change-title">A format decision, not a magic quality claim.</h2><p>Converting to WebP prepares a file in the requested format. It does not guarantee that every image will become smaller, sharper or visually improved.</p></div>
            <dl class="fsg-webp-change__facts">
                <div><dt>What changes</dt><dd>Output format and encoded byte size.</dd></div>
                <div><dt>What can stay</dt><dd>Pixel dimensions when no resize is requested.</dd></div>
                <div><dt>What remains optional</dt><dd>A maximum size, maximum dimensions or a target file weight.</dd></div>
            </dl>
        </section>

        <section class="fsg-shell fsg-webp-use" aria-labelledby="webp-use-title">
            <div class="fsg-prepare-section-heading"><h2 id="webp-use-title">Use WebP when the destination asks for a modern web image.</h2><p>The conversion path is useful when a CMS, website build or image workflow expects WebP. Add other requirements only when the destination actually needs them.</p></div>
            <div class="fsg-webp-use__line">
                <div><x-icon name="image" class="size-5" /><span><strong>Source accepted</strong><small>JPEG, PNG, WebP or supported HEIC</small></span></div>
                <div><x-icon name="target" class="size-5" /><span><strong>Requirement applied</strong><small>WebP, with optional dimensions or target size</small></span></div>
                <div><x-icon name="download" class="size-5" /><span><strong>Result verified</strong><small>Actual format, dimensions and file size reported</small></span></div>
            </div>
        </section>

        <section class="fsg-content-shell fsg-transform-steps" aria-labelledby="webp-steps-title">
            <div class="fsg-prepare-section-heading"><h2 id="webp-steps-title">Add the image. Choose WebP. Download the result.</h2></div>
            <ol>
                <li><span><x-icon name="file" class="size-5" /></span><div><h3>Add your image</h3><p>Choose a supported source file in the real Quick Fit workspace.</p></div></li>
                <li><span><x-icon name="image" class="size-5" /></span><div><h3>Choose WebP</h3><p>Keep the original dimensions or add only the limits the website placement requires.</p></div></li>
                <li><span><x-icon name="download" class="size-5" /></span><div><h3>Download the verified WebP</h3><p>Use the reported format, dimensions and file size to confirm the result fits the job.</p></div></li>
            </ol>
        </section>

        <section class="fsg-prepare-trust" aria-labelledby="webp-trust-title"><div class="fsg-content-shell fsg-prepare-trust__inner"><span class="fsg-prepare-trust__icon"><x-icon name="check" class="size-6" /></span><div><h2 id="webp-trust-title">Your image itself is not uploaded for processing.</h2><p>Supported preparation runs in your browser. HEIC workflows may load File. Set. Go.'s same-origin decoder resources.</p></div><a href="{{ route('privacy') }}">Read the privacy details</a></div></section>

        <div class="fsg-content-shell fsg-transform-faq">@include('partials.faq', ['faqs' => [
            ['q' => 'Is WebP always smaller than JPEG or PNG?', 'a' => 'No. The result depends on the source image, its content and the chosen settings. File. Set. Go. reports the actual output size instead of promising a universal saving.'],
            ['q' => 'Does converting to WebP resize my image?', 'a' => 'Not unless you set a maximum width or height, choose a guided destination, or allow dimension reduction for a target-size requirement.'],
            ['q' => 'Can a WebP keep transparency?', 'a' => 'WebP can carry transparency. File. Set. Go. preserves supported source alpha when the selected processing path and output support it.'],
            ['q' => 'Can I also set a file-size target?', 'a' => 'Yes. Quick Fit can combine WebP output with a KB or MB target and optional dimension limits. The governed search reports when a target is unreachable.'],
            ['q' => 'Is my image uploaded to a processing server?', 'a' => 'No. Supported image preparation happens in your browser. HEIC may load the same-origin decoder resources needed for that format.'],
        ]])</div>

        <section class="fsg-shell fsg-prepare-final" aria-labelledby="webp-final-title"><div><h2 id="webp-final-title">Choose the format your website needs, then verify the real result.</h2><p>Start with the image you have. File. Set. Go. will produce WebP through the same governed processing workspace.</p></div><a href="{{ route('home', ['mode' => 'quick-fit']) }}" class="fsg-primary-action">Convert to WebP <x-icon name="arrow-right" class="size-4" /></a></section>

        <nav class="fsg-content-shell fsg-logo-acquisition__related" aria-label="Related image tasks"><span>Related image tasks</span><a href="{{ route('compress-image') }}">Meet a file-size limit</a><a href="{{ route('website-image-optimizer') }}">Choose by website placement</a></nav>
    </div>
@endsection
