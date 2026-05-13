---
product: RhodeCode
design_sources:
  - https://rhodecode.com/features
  - https://docs.rhodecode.com/5.x/rce/collaboration/pull-req-mgmt.html
  - https://docs.rhodecode.com/5.x/rce/code-review/code-review.html
  - https://docs.rhodecode.com/5.x/rce/admin/repo_admin/repo-perm-steps.html
---

# Design

## Look And Feel

RhodeCode's public materials and docs present a utilitarian enterprise forge: repository lists, admin screens, permission tables, pull-request queues, side-by-side diffs, review statuses, and service-management workflows. The product favors function density and administration clarity over consumer-grade visual polish.

## Open Design Assets

- Product pages and documentation include screenshots for repository management, pull request dashboards, code review, gists, and service management.
- No public design system or token package was found in the reviewed materials.
- The documentation itself is a useful design reference because it exposes the navigation hierarchy: Admin, Repositories, Pull Requests, Notifications, Permissions, AI configuration, and integrations.

## Differentiators

- One UI model spans Git, Mercurial, and Subversion repositories.
- Repository groups and user/group permissions are first-class admin concepts rather than add-ons.
- Pull request review, commit review, inline comments, merge safety, CI comments, API automation, and AI review all live inside the same enterprise-controlled surface.

## What Works

- The interface model maps well to platform administrators who need predictable permission and repository controls.
- The review workflow uses explicit status values such as approved, rejected, under review, and closed states, which helps governed teams.
- Behind-the-firewall positioning makes the product easier to justify in regulated environments than cloud-first developer tools.

## UX Breakdowns

- The design can feel conventional and admin-heavy for developers used to modern hosted forges.
- Documentation exposes many nested admin paths, which can make common tasks look bureaucratic.
- Multi-VCS breadth can limit the product's ability to create one highly refined interaction model for modern Git-only workflows.

## Epoch Design Lessons

- Epoch needs an enterprise administration surface as much as a strong developer history surface.
- Repository groups, inherited permissions, audit logs, and review state should be understandable without burying users in admin menus.
- Migration-sensitive teams need to see how legacy repositories coexist with Epoch-managed history.
