@php
    $title = 'Compress an Image for Your Website | File. Set. Go.';
    $description = 'Work toward a real website file-size target while preserving useful image quality and reducing dimensions only when needed.';
    $structuredData = [
        '@context' => 'https://schema.org',
        '@graph' => [
            ['@type' => 'WebPage', 'name' => $title, 'description' => $description, 'url' => route('compress-image')],
            ['@type' => 'BreadcrumbList', 'itemListElement' => [
                ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                ['@type' => 'ListItem', 'position' => 2, 'name' => 'Compress image for website', 'item' => route('compress-image')],
            ]],
        ],
    ];
@endphp

@extends('layouts.public')

@section('content')
    <div class="fsg-transform-page fsg-compress-page">
        <div class="fsg-content-shell fsg-transform-page__breadcrumb">
            @include('partials.breadcrumb', ['crumbs' => [
                ['label' => 'Home', 'href' => route('home')],
                ['label' => 'Compress image for website', 'href' => null],
            ]])
        </div>

        <section class="fsg-shell fsg-transform-hero" aria-labelledby="compress-title">
            <div class="fsg-transform-hero__copy">
                <p class="fsg-prepare-eyebrow">Compress image for website</p>
                <h1 id="compress-title">Make the image lighter without making it useless.</h1>
                <p class="fsg-transform-hero__intro">Set the limit your website needs. File. Set. Go. searches for a useful result within that requirement and can reduce oversized dimensions before sacrificing practical quality.</p>
                <div class="fsg-prepare-actions">
                    <a href="{{ route('home', ['mode' => 'quick-fit']) }}" class="fsg-primary-action">Compress my image <x-icon name="arrow-right" class="size-4" /></a>
                    <a href="#compress-proof" class="fsg-secondary-action">See how it works</a>
                </div>
                <p class="fsg-prepare-hero__trust"><x-icon name="check" class="size-4" />Prepared in your browser. Your supported image stays on your device while it is processed.</p>
            </div>

            <figure class="fsg-task-visual fsg-transform-demo fsg-compress-demo" aria-labelledby="compress-demo-caption">
                <div class="fsg-transform-demo__image">
                    <img src="/brand/transformation-compress-source.jpg" alt="A project-owned multicolour gradient test image used for the compression example." width="4800" height="3200">
                    <span>Deterministic fixture</span>
                </div>
                <div class="fsg-compress-demo__journey" aria-label="Compression example from a 440.9 kilobyte source toward a target under 30 kilobytes, resulting in a 27.1 kilobyte file.">
                    <div><small>Original</small><strong>440.9 KB</strong><span>4800 × 3200 · JPEG</span></div>
                    <x-icon name="arrow-right" class="size-5" />
                    <div class="fsg-compress-demo__target"><small>Website target</small><strong>Under 30 KB</strong><span>Dimensions may reduce</span></div>
                    <x-icon name="arrow-right" class="size-5" />
                    <div class="fsg-compress-demo__ready"><small>Ready</small><strong>27.1 KB</strong><span>2947 × 1965 · WebP</span></div>
                </div>
                <figcaption id="compress-demo-caption">Real output from File. Set. Go.'s target-size workflow using the local large-image fixture.</figcaption>
            </figure>
        </section>

        <section id="compress-proof" class="fsg-transform-proof" aria-labelledby="compress-proof-title">
            <div class="fsg-shell fsg-transform-proof__inner">
                <div class="fsg-prepare-section-heading">
                    <h2 id="compress-proof-title">The target is a requirement, not a quality preset.</h2>
                    <p>A fixed quality slider cannot know the upload limit. File. Set. Go. tests bounded options and returns a result under the target only when the actual encoded file fits.</p>
                </div>
                <div class="fsg-target-ledger" role="img" aria-label="A real fixture moves from 440.9 kilobytes through a target under 30 kilobytes to a 27.1 kilobyte prepared result.">
                    <div><span>Source file</span><strong>440.9</strong><small>KB</small></div>
                    <div><span>Your requirement</span><strong>&lt; 30</strong><small>KB</small></div>
                    <div><span>Prepared result</span><strong>27.1</strong><small>KB</small></div>
                </div>
            </div>
        </section>

        <section class="fsg-content-shell fsg-quality-proof" aria-labelledby="quality-proof-title">
            <div class="fsg-quality-proof__copy">
                <h2 id="quality-proof-title">Smaller still has to be useful.</h2>
                <p>The result is not judged by byte count alone. The same image remains inspectable after a 93.9% reduction in file weight, while the engine stays within its governed quality and dimension limits.</p>
                <p class="fsg-transform-note"><x-icon name="check" class="size-4" />Illustrative fixture result. Difficult images and different targets produce different outcomes.</p>
            </div>
            <div class="fsg-quality-proof__comparison">
                <figure><span>Before · JPEG · 440.9 KB</span><img src="/brand/transformation-compress-source.jpg" alt="The original project-owned gradient fixture before compression." width="4800" height="3200"><figcaption>Source detail at 4800 × 3200</figcaption></figure>
                <figure><span>After · WebP · 27.1 KB</span><img src="/brand/transformation-compress-result.webp" alt="The same gradient fixture after File. Set. Go. prepared it under 30 kilobytes." width="2947" height="1965"><figcaption>Prepared detail at 2947 × 1965</figcaption></figure>
            </div>
        </section>

        <section class="fsg-shell fsg-dimension-story" aria-labelledby="dimension-story-title">
            <div class="fsg-prepare-section-heading"><h2 id="dimension-story-title">Dimensions and file weight solve different parts of the problem.</h2><p>A giant image can be heavy because it carries far more pixels than its website placement can display. Reducing that excess can protect visible quality better than pushing compression harder.</p></div>
            <dl class="fsg-dimension-story__facts">
                <div><dt>Preserve dimensions</dt><dd>Use a hard boundary when the exact pixel size must remain.</dd></div>
                <div><dt>Allow reduction</dt><dd>Let the bounded search step down dimensions when the target cannot otherwise be reached.</dd></div>
                <div><dt>Unreachable target</dt><dd>Get an honest outcome instead of a file that quietly exceeds the limit.</dd></div>
            </dl>
        </section>

        <section class="fsg-content-shell fsg-transform-steps" aria-labelledby="compress-steps-title">
            <div class="fsg-prepare-section-heading"><h2 id="compress-steps-title">Add the image. Set the limit. Download the result.</h2></div>
            <ol>
                <li><span><x-icon name="file" class="size-5" /></span><div><h3>Add your image</h3><p>Choose a JPEG, PNG, WebP or supported HEIC file in the real Quick Fit workspace.</p></div></li>
                <li><span><x-icon name="target" class="size-5" /></span><div><h3>Enter the website limit</h3><p>Set the KB or MB target, optional maximum dimensions and whether reduction is allowed.</p></div></li>
                <li><span><x-icon name="download" class="size-5" /></span><div><h3>Use the verified result</h3><p>Download the file when the actual encoded output meets the governed requirement.</p></div></li>
            </ol>
        </section>

        <section class="fsg-prepare-trust" aria-labelledby="compress-trust-title"><div class="fsg-content-shell fsg-prepare-trust__inner"><span class="fsg-prepare-trust__icon"><x-icon name="check" class="size-6" /></span><div><h2 id="compress-trust-title">Your image itself is not uploaded for processing.</h2><p>Supported preparation runs in your browser. HEIC workflows may load File. Set. Go.'s same-origin decoder resources.</p></div><a href="{{ route('privacy') }}">Read the privacy details</a></div></section>

        <div class="fsg-content-shell fsg-transform-faq">@include('partials.faq', ['faqs' => [
            ['q' => 'Will File. Set. Go. always reach my target size?', 'a' => 'No. Some targets are too small for the selected dimensions and governed quality range. File. Set. Go. reports an unreachable outcome instead of pretending the file fits.'],
            ['q' => 'Why might the dimensions become smaller?', 'a' => 'When dimension reduction is allowed, a smaller pixel boundary can meet a difficult file-size target while preserving more useful visual quality than extreme compression.'],
            ['q' => 'Does compression have zero quality loss?', 'a' => 'No. Lossy JPEG and WebP preparation can change image detail. The workflow searches within governed quality limits and keeps the result practical rather than promising lossless output.'],
            ['q' => 'What if my image is already small?', 'a' => 'An already-small file may not shrink dramatically, and converting it again may not improve it. Use a requirement that matches the image\'s real website job.'],
            ['q' => 'Is my image uploaded to a processing server?', 'a' => 'No. Supported image preparation happens in your browser. HEIC may load the same-origin decoder resources needed for that format.'],
        ]])</div>

        <section class="fsg-shell fsg-prepare-final" aria-labelledby="compress-final-title"><div><h2 id="compress-final-title">Make the file fit the website requirement, not a guess.</h2><p>Bring the limit you have. File. Set. Go. will search within its quality and dimension guardrails and tell you when the target is not practical.</p></div><a href="{{ route('home', ['mode' => 'quick-fit']) }}" class="fsg-primary-action">Compress my image <x-icon name="arrow-right" class="size-4" /></a></section>

        <nav class="fsg-content-shell fsg-logo-acquisition__related" aria-label="Related image tasks"><span>Related image tasks</span><a href="{{ route('convert-webp') }}">Convert an image to WebP</a><a href="{{ route('website-image-optimizer') }}">Choose by website placement</a></nav>
    </div>
@endsection
