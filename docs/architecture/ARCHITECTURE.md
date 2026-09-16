# FileSetGo Architecture

## System Shape

```text
                    FILESETGO

             Laravel Product Layer
                     │
                     ▼
                Web Application
                     │
                     ▼
             @filesetgo/core
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
     Preflight                Worker Runtime
        │                         │
        ▼                         ▼
     Safety                    Decode
                                  │
                                  ▼
                              Normalize
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
                 Inspect       Transform       Encode
                    │             │             │
                    └─────────────┼─────────────┘
                                  ▼
                               Validate
                                  │
                                  ▼
                                Export
```

The Laravel layer presents the product. The web application translates user intent into typed core-package jobs. `@filesetgo/core` performs reusable preflight and processing work in the browser. Heavy processing is isolated in a worker runtime.

## Laravel Responsibility

Laravel owns:

- routes;
- pages;
- SEO;
- product copy;
- legal pages;
- future analytics policy;
- future monetization; and
- future promotion policy.

Laravel does not own V1 raster-processing algorithms. It must not become a required ingestion or transformation service for supported V1 workflows.

## Web Application Responsibility

The web application owns interaction orchestration:

- file selection;
- collecting Quick Fit requirements or Guided Fit preset choices;
- displaying preflight metadata and suitability warnings;
- dispatching typed jobs;
- displaying progress and structured errors;
- sending cancellation commands; and
- presenting validated outputs for local download.

FSG-003 is the first realized implementation of this layer: the Quick Fit workflow (`resources/js/quick-fit/`) translates plain-language requirements (target file size, optional maximum dimensions, output format, dimension-flexibility) into `processImage()`/`processImageToTarget()` calls, and translates structured outcomes back into human-language success, unreachable-target, and error presentations. See `docs/governance/DECISIONS.md` ADR-016 for how this layer is internally split (DOM-free orchestration vs. a thin DOM-binding controller) for testability.

FSG-004 adds Guided Fit (`resources/js/presets/`) as a second way to arrive at the same requirement shape, not a second processing path. A preset compiler (`compilePreset()`) converts a destination/use-case preset directly into the identical `QuickFitRequirements` shape Quick Fit's own form produces; `GuidedFitController` composes the existing, unmodified `QuickFitWorkflow` (`resources/js/quick-fit/workflow.ts`) by calling its public API, the same way the Quick Fit form's controller does. Destination/product knowledge (preset catalog, categories, provenance) stays entirely in `resources/js/presets/` — `@filesetgo/core` and `QuickFitWorkflow` remain destination-neutral and were not modified.

FSG-007-FIT-002 extends that identical compiled shape to also carry `exactDimensions`/`crop`/`allowUpscale` for all three initial presets (Hero/Content/Card), which now describe an exact destination frame rather than a bounding box — see `docs/governance/DECISIONS.md` ADR-028. `@filesetgo/core` and `QuickFitWorkflow` still remain destination-neutral and were not modified; the exact-frame + approved-crop path they expose (`ExactDimensionsOptions`) already existed generically from FSG-007-FIT-001. The one new shared piece is the interactive crop stage itself (`resources/js/quick-fit/locked-crop-stage.ts`), factored out of Quick Fit's controller into a DOM-ref-parameterized module so Guided Fit's own crop step reuses the identical engine against its own dialog markup, rather than a second implementation.

FSG-007-FIT-003 (frozen at revision R5.1; see `docs/governance/DECISIONS.md` ADR-029–ADR-031 and the R5/R5.1 addenda for how it got here) governs the final processing architecture: task modals own decisions, one shared application-level interstitial owns work, and the workspace owns results. Confirming a run inside any task dialog (Quick Fit, Guided Fit, Logo Pack) closes that dialog *synchronously* — no animated exit, no deferred timer — immediately before a single full-page interstitial (`#fsg-processing-overlay`, a `<body>`-level sibling of `<main>`/nav/footer via `@stack('overlays')`, not a `<dialog>` or a route) becomes visible and marks the rest of the workspace `inert` (`setWorkspaceInert()`) for the duration. There is no code path where a task dialog and the interstitial are both visible at once, and no per-tool in-modal processing presentation exists any more — the old duplicate UIs were deleted outright, not merely hidden behind the overlay.

