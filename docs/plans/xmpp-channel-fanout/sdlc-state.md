# XMPP channel fanout — SDLC State

## Phase

Closed — 2026-08-19 `/sdlc finish`. Stack [#167](https://github.com/Tyler-R-Kendrick/epoch/issues/167).

## Decisions

- Native channels remain signed gossip `epoch.channel/v1`. Transport moves bytes; clients verify signatures.
- XEP-0045 MUC occupancy/nicks are refused as identity. Conference-shaped JIDs are routing labels only.
- The Community Web adapter stays default-off unless `globalThis.epochXmppFanout` is injected.

## Session PRs

| Layer | PR | Merge SHA | Purpose |
|---|---|---|---|
| 01 | [#163](https://github.com/Tyler-R-Kendrick/epoch/pull/163) | [`68caef2`](https://github.com/Tyler-R-Kendrick/epoch/commit/68caef237fade16a6ed9cb574d1612805cecc5c5) | Fan public `channel.create` / `channel.message` over s2s |
| 02 | [#164](https://github.com/Tyler-R-Kendrick/epoch/pull/164) | [`16e92ef`](https://github.com/Tyler-R-Kendrick/epoch/commit/16e92efcd8ed0d1771ee7d98966513f4b4021d69) | Verify goldens for XMPP fidelity + fanout envelope |
| 03 | [#165](https://github.com/Tyler-R-Kendrick/epoch/pull/165) | [`a239879`](https://github.com/Tyler-R-Kendrick/epoch/commit/a23987973d123bb69be15b5f88c72a11c022325c) | `mutation:xmpp` + Quality Gates job |
| 04 | [#166](https://github.com/Tyler-R-Kendrick/epoch/pull/166) | [`babbc16`](https://github.com/Tyler-R-Kendrick/epoch/commit/babbc16f998a8bcd94ef4b71fe0f635507e49d79) | Chaos tests for malformed fanout envelopes and concurrent denials |

## Residual

- Production XMPP ship remains none (adapter default off).
- Prosody `apt-get install` can hang on GitHub-hosted runners; cancel/rerun when the job stalls on Install Prosody.
