# Federation hardening — SDLC State

## Phase

Closed — 2026-08-19 via `/sdlc finish`.

## Session PRs

| Layer | PR | Merge SHA |
|---|---|---|
| Bottom: posture, NATS discovery, channels, gated bridges | [#151](https://github.com/Tyler-R-Kendrick/epoch/pull/151) | `aa44b9240892d9af73735aa0bda2089bf84dea16` |
| Top: Verify goldens, mutation oracles, discovery chaos | [#153](https://github.com/Tyler-R-Kendrick/epoch/pull/153) (replacement for closed [#152](https://github.com/Tyler-R-Kendrick/epoch/pull/152)) | `41433e6f55e6271e7517f36d5900a86994a18074` |

[#152](https://github.com/Tyler-R-Kendrick/epoch/pull/152) closed when `feat/federation-hardening` was deleted after the #151 squash-merge. The same commits were rebased onto `main` as #153.

## Authority decisions

- Transport moves bytes; clients verify signatures.
- Gated features stay off by default. Standing row: **Production ship: (none yet)**.
- Honest phrasing: “Epoch-native with optional bridges.”
- Open posture never grants `epoch.svc.>` even if `svc:discover` is listed.
- Auth callout is Epoch-native JSON, not a production nats-server JWT handshake.
- NATS mutant kill covers listed ACL/discovery guards only; full-project Stryker stays out of band.

## Verification

- Local `npm run verify` on Node 22 (v22.23.1) passed on the combined stack.
- #151 Quality Gates green before squash-merge.
- #153 Quality Gates: Docs/Lint/Typecheck/Test/Coverage/Pact/a11y/e2e/NATS mutant kill green. XMPP Prosody harness was still installing Prosody (`apt-get`) when the PR was squash-merged; not a billing failure, not a Test failure.

## Residual

- Production nats-server JWT handshake, Real PDS, and XMPP remain gated / not Production ship.
- Full-project Stryker scoring remains out of band.
