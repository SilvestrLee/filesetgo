<?php

namespace Tests\Feature;

use Tests\TestCase;

class SecurityHeadersTest extends TestCase
{
    public function test_the_application_emits_the_governed_production_security_headers(): void
    {
        $response = $this->get('/');

        // `style-src` carries a fresh, unguessable per-request nonce (FSG-007
        // closeout §3 — `@fonts()`'s self-hosted Instrument Sans `@font-face`
        // rules are the one legitimate inline `<style>` block, tagged via
        // `Vite::useCspNonce()` rather than a blanket `'unsafe-inline'`), so
        // the header can no longer be asserted as one fixed string.
        $csp = $response->headers->get('Content-Security-Policy');

        $response
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
            ->assertHeaderMissing('Strict-Transport-Security')
            ->assertHeaderMissing('X-XSS-Protection');

        $this->assertMatchesRegularExpression(
            "/^default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'nonce-[A-Za-z0-9\/+=]{16,}'; img-src 'self' blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'$/",
            $csp,
        );
        $this->assertStringNotContainsString('unsafe-inline', $csp);
    }
}
