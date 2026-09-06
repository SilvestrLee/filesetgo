{{-- Expects $heading, $href, $label. --}}
<section class="flex flex-col items-center gap-4 rounded-xl bg-zinc-100 px-6 py-10 text-center dark:bg-zinc-900">
    <p class="text-lg font-semibold tracking-tight">{{ $heading }}</p>
    <a href="{{ $href }}" class="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-zinc-900">
        {{ $label }}
        <x-icon name="arrow-right" class="size-4" />
    </a>
</section>
