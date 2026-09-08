{{-- Expects $title, $steps: array<int, array{label: string, body: string}>, $note (optional trailing paragraph). --}}
<section aria-labelledby="how-title" class="fsg-task-section">
    <h2 id="how-title">{{ $title }}</h2>
    <div class="fsg-task-section__body">
        <ol class="fsg-step-list">
        @foreach ($steps as $step)
            <li>
                <div>
                    <p class="fsg-step-list__label font-semibold">{{ $step['label'] }}</p>
                    <p class="mt-1 text-sm">{{ $step['body'] }}</p>
                </div>
            </li>
        @endforeach
        </ol>
        @isset($note)
            <p class="mt-5 text-sm leading-relaxed">{{ $note }}</p>
        @endisset
    </div>
</section>
