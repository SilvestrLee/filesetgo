<header class="border-b border-zinc-200/80 dark:border-zinc-800">
    <div class="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
        <a class="flex items-center gap-2 whitespace-nowrap text-lg font-semibold tracking-tight" href="{{ route('home') }}">
            <span class="flex size-6 items-center justify-center rounded-md bg-blue-700 text-xs font-bold text-white">F</span>
            File. Set. Go.
        </a>
        <nav aria-label="Primary" class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-zinc-600 sm:gap-x-6 dark:text-zinc-400">
            <details class="group relative">
                <summary class="flex min-h-9 cursor-pointer list-none items-center gap-1 rounded-lg px-1 transition hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:text-zinc-100">
                    Website tasks
                    <svg viewBox="0 0 20 20" fill="currentColor" class="size-4 transition group-open:rotate-180" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/></svg>
                </summary>
                <div class="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-2 text-left shadow-lg shadow-zinc-950/5 dark:border-zinc-800 dark:bg-zinc-900">
                    @foreach (\App\Support\PublicPages::taskLinks() as $link)
                        <a href="{{ $link['href'] }}" class="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100">{{ $link['label'] }}</a>
                    @endforeach
                </div>
            </details>
            <a class="border-b-2 border-transparent py-1 transition hover:text-zinc-950 dark:hover:text-zinc-100" href="{{ route('home') }}#how-it-works">How it works</a>
            <a
                class="border-b-2 py-1 transition hover:text-zinc-950 dark:hover:text-zinc-100 {{ request()->routeIs('privacy') ? 'border-blue-700 text-zinc-950 dark:text-zinc-100' : 'border-transparent' }}"
                href="{{ route('privacy') }}"
                @if (request()->routeIs('privacy')) aria-current="page" @endif
            >Privacy</a>
        </nav>
    </div>
</header>
