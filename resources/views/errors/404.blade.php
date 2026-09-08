@php
    $title = 'Page not found | File. Set. Go.';
    $description = 'This page could not be found.';
    $forceNoindex = true;
@endphp

@extends('layouts.public')

@section('content')
    <div class="fsg-shell fsg-not-found">
        <div class="fsg-not-found__inner">
            <p class="fsg-not-found__code" aria-hidden="true">404</p>
            <div>
                <h1>File not found. Set a new destination.</h1>
                <p class="fsg-text-muted mt-6 max-w-[48ch] text-base leading-relaxed">The page may have moved or no longer exists. The working file-preparation tool is still ready.</p>
                <div class="mt-2 flex flex-wrap gap-3">
                    <a href="{{ route('home') }}" class="fsg-primary-action">Go to FileSetGo</a>
                    <a href="{{ route('prepare-logo') }}" class="fsg-secondary-action fsg-border-control border">Prepare a logo</a>
                </div>
            </div>
        </div>
    </div>
@endsection
