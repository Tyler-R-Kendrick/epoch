# Steps & tests — `community-web-signed-collaboration`

| Path | Role |
|---|---|
| `world.ts` | Shared Cucumber/world state |
| `bindings.steps.ts` | Given/When/Then → implementations |
| `implementations.ts` | Real or stub logic (discovery-wired when possible) |
| `discovery.json` | Code discovery report |
| `../test/community-web-signed-collaboration.bindings.test.ts` | Vitest smoke for bindings |

## Primary binding

- **package-script** `pnpm run vercel:community-web` (high)
- package.json scripts["vercel:community-web"] exists; mentioned in feature/seed

## Run

```bash
# unit/smoke (vitest)
pnpm run test:file .optimizexp/features/community-web-signed-collaboration/test/community-web-signed-collaboration.bindings.test.ts

# cucumber (optimizexp profile, if configured)
pnpm run test:behavior:optimizexp -- --name "community-web-signed-collaboration"
# or:
node --import tsx node_modules/@cucumber/cucumber/bin/cucumber.js \
  --config .optimizexp/cucumber.yaml \
  --name "community-web-signed-collaboration"
```

## Agent rules

1. Prefer wiring steps to **existing** package scripts / CLIs found in `discovery.json`.
2. If code does not exist, leave `IMPLEMENTATION_STATUS` as `stub` and record a finding (friction/uncertainty).
3. Do not call live external services from default steps.
4. Re-run discovery: `generate-feature.mts --mode implement --id community-web-signed-collaboration`.
