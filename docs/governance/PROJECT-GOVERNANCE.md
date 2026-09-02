# FileSetGo Project Governance

## Purpose

This document defines how approved product and technical decisions become directives, implementation, verification, and durable project history for FileSetGo.

## Naming

Governing content uses these names consistently:

- public brand: **File. Set. Go.**;
- operational/product name: **FileSetGo**;
- domain: `filesetgo.com`;
- core package: `@filesetgo/core`;
- milestone prefix: `FSG-`; and
- repository: `SilvestrLee/filesetgo`.

Historical names may appear only where audit provenance requires them. They do not define current product identity.

## Authority Order

1. `docs/governance/MASTER-BLUEPRINT.md`
2. `docs/governance/DECISIONS.md`
3. `docs/governance/ROADMAP.md`
4. current directive in `docs/directives/`
5. architecture, security, and testing documentation
6. implementation

A lower-level artifact may clarify a higher-level decision but may not contradict it. When a conflict is discovered, implementation stops until the higher-level documents are reconciled and the applicable decision or directive is updated.

## Decision Management

Durable architectural and product decisions are recorded in `DECISIONS.md` as uniquely numbered ADRs. Existing ADR numbers must not be reused or duplicated. A changed decision is documented as an explicit amendment or a new ADR that supersedes the prior decision.

The master blueprint records the integrated governing model. The decision register records why specific constraints exist. The roadmap controls sequencing, while directives define the bounded work authorized for the current milestone.

## Directives

Each implementation milestone has one current directive in `docs/directives/`. A directive must state:

- its objective;
- required outcomes;
- non-goals;
- safety and privacy constraints; and
- required verification.

A directive cannot silently expand the roadmap or override an ADR.

## Change Boundaries

Governance-only tasks must not include product implementation. Implementation commits should not absorb unrelated governance, tooling, or environment changes. Staged changes must be inspected before commit so each commit has one coherent purpose.

## Verification and Reporting

Verification results must be reported truthfully. A command result does not substitute for browser or device verification when a directive requires real-browser evidence.

The repository-root `SPRINT_REPORT.md` is the canonical current report. It is replaced only at a formally governed sprint or checkpoint. Earlier reports remain recoverable through Git history and should not be copied into parallel current-report files.

`CHANGELOG.md` tracks notable product releases and unreleased infrastructure. An implementation commit is not automatically a public release.

## Repository Hygiene

- Governing Markdown files must not remain empty placeholders.
- Product code must follow the current directive and all higher authorities.
- Retired naming must not appear in new governing content except for necessary historical audit provenance.
- Security and privacy constraints are architecture requirements, not optional release notes.
