{{-- Expects $related: array<int, array{href: string, label: string, blurb: string}> --}}
<section aria-labelledby="related-tasks-title" class="fsg-related">
    <h2 id="related-tasks-title">Related tasks</h2>
    <ul class="fsg-related__list">
        @foreach ($related as $item)
            <li>
                <a href="{{ $item['href'] }}" class="group flex items-center justify-between gap-4 transition">
                    <span class="flex flex-col gap-0.5">
                        <span class="fsg-related__title font-semibold">{{ $item['label'] }}</span>
                        <span class="fsg-related__copy text-sm">{{ $item['blurb'] }}</span>
                    </span>
                    <x-icon name="arrow-right" class="size-4 shrink-0 transition group-hover:translate-x-0.5" />
                </a>
            </li>
        @endforeach
    </ul>
</section>
