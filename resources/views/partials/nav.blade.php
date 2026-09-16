<header class="fsg-header" data-site-header data-header-state="top">
    <div class="fsg-shell fsg-header__inner">
        <a class="fsg-brand" href="{{ route('home') }}" aria-label="File. Set. Go. home">
            <span class="fsg-brand__wordmark" aria-hidden="true">
                <img class="fsg-brand__logo fsg-brand__logo--light" src="/brand/filesetgo-logo-light-bg.png" alt="" width="2018" height="442">
                <img class="fsg-brand__logo fsg-brand__logo--dark" src="/brand/filesetgo-logo-dark-bg.png" alt="" width="2018" height="442">
            </span>
        </a>

        <div class="fsg-header__actions">
            <nav aria-label="Primary" class="fsg-nav">
                <details data-task-navigation>
                    <summary
                        id="website-tasks-trigger"
                        aria-label="Website tasks"
                        aria-controls="website-tasks-menu"
                        aria-expanded="false"
                    >
                        <span class="fsg-nav__desktop-label">Website tasks</span>
                        <span class="fsg-nav__mobile-icon" aria-hidden="true">
                            <span></span>
                            <span></span>
                            <span></span>
                        </span>
                        <svg viewBox="0 0 20 20" fill="currentColor" class="fsg-nav__chevron" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/></svg>
                    </summary>
                    <div class="fsg-task-menu" id="website-tasks-menu" aria-labelledby="website-tasks-trigger">
                        <div class="fsg-task-menu__mobile-heading" aria-hidden="true">
                            <span>Website tasks</span>
                            <small>Choose what you need to prepare.</small>
                        </div>
                        @foreach (\App\Support\PublicPages::taskLinks() as $link)
                            @php($isCurrentTask = url()->current() === $link['href'])
                            <a
                                href="{{ $link['href'] }}"
                                @if ($isCurrentTask) aria-current="page" @endif
                            >
                                <span class="fsg-task-menu__title">
                                    <span class="fsg-task-menu__label">{{ $link['label'] }}</span>
                                    @if ($isCurrentTask)
                                        <span class="fsg-task-menu__current">Current</span>
                                    @endif
                                </span>
                                <span class="fsg-task-menu__hint">{{ $link['hint'] }}</span>
                            </a>
                        @endforeach
                        <div class="fsg-task-menu__supporting">
                            <a href="{{ route('home') }}#how-it-works">How it works</a>
                            <a href="{{ route('privacy') }}" @if (request()->routeIs('privacy')) aria-current="page" @endif>Privacy</a>
                        </div>
                    </div>
                </details>
                <a href="{{ route('home') }}#how-it-works">How it works</a>
                <a
                    href="{{ route('privacy') }}"
                    @if (request()->routeIs('privacy')) aria-current="page" @endif
                >Privacy</a>
            </nav>

            <button
                type="button"
                class="fsg-theme"
                data-theme-toggle
                aria-label="Toggle light and dark theme"
                aria-pressed="false"
                title="Toggle light and dark theme"
            >
                    <svg class="fsg-theme__icon fsg-theme__icon--sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                        <path d="M12 3v2.25M12 18.75V21M3 12h2.25M18.75 12H21M5.64 5.64l1.59 1.59M16.77 16.77l1.59 1.59M18.36 5.64l-1.59 1.59M7.23 16.77l-1.59 1.59"/>
                        <circle cx="12" cy="12" r="4.25"/>
                    </svg>
                    <svg class="fsg-theme__icon fsg-theme__icon--moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                        <path d="M20.25 15.35A8.5 8.5 0 0 1 8.65 3.75 8.5 8.5 0 1 0 20.25 15.35Z"/>
                    </svg>
                    <span class="sr-only">Theme: <span data-theme-current>{{ ucfirst($themePreference) }}</span></span>
            </button>
        </div>
    </div>
</header>
