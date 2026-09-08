@props([
    'productKey',
    'prompt',
    'context',
    'variant' => 'result',
])

@php($product = \App\Support\ProductFamily::get($productKey))

@if (\App\Support\ProductFamily::isRelevant($productKey, $context))
<aside class="fsg-related-product fsg-related-product--{{ $variant }}" data-product-context="{{ $context }}" aria-label="Related Set. Go. product">
    <p class="fsg-related-product__prompt">{{ $prompt }}</p>
    <div class="fsg-related-product__identity">
        <span class="fsg-related-product__name">{{ $product['name'] }}</span>
        <span class="fsg-related-product__description">{{ $product['description'] }}</span>
    </div>
    @if ($product['status'] === 'live' && $product['url'] !== null)
        <a href="{{ $product['url'] }}" class="fsg-related-product__action">Visit {{ $product['name'] }}</a>
    @else
        <span class="fsg-related-product__status">Coming soon</span>
    @endif
</aside>
@endif
