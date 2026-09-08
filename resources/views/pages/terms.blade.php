@php
    $title = 'Terms of Use | File. Set. Go.';
    $description = 'The practical terms for using FileSetGo.';
    $structuredData = [
        '@context' => 'https://schema.org',
        '@type' => 'WebPage',
        'name' => $title,
        'description' => $description,
        'url' => route('terms'),
    ];
@endphp

@extends('layouts.public')

@section('content')
    <article class="fsg-prose-shell fsg-legal">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Terms of use', 'href' => null],
        ]])

        <header class="fsg-legal__header">
            <h1>Terms of use</h1>
            <p class="fsg-text-muted mt-5 max-w-[58ch] text-base leading-relaxed">
                These are the practical terms for using FileSetGo. They're kept short and specific to what the product
                actually does, rather than generic boilerplate.
            </p>
        </header>

        <section aria-labelledby="terms-list-title">
            <h2 id="terms-list-title">Using FileSetGo</h2>
            <ol class="flex list-decimal flex-col gap-4 pl-5 text-sm">
                <li>You're responsible for having the right to use, edit and prepare any image or file you process with FileSetGo.</li>
                <li>You should review anything FileSetGo prepares before using it. This applies especially to background removal, which FileSetGo may mark as needing review for difficult images rather than guaranteeing a perfect result.</li>
                <li>FileSetGo tries to meet a file-size target you set, but cannot guarantee every target is reachable for every image. Some combinations of size limit, dimensions and content cannot be met without further dimension reduction, or at all, and FileSetGo will tell you when that's the case rather than silently returning a lower-quality file.</li>
                <li>FileSetGo is provided as-is, subject to normal availability. It's a browser-based tool without a service-level guarantee.</li>
            </ol>
            <p class="mt-7 text-sm">
                FileSetGo's legal entity and jurisdiction details are not yet finalized and are intentionally omitted
                from this page rather than invented; they will be added here before this reliance would matter commercially.
            </p>
        </section>

        <p class="fsg-text-muted fsg-border-top pt-6 text-sm">
            See also: <a href="{{ route('privacy') }}" class="fsg-text-ink font-semibold underline decoration-2 underline-offset-4">Privacy</a>.
        </p>
    </article>
@endsection
