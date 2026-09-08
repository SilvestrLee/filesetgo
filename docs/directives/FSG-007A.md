# FSG-007A — Complete Front-Facing Website Redesign

## Status

CURRENT

## Parent Milestone

FSG-007 — Public Product Experience & Launch

## Starting Baseline

FSG-007 reconciled resume baseline:

`356f320cd094a6747e4d6c22ebe14ca413015d14`

This baseline contains:

- formally closed FSG-006R runtime/security hardening;
- preserved FSG-007 SEO/public-launch work;
- Product Office strategy handover;
- UX/design direction;
- commercial strategy;
- growth/analytics strategy;
- Set. Go. family strategy.

## Product Office Decision

The existing FileSetGo public visual design is REJECTED.

Product Owner assessment of the previous appearance:

**3 / 10**

This is not another refinement pass.

The entire front-facing FileSetGo website must be redesigned.

The current visual implementation is not a design constraint.

The certified runtime, security, processing contracts, routes, SEO
architecture, product truths, and accessibility requirements remain
protected.

## Required Context

Before implementation, read:

1. `docs/governance/MASTER-BLUEPRINT.md`
2. `docs/governance/DECISIONS.md`
3. `docs/governance/ROADMAP.md`
4. `docs/product/PRODUCT.md`
5. `docs/product/PRODUCT-STRATEGY.md`
6. `docs/product/UX-DESIGN-DIRECTION.md`
7. `docs/product/PRODUCT-OFFICE-HANDOVER-2026-09-08.md`
8. `docs/product/SET-GO-FAMILY.md`
9. `docs/product/COMMERCIAL-STRATEGY.md`
10. `docs/product/IMPLEMENTATION-PROGRAMME.md`

The full Product Office handover is preserved as source context and must
not be ignored merely because focused derivative documents exist.

## Core Product Proposition

FileSetGo turns:

> Input file + destination or requirement

into:

> validated ready-to-use output.

Primary public positioning:

> File. Set. Go.
>
> Get your file ready for where it needs to go.

FileSetGo is not merely an image converter.

It exists to help non-experts prepare files correctly for real website use
without requiring them to understand formats, dimensions, compression,
transparency, favicon sizing, or similar technical details.

## Interaction Language

The product model is:

### FILE

Choose what you have.

### SET

Tell FileSetGo where it needs to go or what it needs to become.

### GO

Review, prepare, validate, and download.

FILE / SET / GO is an interaction model first.

Do not repeat it decoratively throughout the interface without purpose.

## Redesign Goal

The website should feel:

- intentionally designed;
- premium;
- calm;
- precise;
- modern;
- useful;
- approachable;
- lightweight;
- trustworthy;
- distinctive;
- suitable for non-experts.

It should not feel like:

- a developer demo;
- generic SaaS;
- documentation;
- an admin dashboard;
- a template;
- an AI startup;
- a collection of Tailwind cards;
- a file-converter clone;
- cyberpunk/neon UI;
- a Photoshop-style editor.

Visual thesis:

> Precision utility × editorial clarity × physical file metaphor.

## Existing Visual Direction Is Not Protected

The redesign may replace:

- page backgrounds;
- dark-theme dominance;
- current hero;
- current header;
- current footer;
- current typography;
- current card system;
- section layouts;
- button styling;
- tabs;
- upload treatment;
- spacing;
- border/radius system;
- visual motifs;
- acquisition-page compositions;
- tool framing.

Do not preserve a weak element merely because it already exists.

## Light and Dark

Both Light and Dark must be intentionally designed.

Use a direct:

Light ↔ Dark

toggle.

Requirements:

- first visit may respect `prefers-color-scheme`;
- explicit user choice persists;
- user choice overrides system preference thereafter;
- one-action switching;
- keyboard accessible;
- meaningful ARIA label;
- no theme flash;
- reduced-motion support.

Do not use a permanent three-option Appearance dropdown as the primary
control.

## Colour

Exact production values remain open to design refinement.

Directional palette territory from Product Office:

- Deep Ink — `#111522`
- Slate — `#1A2030`
- Soft Indigo — `#6674F5`
- Electric Blue — `#4388FF`
- Aqua / Teal — `#3BC7B7`
- Warm Amber — `#F4B95F`
- Soft Coral — `#F07A72`
- Off White — `#F6F7FB`

Directional balance:

> 80% neutral / 15% brand colour / 5% expressive colour.

