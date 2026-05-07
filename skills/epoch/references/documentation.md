# Epoch Documentation Freshness Reference

Use this reference before finishing any Epoch change that affects design,
behavior, public APIs, operations, quality gates, hooks, or agent workflows.

## Required Commands

```bash
npm run docs:check
npm run verify
```

`docs:check` validates local Markdown links and ensures every Markdown document
and Gherkin feature spec is reachable from the root `README.md` hierarchy.

## Update Matrix

| Change | Update |
|---|---|
| Top-level value, quick start, navigation | `README.md`, `docs/README.md` |
| Current architecture, actors, hooks, sync, storage, policy | `docs/design.md` |
| Material decision, trade-off, dependency selection, rejected alternative | ADR under `docs/design-decisions/` and its index |
| Implemented feature or acceptance criteria | `docs/features.md`, relevant `features/*.feature`, user stories when flows change |
| CLI command, shorthand, binary, Git-compatible behavior | `docs/cli.md`, `skills/epoch/references/cli.md` |
| SDK API, actor API, CRDT operation API, lifecycle hook API, Epoch.Platform Core/SDK/Web API | `docs/sdk.md`, `skills/epoch/references/core-sdk.md` |
| WASM export or native unsupported behavior | `skills/epoch/references/wasm.md` and relevant public docs |
| HA/DR compact, backup, restore, seed workflow | `docs/HA-DR.md`, feature registry, feature specs |
| Agent workflow, quality gate, docs policy, skill behavior | `AGENTS.md`, `CONTRIBUTING.md`, PR template, `skills/epoch/` |

If no docs update is needed, state why in the PR.
