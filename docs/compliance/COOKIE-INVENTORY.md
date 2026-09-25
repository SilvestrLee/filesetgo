# Cookie and Browser-Storage Inventory

**Directive:** FSG-007H §3
**Method:** Live evidence against production (`https://filesetgo.com`), not inferred from source code alone. Evidence gathered 2026-09-23 via:

- `curl` with a persistent cookie jar across 11 distinct routes (homepage, all 6 acquisition-family routes, `/privacy`, `/terms`, `/sitemap.xml`, `/robots.txt`, and a 404) on a cold cookie jar (no prior cookies sent).
- Direct inspection of `resources/js/theme.ts`, `resources/js/theme/preference.ts`, `bootstrap/app.php`, and `resources/views/layouts/public.blade.php` for every `localStorage`/`sessionStorage`/`IndexedDB`/Cache Storage/`document.cookie` write in the codebase (repository-wide grep, zero matches outside the files named below).
- The existing FSG-006R Playwright suite `tests/browser/specs/network-privacy.spec.ts`, which already asserts (and, per this audit's regression run, still passes — see the production regression report) that no processing workflow writes to `localStorage`, `sessionStorage`, IndexedDB, or Cache Storage.

**Limitation:** live interactive browser verification (DevTools Application-panel inspection, an actual theme-toggle click, a real end-to-end Quick Fit run) was not performed in this pass — the Claude-in-Chrome browser extension was not connected in this environment. The HTTP-level evidence (`Set-Cookie` headers) and the static code audit are complete and cross-checked against each other and against the existing passing Playwright suite, but a live DevTools confirmation is recorded as an open follow-up, not claimed as executed.

## Cookies

| Name | Set by | Trigger | Duration | HttpOnly | Secure | SameSite | JS-readable | Purpose | Classification |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `XSRF-TOKEN` | Laravel (framework, automatic) | Every response, from the first request | `Max-Age=7200` (2h, tied to `SESSION_LIFETIME=120`) | No | Yes | Lax | Yes (by design — read by the frontend and echoed as the `X-XSRF-TOKEN` header) | CSRF protection for same-origin form/state-changing requests | Strictly necessary |
| `file-set-go-session` | Laravel (framework, automatic) | Every response, from the first request | `Max-Age=7200` (2h) | Yes | Yes | Lax | No | Laravel session identifier. `SESSION_DRIVER=database`: the cookie holds only an opaque session ID; the payload lives server-side in the app's own SQLite database, not in the cookie | Strictly necessary |
| `fsg_theme` | `resources/js/theme.ts:56` (client-side JS, never set by the server) | Only when the user explicitly clicks the theme toggle (`applyPreference(..., persist: true)`) — never set on an ordinary page load | `Max-Age=31536000` (1 year) | No (explicitly excluded from cookie encryption in `bootstrap/app.php`: `encryptCookies(except: ['fsg_theme'])`, so the plain `system`/`light`/`dark` value is readable and the server can render the correct theme on the next request without a flash-of-wrong-theme) | Yes, conditionally (`themeCookie()` appends `Secure` only when `window.location.protocol === 'https:'`, which is always true in production) | Lax | Yes (by design) | Appearance preference only (`system`/`light`/`dark`) | Preference / functionality — not strictly necessary, but not tracking |

No other cookie was observed on any of the 11 tested routes, across a cold jar. No Hostinger/CDN-layer cookie, no analytics cookie, and no third-party cookie of any kind is set.

## Browser storage

| Mechanism | Used? | Evidence |
| --- | --- | --- |
| `localStorage` | Yes — one key, `filesetgo-theme` (`resources/js/theme/preference.ts:1`), mirroring the `fsg_theme` cookie. Written only on the same explicit theme-toggle click as the cookie (`theme.ts:51`), read on load as a client-side fallback before the server-rendered value (`theme.ts:16-22`). Never holds file content. | Code audit; `tests/browser/specs/network-privacy.spec.ts` independently asserts `window.localStorage` is `'{}'` after a full upload → process → download cycle (i.e., confirms no *file-content* key is ever written — it does not exercise the theme toggle, so it is not a contradiction). |
| `sessionStorage` | No | Repository-wide grep: zero matches outside test fixtures. |
| IndexedDB | No | Repository-wide grep: zero matches. Independently asserted empty by `network-privacy.spec.ts`. |
| Cache Storage (Service Worker `caches`) | No | Repository-wide grep: zero matches. No Service Worker is registered anywhere in the codebase. Independently asserted empty by `network-privacy.spec.ts`. |
| Blob/Object URLs | Yes, transiently | Used for image previews and downloads during processing (`URL.createObjectURL`), explicitly disclosed on `/privacy` ("Temporary preview and download links use your browser's own Blob/object URLs... released when you reset or leave the page"). Not a persistence mechanism — revoked, not a storage inventory item. |

## Third-party / tracking surface

None. `resources/views/layouts/public.blade.php` (the single public layout every page extends) loads only same-origin CSS/JS via `@vite()`, self-hosted fonts (`instrument-sans-*.woff/woff2`, no Google Fonts or other CDN), and no external `<script src>`, iframe, pixel, or beacon of any kind. This matches the production CSP (`default-src 'self'`, no third-party origin in any directive) and matches `docs/security/PRIVACY-ENGINEERING.md`'s V1 guarantee. Confirmed both by source grep and by the live CSP being enforced (see security report) with zero CSP violations implied by the page's own asset references.

## Classification summary and consent-mechanism conclusion

- **Strictly necessary (no consent required):** `XSRF-TOKEN`, `file-set-go-session`. Both are required for the site's own security (CSRF) and basic operation (session), are first-party, and carry no tracking/advertising purpose.
- **Preference/functionality (`fsg_theme` + its `localStorage` mirror):** set only by an explicit, unambiguous user action (clicking the theme toggle) — never on page load, never by default — and openly disclosed on `/privacy`. It carries no cross-site or tracking capability (first-party, `SameSite=Lax`, readable value is one of three enumerated strings, never an identifier). Many consent frameworks distinguish this category from advertising/analytics cookies and permit a lighter-touch treatment (disclosure rather than a prior opt-in gate) precisely because the cookie only exists as the direct, transparent consequence of the interaction it represents.
- **Analytics/advertising/tracking:** none exist. FSG-007A explicitly excludes analytics from this milestone's scope, and this audit's live evidence confirms no such request, cookie, or script is present anywhere in production today.

**Conclusion (directive §4):** because every non-essential item is a single, disclosed, user-triggered preference cookie with no tracking capability, and there is no analytics/advertising technology to gate, a decorative Accept/Reject consent banner would not "genuinely control" any relevant technology — rejecting it would have nothing to turn off, since the theme cookie is only ever set by the same click a "reject" click would have to compete with. Per directive §4's own guidance, the justified conclusion is a **compact, unobtrusive notice** (the existing `/privacy` disclosure plus the existing footer link, already present on every page) rather than a new banner component. See `PRIVACY-AND-LEGAL-REVIEW.md` for the specific wording corrections recommended to make that existing disclosure fully precise (exact cookie names/durations), and `COMPLIANCE-DECISION-REGISTER.md` for the item recording this as a standing decision available for Product Office to revisit if analytics/advertising is ever introduced (which would change this conclusion).
