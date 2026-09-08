Below is the consolidated handover for the **File. Set. Go. Product Office**. I have separated **user-directed requirements**, **recommended product decisions**, **implementation conclusions**, **commercial strategy**, **UX findings**, and **deferred/open decisions** so the Product Office can treat this as an authoritative continuation brief rather than a loose transcript.

# FILE. SET. GO. — PRODUCT OFFICE HANDOVER

### Consolidated Strategy, UX, Commercial, Design, Growth & Implementation Brief

**Date:** 8 September 2026
**Purpose:** Transfer all decisions, complaints, recommendations, conclusions and implementation direction from the current FileSetGo refinement/strategy conversation into the dedicated Product Office.

---

# 1. Product family direction

The user has decided to build the following products after File. Set. Go.:

**Site. Set. Go.**
**Brand. Set. Go.**
**Shop. Set. Go.**

There is no permanently fixed development order among those three, but the recommendation from this conversation is:

**File. Set. Go. → Site. Set. Go. → Brand. Set. Go. → Shop. Set. Go.**

## Recommended next product: Site. Set. Go.

Site. Set. Go. was recommended as the next product after FileSetGo because it is the closest extension of FileSetGo's existing problem space.

FileSetGo answers:

> Is this file ready for my website?

SiteSetGo would answer:

> Is my website ready for the real world?

The recommended SiteSetGo concept is a URL-based launch-readiness checker covering issues such as:

- oversized images
- missing favicons
- poorly prepared logos
- broken links
- missing alt text
- Open Graph
- metadata
- accidental noindex
- 404s
- mobile issues
- forms
- analytics
- privacy/cookie requirements
- HTTPS/security basics
- sitemap/robots
- performance
- accessibility basics
- general launch readiness

There is a natural FileSetGo integration:

> Oversized hero detected → Fix with File. Set. Go.

This is why SiteSetGo was recommended ahead of BrandSetGo and ShopSetGo.

---

# 2. Set. Go. family philosophy

A larger strategic conclusion emerged:

> **Creation tools help people make things. Set. Go. products help people make those things ready for the real world.**

That is the strongest umbrella idea identified so far.

The family therefore becomes:

### File. Set. Go.

Get files ready.

### Site. Set. Go.

Get websites ready.

### Brand. Set. Go.

Get brand assets ready.

### Shop. Set. Go.

Get online stores ready.

The products should remain independent utilities. Cross-promotion is desirable, but no product should become technically dependent on another.

---

# 3. Brand. Set. Go. recommended direction

BrandSetGo should **not** simply become another AI-logo generator.

The stronger concept identified is:

> **Make an existing brand usable everywhere.**

Possible future BrandSetGo output:

- logo variants
- transparent versions
- light/dark versions
- favicon
- social avatars
- profile assets
- safe-area guidance
- brand colours
- typography
- email signature assets
- print files
- web files
- basic brand guide
- downloadable Brand Pack

That positions it around readiness rather than creation.

---

# 4. Shop. Set. Go. recommended direction

ShopSetGo may eventually have the largest commercial surface area, but it is also much more complex.

Potential areas include:

- product imagery
- product descriptions
- variations
- pricing
- payments
- shipping
- taxes
- store policies
- categories
- merchandising
- search
- SEO
- social sharing
- abandoned carts
- email
- inventory
- fulfilment
- notifications

Recommendation: build it after more product experience has been gained from FileSetGo, SiteSetGo and potentially BrandSetGo.

---

# 5. Major FileSetGo user feedback gathered in this conversation

The user identified several shortcomings in the current FileSetGo implementation.

These should all be considered active product requirements.

## Theme

Current theme switching uses a dropdown.

The user prefers a direct toggle.

Required:

> Light ↔ Dark

System preference can remain the initial default internally, but should not need to remain a permanent third visible option.

---

## Surfaces are too flat

The current interface lacks depth.

User wants:

- more dimensional surfaces
- restrained gradients
- richer visual layering
- visual character
- colour
- sensory appeal

But FileSetGo should remain minimal and serious.

---

## Divider lines should go

The site currently uses horizontal lines to separate major sections.

The user explicitly does **not** want this.

Sections should instead be differentiated through:

- spacing
- visual rhythm
- tonal shifts
- gradients
- composition
- typography
- content-width changes
- surface hierarchy

The target is:

> **space → section → breathing room → tonal change → next section**

not:

> section → line → section → line

---

# 6. Recommended FileSetGo colour system

Recommended visual direction:

### Neutral foundation

- deep ink
- charcoal
- slate
- warm off-white
- soft neutral

### Primary interaction

**Indigo / blue**

Use for:

- primary actions
- selected states
- focus
- links
- active navigation
- theme control emphasis

### Positive / ready

**Teal / aqua**

Use for:

- successful optimization
- ready status
- completed outputs
- positive state indicators

### Recommendation / guidance

**Warm amber**

Use for:

- recommendations
- guidance
- useful notices
- Coming Soon labels

### Failure/destructive

**Restrained coral/red**

Only for genuine errors or destructive actions.

A conceptual palette proposed in the conversation was approximately:

| RoleExample   |           |
| ------------- | --------- |
| Deep Ink      | `#111522` |
| Slate         | `#1A2030` |
| Soft Indigo   | `#6674F5` |
| Electric Blue | `#4388FF` |
| Aqua / Teal   | `#3BC7B7` |
| Warm Amber    | `#F4B95F` |
| Soft Coral    | `#F07A72` |
| Off White     | `#F6F7FB` |

These were directional values, not necessarily final production values.

Recommended visual balance:

> **80% neutral / 15% brand colour / 5% expressive colour**

---

# 7. Gradient philosophy

Gradients should add depth rather than decoration.

Recommended reusable gradient families:

- page atmosphere
- elevated surface
- interactive surface
- selected surface
- recommendation surface
- success surface

Do not invent arbitrary gradients per component.

## Dark theme

Concept:

> deep ink → faint indigo influence → blue-black → barely visible teal

The user should almost **feel** the colour before consciously noticing it.

Avoid:

- aurora blobs
- cyberpunk
- glow
- neon
- rainbow gradients

## Light theme

Concept:

> warm off-white → faint indigo → soft neutral → faint aqua

Avoid a completely pure-white page.

---

