<?php

namespace Tests\Feature;

use App\Support\PublicPages;
use Tests\TestCase;

/**
 * Deterministic SEO/public-surface coverage for FSG-007 (directive §40):
 * every indexable route resolves, carries the required metadata contract
 * (§16), and the sitemap/robots/404/internal-link surfaces behave as the
 * directive specifies.
 */
class PublicSurfacesTest extends TestCase
{
    /**
     * @return array<int, string>
     */
    public static function indexableRoutes(): array
    {
        return PublicPages::indexableRouteNames();
    }

    public function test_every_indexable_route_returns_200(): void
    {
        foreach (self::indexableRoutes() as $name) {
            $this->get(route($name))->assertStatus(200);
        }
    }

    public function test_every_indexable_page_has_exactly_one_h1(): void
    {
        foreach (self::indexableRoutes() as $name) {
            $html = $this->get(route($name))->getContent();

            $this->assertSame(1, preg_match_all('/<h1[ >]/i', $html), "Expected exactly one <h1> on route [{$name}].");
        }
    }

    public function test_every_indexable_page_has_a_unique_title(): void
    {
        $titles = [];

        foreach (self::indexableRoutes() as $name) {
            $html = $this->get(route($name))->getContent();
            preg_match('#<title>(.*?)</title>#s', $html, $matches);

            $this->assertNotEmpty($matches[1] ?? null, "Missing <title> on route [{$name}].");
            $titles[$name] = trim($matches[1]);
        }

        $this->assertSame(count($titles), count(array_unique($titles)), 'Duplicate <title> found across indexable pages: '.json_encode($titles));
    }

    public function test_every_indexable_page_has_a_unique_meta_description(): void
    {
        $descriptions = [];

        foreach (self::indexableRoutes() as $name) {
            $html = $this->get(route($name))->getContent();
            preg_match('/<meta name="description" content="([^"]*)"/', $html, $matches);

            $this->assertNotEmpty($matches[1] ?? null, "Missing meta description on route [{$name}].");
            $descriptions[$name] = $matches[1];
        }

        $this->assertSame(count($descriptions), count(array_unique($descriptions)), 'Duplicate meta description found across indexable pages: '.json_encode($descriptions));
    }

    public function test_every_indexable_page_has_a_canonical_link(): void
    {
        foreach (self::indexableRoutes() as $name) {
            $response = $this->get(route($name));

            $response->assertSee('rel="canonical" href="'.route($name).'"', false);
        }
    }

    public function test_every_indexable_page_has_open_graph_metadata(): void
    {
        $expectedImage = asset('og-image.png');

        foreach (self::indexableRoutes() as $name) {
            $html = $this->get(route($name))->getContent();

            $this->assertMatchesRegularExpression('/<meta property="og:title" content="[^"]+"/', $html, "Missing og:title on route [{$name}].");
            $this->assertMatchesRegularExpression('/<meta property="og:description" content="[^"]+"/', $html, "Missing og:description on route [{$name}].");
            $this->assertMatchesRegularExpression('/<meta property="og:url" content="[^"]+"/', $html, "Missing og:url on route [{$name}].");
            $this->assertStringContainsString('<meta property="og:image" content="'.$expectedImage.'">', $html, "Missing og:image on route [{$name}].");
            $this->assertStringContainsString('<meta name="twitter:image" content="'.$expectedImage.'">', $html, "Missing twitter:image on route [{$name}].");
        }
    }

    /**
     * The FileSetGo site's own favicon/social-preview assets (distinct from
     * any Logo Pack output) exist, are referenced from the shared layout,
     * and are real, valid image files (Product Office amendment, FSG-007
     * design refinement pass).
     */
    public function test_site_favicon_and_social_preview_assets_are_wired_and_real(): void
    {
        $html = $this->get(route('home'))->getContent();

        $this->assertStringContainsString('<link rel="icon" href="/favicon.ico" sizes="any">', $html);
        $this->assertStringContainsString('<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">', $html);
        $this->assertStringContainsString('<link rel="apple-touch-icon" href="/apple-touch-icon.png">', $html);

        foreach (['/favicon.ico', '/favicon-32x32.png', '/apple-touch-icon.png', '/og-image.png'] as $path) {
            $filePath = public_path(ltrim($path, '/'));
            $this->assertFileExists($filePath, "Expected {$path} to exist in public/.");
            $this->assertGreaterThan(0, filesize($filePath), "{$path} must not be an empty placeholder file.");
        }

        // A real ICO container (not a renamed PNG or empty stub): "MM" magic bytes at offset 0 are 00 00 01 00.
        $icoBytes = substr(file_get_contents(public_path('favicon.ico')), 0, 4);
        $this->assertSame("\x00\x00\x01\x00", $icoBytes, 'favicon.ico is not a valid ICO container.');

        // Real PNGs: the 8-byte PNG signature.
        foreach (['favicon-32x32.png', 'apple-touch-icon.png', 'og-image.png'] as $file) {
            $pngSignature = substr(file_get_contents(public_path($file)), 0, 8);
            $this->assertSame("\x89PNG\r\n\x1a\n", $pngSignature, "{$file} is not a valid PNG.");
        }
    }