Use colour semantically:

- indigo/blue for primary interaction;
- teal/aqua for ready/success;
- amber for recommendations/guidance;
- restrained coral/red for genuine failure/destructive state.

This palette is directional, not an immutable token set.

## Gradient Policy

Gradients may add depth.

They must not become decoration.

Use a restrained reusable family such as:

- page atmosphere;
- elevated surface;
- interactive surface;
- selected surface;
- recommendation surface;
- success surface.

Avoid:

- aurora blobs;
- purple SaaS glow;
- rainbow gradients;
- neon;
- cyberpunk;
- excessive glassmorphism.

## Surface Hierarchy

Use deliberate depth.

### Level 0

Canvas/background.

### Level 1

Primary working surfaces:

- upload;
- workspace;
- result.

### Level 2

Interactive surfaces:

- presets;
- options;
- controls.

### Level 3

Selected/active states.

Do not elevate every element equally.

Default assumption:

**No card unless the content represents a real object or interactive
group that benefits from containment.**

Use:

- typography;
- alignment;
- spacing;
- tonal changes;
- composition;
- hierarchy

before reaching for another rounded rectangle.

## Section Rhythm

Major page sections must not rely on decorative horizontal divider lines.

Prefer:

> space → composition → tonal shift → content → breathing room.

Use negative space deliberately.

Do not create large empty areas that feel accidental.

## Header

The header should feel part of the page.

At the top:

- fixed/sticky;
- transparent;
- normal logo scale;
- comfortable vertical spacing;
- no heavy toolbar appearance.

On scroll:

- reduce height;
- slightly reduce logo scale;
- reduce padding;
- use a theme-aware translucent surface;
- restrained elevation;
- optional backdrop blur;
- subtle transition only.

Respect `prefers-reduced-motion`.

## Navigation

Keep desktop navigation compact.

Public task discovery should not become a row of seven SEO links.

Provide a deliberate Website Tasks navigation system.

It must be:

- keyboard accessible;
- focus visible;
- mobile accessible;
- current-page aware;
- quick to scan.

Do not create an oversized marketing mega-menu.

## Homepage

The homepage is primarily a product surface.

The actual FileSetGo tool must remain near the top.

Do not create a large marketing landing page that hides the product below
multiple sections.

Required content areas, composition open to design:

- header;
- product proposition;
- live FileSetGo workspace;
- task discovery;
- File → Set → Go explanation;
- browser-local trust;
- useful website-file problems;
- restrained Set. Go. family context;
- footer.

## Tool Presentation

Current functionality remains:

- Quick Fit;
- Guided Fit;
- Logo Pack.

Presentation may be redesigned.

Explore an appropriate accessible structure such as:

- segmented mode control;
- task launcher;
- workspace switcher;
- destination-first selector;
- compact tabs.

Do not change underlying processing behavior.

## Beginner-First Workflow

The default mental model should be:

> Choose → Upload → Accept recommendation → Download.

The interface should answer:

1. What did I upload?
2. What am I preparing it for?
3. What does FileSetGo recommend?
4. What will change?
5. Is it ready?

Advanced settings remain available but secondary.

## Upload State

The empty upload state must be deliberately designed.

It should teach the user what to do.

After file selection show:

- preview where useful;
- filename;
- detected format;
- dimensions;
- file size;
- readiness/preflight state;
- replace;
- remove.

Do not present a raw generic browser input as the main experience.

## Recommendation State

The recommendation should compare:

### Current

what the user supplied.

### Recommended

what FileSetGo proposes.

Use plain language.

Example structure:

Current:
4032 × 3024
JPEG
4.8 MB

Recommended:
1920 × 1080
WebP
Target under 500 KB

Then explain the outcome in ordinary language.

## Advanced Settings

Advanced settings remain optional.

Possible groups:

### Output format

- WebP
- JPEG
- PNG

### Dimensions

- width
- height
- aspect-ratio handling

### Target

- file size
- quality where genuinely useful

Provide:

> Reset to FileSetGo recommendation

Do not expose internal worker/encoder implementation terminology.

## Result State

The result should feel like the payoff.

Clearly show:

- ready status;
- filename;
- format;
- dimensions;
- file size;
- before/after where useful;
- validated state;
- primary download action.

Where truthful, show:

- bytes saved;
- percentage smaller.

Do not invent metrics.

## File Object Language

