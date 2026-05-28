# ADR-0013: Community Operations Extension Package

Status: Accepted

## Context

Epoch needs a Coolify-inspired surface for project maintainers to inspect app
hosting, preview deploys, workflow runs, runners, secrets, and agent sandbox
outputs. The existing `Epoch.Platform.Web` package is the hosting control plane
for Epoch services, while `Epoch.Platform.Core` owns deploy, job, runner,
secret, AI, policy, and audit invariants.

Adding project operations screens directly to Platform Web would blur the
boundary between instance operations and community-owned project capabilities.
Adding new state directly to Platform Core before the projection proves useful
would make the first slice larger than necessary.

## Decision

Add `Epoch.Community.Operations.Web` as a separate deployable web package.

- It publishes as `@epoch/community-operations-web`.
- It exports a `DeployableEpochApp`-compatible deployment target that
  `Epoch.Platform.Web` can register structurally.
- It reads existing Platform state through `EpochPlatformSdk` snapshots and
  projects hosted apps, workflow runs, agent sandboxes, runner capacity, and
  signed activity into a static PWA model.
- It treats GitHub Actions as an imported workflow source format, not as the
  execution authority.
- It does not require `Epoch.Platform.Web` or `Epoch.Platform.Core` to import
  the extension package.

## Consequences

Positive:

- The Coolify-inspired project operations experience can evolve without making
  the hosting control plane own community workflows.
- Platform Core remains the source of truth for deployments, jobs, runners,
  secrets, AI plans, and audit records.
- Community Operations can be deployed beside Community Web as another
  Platform-managed app descriptor.

Trade-offs:

- The first implementation is a projection and static renderer rather than a
  full interactive control plane.
- Workflow and sandbox metadata supplied by the extension is intentionally
  lightweight until Platform Core has more native execution primitives.

## Revisit Criteria

Revisit this decision when workflow execution, sandbox scheduling, or preview
deployment creation need first-class Core APIs beyond the existing deploy, job,
runner, secret, AI plan, and audit surfaces.

## Related Documents

- [Epoch Platform Packages](../platforms.md)
- [Current Design](../design.md)
- [Feature Registry](../features.md)
