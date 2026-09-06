@php
    $title = 'Page not found | File. Set. Go.';
    $description = 'This page could not be found.';
    $forceNoindex = true;
@endphp

@extends('layouts.public')

@section('content')
    <div class="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6 lg:px-8">
        <p class="text-sm font-semibold text-blue-700 dark:text-blue-400">404</p>
        <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl">We couldn't find that page.</h1>
        <p class="max-w-[50ch] text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            The page you're looking for may have moved or no longer exists. Here are a few places to go instead.
        </p>

        <div class="flex flex-wrap items-center justify-center gap-3">
            <a href="{{ route('home') }}" class="min-h-11 whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-zinc-950">Go to File. Set. Go.</a>
            <a href="{{ route('prepare-logo') }}" class="min-h-11 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">Prepare a logo</a>
            <a href="{{ route('compress-image') }}" class="min-h-11 whitespace-nowrap rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800">Compress an image</a>
        </div>
    </div>
@endsection