Explore a reusable visual FileSetGo file-object pattern.

Possible information:

- filename;
- format;
- dimensions;
- size;
- state.

Possible semantic states:

- Source
- Processing
- Ready
- Needs review
- Unreachable

Do not change the underlying runtime outcome semantics.

## Logo Pack Result

The existing long download-list presentation is rejected.

Primary result:

> Your logo pack is ready.

Primary action:

> Download logo pack

The ZIP/package is the main result.

Individual assets should be secondary behind:

> View individual files

Use a compact list/grid, not seven dominant download bars.

Results must occupy the result/outcome area rather than expanding beneath
configuration and damaging the page layout.

## Favicon Experience

Do not automatically assume a wide full wordmark is the best favicon.

The redesign should support a future/source-selection experience:

1. identify likely compact mark;
2. show proposed favicon source;
3. allow confirmation/adjustment;
4. allow manual square selection where ambiguous;
5. permit full logo as explicit fallback.

Never destructively crop without showing the user what will be used.

Use sensible internal padding.

Preserve aspect ratio.

All favicon outputs derive from the same approved favicon source.

Do not build a full image editor.

## Transparency Experience

Transparent Logo must clearly support preview over:

- Checkerboard;
- Light;
- Dark.

A transparent result should not be described as clean merely because some
alpha exists.

Product quality target:

> usable over light, dark, coloured, or photographic backgrounds without
> visibly exposing the original matte/background.

FSG-006R established that the tested low-alpha denominator alternatives
were worse than baseline.

Do not alter the certified background-removal algorithm merely as part of
visual redesign.

Any reproducible new transparency defect requiring engine changes must
return to Product Office.

## Acquisition Pages

Redesign all approved acquisition pages.

Current routes include:

- `/prepare-logo-for-website`
- `/transparent-logo-for-website`
- `/favicon-generator`
- `/website-image-optimizer`
- `/compress-image-for-website`
- `/convert-image-to-webp`

Do not turn them into generic articles.

Each should feel like a focused product entry.

Required ingredients:

- problem recognition;
- outcome;
- primary action;
- visual explanation;
- concise supporting copy;
- truthful limitations;
- browser-local trust;
- related tasks;
- final action.

Maintain a common design system while allowing each task to have a
recognizable composition.

## Acquisition Visual Concepts

### Prepare Logo

One source → website-ready package.

Use the real Logo Pack output contract.

### Transparent Logo

Use transparency preview meaningfully.

Do not imply perfect AI background removal.

### Favicon

Show logo/mark → favicon/icon family.

Do not invent a separate favicon engine.

### Website Image Optimizer

Use Hero / Content / Card destination frames as recommendations.

### Compress

Show:

Current size → Target → Result.

Do not guarantee every target is reachable.

### WebP

Make format transformation obvious.

Do not promise fixed savings.

## Privacy

Browser-local processing is a product advantage.

Approved direction:

> Your image itself is not uploaded for processing.

Explain that supported processing runs in the browser.

HEIC may load same-origin decoder/WASM resources.

Do not claim:

- zero network;
- nothing ever leaves your browser;
- absolute anonymity;
- military-grade security;
- 100% privacy.

Trust should come from truthful behavior and architecture.

## Footer

The wider Set. Go. family should become visible.

Suggested family section:

### File. Set. Go.

Website-ready file preparation.

### Site. Set. Go.

Website launch readiness.

Coming soon.

### Brand. Set. Go.

Brand asset readiness.

Coming soon.

### Shop. Set. Go.

Online-store readiness.

Coming soon.

Unlaunched products must not have fake destinations.

Cross-promotion remains secondary to the user's current task.

## Commercial Surfaces

Current Product Office principle:

> Free does the job properly. Pro does it at scale, with speed, memory and
> repeatability.

However, this redesign sprint must not fabricate commercial functionality.

Do not build fake:

- login;
- registration;
- billing;
- subscription;
- account;
- Pro entitlement;
- checkout.

Commercial architecture belongs to later governed milestones.

Working pricing/provider proposals in
`docs/product/COMMERCIAL-STRATEGY.md` remain proposals.

## Accessibility

Preserve or improve:

- semantic landmarks;
- exactly one H1 per indexable page;
- keyboard operation;
- visible focus;
- real buttons/labels;
- meaningful links;
- contrast;
- touch targets;
- reduced motion;
- non-colour-only state communication.

