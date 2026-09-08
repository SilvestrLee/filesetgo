<?php

namespace App\Http\Controllers;

use App\Support\PublicPages;
use Illuminate\Http\Response;

/**
 * Deterministic sitemap.xml and robots.txt for FSG-007's curated public
 * surfaces (directive §18–§20). Both are generated from the same
 * `PublicPages::indexableRouteNames()` list the nav/footer read from, so
 * the sitemap can never silently drift out of sync with the real routes.
 */
class SeoController extends Controller
{
    public function sitemap(): Response
    {
        $entries = collect(PublicPages::indexableRouteNames())
            ->map(fn (string $name) => '    <url><loc>'.e(route($name)).'</loc></url>')
            ->implode("\n");

        $xml = <<<XML
        <?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        {$entries}
        </urlset>
        XML;

        return response($xml, 200)->header('Content-Type', 'application/xml');
    }

    public function robots(): Response
    {
        if (! app()->environment('production')) {
            return response("User-agent: *\nDisallow: /\n", 200)->header('Content-Type', 'text/plain');
        }

        $sitemap = route('sitemap');

        return response("User-agent: *\nAllow: /\nSitemap: {$sitemap}\n", 200)->header('Content-Type', 'text/plain');
    }
}