    public function test_acquisition_pages_carry_valid_structured_data(): void
    {
        $acquisitionRoutes = array_diff(self::indexableRoutes(), ['home', 'privacy', 'terms']);

        foreach ($acquisitionRoutes as $name) {
            $html = $this->get(route($name))->getContent();

            $this->assertMatchesRegularExpression('#<script type="application/ld\+json">(.*?)</script>#s', $html, "Missing structured data on route [{$name}].");
            preg_match('#<script type="application/ld\+json">(.*?)</script>#s', $html, $matches);

            $decoded = json_decode($matches[1], associative: true);

            $this->assertNotNull($decoded, "Structured data on route [{$name}] is not valid JSON.");
            $this->assertSame('https://schema.org', $decoded['@context'] ?? null);
        }
    }

    public function test_non_production_pages_are_noindexed(): void
    {
        // The test environment is not `production`, so every page must
        // carry noindex by default (directive §20) without needing a
        // special environment-management system.
        $this->get(route('home'))->assertSee('name="robots" content="noindex, nofollow"', false);
    }

    public function test_production_pages_are_indexable(): void
    {
        app()->instance('env', 'production');

        try {
            $response = $this->get(route('home'));
            $response->assertDontSee('name="robots"', false);
        } finally {
            app()->instance('env', 'testing');
        }
    }

    public function test_sitemap_is_valid_xml_and_contains_only_approved_routes(): void
    {
        $response = $this->get('/sitemap.xml');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/xml');

        $xml = simplexml_load_string($response->getContent());
        $this->assertNotFalse($xml, 'sitemap.xml is not valid XML.');
        $xml->registerXPathNamespace('s', 'http://www.sitemaps.org/schemas/sitemap/0.9');

        $locations = array_map('strval', $xml->xpath('//s:url/s:loc'));

        $this->assertCount(count(self::indexableRoutes()), $locations);

        foreach (self::indexableRoutes() as $name) {
            $this->assertContains(route($name), $locations, "sitemap.xml is missing route [{$name}].");
        }

        foreach ($locations as $location) {
            $this->assertStringNotContainsString('?', $location, 'sitemap.xml must not contain query-string states.');
        }
    }

    public function test_robots_txt_references_the_sitemap_in_production(): void
    {
        app()->instance('env', 'production');

        try {
            $response = $this->get('/robots.txt');
            $response->assertStatus(200);
            $response->assertSee('Sitemap: '.route('sitemap'));
            $response->assertDontSee('Disallow: /');
        } finally {
            app()->instance('env', 'testing');
        }
    }

    public function test_robots_txt_disallows_all_outside_production(): void
    {
        $response = $this->get('/robots.txt');

        $response->assertStatus(200);
        $response->assertSee('Disallow: /');
    }

    public function test_missing_route_returns_a_branded_404(): void
    {
        $response = $this->get('/this-route-does-not-exist');

        $response->assertStatus(404);
        $response->assertSee('File. Set. Go.');
    }

    /**
     * Every footer/nav link resolves to a real, working local route — no
     * dead CTA and no orphan acquisition page (directive §23/§62).
     */
    public function test_internal_navigation_links_all_resolve(): void
    {
        $response = $this->get(route('home'));

        preg_match_all('/href="('.preg_quote(url('/'), '/').'[a-z0-9\-\/]*)"/i', $response->getContent(), $matches);
        $localUrls = array_unique($matches[1]);

        $this->assertNotEmpty($localUrls);

        foreach ($localUrls as $url) {
            $this->get($url)->assertStatus(200);
        }
    }

    /**
     * Acquisition/content pages must not eager-load the processing
     * application bundle — only the homepage, where the tool actually
     * lives, does (directive §43/§44).
     */
    public function test_only_the_homepage_loads_the_processing_application_script(): void
    {
        $scriptPattern = '#<script type="module"[^>]*assets/app-[^"]*\.js#';

        $this->assertMatchesRegularExpression($scriptPattern, $this->get(route('home'))->getContent());

        foreach (array_diff(self::indexableRoutes(), ['home']) as $name) {
            $this->assertDoesNotMatchRegularExpression($scriptPattern, $this->get(route($name))->getContent(), "Route [{$name}] must not eager-load the processing application bundle.");
        }
    }

    public function test_deep_link_mode_query_parameter_does_not_change_the_canonical_url(): void
    {
        $response = $this->get(route('home', ['mode' => 'logo-pack']));

        $response->assertStatus(200);
        $response->assertSee('rel="canonical" href="'.route('home').'"', false);
    }
}
