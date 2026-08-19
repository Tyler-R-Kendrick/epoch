# Test lanes honesty — SDLC State

## Phase

Open — stacked PRs for cucumber flake, Verify goldens, Protocol mutant kill, and this record.

## Session PRs

| Layer | Branch | Purpose |
|---|---|---|
| 01 | `sdlc/test-lanes-01-cucumber-flake` | Share-message cucumber no longer hangs on first-keys help chrome |
| 02 | `sdlc/test-lanes-02-verify-goldens` | Protocol, design-token, and voice-tray Verify goldens plus helper tests |
| 03 | `sdlc/test-lanes-03-mutation-guards` | `npm run mutation:protocol` + Quality Gates / fuzz-campaign jobs |
| 04 | `sdlc/test-lanes-04-docs` | Honest testing-lanes inventory and this closeout |

PR numbers are filled after `gh stack submit`.

## Inventory (honest)

- Atomic unit, Cucumber BDD, Pact HTTP, and PR-time fuzz are strong.
- Mutation kill is listed NATS + Protocol capability mutants, not Stryker.
- Verify goldens cover NATS, posture, protocol capabilities, design tokens, and lounge voice selectors — not every package.
- Chaos is NATS hang/malformed/revoke plus Community Web app faults.
- c8 floors apply to Node-visible `packages/*/dist`, not Playwright client bundles.

## Residual

- Full-project Stryker remains out of band.
- Jazzer campaigns remain scheduled.
- Production nats-server JWT handshake, Real PDS, and XMPP remain gated.
