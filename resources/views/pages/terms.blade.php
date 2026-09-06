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
    <div class="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        @include('partials.breadcrumb', ['crumbs' => [
            ['label' => 'Home', 'href' => route('home')],
            ['label' => 'Terms of use', 'href' => null],
        ]])

        <section class="flex flex-col gap-4">
            <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">Terms of use</h1>
            <p class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                These are the practical terms for using FileSetGo. They're kept short and specific to what the product
                actually does, rather than generic boilerplate.
            </p>
        </section>

        <section class="flex flex-col gap-3">
            <ol class="flex list-decimal flex-col gap-3 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                <li>You're responsible for having the right to use, edit and prepare any image or file you process with FileSetGo.</li>
                <li>You should review anything FileSetGo prepares before using it. This applies especially to background removal, which FileSetGo may mark as needing review for difficult images rather than guaranteeing a perfect result.</li>
                <li>FileSetGo tries to meet a file-size target you set, but cannot guarantee every target is reachable for every image. Some combinations of size limit, dimensions and content cannot be met without further dimension reduction, or at all, and FileSetGo will tell you when that's the case rather than silently returning a lower-quality file.</li>
                <li>FileSetGo is provided as-is, subject to normal availability. It's a browser-based tool without a service-level guarantee.</li>
            </ol>
            <p class="text-sm leading-relaxed text-zinc-500 dark:text-zinc-500">
                FileSetGo's legal entity and jurisdiction details are not yet finalized and are intentionally omitted
                from this page rather than invented; they will be added here before this reliance would matter commercially.
            </p>
        </section>

        <p class="text-sm text-zinc-500 dark:text-zinc-400">
            See also: <a href="{{ route('privacy') }}" class="font-medium text-blue-700 underline dark:text-blue-400">Privacy</a>.
        </p>
    </div>
@endsection
