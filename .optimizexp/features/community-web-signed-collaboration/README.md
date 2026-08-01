# A forge community maintainer selects an idea inspects provenance promotes signed

Feature id: `community-web-signed-collaboration`
Scope: `global` (`.optimizexp`)

## Seed

A forge community maintainer selects an idea inspects provenance promotes signed intent and sees fail-closed recovery and human review authority.

## Personas

Generated one Gherkin file per persona (explicit --personas; config prefer/exclude (.optimizexp/config.json)):

- `community-web-signed-collaboration-forge-community-power-user.feature` ← `.optimizexp/personas/forge-community-power-user.md` (scope: global)

## Bindings & tests

| Path | Role |
|---|---|
| `steps/bindings.steps.ts` | Cucumber Given/When/Then |
| `steps/implementations.ts` | Real command when discovered, else stub |
| `steps/discovery.json` | Code discovery report |
| `test/community-web-signed-collaboration.bindings.test.ts` | Vitest smoke |

Re-discover / rewire: `generate-feature.mts --mode implement --id community-web-signed-collaboration`

## Evidence

`evidence/<scenario-slug>/` — one primary recording per scenario; re-runs overwrite.

## Driver

`web`