# 8. Surface hierarchy

Recommended depth levels:

### Level 0 — Canvas

Atmospheric page background.

### Level 1 — Primary working surfaces

Examples:

- upload region
- result region
- main workspace

Use restrained tonal shift/gradient/elevation.

### Level 2 — Interactive surfaces

Examples:

- preset cards
- options
- controls

Stronger distinction than Level 1.

### Level 3 — Selected/active

Use:

- stronger border
- subtle brand tint
- selection marker
- slight gradient

Do not elevate everything equally.

---

# 9. Visual rhythm

The user specifically requested an intentional rhythm between sections.

Recommended page cadence:

### Hero / introduction

↓ generous breathing room

### 01 — Choose use case

↓ faint tonal transition

### 02 — Upload

↓ generous breathing room

### 03 — FileSetGo recommendation

↓ return toward base canvas

### 04 — Optional adjustments

↓ elevated/contained area

### 05 — Web-ready result

Section numbers should be subtle orientation anchors rather than a rigid wizard/progress component.

Suggested spacing vocabulary:

- micro
- control
- element
- group
- content
- generous
- section

Not every gap should be identical.

---

# 10. Header requirements

The existing header needs significant revision.

User requirements:

- fixed/sticky
- transparent at top
- shrink when user scrolls
- should feel integrated into the page
- must work in Light and Dark themes

## At top

Header should have:

- transparent background
- normal logo size
- generous vertical space
- no heavy bar

## On scroll

It should transition into:

- reduced height
- slightly smaller logo
- less vertical padding
- theme-aware translucent surface
- optional backdrop blur
- restrained gradient
- slight elevation/shadow

No dramatic animation.

Respect `prefers-reduced-motion`.

---

# 11. Recommended commercial header navigation

When signed out:

**Website tasks**
**How it works**
**Pricing**
**Sign in**
**Get Pro**
**Theme toggle**

`Get Pro` should be the commercial primary CTA.

`Sign in` should remain understated.

When signed in, Sign In should become a compact account control.

---

# 12. Theme control conclusion

Replace the Appearance dropdown with a one-action toggle.

Concept:

`☀︎ [ toggle ] ☾`

Requirements:

- direct light/dark switching
- one click/tap
- first visit respects `prefers-color-scheme`
- explicit choice persists
- user preference overrides system after manual change
- keyboard accessible
- meaningful ARIA label
- no theme flash
- reduced-motion support

System does not need to remain visible as a third normal UI state.

---

# 13. Preset selector UX complaint

The existing “Choose what you're preparing” presentation looked too much like three documentation cards.

The recommendation is to reframe it as a premium interactive decision surface.

Recommended heading:

> **What are you preparing?**

Supporting copy:

> Choose the closest match. FileSetGo will apply sensible web-ready settings, which you can adjust before export.

Recommended card structure:

### HERO / BANNER

**Large website image**

Short one-line description.

**Recommended**
1920 × 1080 px

`WebP` `Under 500 KB`

### CONTENT

**Website content image**

**Recommended**
Up to 1600 × 1600 px

`WebP` `Under 300 KB`

### CARD / THUMBNAIL

**Card & thumbnail**

**Recommended**
Up to 800 × 800 px

`WebP` `Under 150 KB`

Requirements:

- whole card clickable
- reduced copy
- strong hierarchy
- dimensions prominent
- format/weight as compact metadata
- intentional hover
- focus state
- selected state
- selected check indicator
- subtle gradient depth
- no decorative clutter

The general caveat about platform-specific limits should move underneath the cards as tertiary copy.

---

# 14. Upload experience

Upload should feel like the clear second step.

Suggested heading:

> **Upload your image**

Dropzone:

> **Drop an image here or choose a file**

Supporting text:

> JPEG, PNG or WebP · FileSetGo will check the file before processing.

Selected context may appear:

> Preparing for: **Large website image**

After selecting a file, replace the empty state with:

- image preview
- filename
- detected format
- dimensions
- file size
- readiness/preflight status
- replace
- remove

The upload area should not look like a generic browser file input.

---

# 15. Recommendation experience

FileSetGo should feel intelligent rather than like a converter.

After preflight, answer:

- What did I upload?
- What does FileSetGo recommend?
- What will happen if I continue?

Suggested presentation:

### Current

4032 × 3024
JPEG
4.8 MB

### Recommended

1920 × 1080
WebP
Target under 500 KB

Then plain-language guidance such as:

> This image is larger than needed for a website hero. FileSetGo can reduce its dimensions and file size while keeping it suitable for large-screen display.

Primary action:

> **Prepare image**

Secondary:

- Change preset
- Replace image
- Adjust settings

Status language:

- Ready
- Needs adjustment
- Cannot process

Avoid technical implementation language in normal UX.

---

# 16. Advanced settings

Advanced settings must remain optional.

Collapsed state:

> **Adjust settings**
> Optional — FileSetGo has already chosen recommended settings.

Recommended groups:

### Output format

- WebP — Recommended
- JPEG
- PNG

### Dimensions

- width
- height
- maintain aspect ratio

### Target

- target file size
- quality where genuinely useful

Include:

> **Reset to FileSetGo recommendation**

If user significantly deviates from preset:

> **Custom settings**

Do not expose implementation details such as:

- MIME types
- encoder internals
- worker settings
- resampling algorithms
- chroma subsampling
- internal memory limits

---

# 17. Result/download state

The final result should feel like the payoff.

Suggested:

### Your image is web-ready

`Prepared for: Large website image`

Then:

| BeforeAfter |             |
| ----------- | ----------- |
| 4.8 MB      | 412 KB      |
| 4032 × 3024 | 1920 × 1080 |
| JPEG        | WebP        |

Where reliable:

> **91% smaller**

or:

> **Saved 4.4 MB**

Primary CTA:

> **Download image**

Secondary:

- Prepare another
- Adjust and prepare again

Processed-image preview should be shown where useful.

Transparent image previews need an appropriate checkerboard/light/dark treatment.

---

# 18. Logo Pack download-layout problem

The current Logo Pack result creates a long vertical list of downloads on the left side of the workspace, badly distorting the layout.

This was identified as an information-architecture problem.

The workspace concept should be:

> **Left = configure**
> **Right = outcome**

