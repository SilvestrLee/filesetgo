<?php

namespace App\Support;

final class ProductFamily
{
    /**
     * @return array<string, array{key: string, name: string, description: string, status: string, url: ?string, contexts: array<int, string>}>
     */
    public static function all(): array
    {
        /** @var array<string, array{name: string, description: string, status: string, url: ?string, contexts: array<int, string>}> $configured */
        $configured = config('product-family.products', []);

        return collect($configured)
            ->mapWithKeys(function (array $product, string $key): array {
                $url = self::safeUrl($product['url']);
                $status = $key === 'file' ? 'current' : ($url === null ? 'coming-soon' : 'live');

                return [$key => [...$product, 'key' => $key, 'status' => $status, 'url' => $url]];
            })
            ->all();
    }

    /**
     * @return array{key: string, name: string, description: string, status: string, url: ?string, contexts: array<int, string>}
     */
    public static function get(string $key): array
    {
        return self::all()[$key] ?? throw new \InvalidArgumentException("Unknown Set. Go. product [{$key}].");
    }

    public static function isRelevant(string $key, string $context): bool
    {
        return in_array($context, self::get($key)['contexts'], true);
    }

    private static function safeUrl(?string $url): ?string
    {
        if ($url === null || filter_var($url, FILTER_VALIDATE_URL) === false) {
            return null;
        }

        $scheme = parse_url($url, PHP_URL_SCHEME);

        return in_array($scheme, ['http', 'https'], true) ? $url : null;
    }
}
