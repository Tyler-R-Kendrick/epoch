# Epoch Documentation

This index is the wiki landing page for repository documentation. Start here
when you need to understand the product, architecture, public APIs, design
decisions, operations, or contribution workflow.

## Product And Requirements

| Document | Use it for |
|---|---|
| [Feature Registry](features.md) | Implemented feature IDs, behavior, and executable coverage links. |
| [User Stories](user-stories.md) | Persona-oriented workflows supported by the current prototype. |
| [Cucumber Feature Specs](../features/) | Executable Gherkin scenarios for repository, CLI, WASM, React, merge, actor, CRDT, view, and HA/DR behavior. |

## Architecture And Public APIs

| Document | Use it for |
|---|---|
| [Current Design](design.md) | Current architecture, event model, sync, policy, CRDT surfaces, hooks, actors, and non-goals. |
| [CLI Reference](cli.md) | Source checkout commands, `epoch` shorthand, `epoch-git`, global linking, and command groups. |
| [Core SDK Reference](sdk.md) | Repository lifecycle, async actor API, CRDT operations, React integration, hooks, sync, and Git-compatible core surfaces. |
| [HA/DR Runbook](HA-DR.md) | Compacts, seed bootstrap, cold backups, and disaster recovery operator flow. |
| [Documentation Freshness Policy](documentation-freshness.md) | Required docs update matrix, no-orphan rules, and docs check command. |

## Design Decisions And ADRs

| Document | Use it for |
|---|---|
| [Design Decisions Index](design-decisions/README.md) | ADR index and decision-record conventions. |
| [ADR-0001: Design Philosophy And Inspiration](design-decisions/0001-design-philosophy-and-inspiration.md) | Project principles and the research systems that shaped Epoch. |
| [ADR-0002: CRDT Backend Selection](crdt-backend-decision.md) | Collabs versus Automerge measurement and backend decision. |
| [Dependency Exceptions](dependency-exceptions.md) | Security-sensitive dependency overrides and rationale. |

## Contribution, Safety, And Agent References

| Document | Use it for |
|---|---|
| [Contributing](../CONTRIBUTING.md) | Setup, TDD workflow, quality gates, and PR expectations. |
| [Security](../SECURITY.md) | Vulnerability reporting and secure contribution guidance. |
| [Support](../SUPPORT.md) | How to ask for help. |
| [Code of Conduct](../CODE_OF_CONDUCT.md) | Community expectations. |
| [Pull Request Template](../.github/PULL_REQUEST_TEMPLATE.md) | Required PR summary and validation checklist. |
| [Bug Report Template](../.github/ISSUE_TEMPLATE/bug_report.md) | Bug report intake fields. |
| [Feature Request Template](../.github/ISSUE_TEMPLATE/feature_request.md) | Feature request intake fields. |
| [Agent Instructions](../AGENTS.md) | Repository-wide instructions for AI coding agents. |
| [Epoch Agent Skill](../skills/epoch/SKILL.md) | Compact agent-facing index for Core, CLI, WASM, and quality-gate references. |
