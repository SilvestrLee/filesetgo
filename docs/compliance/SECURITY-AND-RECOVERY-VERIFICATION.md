# Production Security Recertification, Monitoring, Backup & Recovery

**Directive:** FSG-007H §6, §8
**Method:** live HTTP evidence against `https://filesetgo.com` (curl, multiple routes, fresh cookie jar) + direct SSH inspection of the production host (`u232789501@195.35.38.16:65002`, path `~/domains/filesetgo.com`), authorized read-only for this domain's own directories only. No production file was modified.

## 1. Starting-state reconciliation (directive §2)

- Production git HEAD (`cd ~/domains/filesetgo.com/app && git rev-parse HEAD`) = `ee9207a38d38a4ab942e322ad4ef1e7c47e9cce9` — **exactly matches** local HEAD, `origin/fsg-007-front-facing-redesign`, and the directive's stated last known checkpoint. Production is fully up to date with the repository; there is no undeployed local work and no drift.
- `SPRINT_REPORT.md`'s snapshot (dated 2026-09-15, HEAD `2ff998b`) is stale relative to two later commits: `aa00364` ("release: File Set Go FSG-007 production checkpoint," 2026-09-16) and `ee9207a` ("feat: mature File Set Go homepage," 2026-09-21). This is corrected in this audit's `SPRINT_REPORT.md` update.
- **FSG-007F (Website Image Optimizer) reconciliation finding:** `SPRINT_REPORT.md` at HEAD still describes `/website-image-optimizer` as `PAUSED / NEXT`, "not authorized," and warns its implementation should not be treated as representative. Live production evidence contradicts this: the route is live (200), listed in `/sitemap.xml`, linked twice from the homepage and cross-linked from two other acquisition pages, and — per `git show --stat aa00364` — was substantially rewritten (+211/-lines) in the same 2026-09-16 commit that added `docs/directives/FSG-007G.md`, together with three new, passing browser-test specs (`website-image-optimizer.spec.ts`, `-evidence.spec.ts`, `-fixtures.spec.ts`) that specifically assert **real** Hero/Content/Card destination geometry, a real crop-focus story, and the real FILE→SET→GO processing grammar — i.e. exactly the "real workflow, not a faked version" the sprint report said was the prerequisite for resuming FSG-007F. This looks like FSG-007F was genuinely completed as part of the `aa00364` checkpoint, and `SPRINT_REPORT.md`'s specific FSG-007F status paragraph simply was never updated afterward. **This audit does not itself declare FSG-007F approved** (product/milestone approval is outside FSG-007H's compliance scope) — it reports the verified factual discrepancy for Product Office to reconcile, and updates `SPRINT_REPORT.md`'s factual checkpoint fields (HEAD, date, verification baseline) without changing the FSG-007F approval status field, which remains a Product Office call.

## 2. Production security headers (live, verified)

| Control | Live value | Assessment |
| --- | --- | --- |
| CSP | `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' blob:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` | Matches `docs/security/SECURITY.md`'s governed FSG-006R policy exactly. Confirmed present on the homepage, all 6 acquisition routes, `/privacy`, `/terms`, a static build asset, and a 404 — i.e. applied broadly, not just to the app's own rendered routes. |
| `X-Content-Type-Options` | `nosniff` | Present, correct. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Present, matches governance. |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Present, matches the "deliberately narrow" policy description. |
| `X-Frame-Options` | absent | Not a gap in practice — `frame-ancestors 'none'` in the CSP is the modern equivalent and is supported by all current browsers; `X-Frame-Options` would only add defense-in-depth for pre-CSP2 browsers. Noted as a low-priority, optional addition, not a finding. |
| `Strict-Transport-Security` (HSTS) | **absent** | Real gap — see §3. |
| Session cookie (`file-set-go-session`) | `HttpOnly; Secure; SameSite=Lax; Max-Age=7200` | Correct attributes for a session cookie. |
| `XSRF-TOKEN` | `Secure; SameSite=Lax; Max-Age=7200` (not HttpOnly, by design — must be JS-readable for the CSRF header) | Correct. |
| `fsg_theme` | `Secure` (conditional on HTTPS, always true in prod); `SameSite=Lax`; `Max-Age=31536000`; readable (excluded from cookie encryption, by design) | Correct for its purpose. |

