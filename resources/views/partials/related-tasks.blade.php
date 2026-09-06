{{-- Expects $related: array<int, array{href: string, label: string, blurb: string}> --}}
<section aria-labelledby="related-tasks-title" class="flex flex-col gap-4">
    <h2 id="related-tasks-title" class="text-xl font-semibold tracking-tight">Related tasks</h2>
    <ul class="flex flex-col divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        @foreach ($related as $item)
            <li>
                <a href="{{ $item['href'] }}" class="group flex items-center justify-between gap-4 py-4 transition hover:bg-zinc-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:bg-zinc-900/60">
                    <span class="flex flex-col gap-0.5">
                        <span class="font-semibold text-blue-700 dark:text-blue-400">{{ $item['label'] }}</span>
                        <span class="text-sm text-zinc-600 dark:text-zinc-400">{{ $item['blurb'] }}</span>
                    </span>
                    <x-icon name="arrow-right" class="size-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700 dark:group-hover:text-blue-400" />
                </a>
            </li>
        @endforeach
    </ul>
</section>
