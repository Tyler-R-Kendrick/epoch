# Steps & tests — `community-web-power-controls`

| Path | Role |
|---|---|
| `world.ts` | Shared Cucumber/world state |
| `bindings.steps.ts` | Given/When/Then → implementations |
| `implementations.ts` | Real or stub logic (discovery-wired when possible) |
| `discovery.json` | Code discovery report |
| `../test/community-web-power-controls.bindings.test.ts` | Node test smoke for bindings |

## Primary binding

- **package-script** `npm run nightboard:e2e` (high)
- package.json scripts["nightboard:e2e"] exists; mentioned in feature/seed

## Run

```bash
# unit/smoke
node --import tsx --test .optimizexp/features/community-web-power-controls/test/community-web-power-controls.bindings.test.ts

# cucumber (optimizexp profile, if configured)
pnpm run test:behavior:optimizexp -- --name "community-web-power-controls"
# or:
node --import tsx node_modules/@cucumber/cucumber/bin/cucumber.js \
  --config .optimizexp/cucumber.yaml \
  --name "community-web-power-controls"
```

## Agent rules

1. Prefer wiring steps to **existing** package scripts / CLIs found in `discovery.json`.
2. If code does not exist, leave `IMPLEMENTATION_STATUS` as `stub` and record a finding (friction/uncertainty).
3. Do not call live external services from default steps.
4. Re-run discovery: `generate-feature.mts --mode implement --id community-web-power-controls`.
