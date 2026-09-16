@php
    $title = 'Website Image Optimizer for Hero, Content & Card Images | File. Set. Go.';
    $description = 'Choose a Hero, Content or Card website job. Get recommended dimensions, WebP format, a practical size target and control the crop before preparation.';
    $structuredData = [
        '@context' => 'https://schema.org',
        '@graph' => [
            ['@type' => 'WebPage', 'name' => $title, 'description' => $description, 'url' => route('website-image-optimizer')],
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
    <div class="fsg-optimizer-page fsg-optimizer-page--ready">
        <div class="fsg-content-shell fsg-optimizer-page__breadcrumb">
            @include('partials.breadcrumb', ['crumbs' => [
                ['label' => 'Home', 'href' => route('home')],
                ['label' => 'Website image optimizer', 'href' => null],
            ]])
        </div>

        <section class="fsg-shell fsg-optimizer-hero" aria-labelledby="optimizer-title">
            <div class="fsg-optimizer-hero__copy">
                <h1 id="optimizer-title">Prepare the image for where it will live on your website.</h1>
                <p class="fsg-optimizer-hero__intro">Choose the website job. Get a practical recommendation, then choose the image focus when the shape needs to change.</p>
                <div class="fsg-prepare-actions">
                    <a href="{{ route('home', ['mode' => 'guided-fit']) }}" class="fsg-primary-action">Optimize my image <x-icon name="arrow-right" class="size-4" /></a>
                    <a href="#website-placements" class="fsg-secondary-action">See the website placements</a>
                </div>
            </div>

            <figure class="fsg-optimizer-signature" aria-labelledby="optimizer-signature-caption">
                <div class="fsg-optimizer-signature__source">
                    <span>One source</span>
                    <img src="/brand/website-placement-demo.webp" alt="Blue ceramic vessels arranged in a bright studio, the project-owned source image used throughout this example." width="1536" height="1024">
                    <small>4800 × 3200 JPEG fixture</small>
                </div>
                <div class="fsg-optimizer-signature__route" aria-hidden="true"><span></span><x-icon name="arrow-right" class="size-4" /></div>
                <div class="fsg-optimizer-signature__outputs" aria-label="Three real Guided Fit outputs from the same source.">
                    <figure data-output-aspect="16:9">
                        <img src="/brand/website-optimizer-hero-result.webp" alt="The studio source prepared as a wide 16 by 9 Hero image with the blue vase kept central." width="1600" height="900">
                        <figcaption><strong>Hero</strong><span>1600 × 900</span></figcaption>
                    </figure>
                    <figure data-output-aspect="3:2">
                        <img src="/brand/website-optimizer-content-result.webp" alt="The same studio source prepared as a balanced 3 by 2 Content image." width="1200" height="800">
                        <figcaption><strong>Content</strong><span>1200 × 800</span></figcaption>
                    </figure>
                    <figure data-output-aspect="4:3">
                        <img src="/brand/website-optimizer-card-result.webp" alt="The same studio source prepared as a compact 4 by 3 Card image with the main vase preserved." width="800" height="600">
                        <figcaption><strong>Card</strong><span>800 × 600</span></figcaption>
                    </figure>
                </div>
                <figcaption id="optimizer-signature-caption">Same source. Different website job. Different ready file.</figcaption>
            </figure>
        </section>

        <section id="website-placements" class="fsg-optimizer-placements" aria-labelledby="website-placements-title">
            <div class="fsg-shell">
                <header class="fsg-optimizer-section-heading">
                    <h2 id="website-placements-title">Same image. Different job.</h2>
                    <p>The destination changes the frame, file weight and role. These are practical File. Set. Go. recommendations, not universal website rules.</p>
                </header>
                <div class="fsg-placement-system">
                    <article class="fsg-placement-story fsg-placement-story--hero" data-preset-id="web.hero">
                        <figure><img src="/brand/website-optimizer-hero-result.webp" alt="Real Hero output at 1600 by 900, showing the wide crop approved around the ceramic arrangement." width="1600" height="900" loading="lazy"></figure>
                        <div class="fsg-placement-story__copy">
                            <div><h3>Hero</h3><span>Wide and prominent</span></div>
                            <p>For prominent website sections where the image needs width and visual presence.</p>
                            <dl><div><dt>Geometry</dt><dd>1600 × 900 · 16:9</dd></div><div><dt>Format</dt><dd>WebP</dd></div><div><dt>Target</dt><dd>Under 500 KB</dd></div></dl>
                        </div>
                    </article>
                    <article class="fsg-placement-story fsg-placement-story--content" data-preset-id="web.content">
                        <figure><img src="/brand/website-optimizer-content-result.webp" alt="Real Content output at 1200 by 800, preserving the complete 3 by 2 studio composition." width="1200" height="800" loading="lazy"></figure>
                        <div class="fsg-placement-story__copy">
                            <div><h3>Content</h3><span>Balanced for reading</span></div>
                            <p>A balanced shape for article, page and editorial imagery.</p>
                            <dl><div><dt>Geometry</dt><dd>1200 × 800 · 3:2</dd></div><div><dt>Format</dt><dd>WebP</dd></div><div><dt>Target</dt><dd>Under 300 KB</dd></div></dl>
                        </div>
                    </article>
                    <article class="fsg-placement-story fsg-placement-story--card" data-preset-id="web.card">
                        <figure><img src="/brand/website-optimizer-card-result.webp" alt="Real Card output at 800 by 600, using a tighter 4 by 3 crop around the ceramic subjects." width="800" height="600" loading="lazy"></figure>
                        <div class="fsg-placement-story__copy">
                            <div><h3>Card</h3><span>Compact and repeatable</span></div>
                            <p>A compact frame for cards, grids, listings and repeated website content.</p>
                            <dl><div><dt>Geometry</dt><dd>800 × 600 · 4:3</dd></div><div><dt>Format</dt><dd>WebP</dd></div><div><dt>Target</dt><dd>Under 150 KB</dd></div></dl>
                        </div>
                    </article>
                </div>
            </div>
        </section>

        <section class="fsg-shell fsg-focus-story" aria-labelledby="focus-story-title">
            <div class="fsg-focus-story__copy">
                <h2 id="focus-story-title">You choose what stays in the frame.</h2>
                <p>Changing the destination can change the shape. File. Set. Go. shows the required frame and waits for you to approve the image focus.</p>
                <strong>File. Set. Go. never decides the crop for you.</strong>
            </div>
            <figure class="fsg-focus-demo" aria-labelledby="focus-demo-caption">
                <div class="fsg-focus-demo__image">
                    <img src="/brand/website-placement-demo.webp" alt="The full 3 by 2 studio source with a centered 16 by 9 Hero crop frame." width="1536" height="1024" loading="lazy">
                    <span class="fsg-focus-demo__shade fsg-focus-demo__shade--top" aria-hidden="true"></span>
                    <span class="fsg-focus-demo__shade fsg-focus-demo__shade--bottom" aria-hidden="true"></span>
                    <span class="fsg-focus-demo__frame" aria-hidden="true"></span>
                </div>
                <figcaption id="focus-demo-caption"><span>Source 3:2</span><x-icon name="arrow-right" class="size-4" /><strong>Approved Hero frame 16:9</strong></figcaption>
            </figure>
        </section>

        <section class="fsg-content-shell fsg-guided-journey" aria-labelledby="guided-journey-title">
            <header class="fsg-optimizer-section-heading">
                <h2 id="guided-journey-title">Guided Fit starts with the website job.</h2>
                <p>You bring the source and choose the destination. File. Set. Go. makes the recommendation visible before any preparation begins.</p>
            </header>
            <ol>
                <li><span>Choose</span><div><h3>Choose the website job</h3><p>Hero, Content or Card.</p></div></li>
                <li><span>Review</span><div><h3>Review the recommendation</h3><p>See the dimensions, format and size target.</p></div></li>
                <li><span>Focus</span><div><h3>Choose image focus if needed</h3><p>Approve the crop when the destination shape differs.</p></div></li>
                <li><span>Ready</span><div><h3>Get the ready file</h3><p>The final output is prepared and validated.</p></div></li>
            </ol>
            <p class="fsg-guided-journey__quick-fit">Already know the exact dimensions? <a href="{{ route('home', ['mode' => 'quick-fit']) }}">Use Quick Fit.</a></p>
        </section>

        <section class="fsg-optimizer-processing" aria-labelledby="optimizer-processing-title">
            <div class="fsg-shell fsg-optimizer-processing__inner">
                <header class="fsg-optimizer-section-heading">
                    <h2 id="optimizer-processing-title">Then File. Set. Go. prepares the result.</h2>
                    <p>The task modal owns your decisions. The full-page FILE, SET, GO transition owns the work. The workspace receives the validated result.</p>
                </header>
                <div class="fsg-processing-story" role="img" aria-label="The real File, Set, Go processing grammar shown first while preparing and then ready.">
                    @foreach ([['phase' => 'preparing', 'label' => 'Preparing'], ['phase' => 'ready', 'label' => 'Ready']] as $state)
                        <div class="fsg-processing-story__state @if ($state['phase'] === 'ready') fsg-processing-story__state--ready @endif">
                            <span>{{ $state['label'] }}</span>
                            <div class="fsg-processing-rail" data-phase="{{ $state['phase'] }}" role="presentation">
                                <div class="fsg-processing-rail__stage" data-stage="file"><p class="fsg-processing-rail__label">File</p><div class="fsg-processing-rail__node" data-node="file"><img class="fsg-processing-rail__thumb" src="/brand/website-placement-demo.webp" alt=""><span class="fsg-processing-rail__node-icon" data-node-icon="static"><x-icon name="file" class="size-7" /></span></div><p class="fsg-processing-rail__caption"><span data-phase-text="preparing validating ready">Source accepted</span></p></div>
                                <div class="fsg-processing-rail__connector" data-connector="1" aria-hidden="true"></div>
                                <div class="fsg-processing-rail__stage fsg-processing-rail__stage--set" data-stage="set"><p class="fsg-processing-rail__label">Set</p><div class="fsg-processing-rail__node" data-node="set"><span class="fsg-processing-rail__spinner" aria-hidden="true"></span><span class="fsg-processing-rail__node-icon" data-node-icon="check"><x-icon name="check" class="size-7" /></span></div><p class="fsg-processing-rail__caption"><span data-phase-text="preparing">Preparing</span><span data-phase-text="validating ready">Prepared</span></p></div>
                                <div class="fsg-processing-rail__connector" data-connector="2" aria-hidden="true"></div>
                                <div class="fsg-processing-rail__stage" data-stage="go"><p class="fsg-processing-rail__label">Go</p><div class="fsg-processing-rail__node" data-node="go"><span class="fsg-processing-rail__spinner" aria-hidden="true"></span><span class="fsg-processing-rail__node-icon" data-node-icon="check"><x-icon name="check" class="size-7" /></span></div><p class="fsg-processing-rail__caption"><span data-phase-text="preparing">Pending</span><span data-phase-text="validating">Checking</span><span data-phase-text="ready">Ready</span></p></div>
                            </div>
                        </div>
                        @if ($state['phase'] === 'preparing')<x-icon name="arrow-right" class="fsg-processing-story__arrow size-5" />@endif
                    @endforeach
                </div>
                <ul class="fsg-processing-truths"><li>Supported preparation runs in your browser.</li><li>Progress follows real stages, not a fake percentage.</li><li>Dimensions, format and bytes come from the final validated output.</li></ul>
            </div>
        </section>

        <section class="fsg-shell fsg-result-example" aria-labelledby="result-example-title">
            <div class="fsg-result-example__copy">
                <h2 id="result-example-title">From destination to a measured ready file.</h2>
                <p><strong>Sample result.</strong> This deterministic example was produced through the real Guided Fit path with the project-owned studio fixture.</p>
                <dl>
                    <div><dt>Source</dt><dd>4800 × 3200 JPEG</dd></div>
                    <div><dt>Destination</dt><dd>Hero</dd></div>
                    <div><dt>Recommendation</dt><dd>1600 × 900 WebP, target under 500 KB</dd></div>
                    <div><dt>Focus</dt><dd>User-approved centered Hero crop</dd></div>
                    <div><dt>Result</dt><dd>1600 × 900 WebP, 276.2 KB (282,792 bytes)</dd></div>
                </dl>
            </div>
            <figure><img src="/brand/website-optimizer-hero-result.webp" alt="The measured sample Hero result, a wide studio image with the blue vase kept in focus." width="1600" height="900" loading="lazy"><figcaption><span>Validated output</span><strong>1600 × 900 · WebP · 276.2 KB</strong></figcaption></figure>
        </section>

        <section class="fsg-prepare-trust fsg-optimizer-trust" aria-labelledby="optimizer-trust-title">
            <div class="fsg-content-shell fsg-prepare-trust__inner"><span class="fsg-prepare-trust__icon"><x-icon name="check" class="size-6" /></span><div><h2 id="optimizer-trust-title">Your image itself is not uploaded for processing.</h2><p>Supported workflows run in your browser. HEIC may load File. Set. Go.'s same-origin decoder resources, separately from sending your image to a processing endpoint.</p></div><a href="{{ route('privacy') }}">Read the privacy details</a></div>
        </section>

        <div class="fsg-content-shell fsg-optimizer-faq">
            @include('partials.faq', ['faqs' => [
                ['q' => 'Which destination should I choose?', 'a' => 'Choose Hero for a wide prominent section, Content for an in-page editorial image, or Card for compact repeated content. Each is a practical File. Set. Go. recommendation.'],
                ['q' => 'What if my website needs a different exact size?', 'a' => 'Use Quick Fit when your website builder gives you an exact requirement such as 1440 × 600. Guided Fit is for when you know the destination rather than the exact specification.'],
                ['q' => 'Does File. Set. Go. crop automatically?', 'a' => 'No. If the destination shape differs from the source, Guided Fit shows the required frame and waits for you to approve the image focus before processing.'],
                ['q' => 'What happens if my image is too small?', 'a' => 'Guided Fit explains that reaching the exact frame would enlarge the image and requires your explicit approval. It never enlarges the source silently.'],
                ['q' => 'Can I use WebP?', 'a' => 'Yes. The Hero, Content and Card Guided Fit recommendations currently prepare WebP outputs and validate the result before it appears in GO.'],
                ['q' => 'Is my image uploaded to a processing server?', 'a' => 'No. Supported image preparation happens in your browser. HEIC may load same-origin decoder resources needed to read that format.'],
            ]])
        </div>

        <section class="fsg-shell fsg-prepare-final fsg-optimizer-final" aria-labelledby="optimizer-final-title">
            <div><h2 id="optimizer-final-title">Prepare the image for its website job, not a guess.</h2><p>Choose where the image will live and File. Set. Go. will guide the preparation.</p></div>
            <a href="{{ route('home', ['mode' => 'guided-fit']) }}" class="fsg-primary-action">Optimize my image <x-icon name="arrow-right" class="size-4" /></a>
        </section>

        <nav class="fsg-content-shell fsg-logo-acquisition__related" aria-label="Related image tasks"><span>Related image tasks</span><a href="{{ route('compress-image') }}">Meet an exact file-size limit</a><a href="{{ route('convert-webp') }}">Convert an image to WebP</a></nav>
    </div>
@endsection
