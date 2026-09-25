# Privacy and Legal Review

**Directive:** FSG-007H §5
**Scope:** audit of `/privacy` (`resources/views/pages/privacy.blade.php`) and `/terms` (`resources/views/pages/terms.blade.php`) against verified application behavior. Owner-supplied legal facts (operating entity, privacy contact, jurisdiction, retention) were not provided in this pass; per the authorizing Product Office message, they are recorded as open items below and in `COMPLIANCE-DECISION-REGISTER.md`, not guessed or invented. No publication of these pages as "final" is claimed.

## What FileSetGo actually does with data (verified)

- **Route table is exhaustive and entirely `GET`** (`routes/web.php`): homepage, 6 acquisition pages, `/privacy`, `/terms`, `/sitemap.xml`, `/robots.txt`. There is no form submission, no login/account, no API endpoint, no file upload endpoint anywhere in the application. This was confirmed by reading the complete route file, not inferred.
- **Image processing is genuinely browser-local.** `docs/security/PRIVACY-ENGINEERING.md` and `docs/security/SECURITY.md`'s "FSG-006 Browser-Level Re-confirmation" describe this, and it is independently re-verified at the network level by the passing `tests/browser/specs/network-privacy.spec.ts` suite (see the regression report) across Quick Fit, Guided Fit, Logo Pack (original and transparent), and HEIC decode — no upload request of any kind is produced by any processing path.
- **The only data any visitor's browser exchanges with FileSetGo's server** is: the HTTP request itself (ordinary web/CDN request logging, outside the application's control — see "Hosting and CDN logs" below), the two strictly-necessary cookies, and — only if the visitor clicks the theme toggle — the `fsg_theme` preference. See `COOKIE-INVENTORY.md` for the complete, evidence-based inventory.
- **No email is sent or received by the application today.** Production `.env` (verified via SSH, values only, no secrets reproduced) has `MAIL_MAILER=log` and a placeholder `MAIL_FROM_ADDRESS="hello@example.com"` — i.e. there is currently no functioning contact channel wired into the product itself. Any privacy/legal contact must currently be a real address the owner supplies and configures; the application does not have one today.
- **No account system, no server-side file retention, no analytics, no advertising, no third-party script of any kind** (confirmed by CSP + layout source audit in the security report and cookie inventory).

## Hosting and CDN logs (owner/infrastructure fact, partially verified)

Production is served through Hostinger's `hcdn` edge in front of the Laravel application (confirmed via live response headers: `server: hcdn`, `platform: hostinger`, `panel: hpanel`). This means:

- Ordinary access/request logging happens at (at least) two layers: the Hostinger/`hcdn` edge, and potentially the origin web server.
- I could not find a **filesetgo.com-specific PHP/application error log** on the production server at all (the shared account's `~/.logs/` directory contains per-domain `error_log_<domain>` files for numerous *other, unrelated* customer domains on this same reseller hosting account, but none named for filesetgo.com — consistent with `APP_DEBUG=false`/`LOG_LEVEL=warning` and a currently error-free application, not a missing log). I did not open or read any of those other domains' files; they belong to unrelated third-party sites sharing this hosting account and are out of this audit's authorization.
- **Retention period and IP-handling policy for Hostinger's own edge/CDN access logs are not visible from SSH** — they are an hPanel/Hostinger-account-level policy, not something this application controls or that filesystem access exposes. This is recorded as an open item below.

## Section-by-section accuracy review

### `/privacy` (current content is honest but incomplete against the directive's checklist)

**Already accurate and should be kept:**
- Correctly states image processing happens locally and is not uploaded — verified true.
- Correctly states no account/file storage exists — verified true.
- Correctly states Blob/object URLs are used for preview/download and are released — matches code.
- Correctly discloses "a basic session cookie" and "a one-year color-theme preference cookie" and states neither is for tracking/advertising — verified true and consistent with `COOKIE-INVENTORY.md`.
- Correctly states no analytics/advertising runs today — verified true.

**Gaps against directive §5's checklist (recommended additions, not yet made — see decision register):**
1. No verified operating entity or privacy contact is named anywhere on the page. `/terms` already handles this honestly ("FileSetGo's legal entity and jurisdiction details are not yet finalized and are intentionally omitted from this page rather than invented") — `/privacy` should carry the equivalent honest placeholder rather than being silent on the question, since a privacy policy conventionally names a controller and a contact route for rights requests even when minimal data is processed.
2. The cookie paragraph names the two/three cookies generically ("a basic session cookie," "a one-year color-theme preference cookie") but not by exact name, and does not mention the CSRF cookie (`XSRF-TOKEN`) separately from the session cookie. `COOKIE-INVENTORY.md` now provides the exact, precise table this paragraph can be strengthened to reference.
3. No mention of hosting/CDN-layer request logging as a distinct item from "the site's web server" — Hostinger's `hcdn` edge is a named infrastructure fact worth being explicit about once retention is confirmed (open item).
4. No user-rights/complaints section (access, deletion, complaint-to-authority) — reasonable to keep minimal given how little is processed, but the applicable lawful basis and rights framework depend on the still-unknown jurisdiction (open item).
5. No "policy updates" statement (how changes will be communicated) — the current text ("If that changes, this page will be updated to reflect it truthfully before it happens") partially covers this for the analytics case specifically, but not as a general policy-versioning statement.

### `/terms`

Already the more legally cautious of the two pages — it explicitly and correctly declines to invent an operating entity or jurisdiction, and scopes the substantive terms (user responsibility for rights to the image, review-before-use guidance for background removal, honest target-size limitations, as-is availability) accurately against verified product behavior (FSG-002 target-size unreachable-target handling, FSG-005C transparent-master review flagging). No correction is needed to what it currently says; the same operator/jurisdiction placeholder pattern it already uses is the recommended model for `/privacy`.

## Outstanding legal questions for Product Office

These are the items directive §5 explicitly reserves as owner-supplied facts. None have been guessed, and none are published as final:

1. **Verified legal operator** (entity name, and whether it is an individual/sole trader or a registered company) — currently absent from both pages; `/terms` already flags this honestly.
2. **Public privacy/legal contact** (a real, monitored address or form) — currently, `.env`'s `MAIL_MAILER=log` and placeholder `MAIL_FROM_ADDRESS` confirm no functioning contact channel exists at all; one is needed before either page can name a contact.
3. **Applicable jurisdiction** — determines which rights/lawful-basis framework (e.g. UK/EU GDPR, US state law, other) governs the "user rights, requests and complaints" section directive §5 requires.
4. **Retention** — for the minimal data that does exist (session data in the app's own SQLite database, Hostinger/`hcdn` edge request logs), the application-level retention is already effectively bounded (`SESSION_LIFETIME=120` minutes, and session/cache rows are routine Laravel operational data, not user content — see the monitoring/recovery report for why this was assessed as not needing dedicated backup). The **edge/CDN log retention** is an infrastructure fact owned by the hPanel account, not visible from SSH, and should be confirmed by the owner directly in hPanel (or by contacting Hostinger support) rather than assumed.
5. **International-transfer / sub-processor disclosure** — depends on (3) and on where Hostinger's serving infrastructure is physically located for this account; not independently verifiable from this environment.

**Applied:** `/privacy`'s cookie paragraph was corrected to name the exact cookies (`file-set-go-session`, `XSRF-TOKEN`, `fsg_theme`) with accurate durations, matching `COOKIE-INVENTORY.md` above, and an honest operator/contact/jurisdiction placeholder (matching `/terms`'s existing pattern, linking to it) was added. This is a **repository-only content change** — `resources/views/pages/privacy.blade.php` — re-verified against the full PHPUnit suite (38/38 still passing) and Pint. It has not been deployed to production; deployment is gated behind Product Office review per the directive's stop condition.
