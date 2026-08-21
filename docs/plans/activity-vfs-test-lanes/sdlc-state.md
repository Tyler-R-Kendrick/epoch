# Activity VFS + test-lane boy scout — SDLC State

## Phase

Open — stacked PRs for terminal Activity nav and lane honesty.

## Session PRs

| Layer | Branch | PR | Purpose |
|---|---|---|---|
| 01 | `sdlc/activity-vfs-01-terminal` | [#180](https://github.com/Tyler-R-Kendrick/epoch/pull/180) | Activity filters are terminal leaves; board nav polish |
| 02 | `sdlc/activity-vfs-02-verify-mutation` | [#181](https://github.com/Tyler-R-Kendrick/epoch/pull/181) | Verify golden + `mutation:community-web` CI |
| 03 | `sdlc/activity-vfs-03-docs-faults` | [#182](https://github.com/Tyler-R-Kendrick/epoch/pull/182) | Testing-lanes inventory + plan/dispatch records |

Stack issue: [#183](https://github.com/Tyler-R-Kendrick/epoch/issues/183).

## Inventory (honest)

- Unit / BDD / Pact / PR fuzz remain strong (pre-existing).
- Verify goldens now include Activity terminal leaves.
- Mutation kill now includes Community Web Activity terminal nav (still not Stryker).
- Chaos stays partial: NATS, XMPP fanout, Community Web AI-draft faults — Activity
  terminal contract is covered by Verify + mutant kill + Cucumber, not the AI fault harness.