The current right-side “Go / Ready file” area remains largely empty while generated output expands below the left-side configuration.

This should be corrected.

---

# 19. Recommended Logo Pack result architecture

After Logo Pack generation, the **right/Go panel** should become the primary result area.

Suggested state:

### Your logo pack is ready

`7 web-ready assets · transparency preserved`

Show representative previews such as:

- transparent logo
- web logo
- favicon

Primary CTA:

> **Download logo pack**

Prefer a ZIP containing the complete pack.

Supporting:

> `7 files included`

Then secondary disclosure:

> **View individual files**

Individual files should only appear when expanded.

Use a compact grid/list, not seven large full-width download bars.

Example entries:

- Transparent logo — PNG
- Transparent @2x — PNG
- Favicon — ICO
- Favicon 32 — PNG
- Apple touch icon — PNG

On mobile, preserve:

**File → Set → Go/result**

and retain the same compact ZIP-first model.

---

# 20. Logo Pack naming/package structure

Conceptual package:

```text
logo-pack/
  logo-transparent.png
  logo-transparent@2x.png
  logo-web.png
  favicon.ico
  favicon-32x32.png
  apple-touch-icon.png
  icon-192x192.png
  icon-512x512.png
```

The actual implementation should follow the established Logo Pack specification and avoid unnecessary duplicates.

---

# 21. Favicon quality problem

The current favicon is simply a reduced version of the entire logo.

The user explicitly said this is undesirable.

For horizontal logos, shrinking the full wordmark to 16×16 or 32×32 creates an unreadable favicon.

The favicon should ideally use only the logo icon/mark.

---

# 22. Recommended favicon-source workflow

Add a favicon-source stage inside Logo Pack preparation.

Preferred behaviour:

### A. Icon confidently detected

FileSetGo proposes the icon automatically.

Show:

> **Using this mark for your favicon**

with a preview.

### B. Likely icon but ambiguous

Propose it and allow:

> **Adjust**

### C. No clear icon

Allow user to:

- choose/crop a favicon source
- explicitly choose full logo if they want

The full-logo favicon should be a fallback, not the default for a wide logo.

---

# 23. Favicon detection recommendation

Do not immediately add heavyweight AI.

Start with deterministic analysis:

- trim transparent/background padding
- look for vertical gaps
- identify connected visual regions
- compare compactness/aspect ratio
- detect a compact graphical region adjacent to a much wider wordmark
- use confidence thresholds

Typical pattern:

`[ICON] [WORDMARK]`

Never destructively crop without preview/confirmation where confidence is uncertain.

---

# 24. Favicon crop/preview

Recommended simple square selector:

- preview original logo
- adjustable square crop
- useful padding
- preserve aspect ratio
- live preview

Preview sizes should include approximately:

- 16 px
- 32 px
- larger app-icon size

Do not create a full image editor.

---

# 25. Favicon padding

Do not crop icon pixels flush and stretch them to fill the square.

Use safe internal padding.

Preserve aspect ratio.

All favicon outputs should derive from the same selected favicon source.

Examples:

- favicon.ico
- favicon-32x32.png
- apple-touch-icon.png
- icon-192x192.png
- icon-512x512.png

---

# 26. Transparent Logo defect discovered

A generated SlipGuard transparent PNG was inspected.

It did contain genuine alpha transparency, so background removal is fundamentally working.

However, visible remnants of the old background remained around portions of the lettering.

This indicates:

> **alpha transparency exists, but edge/matte decontamination is incomplete.**

This is a production-quality issue.

---

# 27. Transparency quality standard

Important product conclusion:

> **“Transparent” must not merely mean “the canvas contains alpha.”**

For FileSetGo, transparent should mean:

> **The logo can be placed on white, black, coloured, or photographic backgrounds without revealing where the original background used to be.**

This should become the product-quality standard.

---

# 28. Transparency remediation recommendation

The background-removal implementation should distinguish between:

1. making background pixels transparent
2. cleaning background-colour contamination from anti-aliased edge pixels

The second step is currently incomplete.

Recommended technical work:

- estimate original background/matte colour
- globally classify high-confidence background pixels
- do not rely exclusively on border-connected flood fill
- handle enclosed background areas inside letter counters
- use edge-aware alpha feathering
- decontaminate RGB values of partially transparent edge pixels
- preserve genuine gradients/highlights/shadows
- avoid hard threshold cut-outs
- avoid destroying thin typography

---

# 29. Enclosed letter/background issue

Background cleanup must account for enclosed regions inside characters such as:

- a
- d
- e
- g
- p
- o
- R

A pure border flood-fill can miss these regions because they are not connected to the canvas edge.

Recommended hybrid strategy:

1. estimate background from outer image regions
2. compare colour similarity globally
3. remove high-confidence background pixels
4. use connectivity to protect ambiguous foreground
5. feather edges

---

# 30. JPEG transparency handling

JPEG logo input requires extra care because:

- no native alpha
- compression noise
- colour bleed
- anti-aliased matte contamination

Use tolerance rather than exact colour matching.

Avoid aggressive removal that damages legitimate logo detail.

---

# 31. Gentle / Balanced / Strong

These modes should affect both:

- background classification tolerance
- edge/matte decontamination strength

Recommended conceptual behaviour:

### Gentle

Maximum foreground protection.

### Balanced

Default, practical compromise.

### Strong

Wider background similarity range for difficult cases.

The user must be able to preview before accepting potentially aggressive removal.

---

# 32. Transparency preview

Transparent Logo result should support compact preview modes:

**Checkerboard**
**Light**
**Dark**

This allows users to detect halos immediately.

---

# 33. Commercial issue identified

The current site did not visibly communicate a business model.

User specifically complained that there was:

- no evidence of monetisation
- no pricing
- no login
- no premium-user state
- no registered-user state

This is considered a major product gap.

---

# 34. Commercial product principle

The recommended business model is:

> **Visitor → Registered Free User → Pro User**

The core utility should remain useful without login.

Do not make registration mandatory before users can experience FileSetGo.

---

# 35. Core monetisation philosophy

The strongest commercial conclusion from this conversation:

> **Free does the job properly. Pro does it at scale, with speed, memory and repeatability.**

Or more explicitly:

> **FileSetGo Pro monetizes workflow efficiency, scale and repeatability. It must not deliberately degrade the quality of free preparation to manufacture an upgrade.**

