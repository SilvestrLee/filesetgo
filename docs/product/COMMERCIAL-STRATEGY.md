# FileSetGo Commercial Strategy

## Status

This document records commercial principles and working proposals from the 8 September 2026 Product Office handover.

Items explicitly marked `WORKING PROPOSAL` are not implementation authority until Product Office confirms them for the relevant milestone.

## Monetization Principle

Canonical direction:

> Free does the job properly. Pro does it at scale, with speed, memory and repeatability.

FileSetGo must not deliberately degrade free output quality to create an upgrade trigger.

Paid value should come from productivity, scale, repeatability, reusable workflows, memory, and professional convenience.

## User States

### Guest

No account required for basic use.

Working direction includes:

- single-file preparation;
- Quick Fit;
- Guided Fit;
- general website presets;
- JPEG/PNG/WebP output;
- resize/compression;
- target-size preparation;
- Transparent Logo;
- favicon generation;
- basic Logo Pack and ZIP;
- browser-local processing where supported.

No batch processing and no server-side saved history/presets.

### Registered Free

Registration adds memory and convenience.

Working direction:

- saved preferences;
- account settings;
- limited activity metadata;
- limited custom presets;
- upgrade path.

`WORKING PROPOSAL`: 3 custom presets.

`WORKING PROPOSAL`: last 10 preparation records.

### Pro

Target user:

> People who regularly prepare website assets.

Recommended launch differentiators:

1. batch preparation;
2. more saved/reusable presets;
3. advanced naming;
4. premium platform-readiness presets.

`WORKING PROPOSAL`: initial platforms are WordPress, WooCommerce, and Shopify.

## Pro Launch Threshold

Do not launch paid Pro merely because billing is technically available.

Canonical threshold:

> Do not launch paid Pro until a regular website manager can truthfully save meaningful time every week by using it.

Working minimum paid bundle:

> Batch + Presets + Naming + Platform Readiness.

## Pricing

`WORKING PROPOSAL`

- Free: $0
- Pro monthly: $7
- Pro annual: $59
- no Agency tier at launch;
- no credits;
- no pay-per-export;
- no lifetime plan initially;
- no traditional Pro trial initially.

These values require deliberate Product Office confirmation before billing implementation.

## Advertising

Current recommendation:

> No display advertising inside the core FileSetGo working experience.

Preferred monetization order:

> Free utility → account → Pro → Set. Go. ecosystem.

Advertising/sponsorship may be reconsidered later only if traffic economics justify it and it remains outside the core task surface.

## Billing Provider

`WORKING PROPOSAL`

Preferred first Merchant of Record:

- Lemon Squeezy

Alternative:

- Paddle

Potential later Nigeria-local option:

- Paystack

Billing architecture must remain provider-abstracted.

## Billing Architecture

Do not model paid access only as `users.is_pro`.

Use:

> Billing state → Plan → Entitlements → Feature authorization.

Conceptual subscription state should include provider/customer/subscription IDs, plan, interval, status, period dates, cancellation state, and end date.

Provider-specific logic belongs behind an abstraction such as:

- createCheckout()
- getSubscription()
- cancelSubscription()
- resumeSubscription()
- getBillingPortal()
- verifyWebhook()

## Entitlements

Capabilities should be centralized rather than scattered `if user.pro` checks.

Candidate entitlement keys include:

- single_file_processing
- guided_fit
- transparent_logo
- basic_logo_pack
- favicon_pack
- saved_preferences
- saved_presets
- batch_processing
- advanced_logo_pack
- platform_presets
- advanced_naming
- extended_history
- package_exports

## Billing Truth

Never activate Pro from a browser redirect alone.

Authoritative flow:

> Checkout → provider → verified webhook → backend subscription state → entitlement resolution → Pro activation.

Webhook processing must be idempotent and tolerate retries, duplicates, out-of-order events, invalid signatures, unknown IDs, renewals, failures, cancellation, expiration, and refund states.

Do not store raw payment-card details.

## Account Data Boundary

Distinguish:

### Source asset

For supported browser-local workflows, the uploaded file is not sent to FileSetGo processing servers.

### Output asset

For supported local workflows, generated result is created in browser and downloaded locally.

### Account metadata

May later be stored server-side:

- preferences;
- presets;
- workflow;
- input/output dimensions;
- input/output sizes;
- formats;
- timestamps;
- status;
- subscription information.

If actual files are not stored, do not present a cloud-file-library UX.

## Downgrades

Do not delete user-owned data merely because Pro ends.

Working direction:

- preserve existing presets/data;
- restrict creation beyond Free limits;
- upgrading restores Pro capability;
- cancellation does not confiscate user data.

## Subscription Lifecycle

Future lifecycle should explicitly handle:

- free;
- active;
- past due;
- cancelled but active through paid period;
- expired;
- refunded.

Cancellation should normally preserve already-paid access through the current period.

## Deferred Commercial Features

Do not build at initial Pro launch:

- cloud asset storage;
- teams;
- organizations;
- agency tier;
- client portals;
- shared workspaces;
- public API/SDK;
- enterprise;
- CDN/asset hosting;
- referral programme;
- complex team permissions.
