# Contributing to Epoch

Thank you for improving Epoch. This repository values small, well-tested changes that keep the DVCS core trustworthy and understandable.

## Development setup

```bash
npm ci
npm run verify
```

## Required quality gates

Every source change must pass:

- `npm run docs:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run coverage`
- `npm run verify`

The CI workflow enforces these same gates on pull requests and pushes to `main`.

## TDD workflow

1. Add or update a feature scenario that describes the behavior.
2. Add lower-level tests that fit the change: unit tests for SDK transitions, component tests for framework rendering, and Playwright-backed feature steps for browser behavior.
3. Run the relevant test command and confirm the new tests fail for the expected reason.
4. Implement the smallest production change that satisfies the tests.
5. Run all quality gates.
6. Update docs when public CLI commands, SDK APIs, WASM exports, React hooks, workflows, design choices, or implemented features change.

## Documentation workflow

Follow [Documentation Freshness Policy](docs/documentation-freshness.md) for every change. In short:

- update `README.md` and `docs/README.md` when navigation, quick start, or discoverability changes;
- update `docs/design.md` for current architecture changes;
- add or update ADRs under `docs/design-decisions/` for material design choices, trade-offs, dependency decisions, and rejected alternatives;
- update [Community Human-Centered Design](docs/community-human-centered-design.md), agent instructions, and skill references when Community site methodology, personas, pain points, design-thinking flow, user-centric success criteria, or human-centered design workflow changes;
- update `docs/features.md`, `docs/feature-scenario-inventory.md`, user stories, and Gherkin specs when implemented behavior changes; and
- update `skills/epoch/` references when agent, CLI, SDK, WASM, React, hook, or quality-gate guidance changes.

Run `npm run docs:check` before review to catch broken links and orphaned docs.

## Pull request expectations

- Keep changes focused.
- Explain behavior changes and validation commands in the PR description.
- For Community experience changes, name the GitHub open-source contributor
  persona or an explicit alternative persona, the pain point solved, and the
  design-thinking stage, user-centric success criteria, trust, cost, security,
  accessibility, moderation, degraded-state, and portability considerations.
  Add or update persona-driven feature scenarios under `features/` before
  implementation, then record the changed scenarios in
  `docs/feature-scenario-inventory.md`.
- Do not commit generated `dist/`, `coverage/`, local repositories, logs, or secrets.
- Do not lower coverage thresholds, disable lint rules, or skip tests to make CI pass.

## Repository layout

| Path | Purpose |
|---|---|
| `packages/Epoch.Core` | Core repository, CRDT, event, sync, Git compatibility, HA/DR APIs. |
| `packages/Epoch.CLI` | Node command-line hosts for `epoch` and `epoch-git`. |
| `packages/Epoch.WASM` | WASM-safe exports and unsupported native Git guards. |
| `packages/Epoch.WASM.React` | Browser-safe React hooks and persistent framework state helpers. |
| `features` | Cucumber feature specifications. |
| `test/features` | Cucumber step definitions. |
| `docs` | Public documentation, ADRs, feature registry, executable scenario inventory, SDK/CLI references, and documentation freshness policy. |
| `skills/epoch` | Distributable agent skill documentation and marketplace metadata. |
