# ADR-0056: Vendored anti-slop Oxlint rules for agent-authored TypeScript

- Status: Accepted
- Date: 2026-08-20

## Context

Coding agents in this repository (Claude Code, Cursor, Codex, Grok) frequently
introduce low-evidence TypeScript patterns: `unknown` parameters, ad hoc
`typeof` narrowing, assertion chains, and dictionary types with opaque values.
ESLint remains the package-style and correctness gate. Epoch needed a separate,
opinionated layer that rejects those patterns without replacing ESLint.

[anti-slop](https://github.com/dmmulroy/anti-slop) is designed to be **vendored**
into the repository (not consumed as a frozen npm package of rules) and
configured through Oxlint's JS plugin API.

## Decision

1. Vendor the anti-slop plugin at `tools/oxlint/anti-slop/` (generic rules only;
   Effect rules stay off because Epoch does not depend on Effect).
2. Pin matching `oxlint` and `@oxlint/plugins` development dependencies
   (currently `1.79.0`) and configure them in `oxlint.config.ts`.
3. Expose `npm run lint:oxlint` (alias `lint:anti-slop`) and require it in
   `gate:fast` and the CI Lint job alongside ESLint. Do not weaken anti-slop
   rules to greenwash CI.
4. Install the `install-anti-slop` skill into the repo hosts Claude Code,
   Cursor, Codex, and Grok via
   `npm run agents:install-skills` (skill trees remain gitignored and
   reproducible).

## Consequences

- Agents get a shared vocabulary for rejecting fabricated type evidence.
- The tree is held to a clean anti-slop baseline; new work must not add
  findings.
- The vendored tree is owned by Epoch after copy; updates come from re-running
  the install skill deliberately.

## Revisit when

- Epoch adopts Effect and needs the opt-in `anti-slop-effect` plugin.
- Oxlint's JS plugin API or anti-slop's rule set changes enough to require a
  deliberate re-vendor.
