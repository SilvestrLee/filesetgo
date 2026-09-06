{{-- Expects $crumbs: array<int, array{label: string, href: ?string}>, last entry's href is null (current page). --}}
<nav aria-label="Breadcrumb" class="text-sm text-zinc-500 dark:text-zinc-400">
    <ol class="flex flex-wrap items-center gap-1">
        @foreach ($crumbs as $crumb)
            <li class="flex items-center gap-1">
                @if ($crumb['href'] !== null)
                    <a href="{{ $crumb['href'] }}" class="hover:text-zinc-950 dark:hover:text-zinc-100">{{ $crumb['label'] }}</a>
                    <span aria-hidden="true">/</span>
                @else
                    <span aria-current="page" class="font-medium text-zinc-700 dark:text-zinc-300">{{ $crumb['label'] }}</span>
                @endif
            </li>
        @endforeach
    </ol>
</nav>