The shared layer, `resources/js/shared/` (`processing-phase.ts`, `reveal-gate.ts`, `render-processing-section.ts`, `minimum-dwell-gate.ts`), sits above all three tools' existing controllers rather than inside `@filesetgo/core` — zero core changes, since the worker already performs real output validation and hard-cancellation this layer only needed to surface truthfully. `ProcessingPhase` is derived from each tool's own unmodified state union by a pure adapter function. `RevealGate` is the one shared state machine behind every tool's atomic Ready → close-interstitial + populate-GO handoff, generalizing FIT-002's one-shot `guidedFitAutoClosedForSuccess` boolean; GO's DOM is populated the instant the real result exists, never merely on a timer, so the interstitial can never leave while GO is still empty. `MinimumDwellGate` enforces a minimum *visible* duration for Preparing/Validating — measured from a real, `requestAnimationFrame`-confirmed paint, never from mere request — governed by two constants that never stack extra wait on top of an already-slow job: `MIN_PREPARING_VISIBLE_MS = 1200` and `READY_DWELL_MS = 600`. `render-processing-section.ts`'s `ProcessingCopy`/`resolveProcessingStateText` is the single source of eyebrow/title/status text for every tool, so the three can never disagree with each other or with the real phase; each tool supplies its own copy table (stage text, ready/failed/cancelled copy) — the sharing is in the phase model, the reveal mechanism, and the visual contract, not in the words shown. Change Image and the dialog header `×` are hidden, not disabled, while a job is genuinely active.

The interstitial's visible content is the FILE → SET → GO rail (`#fsg-processing-rail`): a horizontal rail on desktop, a reduced-scale horizontal band on tablet, and a genuine vertical FILE ↓ SET ↓ GO stack on mobile — never one rail scaled down. FILE is always shown "accepted" with a real thumbnail of the confirmed source (reusing the existing unified-source thumbnail pipeline, not a second preview mechanism) or a plain file icon where the browser cannot render one (e.g. HEIC). SET is active while genuinely preparing and resolved once done. GO is pending while preparing, shows "checking" only for tools whose real phase model includes a validating step, and resolves on Ready. Every stage/caption/connector visual state is pure CSS keyed off one `data-phase` attribute — no per-phase JS branching. A one-line, frozen-at-confirmation task-context summary (e.g. `1600 × 900 · WebP · target under 500.0 KB`) accompanies the rail; for tools whose context text varies by phase (currently only Logo Pack's asset-count line), it is derived from the same live `ProcessingPhase` value the rail itself reads, never cached as a single string at confirmation, so it cannot go on saying "Preparing" once the state has moved to Ready.

On a genuine success reveal, focus moves to GO's own result heading (`#result-title`), not the just-closed dialog's trigger button, accompanied by a restrained one-shot border emphasis — no bounce, no confetti. Cancellation shows a real Cancel action on the interstitial only while the underlying job is genuinely still running, terminates the actual worker, and returns the workspace to normal; a stale job can never replace the current result. Reduced-motion preferences retain the full state story (FILE/SET/GO captions, thumbnail, result) with the animated glyph rendering statically instead of disappearing. None of this required a `packages/core` change, a new route, or a new runtime dependency at any revision.

The FSG-007 public shell keeps presentation concerns outside the processing engine. Theme tokens live in `resources/css/app.css`; the small shared `resources/js/theme.ts` entry is loaded independently of the homepage-only processing entry. First-visit `system` appearance is CSS-driven, while an explicit theme is mirrored to local storage and the allow-listed `fsg_theme` cookie. Laravel validates that cookie to `system|light|dark` before rendering the root attribute, so return visits and navigation start in the chosen theme without an inline bootstrap script or a CSP exception.

Set. Go. family metadata is centralized in `config/product-family.php` and normalized by `App\Support\ProductFamily`. Optional sister-product destinations come from deployment configuration; malformed or absent URLs remain non-interactive `Coming soon` entries. The shared `related-product` Blade component checks a product's governed contexts before rendering, and is mounted only inside existing successful-result containers. Product-family presentation therefore does not create a new processing path or interrupt the current FileSetGo task.

