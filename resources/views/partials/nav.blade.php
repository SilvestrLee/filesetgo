<header class="fsg-header">
    <div class="fsg-shell fsg-header__inner">
        <a class="fsg-brand" href="{{ route('home') }}" aria-label="File. Set. Go. home">
            <span class="fsg-brand__mark" aria-hidden="true">F</span>
            <span class="fsg-brand__wordmark">File. Set. Go.</span>
        </a>

        <div class="fsg-header__actions">
            <nav aria-label="Primary" class="fsg-nav">
                <details>
                    <summary>
                        Website tasks
                        <svg viewBox="0 0 20 20" fill="currentColor" class="fsg-nav__chevron" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/></svg>
                    </summary>
                    <div class="fsg-task-menu">
                        @foreach (\App\Support\PublicPages::taskLinks() as $link)
                            <a
                                href="{{ $link['href'] }}"
                                @if (url()->current() === $link['href']) aria-current="page" @endif
                            >
                                <span class="fsg-task-menu__label">{{ $link['label'] }}</span>
                                <span class="fsg-task-menu__hint">{{ $link['hint'] }}</span>
                            </a>
                        @endforeach
                    </div>
                </details>
                <a href="{{ route('home') }}#how-it-works">How it works</a>
                <a
                    href="{{ route('privacy') }}"
                    @if (request()->routeIs('privacy')) aria-current="page" @endif
                >Privacy</a>
            </nav>

            <details class="fsg-theme">
                <summary aria-label="Choose color theme" title="Choose color theme">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                        <path d="M12 3v2.25M12 18.75V21M3 12h2.25M18.75 12H21M5.64 5.64l1.59 1.59M16.77 16.77l1.59 1.59M18.36 5.64l-1.59 1.59M7.23 16.77l-1.59 1.59"/>
                        <circle cx="12" cy="12" r="4.25"/>
                    </svg>
                    <span class="sr-only">Theme: <span data-theme-current>{{ ucfirst($themePreference) }}</span></span>
                </summary>
                <div class="fsg-theme__menu" role="group" aria-label="Color theme">
                    <p>Appearance</p>
                    @foreach (['system' => 'Use device setting', 'light' => 'Always light', 'dark' => 'Always dark'] as $value => $description)
                        <button type="button" data-theme-choice="{{ $value }}" aria-pressed="{{ $themePreference === $value ? 'true' : 'false' }}">
                            <span>{{ ucfirst($value) }}</span>
                            <small>{{ $description }}</small>
                        </button>
                    @endforeach
                </div>
            </details>
        </div>
    </div>
</header>
