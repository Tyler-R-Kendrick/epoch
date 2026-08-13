# Deterministic search and user projections

Feature id: `community-web-search-projections`
Scope: `global` (`.optimizexp`)

## Seed

A contributor searches registered sources, explains matches, saves and mounts a safe projection, and recovers through the immutable namespace

## Personas

Generated one Gherkin file per persona (explicit --personas; config prefer/exclude (.optimizexp/config.json)):

- `community-web-search-projections-screen-reader-power-user.feature` ← `.optimizexp/personas/screen-reader-power-user.md` (scope: global)
- `community-web-search-projections-forge-community-power-user.feature` ← `.optimizexp/personas/forge-community-power-user.md` (scope: global)
- `community-web-search-projections-github-power-user.feature` ← `.optimizexp/personas/github-power-user.md` (scope: global)

## Bindings & tests

| Path | Role |
|---|---|
| `steps/bindings.steps.ts` | Cucumber Given/When/Then |
| `steps/implementations.ts` | Real command when discovered, else stub |
| `steps/discovery.json` | Code discovery report |
| `test/community-web-search-projections.bindings.test.ts` | Vitest smoke |

Re-discover / rewire: `generate-feature.mts --mode implement --id community-web-search-projections`

## Evidence

`evidence/<scenario-slug>/` — one primary recording per scenario; re-runs overwrite.

## Driver

`web`