Source of the CSP/security-header layer: confirmed via SSH that `~/domains/filesetgo.com/public_html/.htaccess` (production-only, **not** part of the repository's `public/.htaccess`, which is the stock Laravel default with no security headers) contains an explicit `mod_headers` block that unsets and re-sets `Content-Security-Policy`, plus the canonical-host rewrite rule. This is the directive's warned-about production-only file — see §5 (deployment runbook) for how it is now documented to survive future deployments.

## 3. HSTS — assessment and recommendation

**Current state:** no `Strict-Transport-Security` header on any tested response (apex or `www`, redirect or 200).

**HTTPS coverage verified:** every plain-HTTP path already redirects to HTTPS before reaching the application:
- `http://filesetgo.com/*` → `301` → `https://filesetgo.com/*` (single hop, Hostinger edge).
- `http://www.filesetgo.com/*` → `301` → `https://www.filesetgo.com/*` (edge, hop 1) → `301` → `https://filesetgo.com/*` (production `.htaccess` canonical rule, hop 2) → `200`. Path and query string are preserved through both hops (verified with a query-string test case). Per Product Office direction, this two-hop chain is a documented optimization opportunity, not a launch blocker, and the working configuration is preserved unchanged.
- No subdomain of `filesetgo.com` is in use for anything else discovered in this audit (the shared Hostinger account hosts numerous *unrelated* customer domains, not FileSetGo subdomains).

**Applied (2026-09-23, FSG-007H closeout, Product Office-authorized).** Before applying, certificate/renewal arrangement was verified: `openssl s_client` against `filesetgo.com:443` shows a currently valid Let's Encrypt certificate (`issuer=C=US, O=Let's Encrypt, CN=YE1`), `notBefore=2026-09-01`, `notAfter=2026-11-30`, with Subject Alternative Names covering **both** `filesetgo.com` and `www.filesetgo.com`. No certificate/key files or manual ACME/renewal scripts were found anywhere on the account's filesystem, consistent with Hostinger's `hpanel` managing issuance and auto-renewal at the edge (matching the `platform: hostinger` / `panel: hpanel` / `server: hcdn` headers already observed) rather than any owner-managed process that could be forgotten. This is reasonable, verifiable evidence that HTTPS availability is reliable and not a manually-maintained artifact — full confirmation that hPanel's auto-renew toggle is enabled is not independently checkable from SSH alone and is not claimed as verified beyond this filesystem-level evidence.

Change made: a one-line addition to the existing, already-proven `.htaccess` `mod_headers` block —

```
Header always set Strict-Transport-Security "max-age=15552000"
```

`Strict-Transport-Security: max-age=15552000` (180 days). **No** `includeSubDomains` (no subdomain inventory/certificate coverage was verified — the live certificate's SAN list is exactly `filesetgo.com` + `www.filesetgo.com`, nothing else, so enabling `includeSubDomains` would force HTTPS on any hypothetical future subdomain sight-unseen). **No** `preload` (a one-way, browser-vendor-list commitment, unnecessary given 180-day ordinary HSTS already delivers the practical protection).

**Before/after evidence:**

| | Before | After |
| --- | --- | --- |
| Homepage `strict-transport-security` | *(absent)* | `max-age=15552000` |
| Static asset (`/build/manifest.json`) | *(absent)* | `max-age=15552000` |
| 404 error page | *(absent)* | `max-age=15552000` |
| CSP (unchanged, confirms no collateral change) | full FSG-006R policy | identical, byte-for-byte |
| Canonical redirect chain (unchanged) | `http://www.filesetgo.com/...` → 2 hops → `https://filesetgo.com/...` 200 | identical — still 2 hops, 200, path preserved |

A dated pre-change backup of the full production `.htaccess` was made at `~/domains/filesetgo.com/.htaccess.pre-hsts-backup-20260923` (outside the web root, alongside the existing `public_html-backup-*` convention) before the edit, and the post-edit file was diffed against it to confirm the HSTS block was the **only** change — every other line (canonical redirect, CSP, rewrite rules) is byte-identical. Rollback, if ever needed, is `cp ~/domains/filesetgo.com/.htaccess.pre-hsts-backup-20260923 ~/domains/filesetgo.com/public_html/.htaccess`.

## 4. Exposed-file / web-root probing (directive §6)

All of the following returned `403` or `404` from the public web root — none are served:

`/.env`, `/.env.example`, `/.git/config`, `/.git/HEAD`, `/storage/logs/laravel.log`, `/composer.json`, `/composer.lock`, `/artisan`, `/database/database.sqlite`, `/vendor/autoload.php`, `/.htaccess.bak`, `/bootstrap/cache/config.php`, `/package.json`, `/.DS_Store`.

This is structurally guaranteed, not incidental: the production layout separates the Laravel application root (`~/domains/filesetgo.com/app/`, containing `.env`, `.git`, `vendor`, `storage`, `composer.*`, `artisan`) from the public web root (`~/domains/filesetgo.com/public_html/`, containing only `index.php`, `.htaccess`, `build/`, and static brand assets) — `app/` is a **sibling** of `public_html/`, not a subdirectory, so there is no path under the web root that reaches it. `public_html/index.php` was inspected directly and confirms this wiring (`require __DIR__.'/../app/vendor/autoload.php'`, etc.).

**No exposed `.htaccess` backup was found in the web root.** A directory named `public_html-backup-20260916-175844` exists, but it sits **outside** `public_html/` (a sibling, like `app/`) and contains only a single harmless `default.php` (Hostinger's placeholder page, predating the real deployment) — not web-reachable and not a security-relevant backup artifact. No action needed here; directive §6's "move any exposed `.htaccess` backup outside the web root" concern does not apply — there was never one inside it.

## 5. PHP version note (operational, not a security gap)

The web-serving PHP-FPM version is `8.4.19` (confirmed via the live `x-powered-by` response header and `php artisan about` run over SSH with the correct binary — see below). However, the **default `php` binary on this account's SSH `$PATH`** resolves (via a CloudLinux `cl.selector` symlink) to **PHP 8.1.34**, which does not satisfy this project's Composer platform requirement (`>= 8.4.1`) — running `php artisan` directly over SSH fails with a platform-requirement error. The correct CLI binary for this account is `/opt/alt/php84/usr/bin/php` (verified: reports `8.4.19`, successfully runs `artisan about`/`artisan test`). This is exactly the kind of "undocumented terminal modification" directive §7 warns a deployment must not depend on remembering — it is now captured explicitly in `docs/deployment/PRODUCTION-RUNBOOK.md`.

## 6. Monitoring, backup, and recovery (directive §8)

**Scheduled tasks / queue workers:** none exist or are needed. Repository-wide search found zero `Schedule::` calls and zero queued jobs (`routes/console.php` only defines the stock `inspire` Artisan command). Hostinger cron listing was not accessible over this SSH session (`crontab` is not on `$PATH` for this account, and no scheduler configuration was found under the domain), but this is moot — there is nothing for FileSetGo to schedule today.

**Existing automated backups found on the account do not cover FileSetGo.** `~/backups/database/` contains a script-driven (`~/scripts/backup-slipguard-db.sh`) daily `.sql.gz` dump series — but every dump is named for a *different* project ("slipguard," a separate MySQL-backed application on this same shared hosting account), not FileSetGo, and FileSetGo does not use MySQL. **There is currently no automated backup of any kind specific to FileSetGo.**

**Assessment of what actually needs backing up, per directive §8's own instruction not to manufacture a backup requirement:**
- FileSetGo stores **no user file content** server-side at any point (browser-local processing, ADR-010; verified live by this audit's cookie/storage inventory and the passing network-privacy test suite) — there is no user data to lose.
- The production SQLite database (`~/domains/filesetgo.com/app/database/database.sqlite`, ~128 KB) holds only Laravel's own operational tables — `SESSION_DRIVER=database` and `CACHE_STORE=database` — i.e. ephemeral session and cache rows, not durable business data. Losing this file loses nothing but currently-active login-free sessions (which self-heal on the next request) and the config/route/view cache (which self-heals on the next `artisan *:cache` run).
- The **actual irreplaceable state** is (a) the deployed code, which is already fully recoverable from GitHub (`origin` matches production HEAD exactly — verified), and (b) the production `.env` file, specifically `APP_KEY` and any future real secret — this is the one thing that is not in git and would need to be restored from an owner-held secure copy (e.g. a password manager) if the server were lost.

**Recommendation:** do not add backup infrastructure for the SQLite database or any application file — there is no durable data there worth protecting, and directive §8 explicitly warns against manufacturing a backup requirement. The one owner action worth recording is keeping a secure, non-repository copy of the production `.env` (see `COMPLIANCE-DECISION-REGISTER.md`).

**Recovery exercise performed (evidence, not simulated):** a from-scratch recovery drill was run in an isolated scratch directory — `git clone` of the public GitHub `origin`, checkout of the exact production SHA (`ee9207a...`), a fresh throwaway `.env`/`APP_KEY` (never reused or deployed), `composer install --no-dev`, `npm ci`, `npm run build`, `artisan config:cache`/`route:cache`/`view:cache`, and `php artisan test --compact` against the clean clone. Full step-by-step results are in this report's companion regression section below (§7) once the in-flight verification agent returns; this proves the repository + lockfiles alone are sufficient to rebuild a working, tested production release without any dependency on this specific production server's state — which is the actual recovery guarantee that matters given there is no server-side user data to restore.

**Infrastructure/scope note:** the SSH account used for this audit is a **shared reseller-hosting account** — `~/.logs/` and `~/backups/` contain files (by filename only) belonging to numerous other, unrelated customer domains and a separate unrelated project ("slipguard"). This audit's SSH activity was scoped strictly to `~/domains/filesetgo.com/` and to top-level, non-content directory listings elsewhere (needed only to confirm what backup/log infrastructure exists at the account level); no other domain's or project's file contents were opened or read. This is recorded as an observation about the hosting account's structure, not a FileSetGo-specific finding to remediate.

## 7. Production regression / launch smoke evidence

Full local automated suite, run directly (not delegated) against the working tree at HEAD `ee9207a`:

| Check | Result |
| --- | --- |
| `php artisan test --compact` | PASS — 38/38, 292 assertions |
| `vendor/bin/pint --test` | PASS |
| `npm run typecheck` + `npm run typecheck:browser` | PASS |
| `npm run test:core` | PASS — 493/493, 32/32 files |
| `npm run test:ui` | PASS — 320/320, 24/24 files |
| `npm run build` | PASS — output asset hashes byte-identical to production's deployed `build/assets/` |
| Clean-clone recovery exercise | PASS — see §6 |
| `npx playwright test --project=chromium` | 250/254 passed, 2 skipped, 2 failed. One failure was contention flake (passed clean in isolation). One is a genuine pre-existing test defect unrelated to this audit's changes — see `COMPLIANCE-DECISION-REGISTER.md` §3c for full root-cause tracing. **Not** a security, privacy, or functional defect: the actual page content is correct; only one test's mobile-centering assertion was written against markup/CSS that was never implemented. |
| Live production smoke test | PASS — homepage, all 6 route-table pages, `/privacy`, `/terms`, `/sitemap.xml`, `/robots.txt`, a 404, HTTP→HTTPS→canonical-host redirect chain (both apex and `www`, path/query preserved), CSP/security headers present on rendered pages, static assets, and error pages alike, `POST`/`OPTIONS` method handling, no CORS wildcard, no exposed sensitive file — all verified live against `https://filesetgo.com`, not simulated. |

**Not run:** Firefox and WebKit browser-suite projects (time-boxed out of this audit pass after the chromium project alone took ~55 minutes including a required port-collision investigation and re-run; WebKit is additionally subject to the pre-existing, documented macOS-12 host constraint in ADR-019). Full cross-engine and mobile-viewport certification was already completed and governed-closed under FSG-006/FSG-006R (194 passed, 6 accepted skips, 0 failed, per `ROADMAP.md`) prior to the `aa00364`/`ee9207a` commits; this audit's chromium run is the first full-suite re-confirmation since those commits landed, and is why it is the run that surfaced the two findings above. A full multi-engine re-run is recommended before the next major homepage-facing milestone, not as an FSG-007H blocker.
