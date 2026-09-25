# FSG-007H — Production Traffic Readiness & Compliance Checkpoint

## Status

CLOSED (2026-09-24) — compliance/hardening scope complete. This directive is
being recorded after the fact to close a governance gap: the checkpoint was
carried out and referenced throughout `SPRINT_REPORT.md` and
`docs/governance/ROADMAP.md` before a directive file existed for it, unlike
every other lettered FSG-007 sub-sprint. It does not retroactively change
what was authorized or done — see "Evidence" below for the actual record —
it only gives that work a governance artifact consistent with
`docs/directives/FSG-007A.md`, `FSG-007G.md`, and `FSG-006R.md`.

## Parent Milestone

FSG-007 — Public Product Experience & Launch

## Governing Directive

FSG-007A — Complete Front-Facing Website Redesign. This checkpoint does not
amend, supersede, or close FSG-007A or FSG-007G.

## Objective

Reconcile the repository's governance documents with the verified state of
production, and close a specific compliance/security/deployment gap
independent of the FSG-007G presentation work:

- Full cookie/browser-storage inventory.
- Privacy/legal page audit against owner-supplied legal facts only (no
  invented facts).
- Production security recertification: CSP, HSTS, redirect behavior, and
  cookie attributes, verified via live headers and authorized SSH access to
  the production host.
- A Hostinger-account-specific deployment runbook.
- A backup/recovery assessment, including a from-scratch recovery exercise.
- Correction of stale `ROADMAP.md` / `SPRINT_REPORT.md` language that
  contradicted the actual, already-live deployment state.
- Investigation and correction of a pre-existing `header-navigation.spec.ts`
  mobile-trust test defect, and of tracing-induced flakiness in
  `stress.spec.ts` and `processing-transition.spec.ts`.

## Scope Boundary

Explicitly out of scope for this directive:

- Any change to Quick Fit, Guided Fit, Logo Pack, unified source handling,
  crop behavior, enlargement approval, processing phases, worker behavior,
  or result truth (all remain governed by their own frozen contracts in
  `SPRINT_REPORT.md`).
- Final FSG-007 multi-engine launch certification.
- FSG-007G's own Product Office visual acceptance.
- Beginning FSG-008.

No application code was deployed to production under this directive.
Production already matched repository HEAD `ee9207a` — confirmed via
authorized SSH — before this checkpoint began, and no new commit was pushed
during it.

## Production Change Authorization

One live production change was made under this directive: a baseline HSTS
header (`max-age=15552000`, no `includeSubDomains`/`preload`) was applied to
`filesetgo.com`, after independently verifying certificate issuance and
renewal arrangements would not be broken by it. This is recorded here as the
directive-level authorization for that change. Full before/after evidence is
in `docs/compliance/SECURITY-AND-RECOVERY-VERIFICATION.md` §3.

## Evidence

- `docs/compliance/COOKIE-INVENTORY.md`
- `docs/compliance/PRIVACY-AND-LEGAL-REVIEW.md`
- `docs/compliance/SECURITY-AND-RECOVERY-VERIFICATION.md`
- `docs/compliance/COMPLIANCE-DECISION-REGISTER.md`
- `docs/deployment/PRODUCTION-RUNBOOK.md`
- `SPRINT_REPORT.md`, "FSG-007H — Production Traffic Readiness & Compliance
  Checkpoint" section and "FSG-007H checkpoint (2026-09-23)" verification
  table.

## Closure

FSG-007H's own scope — cookie/privacy/security/deployment/monitoring
compliance — is closed. It does not constitute FSG-007's own launch
certification, does not close FSG-007G, and does not authorize FSG-008.
Outstanding follow-on work (full multi-engine recertification, FSG-007F/G
visual acceptance, the open Linux-CI-only mobile hero overflow finding) is
tracked under FSG-007's "Next Authorized Work" in `SPRINT_REPORT.md`.