Examples of things that must remain high quality on Free:

- clean transparent logos
- proper favicon outputs
- basic image preparation
- legitimate downloads

Never do:

> Upgrade for clean transparency.

or:

> Free downloads are deliberately degraded.

---

# 36. Guest / Free capability direction

Guest should require no account.

Recommended Guest capabilities:

- single-file preparation
- Quick Fit
- Guided Fit
- basic/general website presets
- JPEG output
- PNG output
- WebP output
- resize
- compression
- file-size targets
- basic metadata cleanup
- Transparent Logo
- clean alpha transparency
- favicon generation
- basic Logo Pack
- Logo Pack ZIP
- local/browser processing where supported

No batch processing.

No server-side saved presets/history.

---

# 37. Registered Free account

Registration should add **memory and convenience** rather than correctness.

Recommended capabilities:

- saved preferences
- remembered settings
- limited activity history
- limited saved presets
- account settings
- smoother repeat use
- upgrade path

Recommended free saved-preset allowance:

> **3 custom presets**

The account should remember how someone works, not necessarily store their files.

---

# 38. Pro positioning

Recommended Pro target:

> People who regularly prepare website assets.

The paid value should centre on:

- batch preparation
- reusable workflows
- more presets
- advanced naming
- platform-specific readiness
- advanced package/export tools
- richer productivity

---

# 39. Recommended FileSetGo Pro launch features

Pro should launch with four major differentiators.

## 1. Batch preparation

Strongest proposed paid feature.

Users can:

- select multiple files
- apply a preset
- view per-file progress
- retry failures
- download results together
- ZIP outputs where appropriate

Browser memory/concurrency safety remains enforced.

“Pro batch” does not mean unsafe unlimited simultaneous processing.

## 2. Saved custom presets

Free:

> up to 3

Pro:

> extended/unlimited reasonable usage

Example:

> Church Website Hero
> WebP · 1920px · 450KB

## 3. Advanced naming

Examples:

`IMG_4312.JPG`

→

`product-01.webp`

Potential tools:

- lowercase
- spaces to hyphens
- remove unsafe characters
- custom base name
- sequence numbers
- filename templates

## 4. Premium platform presets

Recommended initial platforms only:

- WordPress
- WooCommerce
- Shopify

Do not initially support fifteen platforms.

---

# 40. Free general presets

Recommended Free examples:

- Hero/banner
- Content image
- Card/thumbnail
- Logo
- Favicon
- Open Graph
- General website upload

---

# 41. Pro Logo Pack direction

Basic correct Logo Pack remains Free.

Future Pro Logo Pack capabilities may include:

- custom favicon source persistence
- configurable padding
- multiple variants
- light-background version
- dark-background version
- monochrome where safe
- custom dimensions
- naming configuration
- structured packages
- reusable Logo Pack recipes
- multiple-brand batch workflows

Do not automatically create destructive recolours.

---

# 42. Activity/history philosophy

Key principle:

> **An account should remember how you worked, not necessarily retain your file.**

For browser-local workflows, Activity may store metadata such as:

- filename where deliberately needed for user history
- source format
- source dimensions
- source size
- workflow
- output format
- output dimensions
- output size
- preset
- timestamp
- status

The actual uploaded image/output does not need to be stored.

General analytics should be stricter and should not receive raw filenames.

---

# 43. Free vs Pro history

Working direction:

### Free Account

Limited recent activity.

Suggested:

> Last 10 preparations

### Pro

Extended activity/history.

Exact retention duration remains to be finalized based on backend/privacy design.

Do not promise indefinite retention prematurely.

---

# 44. Important history UX rule

If FileSetGo does not still possess the output file, do not display:

> Download again

Instead:

> **Use these settings again**

The user then provides another file.

Do not create fake cloud-library expectations.

---

# 45. No “My Files” unless files are stored

Account navigation should use:

> **Activity**

not:

> **My Files**

unless FileSetGo genuinely adds cloud asset storage in the future.

This protects the browser-local positioning.

---

# 46. Recommended signed-in application shell

Keep it lightweight.

Suggested:

**Prepare**
**Activity**
**Presets**
**Account**

Do not build a giant SaaS dashboard.

Default post-login destination should still be:

> **Prepare**

not a chart-heavy dashboard.

The workflow remains the product.

---

# 47. Registration UX

Recommended fields initially:

- name
- email
- password

Avoid:

- phone
- company size
- job title
- website URL
- acquisition survey
- long onboarding

After registration, return users to the FileSetGo tool or the workflow they came from where possible.

---

# 48. Account page structure

Recommended areas:

### Profile

Name, email.

### Preferences

Theme, output defaults, metadata behaviour, etc.

### Privacy

Explain what is stored vs local.

### Security

Password, sessions if supported.

### Plan

Free or Pro.

### Billing

Later, once billing exists.

### Account actions

Data export/delete where applicable.

---

# 49. Account-data privacy boundary

Recommended three-category distinction:

### Source asset

Actual uploaded file.

For supported browser-local workflows:

> not sent to FileSetGo processing servers.

### Output asset

Generated result.

For supported local workflows:

> created in browser and downloaded locally.

### Account metadata

Can be stored server-side:

- presets
- dimensions
- sizes
- formats
- dates
- workflow
- preferences
- subscription information

---

# 50. Privacy wording caution

Avoid an absolute promise:

> FileSetGo never uploads files.

Future workflows might legitimately require server processing.

Preferred:

> **Supported workflows process your files in your browser.**

Then explain exceptions per workflow if they ever exist.

---

# 51. Account authorization

Authentication alone is insufficient.

User A must never access:

- User B's activity
- User B's presets
- User B's billing
- User B's preferences

Cross-user authorization tests are required.

---

# 52. Downgrade philosophy

If Pro user has 15 presets and cancels:

Do **not** delete the additional presets.

Recommended behaviour:

- preserve user-owned data
- keep existing presets visible
- preferably allow use
- restrict creation beyond Free limits
- upgrading restores Pro functionality immediately

Never confiscate user data simply because billing ends.

---

# 53. Pricing recommendation

The working pricing recommendation developed in this conversation is:

### FileSetGo Free

**$0**

### FileSetGo Pro

**$7/month**