## Core-package Responsibility

`@filesetgo/core` owns:

- preflight;
- format identification;
- runtime capabilities;
- workers;
- decode;
- orientation;
- transforms;
- encode;
- validation primitives; and
- errors.

The package exposes processing capabilities, not host-product concepts. Presets orchestrate these primitives without duplicating them.

`processImageToTarget()` (FSG-002) is a bounded orchestration on top of these same primitives, not a second processing architecture: it reuses preflight, the safety gate, decode, orientation normalization, resize, encode, and output validation, adding only a deterministically bounded dimension-tier × quality-probe search loop. It shares the same single active-job runtime slot as `processImage()` — starting either kind of job cancels whichever job (of either kind) is currently active. See `docs/governance/DECISIONS.md` ADR-015 for the search's bounded parameters.

`processImageSet()` (FSG-005A) extends the same pattern to multiple outputs from one primary source, with a bounded named-source registry added by FSG-007 for explicitly source-specific outputs. It reuses the same render/encode/validate primitives sequentially, decodes each source lazily for its consecutive output group, closes that bitmap before switching, and shares the identical single active-job runtime slot as `processImage()`/`processImageToTarget()` — a third kind competing for the same one-job invariant, not a separate concurrency model. An optional ZIP archive step (`packages/core/src/archive/`) is layered on top, itself hidden behind a FileSetGo-owned adapter so no third-party archive library type ever appears in a public `@filesetgo/core` contract. Package/output-count, source-count, and total-byte safety limits mirror the safety-limit pattern established for source files (ADR-004) and the target-size search (ADR-015). See `docs/governance/DECISIONS.md` ADR-017 and ADR-025.

FSG-005B adds the Website Logo Pack (`resources/js/logo-pack/`) on top of the same `processImageSet()` foundation, contributing two new *generic* core capabilities in the process — a fixed-canvas CONTAIN render primitive (`transforms/contain.ts`) and a small dependency-free ICO container reader/writer (`icons/ico.ts`) — neither of which has any concept of "logo," "favicon," or "icon." `ImageSetOutputSpec`/`ImageSetAssetResult` became discriminated unions (`'raster' | 'contain' | 'ico'`) to represent this without polluting `processImage()`/`processImageToTarget()`. All Logo Pack-specific knowledge (the exact seven-asset composition, geometry/resolution suitability assessment, controlled-upscale policy) lives in `resources/js/logo-pack/`, mirroring the `resources/js/presets/` boundary FSG-004 established. See `docs/governance/DECISIONS.md` ADR-018.

FSG-006 adds no new product feature; it certifies the existing V1 surface against real browser engines (`tests/browser/`, Playwright — see `docs/governance/DECISIONS.md` ADR-019 and `docs/testing/TESTING.md`) rather than only mocked unit boundaries. That certification found and fixed one real defect that had crossed every prior unit-tested boundary undetected: `runtime/protocol.ts`'s `isImageWorkerEvent()` validated every `ImageSetAssetResult` against the raster-only shape unconditionally, silently discarding every real Logo Pack job's completion message (it always includes an ICO asset, which has no raster shape) before it ever reached the UI. This is recorded as the canonical example of why the worker-protocol validation boundary (`packages/core/src/runtime/protocol.ts`) must be exercised with real, fully-shaped fixtures — not simplified stand-ins — whenever a new discriminated-union variant is added to it.

