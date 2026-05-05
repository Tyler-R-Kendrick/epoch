# Epoch Agent Instructions

These instructions apply to the entire repository.

## Required development workflow

- Use test-driven development for behavior changes: write or update a failing feature/test first, implement the smallest change, then make the full suite pass.
- Do not consider work complete until all required quality gates pass locally:
  - `npm run lint`
  - `npm run typecheck`
  - `npm test`
  - `npm run coverage`
  - `npm run verify`
- Preserve or improve coverage for changed behavior. Add new Gherkin scenarios, step definitions, or focused tests when adding or changing production behavior.
- Do not lower coverage thresholds or weaken lint/typecheck settings to make a change pass.
- Keep generated outputs such as `dist/`, `coverage/`, and temporary files out of commits.

## Repository practices

- Keep changes small, intentional, and aligned with the existing TypeScript workspace structure.
- Update documentation when public CLI commands, SDK APIs, WASM exports, or repository workflows change.
- Prefer existing dependencies and standard library APIs. Add a dependency only when the benefit is clear and the dependency has been reviewed.
- Treat Epoch history, identity, signatures, and content-addressed storage as security-sensitive code paths.

## Useful commands

| Command | Purpose |
|---|---|
| `npm ci` | Install locked workspace dependencies. |
| `npm run build` | Build Core, CLI, WASM, and test TypeScript outputs. |
| `npm run lint` | Run ESLint over source, tests, and configuration. |
| `npm run typecheck` | Run `tsgo --noEmit` for every workspace and test project. |
| `npm test` | Build and execute the Cucumber feature suite. |
| `npm run coverage` | Run Cucumber under c8 and enforce coverage thresholds. |
| `npm run verify` | Run lint, typecheck, tests, and coverage as the full local gate. |
