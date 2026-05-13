---
product: Review Board
design_sources:
  - https://www.reviewboard.org/features/
  - https://www.reviewboard.org/docs/manual/latest/users/reviews/review-requests/
  - https://www.reviewboard.org/docs/manual/latest/users/reviews/diffs/
  - https://www.reviewboard.org/docs/manual/latest/users/reviews/file-attachments/
---

# Design

## Look And Feel

Review Board has a utilitarian enterprise review UI: review requests, diff viewers, issue flags, comment threads, file attachments, screenshots, and ship-it style approval states. The interaction model is organized around the review request rather than a repository branch page.

## Open Design Assets

- The official feature pages and user manual provide screenshots and flow documentation for review requests, diffs, file attachments, and dashboard use.
- No public design-token system was found during this pass.
- The open-source project is the implementation reference for teams customizing a self-hosted deployment.

## Differentiators

- The review request is the central unit, which can be connected to many repository types and external bug trackers.
- Visual review is not limited to code diffs; screenshots and file attachments support UX, document, and binary-adjacent review flows.
- Enterprise administrators can configure repositories and integrations without forcing every team into the same forge.

## What Works

- The UI is explicit about review state, open issues, reviewer action, and discussion.
- Teams with Perforce, SVN, Mercurial, and Git can keep a common review process.
- Attachments and screenshots make design and documentation review part of the same workflow as code review.

## UX Breakdowns

- The interface can feel older and more operational than modern GitHub/GitLab pull request pages.
- Review requests add another object model beside branches and commits, which can feel disconnected from Git-native development habits.
- Self-hosted configuration breadth is powerful but can increase administrative complexity.

## Epoch Design Lessons

- Epoch should model review evidence as first-class history-adjacent data, not only as a forge comment stream.
- Supporting non-code artifacts and legacy repository backends can be a differentiator if the signed event model remains understandable.