FSG-005C adds a fourth heavy-job kind, `'transparent-master'`, and two more genuine core-package generics: `transforms/alpha-inspection.ts` (`inspectAlpha()` — real decoded-pixel alpha classification, never inferred from format) and `transforms/background-removal.ts` (`removeConnectedBackground()` — boundary-informed, connectivity-aware background removal with soft edges and decontamination). Both carry zero "logo"/"transparent background" terminology, matching the same generic-core / product-specific-shell boundary FSG-005B established with `contain.ts`/`icons/ico.ts`. The new job kind is orchestrated by `workers/process-transparent-master.ts` and shares `ImageProcessingRuntime`'s existing single active-job slot (`runtime/worker-client.ts`) alongside `processImage()`/`processImageToTarget()`/`processImageSet()` — starting any one of the four cancels whichever of the other three is active. Its terminal worker-protocol event, `JOB_COMPLETE_TRANSPARENT_MASTER`, has its own dedicated shape validator (`isTransparentMasterResult()`) rather than being routed through the raster-shaped `isProcessedImageResult()` — a deliberate reapplication of the FSG-006 lesson in the paragraph above. Logo Pack's Transparent mode (`resources/js/logo-pack/`) orchestrates this new job kind as an explicit second stage — prepare-and-verify a transparent master, preview it, then package from it — before the existing FSG-005A/FSG-005B packaging pipeline runs unchanged against that master. See `docs/governance/DECISIONS.md` ADR-020.

FSG-007 separates that transparent-master stage's analysis resolution from its output resolution. Background analysis/removal remains at the 1024px bound, then `source-resolution-alpha.ts` applies the accepted mask/edge model in bounded strips to the orientation-normalized source-resolution canvas. The removal model now follows the boundary flood with a conservative component pass for background-like enclosed regions: confident counters/holes join the removal mask, uncertain light artwork stays intact and forces `needs-review`, and compact downsampled candidates require near-exact confirmation against source-resolution colour before clearing. Protected ambiguity always wins. `alpha-bounds.ts` then detects meaningful full-resolution outer alpha, rejects near-empty remnants, calculates bounded safe padding, and the worker copies the content rectangle 1:1 onto the fitted output canvas. `TransparentMasterResult` exposes source, normalized, analysis, visible-bound, padding, trim, and no-rescale facts across the validated worker protocol. Logo Pack still decodes that one accepted master once and derives the same seven outputs; only its source canvas is now fitted and source-detail-preserving. See ADR-024 and ADR-027.

FSG-007's favicon-source flow extends `processImageSet()` with a bounded generic named-source registry. Output specs may reference a source id; the runtime validates and preflights each Blob before worker creation, and the worker decodes sources lazily, closing the previous bitmap when the ordered output sequence switches source. Logo Pack maps its accepted full prepared master to the two header outputs and one explicitly confirmed favicon source to the five square outputs. Suitability, freeform region selection, transparent-edge normalization, alternate-icon normalization, user confirmation, and the seven-output mapping remain product-layer concerns in `resources/js/logo-pack/`; the core has no logo/favicon semantics. See ADR-025 and ADR-026.

FSG-007B keeps the homepage workspace controller/state architecture intact while moving Guided Fit and Logo Pack configuration into native `<dialog>` task surfaces. Closed dialogs do not participate in workspace layout, so advanced flow state can grow without changing the FILE/SET/GO shell height. The existing controllers remain the sole owners of processing and result state; dialogs only provide progressive disclosure, focus containment, and mobile full-viewport presentation. Quick Fit remains inline and all successful results continue to render in the shared GO stage.

## FSG-006R Runtime Hardening

FSG-006R hardens the existing target-size path without changing ADR-015's search algorithm. Quality-probe history is metadata-only; only the selected fitting candidate retains encoded bytes, and unreachable closest-miss diagnostics contain no Blob. The source Blob and decoded `ImageBitmap` remain job-scoped, only the current tier's `OffscreenCanvas` is live, the previous canvas is zeroed before replacement, and final cleanup closes the bitmap and zeroes the last canvas.

Host-side cancellation remains immediate. The runtime settles cancellation, detaches handlers, terminates the active worker, and creates a fresh worker for later work without waiting for a decoder or WASM message loop to yield. See ADR-023.

## Architectural Constraints

- Supported V1 processing is browser-first and requires zero server ingestion.
- Heavy work is worker-first and initially limited to one active job.
- Format signatures and container structures are authoritative over filename extensions and declared MIME types.
- Dimensions should be inspected before full bitmap allocation wherever the format permits.
- Every job is identified, cancellable, and protected against stale results.
- Every terminal path releases resources that are no longer needed.
- Export occurs only after output validation succeeds.
- Any repeated-attempt processing (e.g. target-size search) must have an explicit, deterministic upper bound on total work — no unbounded or open-ended loops.
