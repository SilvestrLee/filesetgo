<footer class="border-t border-zinc-200/80 dark:border-zinc-800">
    <div class="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:grid-cols-[1.3fr_1fr_1fr] sm:px-6 lg:px-8">
        <div class="flex flex-col gap-3">
            <a href="{{ route('home') }}" class="flex items-center gap-2 font-semibold">
                <span class="flex size-6 items-center justify-center rounded-md bg-blue-700 text-xs font-bold text-white">F</span>
                File. Set. Go.
            </a>
            <p class="max-w-[32ch] text-sm text-zinc-500 dark:text-zinc-400">Get your file ready for where it needs to go.</p>
        </div>

        <nav aria-label="Website tasks" class="flex flex-col gap-3 text-sm">
            <p class="font-semibold text-zinc-950 dark:text-zinc-100">Website tasks</p>
            <div class="flex flex-col gap-2">
                @foreach (\App\Support\PublicPages::taskLinks() as $link)
                    <a href="{{ $link['href'] }}" class="text-zinc-600 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100">{{ $link['label'] }}</a>
                @endforeach
            </div>
        </nav>

        <nav aria-label="FileSetGo" class="flex flex-col gap-3 text-sm">
            <p class="font-semibold text-zinc-950 dark:text-zinc-100">FileSetGo</p>
            <div class="flex flex-col gap-2 text-zinc-600 dark:text-zinc-400">
                <a class="transition hover:text-zinc-950 dark:hover:text-zinc-100" href="{{ route('home') }}#how-it-works">How it works</a>
                <a class="transition hover:text-zinc-950 dark:hover:text-zinc-100" href="{{ route('privacy') }}">Privacy</a>
                <a class="transition hover:text-zinc-950 dark:hover:text-zinc-100" href="{{ route('terms') }}">Terms of use</a>
            </div>
        </nav>
    </div>
    <div class="border-t border-zinc-200/80 px-4 py-5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:px-6 lg:px-8">
        <p>&copy; {{ now()->year }} File. Set. Go. Files are prepared in your browser.</p>
    </div>
</footer>
