{{-- Expects $crumbs: array<int, array{label: string, href: ?string}>, last entry's href is null (current page). --}}
<nav aria-label="Breadcrumb" class="fsg-text-muted text-sm">
    <ol class="flex flex-wrap items-center gap-1">
        @foreach ($crumbs as $crumb)
            <li class="flex items-center gap-1">
                @if ($crumb['href'] !== null)
                    <a href="{{ $crumb['href'] }}" class="hover:underline">{{ $crumb['label'] }}</a>
                    <span aria-hidden="true">/</span>
                @else
                    <span aria-current="page" class="fsg-text-ink font-semibold">{{ $crumb['label'] }}</span>
                @endif
            </li>
        @endforeach
    </ol>
</nav>
