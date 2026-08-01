# A forge and community power user moves between community channels Network Feed l

Feature id: `community-web-daily-navigation`
Scope: `global` (`.optimizexp`)

## Seed

A forge and community power user moves between community channels Network Feed linked repository issues and another community without losing place.

## Personas

Generated one Gherkin file per persona (explicit --personas; config prefer/exclude (.optimizexp/config.json)):

- `community-web-daily-navigation-forge-community-power-user.feature` ← `.optimizexp/personas/forge-community-power-user.md` (scope: global)

## Bindings & tests

| Path | Role |
|---|---|
| `steps/bindings.steps.ts` | Cucumber Given/When/Then |
| `steps/implementations.ts` | Real command when discovered, else stub |
| `steps/discovery.json` | Code discovery report |
| `test/community-web-daily-navigation.bindings.test.ts` | Vitest smoke |

Re-discover / rewire: `generate-feature.mts --mode implement --id community-web-daily-navigation`

## Evidence

`evidence/<scenario-slug>/` — one primary recording per scenario; re-runs overwrite.

## Driver

`web`
