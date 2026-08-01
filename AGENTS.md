# Epoch Agent Instructions

These instructions apply to the entire repository.

## Required development workflow

- Use test-driven development for behavior changes: write or update a failing feature/test first, implement the smallest change, then make the full suite pass.
- **GitHub Actions quality CI is temporarily disabled** (runner minutes). Enforcement is **local hooks + agent discipline**:
  - After `npm install` / `prepare`, `core.hooksPath` points at `.githooks/`.
  - `pre-commit` runs `npm run gate:fast` (konsistent, docs, design.md lint, eslint).
  - `pre-push` runs `npm run gate:push` (gate:fast + typecheck + build + unit tests).
  - Full bar remains `npm run verify` (adds feature/browser suite, coverage, pact). Agents must run **at least `gate:push`**, and **`verify`** when changing browser-visible or contract behavior, before claiming done.
- Do not consider work complete until required quality gates pass locally:
  - `npm run gate:fast` — commit-time bar
  - `npm run gate:push` — push-time bar (CI substitute)
  - `npm run verify` — full bar (docs, lint, design:lint, typecheck, konsistent, test, coverage, pact)
- Never skip hooks to greenwash a change. Emergency bypass only: `SKIP_GIT_HOOKS=1` or `SKIP_VERIFY=1` (document why in the PR/commit body).
- Preserve or improve coverage for changed behavior. Add new Gherkin scenarios only for user-visible product behavior, and use focused tests or docs checks for repository process, documentation, evidence, or governance requirements.
- Do not lower coverage thresholds or weaken lint/typecheck settings to make a change pass.
- Keep generated outputs such as `dist/`, `coverage/`, and temporary files out of commits.

## Documentation freshness

- Treat documentation as part of every design, behavior, workflow, and public API change. Follow [`docs/documentation-freshness.md`](docs/documentation-freshness.md) before finishing work.
- Update `README.md` and `docs/README.md` when top-level navigation, quick start, or discoverability changes.
- Update `docs/design.md` for current architecture changes, and add or update ADRs under `docs/design-decisions/` for material design choices, trade-offs, dependency decisions, or rejected alternatives.
- Update `docs/features.md`, `docs/feature-scenario-inventory.md`, relevant `features/*.feature` files, and user stories when implemented behavior or acceptance criteria change.
- Update `docs/cli.md`, `docs/sdk.md`, `docs/HA-DR.md`, dependency docs, and `skills/epoch/` references when their public surfaces change.
- Do not create orphaned docs. Every Markdown doc and feature spec must be reachable from the root `README.md` hierarchy, and `npm run docs:check` must pass.

## Community design thinking and human-centered design

- Design the Epoch Community site with design thinking, user-centric design, and human-centered design as the driving methodologies. Follow [`docs/community-human-centered-design.md`](docs/community-human-centered-design.md) and [`docs/design-decisions/0012-community-human-centered-design.md`](docs/design-decisions/0012-community-human-centered-design.md).
- Use the default Community persona, a GitHub open-source contributor, unless a different persona is explicitly documented.
- Personas are users in real product scenarios, not features. Do not create `persona_*`, `*_persona_*`, `*_e2e_journeys`, human-centered-design, or similar persona/governance feature files.
- Before changing Community Web, API, Core, CLI, workflows, docs, or specs, add or update the relevant product feature scenarios under `features/` when user-visible behavior changes, and use persona tags such as `@persona.github_open_source_contributor`, `@persona.maintainer`, `@persona.platform_operator`, or `@persona.security_compliance_responder` on those real behavior scenarios.
- Every new `.feature` scenario must read as a user journey for its persona: name the persona with a tag, start from an app context the user would recognize, move through the app screens or workflow steps the user takes, end with the successful user outcome, and include signed/provenance state only when it affects the user's trust or decision.
- Keep agent instructions, testing procedures, evidence recording, persona matrix audits, repository governance, and other process checks out of `.feature` scenarios.
- Do not write `.feature` scenarios as screen inventories, implementation-stack checklists, or "browser shows" assertions. Browser automation belongs in step definitions; Gherkin belongs to the user's capability.
- Do not add scenario outlines whose only purpose is proving a matrix row exists. Scenario outlines must exercise product behavior for a persona.
- Keep [`docs/persona-feature-matrix.md`](docs/persona-feature-matrix.md) and [`docs/feature-scenario-inventory.md`](docs/feature-scenario-inventory.md) aligned with every executable product `features/*.feature` spec. New or changed scenarios are incomplete until the feature registry, scenario inventory, and persona matrix record them.
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
| `npm run konsistent` | Enforce workspace structural conventions declared in `konsistent.json`. |
| `npm run typecheck` | Run `tsgo --noEmit` for every workspace and test project. |
| `npm test` | Build and execute the Cucumber feature suite. |
| `npm run coverage` | Run Cucumber under c8 and enforce coverage thresholds. |
| `npm run gate:fast` | Commit-time gate: konsistent, docs:check, design:lint, lint. |
| `npm run gate:push` | Push-time gate (CI substitute): gate:fast + typecheck + test. |
| `npm run verify` | Full local gate: gate suite + coverage + pact. |
