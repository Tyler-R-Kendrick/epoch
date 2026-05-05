# Contributing to Epoch

Thank you for improving Epoch. This repository values small, well-tested changes that keep the DVCS core trustworthy and understandable.

## Development setup

```bash
npm ci
npm run verify
```

## Required quality gates

Every source change must pass:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run coverage`
- `npm run verify`

The CI workflow enforces these same gates on pull requests and pushes to `main`.

## TDD workflow

1. Add or update a feature scenario that describes the behavior.
2. Run the relevant test command and confirm the scenario fails for the expected reason.
3. Implement the smallest production change that satisfies the scenario.
4. Run all quality gates.
5. Update docs when public CLI commands, SDK APIs, WASM exports, or workflows change.

## Pull request expectations

- Keep changes focused.
- Explain behavior changes and validation commands in the PR description.
- Do not commit generated `dist/`, `coverage/`, local repositories, logs, or secrets.
- Do not lower coverage thresholds, disable lint rules, or skip tests to make CI pass.

## Repository layout

| Path | Purpose |
|---|---|
| `packages/Epoch.Core` | Core repository, CRDT, event, sync, Git compatibility, HA/DR APIs. |
| `packages/Epoch.CLI` | Node command-line hosts for `epoch` and `epoch-git`. |
| `packages/Epoch.WASM` | WASM-safe exports and unsupported native Git guards. |
| `features` | Cucumber feature specifications. |
| `test/features` | Cucumber step definitions. |
| `skills/epoch` | Distributable agent skill documentation and marketplace metadata. |
