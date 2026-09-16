{{--
    The one shared, restrained FILE→SET→GO processing animation
    (FSG-007-FIT-003 directive §21-§24) used identically by Quick Fit,
    Guided Fit, and Logo Pack's processing sections — CSS/SVG only, no new
    dependency, same hand-drawn visual language as `<x-icon>`. A JS-set
    `data-phase="preparing|validating|ready"` attribute on this root `<svg>`
    is the only script involvement; every visual transition (a gentle
    opacity pulse while preparing, connector lines lighting up as real
    progress is made) is plain CSS (`.fsg-processing-glyph*` in app.css) —
    no canvas, no requestAnimationFrame loop. `prefers-reduced-motion`
    collapses it to a static, fully-opaque end state with no animation.

    Usage: <x-processing-glyph />
--}}
@props(['class' => 'fsg-processing-glyph'])

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="{{ $class }}" aria-hidden="true">
    <g class="fsg-processing-glyph__node" data-node="file" transform="translate(1 1) scale(0.8)">
        <path d="M6 2.5h6l4 4V17a.5.5 0 0 1-.5.5h-9A.5.5 0 0 1 6 17V3a.5.5 0 0 1 .5-.5Z" />
        <path d="M12 2.5V6a1 1 0 0 0 1 1h3.5" />
    </g>
    <path class="fsg-processing-glyph__link" data-link="1" d="M17 10H27" />
    <g class="fsg-processing-glyph__node" data-node="set" transform="translate(23 1) scale(0.8)">
        <rect x="3" y="5" width="14" height="11" rx="1.5" />
        <path d="M3 8h14" />
    </g>
    <path class="fsg-processing-glyph__link" data-link="2" d="M37 10H47" />
    <g class="fsg-processing-glyph__node" data-node="go" transform="translate(45 1) scale(0.8)">
        <circle cx="10" cy="10" r="7" />
        <path d="M6.5 10.2l2.4 2.4L14 7.2" />
    </g>
</svg>
