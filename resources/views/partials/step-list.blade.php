{{--
    Expects $title, $steps: array<int, array{label: string, body: string}>, $note (optional trailing paragraph).
    $colsClass must be one of the literal strings below (not interpolated), so Tailwind's
    build-time scanner can find the complete class name in this file's source.
--}}
@php
    $colsClass = match (count($steps)) {
        3 => 'sm:grid-cols-3',
        4 => 'sm:grid-cols-4',
        default => 'sm:grid-cols-2',
    };
@endphp
<section aria-labelledby="how-title" class="flex flex-col gap-4">
    <h2 id="how-title" class="text-xl font-semibold tracking-tight">{{ $title }}</h2>
    <ol class="grid gap-6 {{ $colsClass }}">
        @foreach ($steps as $step)
            <li class="flex flex-col gap-1 border-l-2 border-blue-700 pl-4 sm:border-l-0 sm:border-t-2 sm:pl-0 sm:pt-4">
                <p class="text-xs font-bold tracking-[0.14em] text-blue-700 uppercase dark:text-blue-400">{{ $step['label'] }}</p>
                <p class="text-sm text-zinc-600 dark:text-zinc-400">{{ $step['body'] }}</p>
            </li>
        @endforeach
    </ol>
    @isset($note)
        <p class="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{{ $note }}</p>
    @endisset
</section>
