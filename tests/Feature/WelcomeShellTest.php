<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class WelcomeShellTest extends TestCase
{
    /**
     * The public Quick Fit shell renders successfully (FSG-003 directive §68 item 1).
     */
    public function test_the_public_shell_returns_a_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertStatus(200);
    }

    /**
     * The public shell carries the FileSetGo brand identity, not the FSG-001
     * engineering-proof interface it replaces.
     */
    public function test_the_public_shell_presents_the_filesetgo_brand(): void
    {
        $response = $this->get('/');

        $response->assertSee('File. Set. Go.');
        $response->assertSee('Get your file ready for where it needs to go.');
    }

    /**
     * Quick Fit is immediately discoverable on the public shell (FSG-003 directive §68 item 2).
     */
    public function test_the_public_shell_presents_the_quick_fit_workspace(): void
    {
        $response = $this->get('/');

        $response->assertSee('id="quick-fit"', false);
        $response->assertSee('id="source-file"', false);
        $response->assertSee('Get file ready');
    }

    /**
     * FileSetGo processes images locally in the browser — no upload or
     * conversion endpoint may exist on the server (FSG-003 directive §31/§68 item 24;
     * FSG-004 directive §54 confirms this still holds after Guided Fit).
     */
    public function test_no_upload_or_conversion_route_exists(): void
    {
        $paths = collect(Route::getRoutes())->map(fn ($route) => $route->uri());

        $suspicious = $paths->first(fn (string $uri) => preg_match('/upload|convert|process/i', $uri) === 1);

        $this->assertNull($suspicious, "Found an unexpected upload/conversion route: {$suspicious}");
    }

    /**
     * No dynamic preset API route exists — presets ship with the application
     * (FSG-004 directive §38/§54).
     */
    public function test_no_dynamic_preset_route_exists(): void
    {
        $paths = collect(Route::getRoutes())->map(fn ($route) => $route->uri());

        $suspicious = $paths->first(fn (string $uri) => preg_match('/preset/i', $uri) === 1);

        $this->assertNull($suspicious, "Found an unexpected preset route: {$suspicious}");
    }

    /**
     * Guided Fit is present as a first-class entry point alongside Quick Fit
     * (FSG-004 directive §15/§54), and the three initial preset choices are
     * represented in the rendered shell.
     */
    public function test_the_public_shell_presents_guided_fit_and_its_initial_presets(): void
    {
        $response = $this->get('/');

        $response->assertSee('id="mode-tab-quick-fit"', false);
        $response->assertSee('id="mode-tab-guided-fit"', false);
        $response->assertSee('Guided Fit');
        $response->assertSee('id="guided-fit-panel"', false);
        $response->assertSee('data-preset-id="web.hero"', false);
        $response->assertSee('data-preset-id="web.content"', false);
        $response->assertSee('data-preset-id="web.card"', false);
    }

    /**
     * Website Logo Pack is present as a third first-class product mode
     * (FSG-005B directive §7).
     */
    public function test_the_public_shell_presents_the_logo_pack_workspace(): void
    {
        $response = $this->get('/');

        $response->assertSee('id="mode-tab-logo-pack"', false);
        $response->assertSee('Logo Pack');
        $response->assertSee('id="logo-pack-panel"', false);
        $response->assertSee('Create logo pack');
    }

    /**
     * No ZIP endpoint, favicon-generation endpoint, or Logo Pack upload
     * route exists — packaging remains entirely local to the browser
     * (FSG-005B directive §35/§64/§70).
     */
    public function test_no_zip_or_favicon_generation_route_exists(): void
    {
        $paths = collect(Route::getRoutes())->map(fn ($route) => $route->uri());

        $suspicious = $paths->first(fn (string $uri) => preg_match('/zip|favicon|logo-pack|package/i', $uri) === 1);

        $this->assertNull($suspicious, "Found an unexpected packaging route: {$suspicious}");
    }
}
