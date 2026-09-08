# FileSetGo Growth & Analytics Strategy

## Status

This document preserves the approved analytics philosophy and working growth strategy from the Product Office handover. Analytics implementation remains a later governed milestone.

## Analytics Principle

> Measure product behaviour, not people's files.

General analytics should never receive:

- image content;
- previews;
- raw file paths;
- EXIF personal data;
- unnecessary content-derived information;
- raw filenames where bucketed/non-identifying context is sufficient.

Prefer structured categories such as source format, size bucket, and dimension bucket.

## North Star

Recommended initial North Star:

> Successfully prepared and downloaded files per week.

New-user activation:

> First successfully prepared and downloaded file.

Signup is not the activation event.

## Core Funnel

Visit
→ workflow selected
→ file selected
→ preflight passed
→ recommendation shown
→ preparation started
→ preparation completed
→ download initiated

Measure conversion and failure between stages.

## Candidate Product Events

- workflow_started
- file_selected
- preflight_completed
- preflight_rejected
- preset_selected
- recommendation_viewed
- settings_adjusted
- processing_started
- processing_completed
- processing_failed
- download_started
- workflow_restarted

Workflow dimensions may include:

- quick_fit
- guided_fit
- logo_pack
- transparent_logo
- favicon
- size_target

## Logo Pack Events

Candidate events:

- logo_pack_started
- transparency_requested
- background_removal_used
- favicon_source_detected
- favicon_source_adjusted
- logo_pack_generated
- logo_pack_zip_downloaded
- individual_logo_asset_downloaded

Candidate dimensions include:

- background_removal_strength: gentle / balanced / strong
- favicon_source: auto_confirmed / auto_adjusted / manual / full_logo

High manual correction rates should be interpreted as product evidence, not merely engagement.

## Reliability Events

Prefer categorized failure values:

- unsupported_format
- file_too_large
- megapixel_limit
- decode_failed
- worker_failed
- memory_guard
- encoding_failed
- background_removal_failed
- zip_generation_failed
- unknown

Avoid relying only on raw exception strings.

## Registration & Pro Events

Registration candidates:

- registration_prompt_viewed
- registration_started
- registration_completed
- login_completed

Capture context such as save_preset, save_preferences, result_screen, activity_history, header, pricing.

Pro candidates:

- pro_cta_clicked
- pro_feature_encountered
- pricing_viewed
- billing_interval_selected
- checkout_started
- subscription_activated
- subscription_cancelled
- subscription_expired

Capture context such as batch, preset_limit, advanced_naming, platform_preset, header, pricing, account.

## Pro Activation

A subscription is not itself product activation.

Meaningful Pro activation should require use of a paid capability, for example:

- completing a batch;
- using a premium platform preset;
- exceeding the Free saved-preset allowance;
- using advanced naming.

## Analytics Boundaries

Avoid initially:

- session replay;
- fingerprinting.

Analytics should be:

- first-party-minded;
- consent-aware where legally required;
- disableable where appropriate;
- non-essential to processing;
- separate/disabled in development and test;
- implemented behind a central abstraction;
- governed by a canonical event registry.

## Launch Model

Recommended growth model:

> Task-led SEO + immediately usable free tools + value-before-registration + contextual account conversion + behaviour-triggered Pro upsell + sister-product demand validation.

## Initial Audiences

- WordPress users;
- freelance web designers;
- no-code builders;
- small businesses;
- church/nonprofit administrators;
- ecommerce store owners;
- VAs/content managers;
- marketers managing website content.

## Soft Launch

1. controlled/internal validation;
2. private beta with real users/files;
3. public launch after core tasks are reliable.

Recommended feedback questions:

- What were you trying to prepare?
- Did you know which option to choose?
- Was the result usable?
- Did you need another tool afterwards?
- What did FileSetGo fail to finish?
- Would you use it again?

Core qualitative question:

> Did FileSetGo finish the job?

## Channels

Potential channels include:

- X;
- LinkedIn;
- Reddit communities;
- WordPress groups;
- web-design/no-code communities;
- entrepreneur/small-business groups;
- existing professional network;
- Product Hunt after sufficient polish;
- task-led SEO.

## Demonstration Content

Prefer concrete before/after product proof, for example:

> 5.2 MB JPEG → Hero preset → 428 KB WebP.

or:

> One logo in → transparent logo + favicon + Apple icon + web logo + Logo Pack.

Do not watermark free output.

## Initial Learning Milestones

Working targets:

1. 500 genuine users successfully prepare files;
2. 50 repeat users;
3. 10 paying Pro users.

These are learning targets, not permanent KPI contracts.
