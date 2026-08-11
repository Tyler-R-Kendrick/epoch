# A keyboard-first Nightboard power user navigates messages and defines one safe reusable action

Feature id: `community-web-power-controls`
Scope: `global` (`.optimizexp`)

## Seed

A keyboard-first Nightboard power user navigates messages and defines one safe reusable action exposed to the prompt, agent tools, and exact voice phrases

## Personas

Generated one Gherkin file per persona (explicit --personas; config prefer/exclude (.optimizexp/config.json)):

- `community-web-power-controls-screen-reader-power-user.feature` ← `.optimizexp/personas/screen-reader-power-user.md` (scope: global)
- `community-web-power-controls-forge-community-power-user.feature` ← `.optimizexp/personas/forge-community-power-user.md` (scope: global)
- `community-web-power-controls-agentic-coding-power-user.feature` ← `.optimizexp/personas/agentic-coding-power-user.md` (scope: global)

## Bindings & tests

| Path | Role |
|---|---|
| `steps/bindings.steps.ts` | Cucumber Given/When/Then |
| `steps/implementations.ts` | Real command when discovered, else stub |
| `steps/discovery.json` | Code discovery report |
| `test/community-web-power-controls.bindings.test.ts` | Node test smoke |

Re-discover / rewire: `generate-feature.mts --mode implement --id community-web-power-controls`

## Evidence

`evidence/<scenario-slug>/` — one primary recording per scenario; re-runs overwrite.

## Driver

`web`