### Annual

**$59/year**

No Agency tier at launch.

No credits.

No pay-per-export.

No lifetime plan initially.

No display advertising inside the core working interface.

This is a recommendation made during strategy work and should be treated as the current working proposal unless Product Office explicitly revises it.

---

# 54. Free vs Pro pricing presentation

Public pricing should remain simple.

## Free

$0

For occasional website-file preparation.

No account required for basic use.

## Pro

$7/month
or $59/year

For people who prepare website assets regularly.

Do not build three or four fake SaaS tiers simply to fill the page.

A Free registered account is an account state, not necessarily a separate pricing card.

---

# 55. Ads conclusion

Recommendation:

> **Do not put display advertising inside the core FileSetGo product experience.**

Ads around uploads, logos and downloads would reduce perceived quality and conflict with the premium visual direction.

Preferred monetisation hierarchy:

> **Free utility → account → Pro → Set. Go. ecosystem**

Advertising or sponsorship could be reconsidered later only if large-scale free traffic makes it worthwhile, and should remain outside the core working surface.

---

# 56. Billing-provider recommendation

The recommended global billing strategy is to use a **Merchant of Record** rather than requiring FileSetGo to independently manage worldwide tax/compliance.

Recommended first choice:

> **Lemon Squeezy**

Rationale discussed:

- suitable for software subscriptions
- Merchant of Record
- global checkout
- tax/VAT handling
- supports payouts to Nigeria
- multiple payment methods

Alternative:

> **Paddle**

Also a strong Merchant-of-Record candidate.

Potential later Nigeria-local option:

> **Paystack**

Useful if significant Nigerian transaction volume justifies a dedicated local payment path.

The billing architecture should remain provider-abstracted.

---

# 57. Billing model

Working recommendation:

- USD pricing initially
- $7 monthly
- $59 annual
- no traditional free trial initially
- free product already provides trial-like product proof
- taxes handled at checkout according to provider/location
- account required before paid checkout

---

# 58. Subscription lifecycle

Recommended states:

### Free

No subscription.

### Active

Pro enabled.

### Past due

Payment issue. Do not immediately destroy user access/data.

### Cancelled but active until period end

Pro continues until paid period expires.

### Expired

Account returns to Free.

### Refunded

Handled through explicit billing-state rules.

---

# 59. Cancellation

Recommended customer-friendly behaviour:

> Your Pro access remains available until **[date]**. After that your account returns to Free.

Do not:

- immediately terminate already-paid access
- delete data
- require support email to cancel if self-service provider tools exist

---

# 60. Billing architecture

Do not use:

```text
users.is_pro = true
```

as the entire billing model.

Conceptually use:

### Subscription

Fields may include:

- user\_id
- provider
- provider\_customer\_id
- provider\_subscription\_id
- plan
- billing\_interval
- status
- current\_period\_start
- current\_period\_end
- cancel\_at\_period\_end
- ended\_at

Entitlements should be resolved separately.

---

# 61. Billing-provider abstraction

Recommended concept:

```text
BillingProvider
```

with methods such as:

- createCheckout()
- getSubscription()
- cancelSubscription()
- resumeSubscription()
- getBillingPortal()
- verifyWebhook()

Then:

```text
LemonSqueezyBillingProvider
```

and potentially later:

```text
PaystackBillingProvider
```

No provider-specific logic scattered throughout UI/controllers.

---

# 62. Entitlement architecture

Do not scatter checks such as:

```text
if user.pro
```

around the application.

Use central capabilities.

Conceptual entitlement keys discussed:

```text
single_file_processing
guided_fit
transparent_logo
basic_logo_pack
favicon_pack
saved_preferences
saved_presets
batch_processing
advanced_logo_pack
platform_presets
advanced_naming
extended_history
package_exports
```

Architecture:

> **Billing state → Plan → Entitlements → Feature authorization**

not:

> payment provider product ID → random UI checks

---

# 63. Billing truth

Never activate Pro purely because browser redirects to:

`?success=true`

Authoritative flow:

> Checkout → Provider → Verified webhook → Backend subscription update → Entitlement resolution → Pro activation

Webhook processing must handle:

- duplicate events
- retries
- out-of-order events
- invalid signatures
- unknown IDs
- cancellations
- renewals
- failures
- expiration

and must be idempotent.

---

# 64. Payment security

FileSetGo should not store raw card/payment details.

Store only necessary provider/customer/subscription references and safe metadata.

Billing secrets remain server-side.

---

# 65. Public-site information architecture

Recommended homepage order:

### 1. Hero

### 2. Core FileSetGo workspace

### 3. File → Set → Go explanation

### 4. Website tasks

### 5. Privacy/browser-local proposition

### 6. Why create a free account?

### 7. Pricing / Pro

### 8. Set. Go. family

### 9. Footer

Do not bury the actual tool under generic SaaS marketing.

The FileSetGo workspace should remain highly prominent.

---

# 66. Hero positioning

Current message direction was considered strong:

> **Get your file ready for where it needs to go.**

Supporting proposition recommended:

> Prepare images, logos, favicons and website assets without needing to understand formats, dimensions or compression.

Trust line:

> **Prepared in your browser where supported**

The product itself should remain close to the hero.

---

# 67. File → Set → Go explanation

Recommended simple framework:

### File

Choose what you have.

### Set

Tell FileSetGo what it needs to become.

### Go

Review the recommendation and download the prepared result.

Keep this short and visual.

---

# 68. Website task discovery

High-value task entry points proposed:

### Prepare a logo

One source → website-ready assets.

### Make a logo transparent

Clean alpha.

### Create a favicon

Use a proper mark/icon.

### Optimize an image

Hero/content/card.

### Meet a size limit

Prepare below KB/MB target.

### Convert to WebP

Modern web optimization.

These should eventually support both product discovery and SEO.

---

# 69. Recommended task routes

Conceptually:

```text
/prepare-logo
/transparent-logo
/create-favicon
/optimize-image
/reduce-image-size
/resize-image-for-website
/convert-to-webp
/website-hero-image-size
/open-graph-image
```

These should contain the relevant tool itself, not merely long-form articles.

---

# 70. “Answer + action” SEO strategy

Example:

### What size should a website hero image be?

Brief useful answer.

Then immediately:

> **Prepare your hero image**

