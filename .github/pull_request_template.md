## Summary

Describe the user, product, governance, or infrastructure outcome of this change.

## Governing Scope

- Milestone or governance task:
- Current directive:
- Relevant ADRs:

## Changes

- Describe the bounded changes included in this pull request.

## Verification

List commands and actual browser or device checks that were run. Do not mark unperformed verification as passing.

- [ ] `git diff --check`
- [ ] Applicable automated tests pass
- [ ] Applicable build and type checks pass
- [ ] Required browser/device evidence is reported truthfully

## Safety and Privacy

- [ ] Supported V1 source files remain on the user's device
- [ ] Analytics receive no filenames, EXIF metadata, image binaries, or arbitrary image content
- [ ] New parsing or processing work is bounded and returns structured failures
- [ ] Cancellation, stale results, and resource cleanup were considered where applicable

## Review Checklist

- [ ] The change follows the governance authority order
- [ ] Scope matches the active directive and its non-goals
- [ ] Product code and unrelated governance/tooling changes are isolated
- [ ] No ADR number is duplicated
- [ ] `SPRINT_REPORT.md` was changed only for a formally governed report
- [ ] Public release notes were added only when this is a notable product release
