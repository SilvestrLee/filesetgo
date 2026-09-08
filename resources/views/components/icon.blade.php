{{--
    A small, restrained set of hand-drawn inline SVG icons (FSG-007 design
    refinement, directive §29): no icon library dependency was added, so
    these compose from plain <path>/<rect> primitives at a consistent
    20x20 viewBox and 1.75 stroke width. Used sparingly, only where an icon
    measurably improves scanning, never as decoration on every element.

    Usage: <x-icon name="file" class="size-5" />
--}}
@props(['name', 'class' => 'size-5'])

@php
    $paths = [
        'file' => '<path d="M6 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 6 17V3a.5.5 0 0 1 .5-.5Z" /><path d="M12 2.5V6a1 1 0 0 0 1 1h3.5" />',
        'target' => '<circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="3.5" /><path d="M10 2.5V5M10 15v2.5M2.5 10H5M15 10h2.5" />',
        'transparent' => '<path d="M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3z" opacity="0.4" /><path d="M11 11h6v6h-6z" />',
        'favicon' => '<rect x="3" y="5" width="14" height="11" rx="1.5" /><path d="M3 8h14" /><circle cx="5.5" cy="6.5" r="0.4" fill="currentColor" stroke="none" />',
        'image' => '<rect x="2.5" y="4" width="15" height="12" rx="1.5" /><circle cx="7" cy="8.5" r="1.25" /><path d="M4 15l4-4 3 3 3-4 3.5 5" />',
        'download' => '<path d="M10 3v9.5M6.5 9l3.5 3.5L13.5 9" /><path d="M4 16.5h12" />',
        'arrow-right' => '<path d="M4 10h12M12 6l4 4-4 4" />',
        'check' => '<path d="M4 10.5l3.5 3.5L16 5.5" />',
    ];
@endphp

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="{{ $class }}" aria-hidden="true">
    {!! $paths[$name] ?? '' !!}
</svg>