Visual ambition does not override accessibility.

## Responsive Quality

Explicitly design/test:

- 320px;
- 375px;
- 390px;
- 430px;
- 768px;
- 1024px;
- wide desktop.

Do not merely shrink desktop.

Pay particular attention to:

- navigation;
- mode controls;
- file object;
- upload;
- recommendations;
- result;
- Logo Pack;
- transparency preview.

No horizontal overflow.

## Motion

Optional.

If used, reinforce product state change.

Examples:

- file selected;
- setting confirmed;
- processing;
- ready result.

CSS-first.

No animation library.

No perpetual decorative movement.

Respect reduced motion.

## Protected SEO/Public Architecture

The redesign must not silently break:

- routes;
- titles;
- descriptions;
- canonical URLs;
- Open Graph;
- structured data;
- sitemap;
- robots;
- indexability;
- internal links;
- Privacy;
- Terms;
- 404;
- acquisition-page intent.

## Protected Certified Runtime

Do not alter:

- preflight;
- source limits;
- worker protocol;
- target-size algorithm;
- FSG-006R Blob/reference hardening;
- cancellation architecture;
- HEIC decoder behavior;
- WASM security policy;
- CSP;
- background-removal algorithm;
- alpha verification;
- ZIP;
- ICO;
- Logo Pack asset contract.

If visual implementation appears to require changing any of these:

STOP.

Return to Product Office.

## Dependencies

No new runtime dependency is pre-approved.

Do not add:

- UI framework;
- component library;
- animation framework;
- icon dependency;
- carousel;
- design framework.

If a dependency is genuinely required:

STOP and report:

- package;
- exact version;
- license;
- need;
- native alternative;
- bundle impact;
- security impact.

## Design Skill Requirement

Use the installed design tooling meaningfully.

Required order for substantial design work:

1. ui-ux-pro-max
2. design-taste-frontend / Taste Skill
3. relevant 21st.dev / Magic capabilities
4. Impeccable

Record actual findings.

Do not falsely claim a tool was used.

Do not treat third-party style opinions as higher authority than FileSetGo
governance.

## Visual Approval Gate

A technically green redesign is not automatically approved.

Before Product Office visual review, capture automated rendered evidence.

Minimum required screenshots:

### Desktop

1. homepage
2. compress-image page
3. WebP page
4. favicon page
5. prepare-logo page
6. transparent-logo page
7. website-image-optimizer page
8. Privacy
9. 404

### Responsive / interaction

10. homepage at 320px
11. homepage at 390px
12. representative acquisition page at 320px
13. Website Tasks navigation open
14. Quick Fit with selected source
15. successful Quick Fit result
16. Logo Pack source/configuration
17. transparent preview
18. Logo Pack final result

Use deterministic fixtures.

No project-owner manual browser QA is required.

## Verification

Run the established local baseline after implementation:

- `npm ci`
- `npm ls @playwright/test`
- `npm run typecheck`
- `npm run typecheck:browser`
- `npm run test:core`
- `npm run test:ui`
- `npm run build`
- `php artisan test --compact`
- `vendor/bin/pint --test`
- `git diff --check`

Run relevant public/browser suites and workflow tests affected by frontend
markup changes.

Do not weaken tests simply because markup changed.

## Performance

Keep public surfaces lightweight.

Avoid unnecessary presentation JavaScript.

Do not eagerly load heavy processing resources on informational pages.

Prefer:

- Blade;
- semantic HTML;
- CSS/Tailwind;
- small existing TypeScript where interaction genuinely requires it.

Measure final:

- CSS;
- main JS;
- worker JS;
- HEIC decoder chunk;
- HEIC WASM;
- ZIP chunk.

## Sprint Reporting

Overwrite canonical root:

`SPRINT_REPORT.md`

at the governed checkpoint.

Include:

- design thesis;
- previous-design diagnosis;
- visual system;
- typography;
- colour;
- surface hierarchy;
- homepage;
- workspace;
- acquisition pages;
- Logo Pack;
- favicon;
- mobile;
- accessibility;
- design-skill evidence;
- screenshots;
- tests;
- bundle;
- known limitations;
- visual concerns.

## Stop Condition

Stop before formal FSG-007 closure.

Do not deploy.

Do not begin FSG-008.

Return to Product Office for visual review.

The website is not considered visually approved until Product Office
reviews the actual rendered implementation.
