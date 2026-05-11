---
product: Gerrit Code Review
design_sources:
  - https://gerrit-review.googlesource.com/Documentation/user-review-ui.html
  - https://gerrit-review.googlesource.com/Documentation/config-submit-requirements.html
  - https://gerrit.googlesource.com/gerrit/+/refs/heads/master/polygerrit-ui/
---

# Design

## Look And Feel

Gerrit's modern web UI, often referred to as PolyGerrit in project materials, is functional and review-dense. The primary surfaces are dashboards, a change screen, and side-by-side or unified diff views. The UI emphasizes metadata, reviewer chips, attention sets, labels, submit requirements, patch sets, file lists, inline comments, and keyboard shortcuts.

## Open Design Assets

- Public Review UI documentation with screenshots and screen anatomy.
- Public source for the web UI implementation.
- Product documentation for submit requirements, labels, attention set, patch sets, comments, and plugin extension points.

## Differentiators

- The change screen makes review state explicit: who owns the change, who uploaded the current patch set, who is in the attention set, which labels are satisfied, and which submit requirements still block landing.
- Keyboard shortcuts, Vim-like diff search, quick approve, draft comment flow, and patch-set comparison target expert reviewers who spend large parts of the day in code review.
- Plugin extension points let organizations adapt the review UI to local infrastructure.

## What Works

- Patch sets are easier to reason about than force-pushed PR branches when a reviewer needs to compare versions of the same proposed change.
- Attention set and label votes create a crisp model of who needs to act next.
- Review metadata living alongside Git data through NoteDb aligns better with audit and replication needs than purely external database rows.

## UX Breakdowns

- Gerrit vocabulary is specialized: changes, patch sets, labels, submit requirements, `refs/for`, attention set, votes, and topics are powerful but unfamiliar to GitHub-trained users.
- Numeric votes such as `Code-Review+2` are efficient for insiders and opaque for newcomers.
- Admin configuration can be hard to reason about because submit requirements are expression-based, inherited, and can interact with legacy labels, plugin rules, and branch exemptions.

