@php
    $title = 'Prepare a Logo for Your Website | File. Set. Go.';
    $description = 'Turn one logo into everything your website needs: header logo, favicon, Apple touch icon and app icons, prepared in your browser.';
    $structuredData = [
        '@context' => 'https://schema.org',
        '@graph' => [
            [
                '@type' => 'WebPage',
                'name' => $title,
                'description' => $description,
                'url' => route('prepare-logo'),
            ],
            [
                '@type' => 'BreadcrumbList',
                'itemListElement' => [
                    ['@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => route('home')],
                    ['@type' => 'ListItem', 'position' => 2, 'name' => 'Prepare a logo', 'item' => route('prepare-logo')],
                ],
            ],
        ],
    ];
@endphp

@extends('layouts.public')

@section('content')
    <div class="fsg-prepare-page">
        <div class="fsg-content-shell fsg-prepare-page__breadcrumb">
            @include('partials.breadcrumb', ['crumbs' => [
                ['label' => 'Home', 'href' => route('home')],
                ['label' => 'Prepare a logo', 'href' => null],
            ]])
        </div>

        <section class="fsg-shell fsg-prepare-hero" aria-labelledby="prepare-logo-title">
            <div class="fsg-prepare-hero__copy">
                <p class="fsg-prepare-eyebrow">Prepare logo for website</p>
                <h1 id="prepare-logo-title">Turn one logo into a website-ready logo system.</h1>
                <p class="fsg-prepare-hero__intro">Prepare one source for headers, browser tabs and app icons without learning formats, dimensions or export settings.</p>
                <div class="fsg-prepare-actions">
                    <a href="{{ route('home', ['mode' => 'logo-pack']) }}" class="fsg-primary-action">
                        Prepare my logo
                        <x-icon name="arrow-right" class="size-4" />
                    </a>
                    <a href="#ready-system" class="fsg-secondary-action">See what you get</a>
                </div>
                <p class="fsg-prepare-hero__trust">
                    <x-icon name="check" class="size-4" />
                    Prepared in your browser. Your supported image stays on your device while it is processed.
                </p>
            </div>

            <figure class="fsg-prepare-demo" aria-labelledby="prepare-demo-caption">
                <div class="fsg-prepare-demo__stage fsg-prepare-demo__source">
                    <div class="fsg-prepare-demo__label"><span>Source</span><small>one logo file</small></div>
                    <div class="fsg-prepare-demo__source-canvas">
                        <img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442">
                    </div>
                </div>
                <x-icon name="arrow-right" class="fsg-prepare-demo__arrow size-5" />
                <div class="fsg-prepare-demo__stage fsg-prepare-demo__prepared">
                    <div class="fsg-prepare-demo__label"><span>Prepared</span><small>transparent and fitted</small></div>
                    <div class="fsg-prepare-demo__checkerboard">
                        <img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442">
                    </div>
                </div>
                <x-icon name="arrow-right" class="fsg-prepare-demo__arrow size-5" />
                <div class="fsg-prepare-demo__stage fsg-prepare-demo__ready">
                    <div class="fsg-prepare-demo__label"><span>Ready</span><small>header and compact icons</small></div>
                    <div class="fsg-prepare-demo__outputs">
                        <div class="fsg-prepare-demo__header-output">
                            <img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442">
                        </div>
                        <img class="fsg-prepare-demo__icon-output" src="/brand/filesetgo-go-icon.png" alt="" width="1254" height="1254">
                        <img class="fsg-prepare-demo__icon-output fsg-prepare-demo__icon-output--small" src="/favicon-32x32.png" alt="" width="32" height="32">
                    </div>
                </div>
                <figcaption id="prepare-demo-caption">Example transformation using File. Set. Go. brand assets.</figcaption>
            </figure>
        </section>

        <section class="fsg-content-shell fsg-prepare-problems" aria-labelledby="prepare-problems-title">
            <div class="fsg-prepare-section-heading">
                <h2 id="prepare-problems-title">A logo file is not always ready for a website.</h2>
                <p>File. Set. Go. resolves the practical gaps between the artwork you have and the places your website needs it.</p>
            </div>
            <div class="fsg-prepare-problem-list">
                <article class="fsg-prepare-problem">
                    <span class="fsg-prepare-problem__icon"><x-icon name="image" class="size-5" /></span>
                    <div><h3>Too much empty canvas</h3><p>The visible logo can occupy only a small part of the uploaded image. Extra outer space is fitted to the artwork.</p></div>
                    <div class="fsg-prepare-problem__visual fsg-prepare-problem__visual--canvas" aria-hidden="true">
                        <span><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></span>
                        <x-icon name="arrow-right" class="size-4" />
                        <img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442">
                    </div>
                </article>
                <article class="fsg-prepare-problem">
                    <span class="fsg-prepare-problem__icon"><x-icon name="transparent" class="size-5" /></span>
                    <div><h3>A background that limits placement</h3><p>Choose transparency when the logo needs to work across light, dark or coloured website surfaces.</p></div>
                    <div class="fsg-prepare-problem__visual fsg-prepare-problem__visual--background" aria-hidden="true">
                        <span><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></span>
                        <x-icon name="arrow-right" class="size-4" />
                        <span><img src="/brand/filesetgo-logo-dark-bg.png" alt="" width="2018" height="442"></span>
                    </div>
                </article>
                <article class="fsg-prepare-problem">
                    <span class="fsg-prepare-problem__icon"><x-icon name="favicon" class="size-5" /></span>
                    <div><h3>A wordmark that disappears at 16 pixels</h3><p>Approve a compact favicon source so the browser tab does not receive a tiny, unreadable horizontal logo.</p></div>
                    <div class="fsg-prepare-problem__visual fsg-prepare-problem__visual--favicon" aria-hidden="true">
                        <img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442">
                        <x-icon name="arrow-right" class="size-4" />
                        <img src="/favicon-32x32.png" alt="" width="32" height="32">
                    </div>
                </article>
                <article class="fsg-prepare-problem">
                    <span class="fsg-prepare-problem__icon"><x-icon name="download" class="size-5" /></span>
                    <div><h3>Different destinations, inconsistent exports</h3><p>Header, browser and device assets are prepared together so each file has a clear purpose.</p></div>
                    <div class="fsg-prepare-problem__visual fsg-prepare-problem__visual--files" aria-hidden="true">
                        <span>HEADER</span><span>BROWSER</span><span>DEVICE</span>
                    </div>
                </article>
            </div>
        </section>

        <section id="ready-system" class="fsg-prepare-system" aria-labelledby="prepare-system-title">
            <div class="fsg-shell fsg-prepare-system__inner">
                <div class="fsg-prepare-section-heading">
                    <h2 id="prepare-system-title">From one file to a ready logo system.</h2>
                    <p>The complete artwork remains the header source. A user-approved compact mark becomes the source for square icons.</p>
                </div>
                <div class="fsg-prepare-system__diagram" role="img" aria-label="One source logo is prepared, then becomes header, browser, and device icon assets.">
                    <div class="fsg-prepare-system__source">
                        <span>Your logo</span>
                        <div><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></div>
                    </div>
                    <x-icon name="arrow-right" class="fsg-prepare-system__arrow size-6" />
                    <div class="fsg-prepare-system__master">
                        <span>File. Set. Go.</span>
                        <strong>Prepared master</strong>
                        <small>fitted, reviewed and full resolution</small>
                    </div>
                    <div class="fsg-prepare-system__branches" aria-hidden="true"></div>
                    <div class="fsg-prepare-system__outputs">
                        <section>
                            <div class="fsg-prepare-output__preview fsg-prepare-output__preview--header"><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></div>
                            <h3>Header</h3>
                            <p>Standard and high-density logo</p>
                            <small>header-logo.png<br>header-logo@2x.png</small>
                        </section>
                        <section>
                            <div class="fsg-prepare-output__preview fsg-prepare-output__preview--browser"><img src="/favicon-32x32.png" alt="" width="32" height="32"></div>
                            <h3>Browser</h3>
                            <p>Favicon and ICO package asset</p>
                            <small>favicon.ico<br>favicon-32x32.png</small>
                        </section>
                        <section>
                            <div class="fsg-prepare-output__preview fsg-prepare-output__preview--device"><img src="/brand/filesetgo-go-icon.png" alt="" width="1254" height="1254"></div>
                            <h3>Device and app</h3>
                            <p>Touch, 192 and 512 icons</p>
                            <small>apple-touch-icon.png<br>icon-192x192.png<br>icon-512x512.png</small>
                        </section>
                    </div>
                </div>
            </div>
        </section>

        <section class="fsg-content-shell fsg-prepare-steps" aria-labelledby="prepare-steps-title">
            <div class="fsg-prepare-section-heading">
                <h2 id="prepare-steps-title">Add it. Review it. Download it.</h2>
                <p>The existing Logo Pack workflow keeps each decision focused and shows the result before packaging.</p>
            </div>
            <ol class="fsg-prepare-steps__list">
                <li><span><x-icon name="file" class="size-5" /></span><div><h3>Add your logo</h3><p>Choose a PNG, JPEG, WebP or supported HEIC file.</p></div></li>
                <li><span><x-icon name="transparent" class="size-5" /></span><div><h3>Review the preparation</h3><p>Choose the background treatment and approve the compact favicon source.</p></div></li>
                <li><span><x-icon name="download" class="size-5" /></span><div><h3>Download the pack</h3><p>Receive seven purpose-built website assets in one ZIP.</p></div></li>
            </ol>
        </section>

        <section class="fsg-shell fsg-prepare-evidence" aria-labelledby="prepare-evidence-title">
            <div class="fsg-prepare-evidence__transparency">
                <div class="fsg-prepare-section-heading">
                    <h2 id="prepare-evidence-title">Review transparency where it matters.</h2>
                    <p>The same prepared logo is shown on checkerboard, light and dark surfaces before the pack is created.</p>
                </div>
                <div class="fsg-prepare-surface-review" role="img" aria-label="The prepared File. Set. Go. logo shown on checkerboard, light, and dark website surfaces.">
                    <div class="fsg-prepare-surface-review__item fsg-prepare-surface-review__item--checker"><span>Checkerboard</span><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></div>
                    <div class="fsg-prepare-surface-review__item fsg-prepare-surface-review__item--light"><span>Light</span><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></div>
                    <div class="fsg-prepare-surface-review__item fsg-prepare-surface-review__item--dark"><span>Dark</span><img src="/brand/filesetgo-logo-dark-bg.png" alt="" width="2018" height="442"></div>
                </div>
                <p class="fsg-prepare-evidence__note">If artwork resembles its background, File. Set. Go. preserves the uncertain content and asks you to review the result.</p>
            </div>

            <div class="fsg-prepare-evidence__favicon">
                <div class="fsg-prepare-section-heading">
                    <h2>A website logo is not always a good favicon.</h2>
                    <p>Select a compact mark, inspect it at real sizes, then approve it for square outputs.</p>
                </div>
                <div class="fsg-prepare-favicon-story" role="img" aria-label="A full horizontal logo becomes a compact approved mark shown at 16 and 32 pixel favicon sizes.">
                    <div class="fsg-prepare-favicon-story__full"><span>Full logo</span><img src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442"></div>
                    <x-icon name="arrow-right" class="size-5" />
                    <div class="fsg-prepare-favicon-story__mark"><span>Compact source</span><img src="/brand/filesetgo-go-icon.png" alt="" width="1254" height="1254"></div>
                    <x-icon name="arrow-right" class="size-5" />
                    <div class="fsg-prepare-favicon-story__sizes"><span><img src="/favicon-16x16.png" alt="" width="16" height="16"><small>16 px</small></span><span><img src="/favicon-32x32.png" alt="" width="32" height="32"><small>32 px</small></span></div>
                </div>
            </div>
        </section>

        <section class="fsg-prepare-trust" aria-labelledby="prepare-trust-title">
            <div class="fsg-content-shell fsg-prepare-trust__inner">
                <span class="fsg-prepare-trust__icon"><x-icon name="check" class="size-6" /></span>
                <div><h2 id="prepare-trust-title">Your image itself is not uploaded for processing.</h2><p>Supported preparation runs in your browser. HEIC workflows may load File. Set. Go.'s same-origin decoder resources.</p></div>
                <a href="{{ route('privacy') }}">Read the privacy details</a>
            </div>
        </section>

        <div class="fsg-content-shell fsg-prepare-faq">
            @include('partials.faq', ['faqs' => [
                ['q' => 'Does File. Set. Go. resize my logo?', 'a' => 'Header and icon outputs are sized for their destinations. The accepted prepared master preserves the useful source detail and removes only unnecessary outer transparent canvas.'],
                ['q' => 'Can it make my logo background transparent?', 'a' => 'Yes, when you explicitly choose transparency. File. Set. Go. checks the result and marks ambiguous background removal as Needs Review instead of claiming a clean result.'],
                ['q' => 'Will it create a favicon?', 'a' => 'Yes. You approve a compact favicon source, then File. Set. Go. creates favicon.ico and favicon-32x32.png as part of the seven-file Logo Pack.'],
                ['q' => 'Does it make a low-resolution logo high resolution?', 'a' => 'No. File. Set. Go. does not manufacture missing detail. It warns when the useful logo resolution may look soft at larger sizes.'],
                ['q' => 'What files do I get?', 'a' => 'Two header logos, favicon.ico, favicon-32x32.png, an Apple touch icon, and 192 and 512 pixel app icons in one ZIP.'],
                ['q' => 'Is my logo uploaded to a processing server?', 'a' => 'No. Supported logo preparation happens in your browser. HEIC may load the same-origin decoder resources needed to process that format.'],
            ]])
        </div>

        <section class="fsg-shell fsg-prepare-final" aria-labelledby="prepare-final-title">
            <div><h2 id="prepare-final-title">Your logo should be ready before your website needs it.</h2><p>Start with the file you already have. Review each decision, then download the complete pack.</p></div>
            <a href="{{ route('home', ['mode' => 'logo-pack']) }}" class="fsg-primary-action">Prepare my logo <x-icon name="arrow-right" class="size-4" /></a>
        </section>
    </div>
@endsection
