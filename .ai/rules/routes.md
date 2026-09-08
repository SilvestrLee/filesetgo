---
paths:
  - routes/web.php
---

# Routes

## Register new curated public pages in App\Support\PublicPages too
Every curated public/indexable route name must also be added to `App\Support\PublicPages::indexableRouteNames()` (and `taskLinks()` if it's a "website task" acquisition page). The nav dropdown, footer, sitemap.xml, and `tests/Feature/PublicSurfacesTest.php`'s metadata/indexability checks all read from that single list — adding a route without it means the page renders but is invisible to the sitemap/nav/tests.