and the relevant FileSetGo workflow.

This is preferred over producing a large generic SEO content farm.

---

# 71. Search positioning

Avoid positioning FileSetGo primarily as:

> free online image converter

That places it in a commodity category.

Preferred:

> **Get your files website-ready without needing to understand formats, dimensions or compression.**

Differentiator:

> **readiness guidance**, not simple conversion.

---

# 72. Privacy section

Recommended public messaging should remain truthful and precise.

Example:

> **Your image itself is not uploaded for processing.**

Then clarify:

> Supported workflows run in your browser. FileSetGo may load same-origin decoder resources where required, but your source image is not sent to a FileSetGo processing endpoint for those workflows.

Avoid absolute claims that cannot remain true forever.

---

# 73. Free-account marketing

Recommended section:

### Work the same way next time.

> Create a free FileSetGo account to remember your preferences, save up to 3 presets, and keep a lightweight preparation history.

CTA:

> **Create free account**

Secondary:

> **Sign in**

Registration should be framed through value, not account bureaucracy.

---

# 74. Contextual account CTAs

After Guided Fit:

> **Save these settings**

After Logo Pack:

> **Remember my Logo Pack preferences**

After repeat use:

> **Keep my preparation history**

The account is the mechanism behind the benefit, not the headline proposition.

---

# 75. Upgrade moments

Good:

> Preparing several files? Batch preparation is available with FileSetGo Pro.

Good:

> Save unlimited reusable workflows with Pro.

Bad:

- blocking a successful download
- interrupting processing with an upsell
- deliberately degrading free results
- showing Pro prompts on every screen

---

# 76. Set. Go. family in footer

The user explicitly requested sister sites in the footer.

Recommended section:

### Set. Go. Products

**File. Set. Go.**
Website-ready file preparation

**Site. Set. Go.**
Website launch readiness
`Coming soon`

**Brand. Set. Go.**
Brand asset readiness
`Coming soon`

**Shop. Set. Go.**
Online-store readiness
`Coming soon`

Unlaunched products must not have fake/broken links.

---

# 77. Wider footer architecture

Recommended groups:

### Brand

Logo, proposition, Set. Go. family statement.

### Website tasks

Task links.

### Set. Go. Products

Family products.

### Account

Sign in, Create account, Pro, Pricing.

### FileSetGo

How it works, Privacy, Terms.

Footer should transition through tone/space rather than a heavy horizontal divider.

---

# 78. Contextual cross-promotion

The user wants sister products cross-promoted “anywhere possible,” but recommendation is to keep promotion contextual and restrained.

Logo workflows:

> **Brand. Set. Go. — Coming soon**

Website-image workflows:

> **Site. Set. Go. — Coming soon**

Product/ecommerce imagery:

> **Shop. Set. Go. — Coming soon**

Only one relevant sister product at a time.

Never put sister promotion ahead of:

- result
- download
- current task completion

---

# 79. Cross-promotion component

Recommended reusable abstraction conceptually:

```text
RelatedProductCard
```

or equivalent.

Supported properties:

- product name
- description
- status
- URL if live
- context
- CTA if applicable

Unlaunched:

> `Coming soon`

No fake CTA.

---

# 80. Sister-product demand validation

A future useful enhancement:

> **Notify me**

for Coming Soon sister products.

Track interest separately for:

- Site. Set. Go.
- Brand. Set. Go.
- Shop. Set. Go.

This could provide real data on which sister product users want next.

---

# 81. Analytics philosophy

Core principle:

> **Measure product behaviour, not people's files.**

Analytics should never receive:

- image content
- previews
- raw file paths
- EXIF personal data
- unnecessary content-derived information

General analytics should avoid raw filenames.

Instead track buckets such as:

```text
source_format: jpeg
source_size_bucket: 1mb_5mb
dimensions_bucket: large
```

---

# 82. North Star metric

Recommended initial FileSetGo North Star:

> **Successfully prepared and downloaded files per week**

This directly measures whether FileSetGo fulfilled its core job.

New-user activation:

> **First successfully prepared and downloaded file**

Not signup.

---

# 83. Core funnel

Recommended:

> Visit → workflow selected → file selected → preflight passed → recommendation shown → preparation started → preparation completed → download initiated

Track conversion between each stage.

---

# 84. Suggested analytics events

Conceptually:

```text
workflow_started
file_selected
preflight_completed
preflight_rejected
preset_selected
recommendation_viewed
settings_adjusted
processing_started
processing_completed
processing_failed
download_started
workflow_restarted
```

Use structured context, not personal content.

---

# 85. Workflow types to track

Recommended:

```text
quick_fit
guided_fit
logo_pack
transparent_logo
favicon
size_target
```

Need to know which workflows create:

- completion
- repeats
- accounts
- Pro intent

---

# 86. Logo Pack analytics

Suggested:

```text
logo_pack_started
transparency_requested
background_removal_used
favicon_source_detected
favicon_source_adjusted
logo_pack_generated
logo_pack_zip_downloaded
individual_logo_asset_downloaded
```

Important dimensions:

```text
background_removal_strength:
gentle
balanced
strong

favicon_source:
auto_confirmed
auto_adjusted
manual
full_logo
```

High manual correction rates would indicate icon detection needs improvement.

---

# 87. Reliability analytics

Track categorized failures:

```text
unsupported_format
file_too_large
megapixel_limit
decode_failed
worker_failed
memory_guard
encoding_failed
background_removal_failed
zip_generation_failed
unknown
```

Avoid relying solely on raw exception strings.

---

# 88. Registration analytics

Track:

```text
registration_prompt_viewed
registration_started
registration_completed
login_completed
```

Also record context:

```text
save_preset
save_preferences
result_screen
activity_history
header
pricing
```

Need to understand **why** users register.

---

# 89. Pro analytics

Track:

```text
pro_cta_clicked
pro_feature_encountered
pricing_viewed
billing_interval_selected
checkout_started
subscription_activated
subscription_cancelled
subscription_expired
```

Context examples:

```text
batch
preset_limit
advanced_naming
platform_preset
header
pricing
account
```

---

# 90. Pro activation

Paying is not enough.

A user should be considered meaningfully activated when they actually use a Pro capability, for example:

- complete a batch
- use premium platform preset
- create more than three saved presets
- use advanced naming

