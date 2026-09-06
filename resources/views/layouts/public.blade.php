<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="{{ $description }}">

        @if (($forceNoindex ?? false) || ! app()->environment('production'))
            <meta name="robots" content="noindex, nofollow">
        @endif

        <title>{{ $title }}</title>
        <link rel="canonical" href="{{ url()->current() }}">
        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        <meta property="og:type" content="{{ $ogType ?? 'website' }}">
        <meta property="og:site_name" content="File. Set. Go.">
        <meta property="og:title" content="{{ $ogTitle ?? $title }}">
        <meta property="og:description" content="{{ $ogDescription ?? $description }}">
        <meta property="og:url" content="{{ url()->current() }}">
        <meta property="og:image" content="{{ asset('og-image.png') }}">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ $ogTitle ?? $title }}">
        <meta name="twitter:description" content="{{ $ogDescription ?? $description }}">
        <meta name="twitter:image" content="{{ asset('og-image.png') }}">

        @isset($structuredData)
            <script type="application/ld+json">{!! json_encode($structuredData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}</script>
        @endisset

        @vite(['resources/css/app.css'])
        @stack('head')
    </head>
    <body class="min-h-[100dvh] bg-zinc-50 text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-700 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white">Skip to content</a>

        @include('partials.nav')

        <main id="main-content">
            @yield('content')
        </main>

        @include('partials.footer')

        @stack('scripts')
    </body>
</html>
