<footer class="fsg-footer">
    <div class="fsg-shell fsg-footer__inner">
        <div class="fsg-footer__intro">
            <a href="{{ route('home') }}" class="fsg-brand">
                <span class="fsg-brand__wordmark" aria-hidden="true">
                    <img class="fsg-brand__logo fsg-brand__logo--dark" src="/brand/filesetgo-logo-dark-bg.png" alt="" width="2018" height="442">
                </span>
            </a>
            <p class="fsg-footer__promise">Get your file ready for where it needs to go.</p>
            <p class="fsg-footer__family-note">Part of the Set. Go. family</p>
        </div>

        <details class="fsg-footer__tasks" open>
            <summary>Website tasks</summary>
            <nav aria-label="Website tasks" class="fsg-footer__task-links">
                @foreach (\App\Support\PublicPages::taskLinks() as $link)
                    <a href="{{ $link['href'] }}">{{ $link['label'] }}</a>
                @endforeach
            </nav>
        </details>

        <section class="fsg-footer__products" aria-labelledby="set-go-products-title">
            <p id="set-go-products-title">Set. Go. Products</p>
            <div class="fsg-footer__product-list">
                @foreach (\App\Support\ProductFamily::all() as $product)
                    <div class="fsg-footer__product">
                        @if ($product['status'] === 'current')
                            <a href="{{ route('home') }}" aria-current="page">{{ $product['name'] }}</a>
                        @elseif ($product['status'] === 'live' && $product['url'] !== null)
                            <a href="{{ $product['url'] }}">{{ $product['name'] }}</a>
                        @else
                            <span class="fsg-footer__product-name">{{ $product['name'] }}</span>
                        @endif
                        <span>{{ $product['description'] }}</span>
                        <small>{{ $product['status'] === 'current' ? 'Current product' : ($product['status'] === 'live' ? 'Available now' : 'Coming soon') }}</small>
                    </div>
                @endforeach
            </div>
        </section>

    </div>
    <div class="fsg-footer__meta">
        <div class="fsg-shell fsg-footer__meta-inner">
            <p>&copy; {{ now()->year }} File. Set. Go. Files are prepared in your browser.</p>
            <nav aria-label="FileSetGo information">
                <a href="{{ route('home') }}#how-it-works">How it works</a>
                <a href="{{ route('privacy') }}">Privacy</a>
                <a href="{{ route('terms') }}">Terms of use</a>
            </nav>
        </div>
    </div>
</footer>
