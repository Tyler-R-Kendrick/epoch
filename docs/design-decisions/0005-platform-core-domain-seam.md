# ADR-0005: Keep Epoch.Platform Invariants In Core

## Status

Accepted. Amended by [ADR-0006](0006-platform-filesystem-core.md).

## Context

Epoch.Platform is intended to be usable as a self-hosted forge and deployment
platform, with `Epoch.Platform.Core` carrying the actual business logic,
`Epoch.Platform.Sdk` supporting headless automation, and
`Epoch.Platform.Community` remaining optional for private installations.

Adding platform behavior directly to the web console or SDK would make early
demos easier but would split approval, audit, Community, and recovery rules
across consumers.

## Decision

Implement platform behavior in `@epoch/platform-core`. The SDK delegates to
Core, and the web console receives a render model derived from Core/SDK state.
Core owns invariants for protected deploy approvals, identity/RBAC, SSO/SCIM
state, service-account tokens, sessions, review intents, packages, search
summaries, observability summaries, infrastructure and runner coordination,
backup/restore/HA drill records, AI approval gates, AI context redaction,
webhooks, event streams, audit/compliance records, Community enablement,
Community moderation/social safety, and snapshot export/restore.

The in-memory store remains available for focused tests and short-lived
embedded flows. ADR-0006 adds the durable filesystem-backed Core mode without
moving correctness into SDK or Web.

## Consequences

- Feature scenarios can test product behavior through SDK calls while keeping
  correctness centralized in Core.
- Community can be disabled cleanly because Core capability discovery gates the
  Community APIs.
- Snapshot export/restore gives a narrow disaster-recovery contract while
  keeping behavior executable.
- Persistence work must preserve the Core API contracts or introduce a
  deliberate migration ADR.

## Revisit Criteria

Revisit this decision when Epoch.Platform adds real runners, networked
deployments, clustered control-plane services, or a separate Community
deployment process.
