# Epoch Quality Gates Reference

Epoch requires TDD and passing automated gates for source changes.

## Local gate commands

Run these commands from the repository root:

Use Node.js `^20.20.0` or `>=22.13.0` with npm `>=10.0.0`; these versions match the package engine declaration and the toolchain used by CI.

| Command | Required for | What it checks |
|---|---|---|
| `npm run lint` | Every source or test change | ESLint rules over TypeScript, tests, and configuration. |
| `npm run typecheck` | Every source or test change | `tsgo --noEmit` for Core, CLI, WASM, WASM React, and tests. |
| `npm test` | Every behavior change | Unit/component runtime tests plus Cucumber features against compiled TypeScript output. |
| `npm run coverage` | Every behavior change | c8 coverage over unit/component tests and Cucumber features with enforced thresholds. |
| `npm run verify` | Before review | Lint, typecheck, tests, and coverage in sequence. |

## TDD expectations

- Add or update a feature scenario before implementing new externally visible behavior.
- Keep feature files readable and focused on user-observable outcomes.
- Add step definitions only when existing reusable steps cannot express the behavior.
- Add unit tests for SDK state transitions and component tests for framework rendering or subscription behavior.
- Use Playwright-backed feature steps for browser-facing behavior and assert rendered evidence such as text, bounds, or screenshots.
- Do not weaken thresholds, skip tests, or hide failing coverage.

## CI expectations

The GitHub Actions quality workflow installs dependencies with `npm ci` and runs lint, typecheck, test, and coverage as independent required gates.
