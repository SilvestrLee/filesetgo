# FileSetGo Product Strategy

## Status

This document distills accepted product strategy from the 8 September 2026 Product Office handover. The full source handover is preserved in `PRODUCT-OFFICE-HANDOVER-2026-09-08.md`.

Where this document conflicts with `docs/governance/MASTER-BLUEPRINT.md` or `docs/governance/DECISIONS.md`, the repository governance hierarchy applies.

## Core Positioning

FileSetGo is not merely an image converter.

Its job is to help non-experts prepare files correctly for real website use:

> Input file + destination or requirement → validated ready-to-use output.

Primary positioning:

> Get your file ready for where it needs to go.

The product should start from what the file is for, then apply the technical operations needed to make it suitable.

## Canonical Product Principles

### Readiness over conversion

FileSetGo should understand what the file is for and guide the user toward a ready output rather than exposing conversion mechanics as the product.

### Beginner first, control available

The default path should be understandable as:

> Choose → Upload → Accept recommendation → Download.

Advanced controls remain available but optional.

### Free must remain trustworthy

Free output must not be intentionally degraded to manufacture an upgrade.

Examples that must remain correct on Free include clean supported transparency, valid favicon output, ordinary image preparation, and legitimate downloads.

### Pro sells productivity

Paid value should come from scale, repeatability, memory, workflow efficiency, reusable configuration, batch work, naming, and platform readiness.

Working expression:

> Free does the job properly. Pro does it at scale, with speed, memory and repeatability.

### Browser-local is a trust advantage

Supported workflows should remain browser-local wherever feasible and be described accurately. Do not overstate this as zero network activity.

### Results before promotion

The user's current task, result, and download must remain visually and functionally more important than signup prompts, Pro upsells, or sister-product promotion.

### Product family, not product dependency

Set. Go. products may cross-promote and share appropriate capabilities, but each product remains independently useful and technically independent.

### No fake product surfaces

Do not ship fake login, fake billing, fake sister-product URLs, fake downloads, fake analytics, or placeholder features represented as active.

## Core Audience

Primary users include:

- WordPress site owners;
- freelance web designers;
- no-code and AI site builders;
- small-business owners;
- church and nonprofit website administrators;
- ecommerce store owners;
- virtual assistants and content managers;
- marketers managing website content.

The market insight is that website creation has become easier while practical file-preparation knowledge remains uneven.

## Core Interaction Model

The public brand concept remains:

### File

Choose what you have.

### Set

Tell FileSetGo where it needs to go or what it needs to become.

### Go

Review the recommendation, process, validate, and download the ready result.

The FILE → SET → GO concept is an interaction model first and a visual motif second. It should not be repeated decoratively without purpose.

## Current Product Workflows

- Quick Fit
- Guided Fit
- Website Logo Pack

Website task discovery should use the user's problem language, such as:

- prepare a logo;
- make a logo transparent;
- create a favicon;
- optimize a website image;
- meet a size limit;
- convert to WebP.

## Account Philosophy

Core utility remains usable without login.

The long-term account model is:

> Visitor → Registered Free User → Pro User.

Registration should add memory and convenience rather than correctness.

A key principle is:

> An account should remember how you worked, not necessarily retain your file.

Until FileSetGo deliberately adds cloud asset storage, account navigation should use `Activity`, not `My Files`.

If an output file is no longer retained, do not offer `Download again`; offer `Use these settings again`.

## Public Launch Quality

Technical correctness, usability, and visual quality are separate launch gates.

The public-facing website must feel intentional, trustworthy, useful, and distinctly FileSetGo. A technically green build is not sufficient if the front-facing product still appears unfinished or generic.
