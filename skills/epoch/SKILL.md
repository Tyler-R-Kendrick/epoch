---
name: epoch
display_name: Epoch DVCS Skill
description: Use, extend, test, and integrate Epoch's TypeScript DVCS, CLI, WASM, and platform packages.
version: 0.1.0
license: MIT
entrypoint: SKILL.md
permissions: []
compatibility:
  - claude
  - github-copilot
  - open-agent
---

# Epoch DVCS Skill

Epoch is an event-driven, offline-first DVCS with signed immutable events, content-addressed storage, first-class repository creation and signed versions, CRDT-backed entity merging, a Node CLI, WASM-facing exports, React integration helpers, a headless `Epoch.Platform.Core` / `Epoch.Platform.Sdk` layer, and separate platform/community web-app packages. Use this skill when an agent needs to understand how to operate Epoch, integrate it into applications, extend repository or platform behavior, or contribute changes safely.

This file is intentionally a compact wiki index. Read only the reference page relevant to the task to minimize context usage.

## When to use this skill

- Building or debugging integrations with `@epoch/core`, `@epoch/cli`, `@epoch/wasm`, or `@epoch/wasm-react`.
- Building or debugging integrations with `@epoch/platform-core`, `@epoch/platform-sdk`, `@epoch/platform-web`, `@epoch/community-api`, `@epoch/community-core`, `@epoch/community-cli`, and `@epoch/community-web`.
- Writing automation that creates repositories, pushes assets, records files, creates/materializes versions, appends CRDT operations, verifies repositories, syncs peers, or imports/exports Git repositories.
- Updating Epoch source code, tests, quality gates, or documentation.
- Explaining Epoch concepts to project consumers.

## Required contribution gates

Before proposing source changes, run the project gates documented in [Quality Gates](references/quality-gates.md): docs check, linting, typechecking, tests, coverage, and the combined verification command.

For design, behavior, workflow, CLI, SDK, WASM, React, hook, or agent-skill changes, follow [Documentation Freshness](references/documentation.md) and update public docs in the same change.

## Reference index

| Reference | Use it for |
|---|---|
| [Core SDK](references/core-sdk.md) | Repository lifecycle, event log, CRDT operations, hooks, actors, Git-compatible core exports, and Epoch.Platform Core/SDK/Community/Web foundation. |
| [CLI](references/cli.md) | Running `epoch` and `epoch-git`, repository commands, views, policy events, import/export, and verification. |
| [WASM](references/wasm.md) | Browser/worker-safe exports, CRDT helpers, and unsupported native Git behavior. |
| [Platform Packages](../../docs/platforms.md) | Separate Platform Web and Epoch Community API/Core/CLI/Web responsibilities and deployment boundary. |
| [Quality Gates](references/quality-gates.md) | Required TDD, lint, typecheck, test, coverage, and CI expectations. |
| [Documentation Freshness](references/documentation.md) | Required README, docs index, ADR, feature, SDK, CLI, WASM, and skill-reference updates. |
| [SDLC Subagent](references/sdlc.md) | Codex subagent checklist for enforcing feature-first TDD and the Epoch test trophy. |
| [Documentation Index](../../docs/README.md) | Public wiki index for architecture, CLI, SDK, features, operations, and ADRs. |
| [Architecture](../../docs/design.md) | Full design model, data structures, extension surfaces, and system comparisons. |
| [CLI Docs](../../docs/cli.md) | Public source-checkout shorthand, installed CLI usage, and command reference. |
| [SDK Docs](../../docs/sdk.md) | Public repository lifecycle, async actor API, CRDT operation, React integration, and hook examples. |
| [Feature Registry](../../docs/features.md) | Product feature IDs and acceptance criteria. |
| [Design Decisions](../../docs/design-decisions/README.md) | ADR index, design philosophy, inspiration archive links, and backend decisions. |

## Quick orientation

- Workspace packages live in `packages/Epoch.Core`, `packages/Epoch.CLI`, `packages/Epoch.WASM`, `packages/Epoch.WASM.React`, `packages/Epoch.Platform.Core`, `packages/Epoch.Platform.Sdk`, `packages/Epoch.Platform.Web`, `packages/Epoch.Community.API`, `packages/Epoch.Community.Core`, `packages/Epoch.Community.CLI`, and `packages/Epoch.Community.Web`.
- `Epoch.Platform.Web` is only the Epoch hosting control plane; `Epoch.Community.Web` is registered with Web through a deployable app descriptor, while Community API behavior lives in `Epoch.Community.API` and Web/CLI consume `Epoch.Community.Core`. Community Web site releases should use `materializeCommunityWebSiteWithEpoch()` so the static site is built from signed Epoch branch, merge, version, and rollback evidence.
- Feature specifications live in `features/`; step definitions and lower-level tests live in `test/`.
- Build output is generated into `dist/` directories and should not be committed.
- Public behavior, architecture, design decisions, and agent workflows should be documented in the docs index, ADRs, feature registry, and relevant skill reference when they change.
