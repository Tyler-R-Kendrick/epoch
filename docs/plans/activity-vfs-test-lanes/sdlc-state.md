# Activity VFS + test-lane boy scout — SDLC State

## Phase

**Closed** — squash-merged to `main` 2026-08-21.

## Session PRs

| Layer | Branch | PR | Merge SHA | Purpose |
|---|---|---|---|---|
| 01 | `sdlc/activity-vfs-01-terminal` | [#180](https://github.com/Tyler-R-Kendrick/epoch/pull/180) | [`a249a51`](https://github.com/Tyler-R-Kendrick/epoch/commit/a249a5141e65ed076bcc932e98db7702f3a58cb2) | Activity filters are terminal leaves; board nav polish |
| 02 | `sdlc/activity-vfs-02-verify-mutation` | [#181](https://github.com/Tyler-R-Kendrick/epoch/pull/181) | [`a2985aa`](https://github.com/Tyler-R-Kendrick/epoch/commit/a2985aa396cccc4023e7cfb2f198aeb5cdb6232a) | Verify golden + `mutation:community-web` CI |
| 03 | `sdlc/activity-vfs-03-docs-faults` | [#182](https://github.com/Tyler-R-Kendrick/epoch/pull/182) | [`358cbfe`](https://github.com/Tyler-R-Kendrick/epoch/commit/358cbfeb958bce75c81e0592ed4da3bd096e392a) | Testing-lanes inventory + plan/dispatch records |

Stack issue label from `gh stack submit`: #183 (not a GitHub Issue).

## Inventory (honest)

- Unit / BDD / Pact / PR fuzz remain strong (pre-existing).
- Verify goldens now include Activity terminal leaves.
- Mutation kill now includes Community Web Activity terminal nav (still not Stryker).
- Chaos stays partial: NATS, XMPP fanout, Community Web AI-draft faults — Activity
  terminal contract is covered by Verify + mutant kill + Cucumber, not the AI fault harness.

## Closeout notes

Pre-merge CI on #180 failed on Activity dismiss (feedMark seeded from target `post`),
fold hotkey probe (branch rail lacked `aria-keyshortcuts`), and a Tab-yield e2e race.
Fixed on layer 01 before squash-merge; Production deploy followed `a249a51`.
