---
name: epoch
display_name: Epoch DVCS Skill
description: Use, extend, test, and integrate Epoch's TypeScript DVCS, CLI, and WASM packages.
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

Epoch is an event-driven, offline-first DVCS with signed immutable events, content-addressed storage, CRDT-backed entity merging, Git compatibility surfaces, a Node CLI, and WASM-facing exports. Use this skill when an agent needs to understand how to operate Epoch, integrate it into applications, extend repository behavior, or contribute changes safely.

This file is intentionally a compact wiki index. Read only the reference page relevant to the task to minimize context usage.

## When to use this skill

- Building or debugging integrations with `@epoch/core`, `@epoch/cli`, or `@epoch/wasm`.
- Writing automation that records files, appends CRDT operations, verifies repositories, syncs peers, or imports/exports Git repositories.
- Updating Epoch source code, tests, quality gates, or documentation.
- Explaining Epoch concepts to project consumers.

## Required contribution gates

Before proposing source changes, run the project gates documented in [Quality Gates](references/quality-gates.md): linting, typechecking, tests, coverage, and the combined verification command.

## Reference index

| Reference | Use it for |
|---|---|
| [Core SDK](references/core-sdk.md) | Repository lifecycle, event log, CRDT operations, hooks, actors, Git-compatible core exports. |
| [CLI](references/cli.md) | Running `epoch` and `epoch-git`, repository commands, views, policy events, import/export, verification. |
| [WASM](references/wasm.md) | Browser/worker-safe exports, CRDT helpers, and unsupported native Git behavior. |
| [Quality Gates](references/quality-gates.md) | Required TDD, lint, typecheck, test, coverage, and CI expectations. |
| [SDLC Subagent](references/sdlc.md) | Codex subagent checklist for enforcing feature-first TDD and the Epoch test trophy. |
| [Architecture](../../docs/design.md) | Full design model, data structures, extension surfaces, and system comparisons. |
| [Feature Registry](../../docs/features.md) | Product feature IDs and acceptance criteria. |

## Quick orientation

- Workspace packages live in `packages/Epoch.Core`, `packages/Epoch.CLI`, and `packages/Epoch.WASM`.
- Feature specifications live in `features/`; step definitions live in `test/features/steps.ts`.
- Build output is generated into `dist/` directories and should not be committed.
- Public behavior should be documented in the README or the relevant reference page when it changes.
