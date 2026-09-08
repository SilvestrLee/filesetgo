<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Foundation\Vite;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Browser security headers for the production asset build (FSG-006R,
 * ADR-023).
 *
 * The CSP is built from FileSetGo's actual, measured resource
 * requirements (directive §18), not copied from the external audit's
 * generic sample policy:
 *
 * - `script-src 'self' 'wasm-unsafe-eval'` — application and lazy chunks
 *   are same-origin. The narrow WASM keyword permits the HEIC adapter's
 *   explicit `WebAssembly.compile()`; `'unsafe-eval'` is not allowed.
 * - `style-src 'self'` — Tailwind ships as a built stylesheet; no
 *   inline `<style>` tag or `style=` attribute is used anywhere in the
 *   product surface.
 * - `img-src 'self' blob:` — Logo Pack/transparent-preview `<img>` tags
 *   render from `URL.createObjectURL()` Blob URLs.
 * - `connect-src 'self'` — the only `fetch()` in the product is the
 *   same-origin HEIC WASM asset fetch.
 * - `worker-src 'self'` — the Vite-built module worker.
 * - `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'` —
 *   nothing in FileSetGo uses plugins, a `<base>` tag, or expects to be
 *   framed.
 *
 * Vite's HMR client is development tooling with different WebSocket and
 * injected-style requirements. CSP is therefore applied to built assets,
 * not synthesized dynamically for a changing dev-server origin.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        if (! app(Vite::class)->isRunningHot()) {
            $response->headers->set('Content-Security-Policy', implode('; ', [
                "default-src 'self'",
                "script-src 'self' 'wasm-unsafe-eval'",
                "style-src 'self'",
                "img-src 'self' blob:",
                "font-src 'self'",
                "connect-src 'self'",
                "worker-src 'self'",
                "object-src 'none'",
                "base-uri 'none'",
                "form-action 'self'",
                "frame-ancestors 'none'",
            ]));
        }
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        // HSTS remains an HTTPS edge/hosting responsibility because this
        // application does not own TLS termination. See docs/security/SECURITY.md.

        return $response;
    }
}
