{{-- Expects $heading, $href, $label. --}}
<section class="fsg-final-cta">
    <h2>{{ $heading }}</h2>
    <a href="{{ $href }}" class="fsg-primary-action">
        {{ $label }}
        <x-icon name="arrow-right" class="size-4" />
    </a>
</section>
