# Epoch Agent Instructions

These instructions apply to the entire repository.

## Required development workflow

- Use test-driven development for behavior changes: write or update a failing feature/test first, implement the smallest change, then make the full suite pass.
- Do not consider work complete until all required quality gates pass locally:
  - `npm run docs:check`
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run coverage`
  - `npm run verify`
- Preserve or improve coverage for changed behavior. Add new Gherkin scenarios, step definitions, or focused tests when adding or changing production behavior.
- Do not lower coverage thresholds or weaken lint/typecheck settings to make a change pass.
- Keep generated outputs such as `dist/`, `coverage/`, and temporary files out of commits.

## Documentation freshness

- Treat documentation as part of every design, behavior, workflow, and public API change. Follow [`docs/documentation-freshness.md`](docs/documentation-freshness.md) before finishing work.
- Update `README.md` and `docs/README.md` when top-level navigation, quick start, or discoverability changes.
- Update `docs/design.md` for current architecture changes, and add or update ADRs under `docs/design-decisions/` for material design choices, trade-offs, dependency decisions, or rejected alternatives.
- Update `docs/features.md`, relevant `features/*.feature` files, and user stories when implemented behavior or acceptance criteria change.
- Update `docs/cli.md`, `docs/sdk.md`, `docs/HA-DR.md`, dependency docs, and `skills/epoch/` references when their public surfaces change.
- Do not create orphaned docs. Every Markdown doc and feature spec must be reachable from the root `README.md` hierarchy, and `npm run docs:check` must pass.

## Community design thinking and human-centered design

- Design the Epoch Community site with design thinking, user-centric design, and human-centered design as the driving methodologies. Follow [`docs/community-human-centered-design.md`](docs/community-human-centered-design.md) and [`docs/design-decisions/0012-community-human-centered-design.md`](docs/design-decisions/0012-community-human-centered-design.md).
- Use the default Community persona, a GitHub open-source contributor, unless a different persona is explicitly documented.
- Before changing Community Web, API, Core, CLI, workflows, docs, or specs, add or update persona-driven feature scenarios under `features/` and name the contributor journey, design-thinking stage, user-centric success criteria, pain point, trust question, security/privacy/cost/accessibility/moderation/portability considerations, degraded-state behavior, and validation evidence.
- Keep [`docs/persona-feature-matrix.md`](docs/persona-feature-matrix.md) and [`docs/persona-e2e-journeys.md`](docs/persona-e2e-journeys.md) aligned with every executable `features/*.feature` spec. New feature specs are incomplete until they appear in the feature registry, persona matrix, and persona end-to-end journey registry.
- Treat recent GitHub availability, security, free-vs-paid tier, and Copilot billing changes as research signals to re-verify before making product claims.

## Repository practices

- Keep changes small, intentional, and aligned with the existing TypeScript workspace structure.
- Update documentation when public CLI commands, SDK APIs, WASM exports, repository workflows, agent instructions, or design decisions change.
- Prefer existing dependencies and standard library APIs. Add a dependency only when the benefit is clear and the dependency has been reviewed.
- Treat Epoch history, identity, signatures, and content-addressed storage as security-sensitive code paths.

## Useful commands

| Command | Purpose |
|---|---|
| `npm ci` | Install locked workspace dependencies. |
| `npm run build` | Build Core, CLI, WASM, and test TypeScript outputs. |
| `npm run docs:check` | Validate local Markdown links and docs/spec discoverability from `README.md`. |
| `npm run lint` | Run ESLint over source, tests, and configuration. |
| `npm run typecheck` | Run `tsgo --noEmit` for every workspace and test project. |
| `npm test` | Build and execute the Cucumber feature suite. |
| `npm run coverage` | Run Cucumber under c8 and enforce coverage thresholds. |
| `npm run verify` | Run lint, typecheck, tests, and coverage as the full local gate. |
