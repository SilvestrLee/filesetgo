# FileSetGo Forward Implementation Programme

## Status

This is a planning document derived from the Product Office handover. Existing closed milestones remain historical authority. Future milestone IDs must be reconciled with the canonical `docs/governance/ROADMAP.md` before implementation.

## Immediate Priority

The immediate priority is the complete front-facing FileSetGo redesign inside the active FSG-007 public-launch milestone.

Do not allow the redesign to silently expand into authentication, billing, analytics, or speculative Pro features.

## Recommended Programme

### Current — Public Product Experience & Launch

1. complete front-facing redesign;
2. workflow and result UX refinement;
3. Logo Pack result architecture and favicon-source UX;
4. transparency-quality investigation only where reproducible evidence justifies reopening engine behavior;
5. launch recertification.

### Accounts

Future scope:

- registration;
- login;
- password reset;
- account menu;
- preferences;
- activity metadata;
- saved-preset foundation;
- cross-user authorization tests.

No billing initially.

### Commercial Foundation

Future scope:

- central plan configuration;
- entitlement architecture;
- pricing surfaces;
- Pro feature definitions;
- upgrade entry points.

Do not invent final pricing or provider decisions during implementation.

### Pro Productivity

Recommended paid-value bundle:

- batch processing;
- reusable presets;
- advanced naming;
- platform readiness.

Browser memory/concurrency safety remains authoritative. Paid batch does not mean unsafe unlimited simultaneous processing.

### Billing

Future scope:

- Merchant-of-Record/provider abstraction;
- checkout;
- webhooks;
- lifecycle states;
- cancellation/renewal;
- billing management;
- entitlement synchronization.

### Growth

Future scope:

- analytics abstraction;
- event registry;
- contextual sister-product promotion;
- sister-product interest capture;
- upgrade-event instrumentation.

## Specific UX Correctives

### Logo Pack

- result belongs in the result/outcome region;
- ZIP-first primary download;
- individual files collapsed by default;
- compact file list/grid;
- strong mobile outcome state.

### Favicon

- avoid default unreadable full-wordmark favicon when a compact mark exists;
- propose favicon source with confidence;
- allow review/adjustment;
- all favicon sizes derive from one approved source;
- use safe padding and preserved aspect ratio.

### Transparency

The product-quality target is a logo that works cleanly over light, dark, colour, or photographic backgrounds without obvious old-matte remnants.

FSG-006R already established that the tested low-alpha denominator alternatives were worse than baseline. Any new engine change must therefore address a separately reproducible defect and must be evidence-driven.

## Launch Readiness

Before broad public launch, verify as applicable:

- core workflow reliability;
- logo/transparency quality;
- favicon experience;
- Logo Pack result architecture;
- mobile;
- Light/Dark;
- header behavior;
- privacy/terms;
- SEO metadata;
- Open Graph/social preview;
- favicon;
- 404;
- broken links;
- sitemap;
- robots;
- production error monitoring;
- form protection if forms exist.

Pricing, authentication, analytics, and billing are required only for the launch scope in which those surfaces are actually introduced; do not create fake functionality merely to satisfy a checklist.
