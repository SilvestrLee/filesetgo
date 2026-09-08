---
paths:
  - 'tests/browser/**'
---

# Browser

## Rebuild assets after editing Blade Tailwind classes before running Playwright
`playwright.config.ts`'s webServer runs `php artisan serve` over the built `public/build/` output, not the Vite dev server. A Tailwind utility class added/changed in a Blade file has no effect until `npm run build` regenerates `public/build/assets/app-*.css` — Tailwind's scanner only sees classes present in source files at build time. If a browser test/visual check of a just-edited Blade view looks wrong or a new class seems to do nothing, rebuild first before assuming a code bug.
