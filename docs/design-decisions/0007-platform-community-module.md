# ADR-0007: Platform Community Module

## Status

Accepted.

## Context

The Epoch.Platform spec requires Community to be optional for private
enterprise installs, but first-class when enabled. Community needs public or
internal profiles, project showcases, follows, stars, bookmarks, feeds,
discussions, reputation, moderation, abuse controls, legal hold, and backup /
restore coverage. It also must not leak private repository data, and disabled
Community API calls must fail with `feature_disabled` while Core repository and
deployment workflows continue.

## Decision

Ship `@epoch/platform-community` as a separate workspace package and root
export over `@epoch/platform-sdk`. The package is the product-facing Community
module, with grouped profile, project, discussion, feed, and moderation
surfaces.

All invariants remain in `@epoch/platform-core`: capability checks, public
visibility gates, maintainer RBAC for showcase publication, moderation triage,
abuse throttles, public feed shape, bookmark/follow/star counters, legal-hold
export, and snapshot/backup restoration. `@epoch/platform-sdk` exposes the same
Core-backed operations for headless installs.

## Consequences

- Private installations can omit the Community package and keep Community
  disabled without breaking Core or SDK workflows.
- Community deployments get a cohesive module API while avoiding duplicate
  business rules outside Core.
- Web and future public ingress surfaces can use the same capability discovery
  and disabled-mode contract as SDK clients.
- Future production adapters still need durable database, queue, search, and
  worker implementations behind the same Core contracts.

## Revisit Criteria

Revisit this decision if Community becomes federated, requires a separate
storage boundary for regulatory reasons, or introduces production workers whose
availability model cannot be represented by Core capability discovery.

## Coverage

- `test/unit/platform-community-module.test.ts`
- `features/platform_community_conformance.feature`
- `features/platform_product_domains.feature`
