# Cold Community Web entry clearly orients expert forge community and design-led b

Feature id: `community-web-first-use`
Scope: `global` (`.optimizexp`)

## Seed

Cold Community Web entry clearly orients expert forge community and design-led builder personas with honest live or snapshot state.

## Personas

Generated one Gherkin file per persona (explicit --personas; config prefer/exclude (.optimizexp/config.json)):

- `community-web-first-use-forge-community-power-user.feature` ← `.optimizexp/personas/forge-community-power-user.md` (scope: global)
- `community-web-first-use-app-builder-design-power-user.feature` ← `.optimizexp/personas/app-builder-design-power-user.md` (scope: global)

## Bindings & tests

| Path | Role |
|---|---|
| `steps/bindings.steps.ts` | Cucumber Given/When/Then |
| `steps/implementations.ts` | Real command when discovered, else stub |
| `steps/discovery.json` | Code discovery report |
| `test/community-web-first-use.bindings.test.ts` | Vitest smoke |

Re-discover / rewire: `generate-feature.mts --mode implement --id community-web-first-use`

## Evidence

`evidence/<scenario-slug>/` — one primary recording per scenario; re-runs overwrite.

## Driver

`web`
