# Epoch Documentation

This index is the wiki landing page for repository documentation. Start here
when you need to understand the product, architecture, public APIs, design
decisions, operations, or contribution workflow.

## Product And Requirements

| Document | Use it for |
|---|---|
| [Feature Registry](features.md) | Implemented feature IDs, behavior, and executable coverage links. |
| [User Stories](user-stories.md) | Persona-oriented workflows supported by the current prototype, including platform conformance flows. |
| [Create Repository And Version Materialization Spec](create-repository-and-version-materialization.md) | Implemented create, push, version, and materialization user stories. |
| [Specification Template Outline](spec-template-outline.md) | Reusable outline extracted from a conformance-grade app spec. |
| [Epoch.Platform Specification](epoch-platform-spec.md) | Draft product and system spec for a self-hostable Epoch platform. |
| [Samples](../samples/README.md) | Runnable minimal integrations for Epoch browser, Node backend, and repository workflows. |
| [Notebooks](../notebooks/README.md) | Executable Node.js notebook examples for Epoch usage scenarios with stored results and output explanations. |
| [Competition Research](competition/README.md) | Parseable competitor dossiers across design, features, marketing, and public sentiment. |
| [Cucumber Feature Specs](../features/) | Executable Gherkin scenarios for repository, CLI, WASM, React, merge, actor, CRDT, view, HA/DR, and platform behavior. |

## Architecture And Public APIs

| Document | Use it for |
|---|---|
| [Current Design](design.md) | Current architecture, event model, sync, policy, CRDT surfaces, hooks, actors, and non-goals. |
| [Visual Design System](../DESIGN.md) | Epoch Community visual tokens, component rules, accessibility guardrails, and design-system sidecar guidance. |
| [CLI Reference](cli.md) | Source checkout commands, `epoch` shorthand, `epoch-git`, global linking, and command groups. |
| [Core SDK Reference](sdk.md) | Repository lifecycle, async actor API, CRDT operations, React integration, hooks, sync, and Git-compatible core surfaces. |
| [Platform Core And SDK APIs](sdk.md) | Repository lifecycle, async actor API, CRDT operations, React integration, hooks, sync, Git-compatible core surfaces, and `Epoch.Platform.Core` / `Epoch.Platform.Sdk` APIs. |
| [Platform Packages](platforms.md) | Separate `Epoch.Platform.Web` and `Epoch.Community.*` package responsibilities and integration boundary. |
| [HA/DR Runbook](HA-DR.md) | Compacts, seed bootstrap, cold backups, and disaster recovery operator flow. |
| [Documentation Freshness Policy](documentation-freshness.md) | Required docs update matrix, no-orphan rules, and docs check command. |

## Design Decisions And ADRs

| Document | Use it for |
|---|---|
| [Design Decisions Index](design-decisions/README.md) | ADR index and decision-record conventions. |
| [ADR-0001: Design Philosophy And Inspiration](design-decisions/0001-design-philosophy-and-inspiration.md) | Project principles and the research systems that shaped Epoch. |
| [ADR-0003: Competitive Gap Design Options](design-decisions/0003-competitive-gap-design-options.md) | Competitive gaps and proposed Epoch-shaped design options. |
| [ADR-0002: CRDT Backend Selection](crdt-backend-decision.md) | Collabs versus Automerge measurement and backend decision. |
| [ADR-0004: First-Class Repository Creation And Versions](design-decisions/0004-first-class-repository-creation-and-versions.md) | Accepted direction for simple repository creation, asset push, and signed versions. |
| [ADR-0005: Platform Core Domain Seam](design-decisions/0005-platform-core-domain-seam.md) | Keep Epoch.Platform invariants in Core while SDK, Community, and Web consume Core contracts. |
| [ADR-0006: Platform Filesystem Core](design-decisions/0006-platform-filesystem-core.md) | Add filesystem-backed Epoch.Platform Core state, HMAC webhooks, and verified backup artifacts. |
| [ADR-0007: Platform Community Module](design-decisions/0007-platform-community-module.md) | Historical record for the SDK-backed Community module before extraction into dedicated packages. |
| [ADR-0008: Separate Platform Web And Community Apps](design-decisions/0008-separate-platform-web-and-community.md) | Keeps hosting operations and community collaboration in separate web-app packages. |
| [ADR-0009: Native Working Tree Lifecycle](design-decisions/0009-native-working-tree-lifecycle.md) | Adds native signed working-tree lifecycle commands, ignore rules, and TOML repository config. |
| [Dependency Exceptions](dependency-exceptions.md) | Security-sensitive dependency overrides and rationale. |

## Contribution, Safety, And Agent References

| Document | Use it for |
|---|---|
| [Contributing](../CONTRIBUTING.md) | Coding workflow, testing expectations, and pull request checklist. |
| [AGENTS.md](../AGENTS.md) | Repository-specific agent instructions and quality gate requirements. |
| [Epoch Skill](../skills/epoch/SKILL.md) | Compact wiki for agents operating on the repository. |
