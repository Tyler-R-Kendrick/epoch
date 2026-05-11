---
product: Gerrit Code Review
gossip_sources:
  - https://issues.gerritcodereview.com/
  - https://www.gerritcodereview.com/issues.html
  - https://gerrit-review.googlesource.com/Documentation/user-review-ui.html
  - https://gerrit-review.googlesource.com/Documentation/config-submit-requirements.html
---

# Gossip

## What People Say

Gerrit's reputation is that it is powerful, strict, and culturally different from pull-request forges. Public issue tracking and documentation point to an actively maintained but specialized system whose users often care more about review correctness than broad approachability.

## Design And UX Complaints

- The review UI is intentionally dense, and the concepts require training.
- The most valuable shortcuts and labels can feel like internal project language rather than general product UX.
- Plugins can extend the UI in arbitrary ways, which is useful locally but can make Gerrit instances feel inconsistent across organizations.

## Feature Complaints

- Submit requirement expressions are powerful but easy to misconfigure, especially when inherited project settings, branch exemptions, legacy submit rules, and plugin-provided checks interact.
- Contributors must understand when comments are drafts, when votes publish, which patch set is current, and what each label means.

## Product Risk For Epoch

Gerrit is a warning and an inspiration. Durable review metadata and explicit submit state are strategically valuable, but Epoch should make equivalent guarantees legible without requiring every user to learn Gerrit-style review mechanics.

