---
product: Review Board
slug: review-board
category: code_review_platform
primary_sources:
  - https://www.reviewboard.org/
  - https://www.reviewboard.org/features/
  - https://www.reviewboard.org/docs/manual/latest/users/reviews/review-requests/
  - https://www.reviewboard.org/docs/manual/latest/admin/configuration/repositories/
  - https://www.rbcommons.com/
---

# Review Board

Review Board is a long-running code review platform with support for Git, Mercurial, Perforce, Subversion, and other repository backends. It competes with Epoch where teams need reviewable evidence across code, documents, images, and legacy SCM systems without adopting a single hosted forge.

## Competitive Relevance

- Review Board treats review requests as durable objects that can span multiple SCM systems and attachment types.
- Its multi-SCM support matters for enterprises that still combine Git, Perforce, SVN, and Mercurial.
- RBCommons provides the hosted version, while Review Board remains self-hostable for teams with private infrastructure.
- The review model emphasizes comments, issue tracking, approval, screenshots, and rich diffs rather than branch-native pull request workflow only.

## Epoch Implications

- Epoch should not assume all review evidence lives in Git pull requests. Review Board shows a market for SCM-neutral review records.
- Epoch's signed event history could pair well with review-request evidence if it can export or reference durable review state.
- Asset and document review support is a reminder that repository history often contains more than text code.

## Unknowns To Track

- Hosted RBCommons packaging and pricing should be rechecked before procurement comparisons.
- Review Board's strongest fit may be established enterprises and legacy SCM users rather than greenfield Git-native teams.
