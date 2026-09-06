{{-- Expects $faqs: array<int, array{q: string, a: string}>. No FAQPage structured data is emitted for this list (directive §33 -- schema is not added automatically). --}}
<section aria-labelledby="faq-title" class="flex flex-col gap-4">
    <h2 id="faq-title" class="text-xl font-semibold tracking-tight">Common questions</h2>
    <div class="flex flex-col divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        @foreach ($faqs as $faq)
            <details class="group py-4">
                <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
                    {{ $faq['q'] }}
                    <svg viewBox="0 0 20 20" fill="currentColor" class="size-4 shrink-0 text-zinc-400 transition group-open:rotate-180" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/></svg>
                </summary>
                <p class="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{{ $faq['a'] }}</p>
            </details>
        @endforeach
    </div>
</section>
