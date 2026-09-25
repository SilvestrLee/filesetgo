---
paths:
  - 'docs/deployment/**'
---

# Deployment

## Production SSH's default `php` is the wrong version — use the PHP 8.4 alt binary
On the Hostinger production account (`u232789501@195.35.38.16:65002`, `~/domains/filesetgo.com`), the default `php` on `$PATH` resolves via a CloudLinux `cl.selector` symlink to PHP 8.1.34, which fails this project's Composer platform requirement (`>= 8.4.1`) and cannot run `artisan`. The web-serving PHP-FPM is actually 8.4.19. Always use `/opt/alt/php84/usr/bin/php` explicitly for any `artisan`/`composer` command run over SSH on production. Full context in `docs/deployment/PRODUCTION-RUNBOOK.md` §2.
