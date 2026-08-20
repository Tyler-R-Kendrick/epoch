# Anti-slop zero — SDLC state

Initiative: re-install / reconfigure / re-init [anti-slop](https://github.com/dmmulroy/anti-slop),
drive findings to zero with stacked PRs, confirm a second clean run.

## Phase

`closeout` — install skill restored; plugin force-copied; baseline stayed **0 findings**; stacked WIP for legacy-state + design-chrome.

## Decisions

- Epoch already vendored anti-slop in #170 / ADR-0056; this initiative re-runs
  `install-anti-slop` deliberately rather than treating the tree as green by memory.
- Effect plugin stays off (no direct `effect` dependency).
- Do not weaken rules in `oxlint.config.ts` to greenwash.

## Stack

| Layer | Branch | Scope |
|---|---|---|
| 01 | `sdlc/anti-slop-01-reinit` → [#172](https://github.com/Tyler-R-Kendrick/epoch/pull/172) | Skill install, force re-vendor, config verify, clean baseline proof |
| 02 | `sdlc/anti-slop-02-legacy-state` → [#173](https://github.com/Tyler-R-Kendrick/epoch/pull/173) | Drop unshipped Community schema 1/2 migrate paths |
| 03 | `sdlc/anti-slop-03-design-chrome` → [#174](https://github.com/Tyler-R-Kendrick/epoch/pull/174) | Receipt Bracket Rule + board design chrome lint in hooks |

Submitted stack #175: [#172](https://github.com/Tyler-R-Kendrick/epoch/pull/172) → [#173](https://github.com/Tyler-R-Kendrick/epoch/pull/173) → [#174](https://github.com/Tyler-R-Kendrick/epoch/pull/174).

## Evidence

- `npx skills add dmmulroy/anti-slop --skill install-anti-slop` → hosts Claude/Cursor/Codex/Grok
- `node .agents/skills/install-anti-slop/scripts/install.mjs … --force`
- `npm view oxlint/@oxlint/plugins` → `1.79.0` (matches lockfile)
- `oxlint .` run 1 → exit 0, 0 `anti-slop` diagnostics (rules still fire on probe file)
- Upstream `dmmulroy/anti-slop` `src/` matches vendored rules (tests only differ)

## Next

Confirm a second consecutive `oxlint .` at 0 after stacking parked product WIP.
