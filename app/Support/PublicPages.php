<?php

namespace App\Support;

/**
 * Single source of truth for FileSetGo's curated public/acquisition
 * surfaces (FSG-007 directive §6, §18, §23, §25, §60–§62).
 *
 * Navigation, the footer, the sitemap, and the internal-link/indexability
 * tests all read from this list instead of each hard-coding their own copy
 * of the route set — so an added, removed, or renamed page cannot silently
 * drift out of sync between the sitemap, the footer, and the nav.
 */
final class PublicPages
{
    /**
     * The curated, indexable public route names, in sitemap priority order.
     * Every entry here must resolve via `route()` and correspond to a real,
     * working page (directive §61/§62 — no orphan or dead entry).
     *
     * @return array<int, string>
     */
    public static function indexableRouteNames(): array
    {
        return [
            'home',
            'prepare-logo',
            'transparent-logo',
            'favicon-generator',
            'website-image-optimizer',
            'compress-image',
            'convert-webp',
            'privacy',
            'terms',
        ];
    }

    /**
     * The "website tasks" acquisition pages, for the nav dropdown and the
     * footer's task column. Deliberately excludes home/privacy/terms, which
     * are surfaced elsewhere in the same shell (directive §24/§25).
     *
     * @return array<int, array{href: string, label: string, hint: string}>
     */
    public static function taskLinks(): array
    {
        return [
            ['href' => route('prepare-logo'), 'label' => 'Prepare a logo', 'hint' => 'One source, seven website files'],
            ['href' => route('transparent-logo'), 'label' => 'Transparent logo', 'hint' => 'Review it on light and dark'],
            ['href' => route('favicon-generator'), 'label' => 'Create a favicon', 'hint' => 'Included in the Logo Pack'],
            ['href' => route('website-image-optimizer'), 'label' => 'Optimize an image', 'hint' => 'Choose hero, content or card'],
            ['href' => route('compress-image'), 'label' => 'Meet a size limit', 'hint' => 'Enter the KB or MB target'],
            ['href' => route('convert-webp'), 'label' => 'Convert to WebP', 'hint' => 'Prepare a modern web format'],
        ];
    }
}