This should become a health metric.

---

# 91. Analytics implementation boundaries

Avoid session replay initially.

Avoid fingerprinting.

Analytics should be:

- first-party-minded
- consent-aware where legally needed
- disableable
- non-essential to processing
- disabled or separate in development/test environments

Create a central analytics abstraction rather than scattering provider-specific calls.

Maintain a canonical analytics event registry.

---

# 92. Launch strategy

Recommended growth model:

> **Task-led SEO + immediately usable free tools + value-before-registration + contextual account conversion + behaviour-triggered Pro upsell + sister-product demand validation**

---

# 93. Main launch audiences

Recommended initial audiences:

- WordPress site owners
- freelance web designers
- no-code builders
- small-business owners
- church/nonprofit website administrators
- ecommerce store owners
- virtual assistants/content managers
- marketers managing website content

These users repeatedly encounter file-preparation problems.

---

# 94. Soft-launch sequence

Recommended:

### Internal/controlled validation

Test real workflows.

### Private beta

Approximately 20–50 real users using real files.

### Public launch

Only after core paths are reliable.

Feedback should ask:

- What were you trying to prepare?
- Did you know which option to choose?
- Was the result usable?
- Did you need another tool afterwards?
- What did FileSetGo fail to finish?
- Would you use it again?

Key question:

> **Did FileSetGo finish the job?**

---

# 95. Launch channels

Potential channels:

- X
- LinkedIn
- relevant Reddit communities
- WordPress communities
- web-design groups
- no-code communities
- entrepreneur/small-business communities
- existing professional network
- Product Hunt once sufficiently polished
- SEO task pages

Marketing should demonstrate problems/results rather than merely announcing a SaaS launch.

---

# 96. Demonstration content

Good FileSetGo marketing example:

> 5.2 MB JPEG
> Hero preset
> 428 KB WebP
> 91% smaller

Or:

> One logo in → transparent logo + favicon + Apple icon + web logo + Logo Pack.

The product is highly demonstrable.

---

# 97. Do not watermark free output

Recommendation:

> **Never watermark free FileSetGo output.**

Users need professional assets.

Organic sharing should come through product usefulness, not by contaminating user files.

---

# 98. Strong acquisition wedges

Three especially promising entry points identified:

## Logo Pack

> **One logo in. Website-ready logo pack out.**

## File-size limits

Example:

> Make this image under 500 KB.

## Favicon quality

Educational hook:

> Don't just shrink your full horizontal logo into 16 pixels.

These strongly embody FileSetGo's readiness positioning.

---

# 99. Initial launch goals

Recommended learning-focused milestones:

### First goal

500 genuine users successfully prepare files.

### Then

50 repeat users.

### Then

10 paying Pro users.

These teach more than vanity traffic or registrations.

---

# 100. Pro roadmap after launch

Recommended expansion order after initial Pro:

### Phase 2

Advanced Logo/Brand workflow.

### Phase 3

Advanced Batch workflows.

### Phase 4

Activity intelligence.

### Phase 5

Projects.

### Phase 6

Advanced CMS readiness.

### Phase 7

Package recipes.

---

# 101. Future Projects feature

Do **not** build at launch.

Potential future Project example:

### Grace Harmony Website

Store:

- logo preset
- favicon source
- hero preset
- content-image preset
- naming rules

Useful for freelancers/agencies, but should be demand-driven.

---

# 102. Future package recipes

Promising eventual Pro feature:

### New Website Launch Pack

Input:

- logo
- hero
- content images

Output conceptually:

```text
/site-assets
  /branding
    logo-transparent.png
    favicon.ico
    apple-touch-icon.png

  /images
    homepage-hero.webp
    about-team.webp
    service-design.webp
```

This aligns closely with FileSetGo's core market insight about poor file-management knowledge among modern website builders.

---

# 103. Features explicitly deferred from Pro launch

Do not build yet:

- cloud asset storage
- teams
- organizations
- Agency tier
- client portals
- shared workspaces
- AI logo generation
- AI image generation
- Photoshop-style editor
- API
- SDK
- enterprise
- public CDN
- asset hosting
- referral programme
- complex team permissions

Focus the product.

---

# 104. Consolidated implementation programme

A multi-sprint implementation sequence was recommended.

## Sprint A — Visual Foundation

Implement:

- semantic design tokens
- colour system
- gradient system
- light/dark toggle
- spacing system
- surface hierarchy
- removal of decorative section dividers
- section rhythm
- card states
- button depth
- accessibility verification

Do not yet expand into billing/auth.

---

## Sprint B — Global Product Shell

Implement:

- transparent fixed header
- shrinking scroll state
- navigation
- responsive mobile header
- footer restructuring
- sister-product registry
- Pricing
- Sign In
- Get Pro entry points

---

## Sprint C — Workflow UX

Refine:

- preset selection
- upload
- preflight
- recommendations
- advanced settings
- processing
- download/result

---

## Sprint D — Homepage Composition

Refine:

- hero
- File → Set → Go explanation
- task discovery
- privacy
- section rhythm
- visual transitions
- responsive layout

---

## Sprint E — Accounts

Build:

- registration
- login
- password reset
- account state
- account menu
- preferences
- activity foundation
- preset foundation

No billing yet.

---

## Sprint F — Commercial Architecture

Implement:

- central plan config
- entitlement architecture
- pricing page
- homepage pricing
- Pro surfaces
- upgrade entry points

Commercial inputs should be deliberately approved rather than invented during implementation.

---

## Sprint G — Billing

Implement:

- Merchant-of-Record checkout
- provider abstraction
- subscription lifecycle
- webhooks
- renewal/cancellation
- billing management
- entitlement synchronization

---

## Sprint H — Cross-Promotion & Growth

Implement:

- reusable contextual sister-product promotion
- sister-product interest/waitlists where approved
- analytics
- upgrade-event instrumentation

---

# 105. Additional corrective sprint: Logo Pack UX

Because current Logo Pack behaviour has specific defects, a focused implementation milestone was also defined:

### FSG-LOGOPACK-UX-001

Goals:

- move Logo Pack results to Go/right result region
- ZIP-first download
- collapse individual files
- improve favicon source selection
- use icon rather than entire wordmark
- mobile cleanup
- accessibility
- tests

