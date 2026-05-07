# ADR-0005: Separate Platform Web And Community Apps

Status: Accepted

## Context

Epoch needs two web experiences with different jobs:

- a hosting control plane for deploying and operating Epoch services; and
- a community application for repository discovery, issues, reviews,
  discussions, profiles, releases, and organization spaces.

Combining those responsibilities makes the hosting product feel like a forge
and leaves the community product empty. It also makes future deployment work
riskier because operational code, collaboration state, and social product
surfaces become hard to test independently.

## Decision

Keep `Epoch.Platform.Web` and `Epoch.Community.Web` as completely separate
web-app packages, and split Community behavior into API, Core, CLI, and Web
packages.

- `Epoch.Platform.Web` is the PWA SPA for Epoch hosting operations. It exposes
  Epoch runtime, object storage, sync seed, and deployable-app service
  descriptors. It does not own community workflows.
- `Epoch.Community.API` owns the current API implementation for repositories,
  issues, change proposals, maintainer reviews, discussions, profiles,
  releases, and organization spaces.
- `Epoch.Community.Core` owns shared community domain types and the API client
  used by other Community surfaces.
- `Epoch.Community.CLI` uses Core for command-line community workflows.
- `Epoch.Community.Web` is the GitHub-like community web app. It consumes Core
  rather than owning API behavior directly.
- The integration point is a generic deployment descriptor. Community exports a
  `deploymentTarget`; Web accepts any structurally compatible
  `DeployableEpochApp`.
- Platform Web does not import Community packages. Tests enforce the dependency
  direction.

## Consequences

Positive:

- Community code now lives in API/Core/CLI/Web packages instead of being
  collapsed into the hosting control plane.
- The hosting control plane stays focused on Epoch service deployment and
  operations.
- Platform Web, Community API, Community Core, Community CLI, and Community Web
  can evolve, test, and ship independently.
- Web can still deploy and manage Community as an Epoch-hosted app.

Trade-offs:

- Some deployment descriptor fields are structurally duplicated between
  Platform Web and Community Web instead of coming from a shared platform
  package. This avoids creating another abstraction before the platform surface
  has enough real pressure to justify one.
- Host applications must compose the two packages explicitly at wiring time.
  That keeps ownership clear but requires a small integration step.

## Rejected Alternatives

Put Community routes inside Platform Web.

- Rejected because the products have different jobs, users, navigation, and
  future scaling needs.

Make Platform Web depend directly on Community Web.

- Rejected because it would make the hosting control plane import the community
  product it is supposed to deploy as an external app.

Make Community Web own API behavior directly.

- Rejected because Web should consume `Epoch.Community.Core` as an API client
  and leave API behavior in `Epoch.Community.API`.

Add a shared platform package immediately.

- Rejected for now because a shared platform package would add maintenance
  surface before the descriptor boundary has stabilized.

## Revisit Criteria

Revisit this decision if:

- more than two deployable Epoch apps need the same descriptor helpers;
- deployment descriptors become large enough to need validation shared across
  packages; or
- runtime packaging requires a dedicated host application that composes Platform
  Web, Community API, Community Core, Community CLI, and Community Web.

## Related Documents

- [Epoch Platform Packages](../platforms.md)
- [Current Design](../design.md)
- [Feature Registry](../features.md)
