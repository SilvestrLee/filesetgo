# FileSetGo UX & Visual Direction

## Status

This document records accepted UX and visual requirements from the Product Office handover. Exact production tokens remain subject to visual review.

## Visual Goal

FileSetGo should feel:

- intentionally designed;
- minimal but not flat;
- serious but approachable;
- precise;
- useful;
- premium without becoming ornamental;
- sensory through controlled colour, depth, rhythm, and state change.

It should not feel like:

- a developer demo;
- generic SaaS;
- documentation;
- a dashboard;
- an AI startup;
- a collection of identical Tailwind cards;
- a cyberpunk or neon product.

## Theme

Use a direct Light ↔ Dark toggle.

Requirements:

- one-action switching;
- first visit may respect `prefers-color-scheme`;
- explicit user choice persists;
- manual choice overrides system thereafter;
- keyboard accessible;
- meaningful ARIA label;
- avoid theme flash;
- respect reduced motion.

A permanent visible three-state dropdown is not preferred.

## Colour Direction

Directional palette only, not frozen tokens:

- Deep Ink `#111522`
- Slate `#1A2030`
- Soft Indigo `#6674F5`
- Electric Blue `#4388FF`
- Aqua / Teal `#3BC7B7`
- Warm Amber `#F4B95F`
- Soft Coral `#F07A72`
- Off White `#F6F7FB`

Recommended balance:

> 80% neutral / 15% brand colour / 5% expressive colour.

Use blue/indigo for primary interaction, teal for ready/success, amber for guidance, and coral/red only for genuine errors/destructive actions.

## Gradient Philosophy

Gradients add depth, not decoration.

Use a small reusable family:

- page atmosphere;
- elevated surface;
- interactive surface;
- selected surface;
- recommendation surface;
- success surface.

Avoid aurora blobs, neon glow, rainbow gradients, and decorative gradients with no state meaning.

## Surface Hierarchy

### Level 0 — Canvas

Atmospheric page background.

### Level 1 — Primary working surfaces

Upload, result, and workspace surfaces.

### Level 2 — Interactive surfaces

Presets, choices, and controls.

### Level 3 — Selected / active

Stronger border/tint/selection marker and restrained elevation.

Do not give everything the same elevation.

## Section Rhythm

Do not use horizontal divider lines as the default major-section separator.

Prefer:

- space;
- tonal change;
- composition;
- typography;
- content-width shifts;
- subtle atmospheric surfaces.

Use deliberate spacing vocabulary rather than identical gaps everywhere.

## Header

Target behavior:

### At top

- fixed/sticky;
- transparent;
- integrated with page;
- normal logo size;
- generous vertical spacing;
- no heavy bar.

### On scroll

- reduced height;
- slightly smaller logo;
- reduced padding;
- theme-aware translucent surface;
- optional backdrop blur;
- restrained gradient/elevation;
- no dramatic animation;
- reduced-motion support.

## Core Workspace

The actual product remains highly prominent.

The interface should clearly separate:

- source/context;
- user decisions;
- recommendation;
- processing state;
- outcome/result.

`Configure left / outcome right` is a useful desktop pattern but not an immutable law. The canonical requirement is that decisions and outcomes are visually distinct and that results are never buried beneath configuration.

## Preset / Task Selection

Avoid documentation-style cards.

Use user-oriented language such as:

> What are you preparing?

Cards or rows must prioritize:

- purpose;
- recommended dimensions;
- format;
- target size;
- selected state;
- whole-control clickability;
- keyboard/focus behavior.

## Upload

The upload state should teach the next step and should not look like a raw browser file input.

After file selection show:

- preview;
- filename;
- detected format;
- dimensions;
- file size;
- preflight/readiness state;
- replace/remove actions.

## Recommendation

After preflight, answer:

1. What did I upload?
2. What does FileSetGo recommend?
3. What will happen if I continue?

Use plain language.

## Advanced Settings

Keep optional and collapsed by default.

Expose only product-relevant settings:

- output format;
- dimensions;
- aspect ratio;
- target size;
- quality where genuinely useful.

Provide a reset to the FileSetGo recommendation.

Do not expose worker/encoder implementation detail.

## Results

The result state is the payoff.

Show where reliable:

- output filename;
- format;
- dimensions;
- byte size;
- readiness/status;
- before vs after;
- saved bytes/percentage where truthful;
- clear download action.

Secondary actions may include preparing another file or adjusting and preparing again.

## Logo Pack Result

Primary result belongs in the result/outcome region.

Use ZIP-first delivery:

> Download logo pack

Then optionally:

> View individual files

Individual assets should be compact and collapsible, not seven dominant full-width download bars.

## Favicon UX

A wide wordmark should not automatically become an unreadable favicon if a better compact mark can be identified.

Preferred future flow:

1. detect/suggest likely favicon source;
2. show it to the user;
3. allow adjust/confirm;
4. if no clear mark exists, allow user crop/selection;
5. full-logo favicon remains an explicit fallback.

Do not destructively crop without preview/confirmation.

A favicon source selector should remain a simple square crop/selection tool, not a full editor.

All favicon outputs should derive from the same approved source with sensible internal padding and preserved aspect ratio.

## Transparency Quality

A result should not be described as a clean transparent logo merely because some alpha exists.

Product quality target:

> The logo can be placed on light, dark, coloured, or photographic backgrounds without visibly revealing the old matte/background.

Checkerboard, Light, and Dark preview states remain important.

Any future change to the background-removal engine must be evidence-driven and must preserve the FSG-006R finding that no low-alpha denominator change was justified by the completed comparison matrix.

## Footer & Set. Go. Family

Footer may expose the sister-product family:

- File. Set. Go. — website-ready file preparation
- Site. Set. Go. — website launch readiness — Coming soon
- Brand. Set. Go. — brand asset readiness — Coming soon
- Shop. Set. Go. — online-store readiness — Coming soon

Do not create fake destinations for unlaunched products.

Contextual sister-product promotion must never outrank the user's active task or result.