---

# 106. Additional corrective sprint: Transparency

Another focused milestone was defined conceptually:

### FSG-TRANSPARENCY-002

Goals:

- clean matte contamination
- remove enclosed background regions
- preserve anti-aliasing
- edge-aware decontamination
- improve JPEG handling
- meaningful Gentle/Balanced/Strong
- checkerboard/light/dark preview
- regression testing

This work should be considered required before Transparent Logo is production-ready.

---

# 107. Critical implementation order from current state

When Codex access resumes, recommended priority is:

### 1. Finish existing correctness issues first

Especially:

- transparency halos/background remnants
- favicon mark extraction
- Logo Pack result layout/download architecture

These are quality defects.

### 2. Finish visual foundation

- toggle
- colour
- gradients
- rhythm
- surface hierarchy

### 3. Global shell

- fixed transparent shrinking header
- commercial navigation
- footer
- sister-product presence

### 4. Core workflow refinement

### 5. Authentication/account foundation

### 6. Activity and presets

### 7. Entitlements

### 8. Batch processing

### 9. Advanced naming

### 10. Platform presets

### 11. Billing integration

### 12. Public Pro launch

Do not launch paid Pro while most paid capabilities are hypothetical.

---

# 108. Pro launch threshold

A key conclusion:

> **Do not launch paid Pro until a regular website manager can truthfully save meaningful time every week by using it.**

Recommended minimum paid-value bundle:

> **Batch + Presets + Naming + Platform Readiness**

That clears the threshold.

---

# 109. Launch-readiness requirements

Before a broad public launch, verify:

- core workflows reliable
- transparency halos resolved
- favicon extraction corrected
- Logo Pack download presentation corrected
- mobile verified
- Light/Dark verified
- fixed shrinking header verified
- pricing visible
- authentication working
- privacy/terms complete
- analytics functioning
- SEO metadata
- Open Graph/social preview
- FileSetGo favicon
- custom 404
- broken links
- sitemap
- robots
- form protection
- production error monitoring
- backup/recovery where server-side account data exists

FileSetGo itself should meet the readiness principles the Set. Go. family advocates.

---

# 110. Product principles that should now be considered canonical

Several principles emerged strongly enough that Product Office should preserve them.

### Readiness over conversion

FileSetGo is not merely a converter.

It should understand:

> what the file is for

and help prepare it accordingly.

### Beginner first, control available

A beginner should be able to:

> Choose → Upload → Accept recommendation → Download

without understanding technical image settings.

Advanced users can adjust details.

### Free must remain trustworthy

Never intentionally lower output quality to drive upgrades.

### Pro sells productivity

Scale, memory, automation and repeatability.

### Browser-local is a trust advantage

Preserve it wherever feasible and communicate it accurately.

### Results before promotion

Never make account/Pro/sister-product promotion more visually important than the user's successful result/download.

### Configure left, outcome right

In the current File/Set/Go workspace architecture:

> **File/Set = decisions**
> **Go = output**

### No fake links or features

Coming Soon means Coming Soon.

No fake sister-site URLs.

No fake billing.

No frontend-only pretend login.

### Visual separation through rhythm

Use composition, space, tone and depth rather than horizontal dividers.

### Colour is controlled

Sensory and memorable without becoming flashy.

### Product family, not product dependency

Set. Go. products cross-promote but remain standalone.

---

# 111. Governance

Continue existing FileSetGo governance.

Every governed implementation sprint should:

- inspect existing architecture before making changes
- reuse established systems rather than creating parallel ones
- maintain tests
- run the established verification baseline
- preserve accessibility
- document deliberate deferrals
- overwrite canonical root `SPRINT_REPORT.md`
- never create competing sprint-report files
- avoid commits/pushes unless current sprint authority explicitly allows them

---

# 112. Items that are recommendations rather than irreversible decisions

The Product Office should be aware that the following were recommended strongly during this conversation but can still be deliberately reconsidered before implementation:

- Site. Set. Go. as the next sister product
- $7/month Pro pricing
- $59/year annual pricing
- Lemon Squeezy as initial billing provider
- no traditional Pro trial at launch
- 3 saved presets for Free accounts
- Last 10 activity records for Free
- WordPress/WooCommerce/Shopify as initial premium platform presets
- no display ads in core workflow
- no Agency tier initially
- USD-only base pricing initially
- no cloud file storage at launch

Everything should be changed only intentionally, not accidentally by implementation.

---

# 113. Outstanding Product Office decisions

The following still merit explicit Product Office confirmation before their implementation milestone:

| DecisionCurrent recommendation |                                 |
| ------------------------------ | ------------------------------- |
| Pro monthly price              | $7                              |
| Pro annual price               | $59                             |
| Billing provider               | Lemon Squeezy                   |
| Merchant of Record model       | Yes                             |
| Free saved presets             | 3                               |
| Free history                   | Last 10, provisional            |
| Pro history retention          | Not yet finalized               |
| Free/Pro naming behaviour      | Advanced naming Pro             |
| Initial premium platforms      | WordPress, WooCommerce, Shopify |
| Trial                          | None initially                  |
| Ads                            | None in core workflow           |
| Agency tier                    | Deferred                        |
| Sister-product waitlists       | Recommended later               |
| File storage                   | No cloud library initially      |

---

# 114. Product Office immediate next action

The Product Office should **not reopen all of these discussions from scratch**.

The best next move is to take this handover and:

1. classify the requirements into **correctness**, **visual foundation**, **commercial shell**, **workflow UX**, **accounts**, **Pro**, **billing**, and **growth**;
2. reconcile them with the existing FileSetGo roadmap and already-completed milestones;
3. assign canonical sprint IDs;
4. avoid duplicating work already implemented;
5. prioritize the current Logo Pack/transparency/favicon correctness defects;
6. then continue through the consolidated implementation programme.

The key strategic conclusion of this entire conversation is:

> **File. Set. Go. should become the product that helps non-experts prepare files correctly for real website use—not merely another image converter. The free product must finish the job properly, while Pro monetizes repeated professional workflow. The interface should feel intentionally designed through colour, depth, rhythm and guided decisions, and the wider Set. Go. family should become visible without distracting from the user's immediate task.**

That is the handover I would treat as the canonical bridge into the Product Office.