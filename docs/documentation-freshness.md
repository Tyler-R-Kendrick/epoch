# Documentation Freshness Policy

Documentation is part of the change, not a follow-up. Any change that affects
Epoch's public behavior, architecture, design intent, operations, agent
workflow, or contribution workflow must update the relevant documentation in
the same pull request.

## Required Check

Run the docs gate before review:

```bash
npm run docs:check
```

This validates local Markdown links and proves every product Markdown document
and Gherkin feature spec is reachable from the root `README.md` link hierarchy.
Generated OptimizeXP run state under `.optimizexp/` is evidence, not product
documentation, and is excluded from this navigation check.

## Update Matrix

| Change type | Required documentation |
|---|---|
| Value proposition, quick start, top-level navigation, contribution basics | `README.md` and `docs/README.md` |
| Current architecture, storage model, event model, sync, policy, actors, hooks, or non-goals | `docs/design.md` |
| Material design choice, trade-off, selected dependency, security-sensitive direction, or rejected alternative | New or updated ADR under `docs/design-decisions/` and the ADR index |
| Fuzz lanes, corpora, regression promotion, or scheduled fuzz CI | `docs/design-decisions/0052-model-based-and-coverage-guided-fuzzing.md`, `test/fuzz/README.md`, and `docs/change-graph.md` when Change Graph surfaces change |
| Community site design methodology, persona, pain-point framing, design-thinking stage, user-centric success criteria, product behavior feature coverage, persona feature mapping, or human-centered design workflow | `docs/community-human-centered-design.md`, `docs/persona-feature-matrix.md`, `docs/feature-scenario-inventory.md`, relevant product `features/*.feature` specs when user-visible behavior changes, `docs/features.md`, `docs/design.md`, relevant ADRs, `AGENTS.md`, `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, and `skills/epoch/` references |
| Implemented product behavior or acceptance criteria | `docs/features.md`, `docs/feature-scenario-inventory.md`, `docs/persona-feature-matrix.md`, relevant product `features/*.feature`, and `docs/user-stories.md` when persona flows change |
| CLI command, argument, shorthand, installed binary, or Git-compatible CLI behavior | `docs/cli.md` and `skills/epoch/references/cli.md` |
| SDK API, actor API, CRDT operation API, lifecycle hooks, sync API, or Git-compatible core surface | `docs/sdk.md` and `skills/epoch/references/core-sdk.md` |
| WASM export or unsupported native behavior | `skills/epoch/references/wasm.md` and any relevant public docs |
| HA/DR compact, backup, restore, or seed workflow | `docs/HA-DR.md`, `docs/features.md`, and relevant feature specs |
| Dependency exception, override, or security rationale | `docs/dependency-exceptions.md` and the relevant ADR |
| Agent workflow, quality gate, documentation policy, or skill behavior | `AGENTS.md`, `CONTRIBUTING.md`, `.github/PULL_REQUEST_TEMPLATE.md`, and `skills/epoch/` references |

## Agent Checklist

Before finishing a change, agents must:

1. Identify which row of the update matrix applies.
2. Update the public docs, feature docs, ADRs, and skill references that match
   the changed surface.
3. Add new docs to `docs/README.md` and any narrower index such as
   `docs/design-decisions/README.md`.
4. Keep the root `README.md` focused on value proposition, quick start,
   contribution basics, and links to deeper docs.
5. Run `npm run docs:check` and the required quality gates.

If no documentation update is needed, state why in the pull request.
