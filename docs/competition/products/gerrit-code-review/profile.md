---
product: Gerrit Code Review
slug: gerrit-code-review
category: review_first_forge
primary_sources:
  - https://www.gerritcodereview.com/
  - https://gerrit-review.googlesource.com/Documentation/index.html
  - https://gerrit-review.googlesource.com/Documentation/user-review-ui.html
  - https://gerrit-review.googlesource.com/Documentation/config-submit-requirements.html
  - https://gerrit-review.googlesource.com/Documentation/note-db.html
---

# Gerrit Code Review

Gerrit is a self-hostable Git code review system organized around changes, patch sets, labels, submit requirements, and server-side merge gates. It competes with Epoch where teams want every change to move through explicit review state before landing in canonical history.

## Competitive Relevance

- Gerrit is review-first rather than branch-first. Developers push commits to `refs/for/*`, Gerrit creates change records, reviewers vote on labels, and submit requirements determine whether a change can land.
- NoteDb stores code review metadata in Git refs, which is closer to Epoch's durable-history instincts than SaaS-only PR metadata.
- Large projects that value strict review, auditability, and custom submit rules can treat Gerrit as infrastructure, not just a UI.

## Epoch Implications

- Gerrit proves that serious teams will accept a specialized workflow when review integrity is the payoff.
- Epoch should learn from Gerrit's patch-set and metadata durability, while avoiding the onboarding tax of magic refs, numeric label votes, and admin-heavy submit expressions.
- Native default: `epoch change submit` is change-based review publish ([ADR-0051](../../../design-decisions/0051-change-based-review-publish.md)). The Git dialect is a `Change-Id` trailer and `refs/for/<target>`; it is not a `gerritMode` flag.

