# ADR-0017: Konsistent Structural Conventions

Status: Accepted

## Context

Epoch is an npm workspaces monorepo with 17 packages under `packages/` and
three sample apps under `samples/`. ESLint enforces in-file code style and
`tsgo` enforces types, but neither verifies project-level structural
conventions such as "every workspace ships a `package.json`" or "every
workspace exposes a `src/index.ts` entrypoint." These conventions are currently
enforced only by review and habit, which is fragile as the workspace grows and
as coding agents generate new packages.

[`konsistent`](https://www.npmjs.com/package/konsistent) is a CLI linter that
checks whether files and directories match declared structural patterns. Vercel
positions it as a way to give agents and humans the consistent context they
need to implement features correctly. It fills the gap ESLint, Biome, and
oxlint leave open.

The published guidance installs `konsistent` with pnpm or bun and reaches for
placeholder path captures like `packages/{name}`. Neither matches Epoch: the
repo standardizes on npm workspaces, and its package directories use
dot-delimited PascalCase names (for example `Epoch.Community.API`) that fall
outside konsistent's `[a-zA-Z0-9_-]+` placeholder charset, so `{name}` captures
zero directories here.

## Decision

Adopt `konsistent` as a required, npm-managed quality gate.

- Install `konsistent` as a root `devDependency` with npm
  (`npm install konsistent --save-dev`), alongside ESLint and the TypeScript
  toolchain, rather than pnpm or bun.
- Add a `konsistent` script to the root `package.json` and include
  `npm run konsistent` in the `verify` gate after `typecheck` and before the
  runtime tests.
- Add a dedicated `Konsistent` job to the GitHub Actions quality workflow,
  mirroring the existing per-gate jobs, so violations annotate pull requests.
- Declare conventions in `konsistent.json` at the repository root, referencing
  the bundled JSON schema for editor autocomplete.
- Match the codebase's real, universal structure with wildcard globs instead of
  placeholder captures, because the dot-delimited directory names defeat
  `{name}` extraction:
  - every `packages/*` is a directory with a `package.json`;
  - every `packages/*` except `Epoch.CLI` exposes `src/index.ts` (the CLI ships
    `src/cli.ts` and `src/cli-git.ts` entrypoints instead); and
  - every `samples/*` app directory has a `package.json`.

## Implementation Update (2026-08-11)

The root `konsistent.json` and `npm run konsistent` remain active in
`gate:fast`, pull-request CI, and `npm run verify`. The frontier package additions
conform to those workspace rules; no exception or new structural dependency was
introduced.

## Consequences

Positive:

- Structural conventions are enforced automatically for humans and agents
  instead of relying on review.
- The rules are grounded in patterns the codebase already follows, so the gate
  starts green and stays meaningful.
- Installation and enforcement stay on the repository's existing npm workspace
  toolchain, keeping a single lockfile and package manager.

Trade-offs:

- `konsistent` requires Node.js `>=22.11.0`. CI runs Node 22 and the package
  engines already allow `>=22.13.0`, but contributors on the supported Node 20
  line must use the 22.x toolchain to run this gate.
- The current conventions are filesystem-structural. Export- and type-shape
  rules are deferred because the dot-delimited package names make konsistent's
  name-transformation templates unreliable for this repo.
- `konsistent` is a `1.0.0-beta` release; the configuration schema may shift
  before the stable release.

## Revisit Criteria

Revisit this decision when konsistent reaches a stable release, when package
directories adopt names compatible with placeholder capture, or when the team
wants to enforce export- and type-shape conventions beyond filesystem layout.

## Related Documents

- [konsistent.json](../../konsistent.json)
- [Quality Gates Reference](../../skills/epoch/references/quality-gates.md)
- [Contributing](../../CONTRIBUTING.md)
- [Current Design](../design.md)
