---
paths:
  - resources/css/app.css
---

# Css

## Toggling `.hidden` on `.fsg-task-dialog__progress li` needs an explicit override
`.fsg-task-dialog__progress li { display: flex; ... }` (one class + one element, specificity 0,1,1) has higher specificity than Tailwind's `.hidden { display: none }` (0,1,0), so simply adding/removing `hidden` on a progress-list `<li>` silently does nothing. A dedicated `.fsg-task-dialog__progress li.hidden { display: none; }` override is required (added for FSG-007-FIT-002's conditional "Confirm crop" step). If a wizard-style progress `<ol>` ever needs a variable step count, also toggle a `--four`/`--N` grid-column-count modifier class on the `<ol>` itself — a fixed `repeat(3, ...)` grid misplaces a 4th visible item onto a wrapped row instead of forming 4 even columns.

## `.fsg-task-dialog__surface`'s grid-template-rows assumes exactly 4 children
`.fsg-task-dialog__surface { grid-template-rows: auto auto minmax(0,1fr) auto; }` positionally maps header/progress-nav/content/actions to rows 1-4. A dialog with only 3 direct children (no progress nav, e.g. Quick Fit) gets silently mis-mapped: content lands on the "progress" `auto` row (sized to its own full height, unconstrained) and the actions footer lands on the `minmax(0,1fr)` row (collapsed near 0), rendering past the surface's fixed height where `overflow:hidden` clips it invisibly — this was the real cause of a "primary action not visible" defect (FSG-007-FIT Quick Fit compact-content remediation), not a content-height problem. Any dialog surface with a 3-child shape must add the `.fsg-task-dialog__surface--no-progress` modifier (`grid-template-rows: auto minmax(0,1fr) auto`). If you ever add/remove a `.fsg-task-dialog__surface` child, re-verify the row-count still matches.

## Reduced-motion overrides for state-driven CSS must match the specificity they're beating
When a `[data-phase='x'] .child[data-attr='y']`-style rule (3 selectors) drives an animation, a `@media (prefers-reduced-motion: reduce)` override written as the bare `.child` class (1 selector) silently loses the cascade and the animation keeps running — the media query does not add specificity. Write the override with matching/higher specificity (e.g. `.glyph[data-phase] .child[data-attr]`) so it actually wins. Same family of bug as the documented `.fsg-task-dialog__progress li.hidden` vs `li` gotcha. Found via FSG-007-FIT-003's `.fsg-processing-glyph` reduced-motion rule, which needed this exact fix (see git history around that date).
