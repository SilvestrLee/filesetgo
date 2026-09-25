# Production Deployment Runbook — Hostinger

**Directive:** FSG-007H §7
**Audience:** whoever performs the next production deployment (human or agent). Every fact below was verified directly against the live production account (`u232789501@195.35.38.16:65002`) during the FSG-007H audit (2026-09-23), not assumed from `docs/architecture/DEPLOYMENT.md`'s generic engineering-readiness description. This file supersedes that document for anything Hostinger-account-specific; `docs/architecture/DEPLOYMENT.md` remains correct for the environment-agnostic build/verify steps.

## 1. Production topology (verified)

```
~/domains/filesetgo.com/
├── app/            ← Laravel application root (this repo, checked out at a specific commit)
│   ├── .env        ← production secrets, NOT in git, NOT under public_html
│   ├── vendor/, node_modules-free (build output only ships compiled assets)
│   ├── database/database.sqlite
│   └── storage/, bootstrap/cache/
└── public_html/    ← the actual HTTP document root (sibling of app/, not a subdirectory)
    ├── index.php   ← custom-wired: require __DIR__.'/../app/vendor/autoload.php' etc.
    ├── .htaccess   ← PRODUCTION-ONLY: canonical-host redirect + CSP header block (§3)
    ├── build/      ← Vite output (npm run build), copied/synced here from app/public/build
    └── favicon*.ico/png, apple-touch-icon.png, og-image.png, brand/
```

`app/` and `public_html/` are **siblings** under `~/domains/filesetgo.com/`, not parent/child. This is what makes `.env`, `.git`, `vendor/`, `storage/`, and `composer.*` unreachable from the web (verified — see the security report's exposed-file probing, all `403`/`404`).

## 2. Required PHP binary (do not use the default `php`)

The account's default `php` on `$PATH` resolves through a CloudLinux `cl.selector` symlink to **PHP 8.1.34**, which fails this project's Composer platform requirement (`>= 8.4.1`). The web-serving PHP-FPM (confirmed via the live `x-powered-by` header) is **8.4.19**. The matching CLI binary, verified working (`artisan about`, `artisan test --compact` both ran successfully), is:

```
/opt/alt/php84/usr/bin/php
```

**Every `php`/`artisan`/`composer` command in this runbook must use this binary explicitly** (e.g. `/opt/alt/php84/usr/bin/php artisan ...`, or `/opt/alt/php84/usr/bin/php /usr/local/bin/composer ...` if the account's `composer` wrapper itself needs pinning — verify with `composer --version` after cd'ing into `app/`). Do not rely on remembering this interactively; script it.

## 3. Files that must survive every deployment unchanged (directive §7)

Two files exist **only in production**, are **not part of this git repository**, and must never be overwritten by a routine file sync/deploy:

1. **`public_html/.htaccess`** — contains the standard Laravel rewrite rules (present in the repo's `public/.htaccess` too) **plus** a production-only block:
   - The canonical-host redirect: `RewriteCond %{HTTP_HOST} ^www\.filesetgo\.com$ [NC]` → `RewriteRule ^ https://filesetgo.com%{REQUEST_URI} [R=301,L,NE]`.
   - A `mod_headers` block that force-unsets and re-sets `Content-Security-Policy` to the governed FSG-006R policy, because Hostinger's edge otherwise replaces it with a bare `upgrade-insecure-requests`.

   A dated reference copy of the exact current production `.htaccess` content is preserved in this runbook's git history (this section) specifically so a future deploy can diff against it rather than rely on memory. **Before any deploy that touches `public_html/`, diff the live file against this reference; if they differ, reconcile deliberately, never overwrite blindly.**

2. **`public_html/index.php`** — the standard Laravel front controller, with paths already correctly adjusted for the `app/`+`public_html/` sibling split (see §1). This is a stock Laravel file that happens to need this specific relative-path wiring; a routine `public/index.php` copy from a fresh `npm run build`/deploy artifact **would work identically** here since the repo's own `public/index.php` was written for exactly this deployment shape — but confirm this each time by checking that the two `require __DIR__.'/../...'` paths still point at `app/vendor` and `app/bootstrap`, not `../vendor`/`../bootstrap`, in case a future refactor changes the split.

3. **`.well-known/`** — directive §7 asks this to be explicitly protected. No `.well-known/` directory currently exists under `public_html/` (none was found in this audit). If one is added in future (TLS validation, domain verification, etc.), it must be preserved the same way as the two files above — do not let a deploy sync delete or overwrite it.

## 4. Deployment procedure

1. **Note the exact release SHA** being deployed (`git rev-parse HEAD` on the machine building the release). Record it — the last verified-matching production SHA as of this audit is `ee9207a38d38a4ab942e322ad4ef1e7c47e9cce9`.
2. On the production host, `cd ~/domains/filesetgo.com/app && git fetch origin && git checkout <SHA>` (or `git pull` if deploying the branch tip — prefer pinning an explicit SHA for anything beyond routine iteration).
3. `cd ~/domains/filesetgo.com/app && /opt/alt/php84/usr/bin/php $(which composer) install --no-dev --optimize-autoloader`.
4. `npm ci && npm run build` (from `app/`) — produces `app/public/build/`. **This must then be synced to `public_html/build/`** (the actual served location) — confirm the account's existing deploy mechanism does this (it evidently already does, since production `build/` assets match the current manifest), rather than assuming Vite writes there directly.
5. Cache: `/opt/alt/php84/usr/bin/php artisan config:cache && /opt/alt/php84/usr/bin/php artisan route:cache && /opt/alt/php84/usr/bin/php artisan view:cache`.
6. **Do not touch `public_html/.htaccess`, `public_html/index.php`, or `.well-known/`** during the sync in step 4 — see §3.
7. Confirm `.env` still has `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://filesetgo.com` (these were verified correct at audit time; do not let a template overwrite reset them).

## 5. Health checks and post-deploy verification

- `GET https://filesetgo.com/up` → expect `200` (Laravel's built-in health route, confirmed working).
- Confirm the CSP header is still the full governed policy (not the bare `upgrade-insecure-requests` Hostinger default) on a fresh `curl -I https://filesetgo.com/` — this is the single fastest signal that `public_html/.htaccess` survived the deploy intact.
- Confirm `php artisan about` (via the correct `/opt/alt/php84/usr/bin/php` binary) reports `Config: CACHED`, `Routes: CACHED`, `Views: CACHED`, and the expected commit-relevant version info.
- Run the launch smoke test described in `docs/architecture/DEPLOYMENT.md` §"Launch smoke test" — homepage, each of the 6 public routes, `/privacy`, `/terms`, `/sitemap.xml`, `/robots.txt`, a 404, HTTPS/canonical-host check. This audit executed exactly this smoke test against the current production release — see the regression report for results.

## 6. Rollback

Because `app/` on production is a live git checkout, rollback is `git checkout <previous-known-good-SHA>` followed by steps 3–6 above again (dependencies/build/cache are all reproducible from any commit; nothing is destructively migrated — there is no schema migration this application depends on beyond Laravel's own default tables). Keep the previously-deployed SHA noted (§4 step 1) specifically so this is a known value, not a guess, at rollback time.

## 7. What this runbook deliberately does not cover

Per directive §7/§8/§10, this runbook does not introduce a new CI/CD pipeline, a new deployment tool, or any new dependency — it documents the existing manual/SSH-based Hostinger deployment shape exactly as verified, so the next deployment does not depend on remembering undocumented terminal modifications (specifically: the PHP 8.4 binary path and the production-only `.htaccess` content, both of which caused real friction during this audit before being tracked down).
