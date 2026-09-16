---
paths:
  - resources/js/quick-fit/controller.ts
---

# Quick Fit

## Auto-close-on-success in render() must be one-shot, not re-fire every render
`render()`/`renderGuidedFit()` call `closeWorkflowDialog(...)` whenever `state.status === 'success'`. Since these render functions re-run on every `renderAll()` (any UI click, not just workflow state changes), a naive unconditional check re-closes the dialog on every subsequent render while status stays 'success' — breaking any deliberate reopen-after-success flow (e.g. Guided Fit: reopen and pick a different destination for the same result). Guard with a one-shot flag reset when status leaves 'success' (see `guidedFitAutoClosedForSuccess`, added FSG-007-FIT-002). Quick Fit's own `render()` has the identical unguarded pattern for `quickFitDialog` — not fixed here (out of this milestone's scope), but the same bug is latent there too.
