# A design-led app builder audits Community Web desktop narrow zoom focus and redu

Feature id: `community-web-responsive-craft`
Scope: `global` (`.optimizexp`)

## Seed

A design-led app builder audits Community Web desktop narrow zoom focus and reduced-motion rendering for unacceptable visual artifacts.

## Personas

Generated one Gherkin file per persona (explicit --personas; config prefer/exclude (.optimizexp/config.json)):

- `community-web-responsive-craft-app-builder-design-power-user.feature` ← `.optimizexp/personas/app-builder-design-power-user.md` (scope: global)

## Bindings & tests

| Path | Role |
|---|---|
| `steps/bindings.steps.ts` | Cucumber Given/When/Then |
| `steps/implementations.ts` | Real command when discovered, else stub |
| `steps/discovery.json` | Code discovery report |
| `test/community-web-responsive-craft.bindings.test.ts` | Vitest smoke |

Re-discover / rewire: `generate-feature.mts --mode implement --id community-web-responsive-craft`

## Evidence

`evidence/<scenario-slug>/` — one primary recording per scenario; re-runs overwrite.

## Driver

`web`
